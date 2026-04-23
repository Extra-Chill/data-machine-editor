/**
 * ActionTracker — centralized pending-action state management and
 * continuation triggering.
 *
 * Tracks diff blocks by Gutenberg clientId and calls the DM /chat/continue
 * endpoint when all staged actions have been resolved.
 */

import apiFetch from '@wordpress/api-fetch';
import type { ActionDecision, ActionInfo, GutenbergBlock, TrackerStatus } from '../types';

export class ActionTracker {
	private activeDiffBlocks = new Map< string, ActionInfo >();
	private currentToolCallId: string | null = null;
	private currentSessionId: string | null = null;
	private isTrackingBulkOperation = false;
	private postId: number | null = null;

	private static instance: ActionTracker | null = null;

	constructor() {
		if ( typeof wp !== 'undefined' && wp.data ) {
			wp.data.subscribe( () => {
				this.syncWithEditor();
			} );
		}
	}

	/** Initialize tracking for a new tool call. */
	startTracking(
		toolCallId: string,
		postId: number | null = null,
		sessionId: string | null = null
	): void {
		console.log( 'ActionTracker: Starting tracking for tool:', toolCallId );

		this.currentToolCallId = toolCallId;
		this.currentSessionId = sessionId;
		this.postId = postId;
		this.activeDiffBlocks.clear();
	}

	/** Add a diff block to tracking when created in the editor. */
	addDiffBlock( clientId: string, info: Omit< ActionInfo, 'timestamp' > ): void {
		console.log( 'ActionTracker: Adding diff block:', clientId );

		this.activeDiffBlocks.set( clientId, {
			...info,
			timestamp: Date.now(),
		} );

		console.log(
			'ActionTracker: Now tracking',
			this.activeDiffBlocks.size,
			'active diff blocks'
		);
	}

	/** Mark a diff block as resolved (accepted or rejected). */
	markDiffBlockResolved( clientId: string, action: ActionDecision ): void {
		if ( ! this.activeDiffBlocks.has( clientId ) ) {
			return;
		}

		console.log(
			'ActionTracker: Marking diff block as resolved:',
			clientId,
			'action:',
			action
		);
		this.activeDiffBlocks.delete( clientId );

		const remaining = this.activeDiffBlocks.size;
		console.log( 'ActionTracker: Remaining active diff blocks:', remaining );

		if ( remaining === 0 && this.currentToolCallId ) {
			console.log(
				'ActionTracker: All diff blocks resolved, triggering continuation'
			);
			void this.triggerContinuation( action );
		}
	}

	/** Start bulk operation tracking (suppresses individual continuations). */
	startBulkOperation(): void {
		console.log( 'ActionTracker: Starting bulk operation' );
		this.isTrackingBulkOperation = true;
	}

	/** End bulk operation — triggers continuation if all resolved. */
	endBulkOperation( action: ActionDecision ): void {
		console.log( 'ActionTracker: Ending bulk operation' );
		this.isTrackingBulkOperation = false;

		if ( this.activeDiffBlocks.size === 0 && this.currentToolCallId ) {
			void this.triggerContinuation( action );
		}
	}

	/** Sync tracker state with the current editor blocks. */
	private syncWithEditor(): void {
		if (
			this.activeDiffBlocks.size === 0 ||
			! this.currentToolCallId
		) {
			return;
		}

		const currentBlocks = this.getCurrentDiffBlocks();
		const currentClientIds = new Set(
			currentBlocks.map( ( b ) => b.clientId )
		);

		const removed: string[] = [];
		for ( const clientId of this.activeDiffBlocks.keys() ) {
			if ( ! currentClientIds.has( clientId ) ) {
				removed.push( clientId );
			}
		}

		for ( const clientId of removed ) {
			this.activeDiffBlocks.delete( clientId );
		}

		if (
			this.activeDiffBlocks.size === 0 &&
			this.currentToolCallId &&
			! this.isTrackingBulkOperation
		) {
			void this.triggerContinuation( 'accepted' );
		}
	}

	/** Get current diff blocks from the Gutenberg editor store. */
	private getCurrentDiffBlocks(): GutenbergBlock[] {
		if ( typeof wp === 'undefined' || ! wp.data ) {
			return [];
		}
		const blocks: GutenbergBlock[] =
			wp.data.select( 'core/block-editor' ).getBlocks();
		return blocks.filter( ( b ) => b.name === 'datamachine/diff' );
	}

	/** Whether we're in a bulk operation. */
	isBulkOperation(): boolean {
		return this.isTrackingBulkOperation;
	}

	/** Current tracking status snapshot. */
	getStatus(): TrackerStatus {
		return {
			activeDiffBlocks: Array.from( this.activeDiffBlocks.keys() ),
			totalDiffBlocks: this.activeDiffBlocks.size,
			currentToolCallId: this.currentToolCallId,
			currentSessionId: this.currentSessionId,
			isBulkOperation: this.isTrackingBulkOperation,
			allResolved: this.activeDiffBlocks.size === 0,
			postId: this.postId,
		};
	}

	/**
	 * Trigger chat continuation via the DM REST API.
	 * Falls back to a DOM event when no session is available.
	 */
	private async triggerContinuation( action: ActionDecision ): Promise< void > {
		if ( ! this.currentToolCallId ) {
			return;
		}

		console.log(
			'ActionTracker: Triggering continuation for tool:',
			this.currentToolCallId
		);

		if ( this.currentSessionId ) {
			try {
				const response = await apiFetch( {
					path: '/datamachine/v1/chat/continue',
					method: 'POST',
					data: { session_id: this.currentSessionId },
				} );

				document.dispatchEvent(
					new CustomEvent( 'datamachine-chat-continued', {
						detail: {
							sessionId: this.currentSessionId,
							response,
						},
					} )
				);
			} catch ( error ) {
				console.error(
					'ActionTracker: Chat continuation failed:',
					error
				);
			}
		} else {
			document.dispatchEvent(
				new CustomEvent( 'datamachine-continue-chat', {
					detail: {
						trigger: 'action_resolved',
						toolResult: {
							action,
							toolCallId: this.currentToolCallId,
							postId: this.postId,
							totalDiffBlocks: this.activeDiffBlocks.size,
							timestamp: Date.now(),
						},
					},
				} )
			);
		}

		this.reset();
	}

	/** Reset all tracking state. */
	reset(): void {
		console.log( 'ActionTracker: Resetting tracking state' );
		this.activeDiffBlocks.clear();
		this.currentToolCallId = null;
		this.currentSessionId = null;
		this.isTrackingBulkOperation = false;
		this.postId = null;
	}

	/** Get or create the singleton instance. */
	static getInstance(): ActionTracker {
		if ( ! ActionTracker.instance ) {
			ActionTracker.instance = new ActionTracker();
		}
		return ActionTracker.instance;
	}
}

/** Singleton instance. */
export const actionTracker = ActionTracker.getInstance();
