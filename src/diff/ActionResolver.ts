/**
 * ActionResolver — accept/reject logic with DM REST API communication.
 *
 * Delegates each decision to the editor bridge endpoint
 * `/datamachine/v1/editor/actions/resolve`, which in turn routes to core's
 * unified ResolvePendingActionAbility.
 */

import apiFetch from '@wordpress/api-fetch';
import { ContentUpdater } from './ContentUpdater';
import { FindDiffBlocks } from './FindDiffBlocks';
import { actionTracker } from '../editor/ActionTracker';
import type {
	DiffBlockAttributes,
	ActionDecision,
	ResolvePayload,
	ResolveResponse,
} from '../types';

export class ActionResolver {
	/** Handle accepting a pending action. */
	static async handleAccept(
		attributes: DiffBlockAttributes,
		clientId: string,
		currentPostId: number,
		suppressContinuation = false
	): Promise< { success: boolean } > {
		const { toolCallId, actionId } = attributes;

		try {
			ContentUpdater.removeDiffWrapper( clientId, true );

			const responseData = await ActionResolver.sendUserDecision(
				'accepted',
				{
					tool_call_id: toolCallId,
					action_id: actionId,
					post_id: currentPostId,
				}
			);

			if ( responseData.continue_chat && ! suppressContinuation ) {
				const remaining = FindDiffBlocks.findDiffBlocksByActionId(
					actionId
				).filter( ( b ) => b.attributes.status === 'pending' );

				if ( remaining.length === 0 ) {
					actionTracker.markDiffBlockResolved( clientId, 'accepted' );
				}
			}

			return { success: true };
		} catch ( error ) {
			console.error( 'Error accepting pending action:', error );
			throw error;
		}
	}

	/** Handle rejecting a pending action. */
	static async handleReject(
		attributes: DiffBlockAttributes,
		clientId: string,
		currentPostId: number,
		suppressContinuation = false
	): Promise< { success: boolean } > {
		const { toolCallId, actionId } = attributes;

		try {
			ContentUpdater.removeDiffWrapper( clientId, false );

			const responseData = await ActionResolver.sendUserDecision(
				'rejected',
				{
					tool_call_id: toolCallId,
					action_id: actionId,
					post_id: currentPostId,
				}
			);

			if ( responseData.continue_chat && ! suppressContinuation ) {
				const remaining = FindDiffBlocks.findDiffBlocksByActionId(
					actionId
				).filter( ( b ) => b.attributes.status === 'pending' );

				if ( remaining.length === 0 ) {
					actionTracker.markDiffBlockResolved( clientId, 'rejected' );
				}
			}

			return { success: true };
		} catch ( error ) {
			console.error( 'Error rejecting pending action:', error );
			throw error;
		}
	}

	/**
	 * Send user decision to backend via Data Machine REST API.
	 * Uses wp.apiFetch which handles nonce/auth automatically.
	 */
	static async sendUserDecision(
		decision: ActionDecision,
		data: ResolvePayload
	): Promise< ResolveResponse > {
		return apiFetch< ResolveResponse >( {
			path: '/datamachine/v1/editor/actions/resolve',
			method: 'POST',
			data: {
				decision,
				tool_call_id: data.tool_call_id,
				action_id: data.action_id,
				post_id: data.post_id,
			},
		} );
	}

	/**
	 * Trigger chat continuation after all pending actions in a tool call are resolved.
	 */
	static async triggerChatContinuation(
		sessionId: string
	): Promise< unknown > {
		if ( ! sessionId ) {
			console.warn(
				'ActionResolver: No session ID for chat continuation'
			);
			return undefined;
		}

		try {
			const response = await apiFetch( {
				path: '/datamachine/v1/chat/continue',
				method: 'POST',
				data: { session_id: sessionId },
			} );

			console.log(
				'ActionResolver: Chat continuation response:',
				response
			);
			return response;
		} catch ( error ) {
			console.error( 'ActionResolver: Chat continuation failed:', error );
			throw error;
		}
	}

	/** Create action handlers with proper context. */
	static createActionHandlers(
		attributes: DiffBlockAttributes,
		clientId: string,
		currentPostId: number,
		setIsProcessing: ( v: boolean ) => void,
		setAttributes: ( attrs: Partial< DiffBlockAttributes > ) => void
	): { handleAccept: () => Promise< void >; handleReject: () => Promise< void > } {
		const handleAccept = async () => {
			setIsProcessing( true );
			try {
				setAttributes( { status: 'accepted' } );
				await ActionResolver.handleAccept(
					attributes,
					clientId,
					currentPostId
				);
			} catch {
				setAttributes( { status: 'pending' } );
			} finally {
				setIsProcessing( false );
			}
		};

		const handleReject = async () => {
			setIsProcessing( true );
			try {
				setAttributes( { status: 'rejected' } );
				await ActionResolver.handleReject(
					attributes,
					clientId,
					currentPostId
				);
			} catch {
				setAttributes( { status: 'pending' } );
			} finally {
				setIsProcessing( false );
			}
		};

		return { handleAccept, handleReject };
	}
}
