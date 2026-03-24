/**
 * DiffActions — accept/reject logic with DM REST API communication.
 */

import apiFetch from '@wordpress/api-fetch';
import { ContentUpdater } from './ContentUpdater';
import { FindDiffBlocks } from './FindDiffBlocks';
import { diffTracker } from '../editor/DiffTracker';
import type {
	DiffBlockAttributes,
	DiffDecision,
	ResolvePayload,
	ResolveResponse,
} from '../types';

export class DiffActions {
	/** Handle accepting a diff. */
	static async handleAccept(
		attributes: DiffBlockAttributes,
		clientId: string,
		currentPostId: number,
		suppressContinuation = false
	): Promise< { success: boolean } > {
		const { toolCallId, diffId } = attributes;

		try {
			ContentUpdater.removeDiffWrapper( clientId, true );

			const responseData = await DiffActions.sendUserDecision(
				'accepted',
				{
					tool_call_id: toolCallId,
					diff_id: diffId,
					post_id: currentPostId,
				}
			);

			if ( responseData.continue_chat && ! suppressContinuation ) {
				const remaining = FindDiffBlocks.findDiffBlocksByDiffId(
					diffId
				).filter( ( b ) => b.attributes.status === 'pending' );

				if ( remaining.length === 0 ) {
					diffTracker.markDiffBlockResolved( clientId, 'accepted' );
				}
			}

			return { success: true };
		} catch ( error ) {
			console.error( 'Error accepting diff:', error );
			throw error;
		}
	}

	/** Handle rejecting a diff. */
	static async handleReject(
		attributes: DiffBlockAttributes,
		clientId: string,
		currentPostId: number,
		suppressContinuation = false
	): Promise< { success: boolean } > {
		const { toolCallId, diffId } = attributes;

		try {
			ContentUpdater.removeDiffWrapper( clientId, false );

			const responseData = await DiffActions.sendUserDecision(
				'rejected',
				{
					tool_call_id: toolCallId,
					diff_id: diffId,
					post_id: currentPostId,
				}
			);

			if ( responseData.continue_chat && ! suppressContinuation ) {
				const remaining = FindDiffBlocks.findDiffBlocksByDiffId(
					diffId
				).filter( ( b ) => b.attributes.status === 'pending' );

				if ( remaining.length === 0 ) {
					diffTracker.markDiffBlockResolved( clientId, 'rejected' );
				}
			}

			return { success: true };
		} catch ( error ) {
			console.error( 'Error rejecting diff:', error );
			throw error;
		}
	}

	/**
	 * Send user decision to backend via Data Machine REST API.
	 * Uses wp.apiFetch which handles nonce/auth automatically.
	 */
	static async sendUserDecision(
		decision: DiffDecision,
		data: ResolvePayload
	): Promise< ResolveResponse > {
		return apiFetch< ResolveResponse >( {
			path: '/datamachine/v1/editor/diff/resolve',
			method: 'POST',
			data: {
				decision,
				tool_call_id: data.tool_call_id,
				diff_id: data.diff_id,
				post_id: data.post_id,
			},
		} );
	}

	/**
	 * Trigger chat continuation after all diffs in a tool call are resolved.
	 */
	static async triggerChatContinuation(
		sessionId: string
	): Promise< unknown > {
		if ( ! sessionId ) {
			console.warn(
				'DiffActions: No session ID for chat continuation'
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
				'DiffActions: Chat continuation response:',
				response
			);
			return response;
		} catch ( error ) {
			console.error( 'DiffActions: Chat continuation failed:', error );
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
				await DiffActions.handleAccept(
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
				await DiffActions.handleReject(
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
