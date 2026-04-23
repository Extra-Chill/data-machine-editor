/**
 * HandleAcceptAll — bulk accept/reject for all diff blocks in the editor.
 */

import { ActionResolver } from './ActionResolver';
import { FindDiffBlocks } from './FindDiffBlocks';
import { actionTracker } from '../editor/ActionTracker';

/**
 * Resolve the current post ID from either the provided value
 * or the core/editor store (wp-admin fallback).
 */
function resolvePostId( postId?: number ): number {
	if ( postId && postId > 0 ) {
		return postId;
	}

	// Fallback: try core/editor if available (wp-admin context).
	try {
		const editor = wp?.data?.select?.( 'core/editor' ) as Record< string, CallableFunction > | undefined;
		return editor?.getCurrentPostId?.() ?? 0;
	} catch {
		return 0;
	}
}

export class HandleAcceptAll {
	/** Accept all diff blocks in the editor. */
	static async acceptAll( postId?: number ): Promise< number > {
		const currentPostId = resolvePostId( postId );
		const diffBlocks = FindDiffBlocks.findAllDiffBlocks();

		console.log(
			'HandleAcceptAll: Processing',
			diffBlocks.length,
			'diff blocks'
		);

		actionTracker.startBulkOperation();

		for ( const diffBlock of diffBlocks ) {
			try {
				await ActionResolver.handleAccept(
					diffBlock.attributes,
					diffBlock.clientId,
					currentPostId,
					true
				);
				console.log(
					'HandleAcceptAll: Accepted diff block',
					diffBlock.attributes.actionId
				);
			} catch ( error ) {
				console.error(
					'HandleAcceptAll: Error accepting diff block',
					diffBlock.attributes.actionId,
					error
				);
			}
		}

		actionTracker.endBulkOperation( 'accepted' );
		return diffBlocks.length;
	}

	/** Reject all diff blocks in the editor. */
	static async rejectAll( postId?: number ): Promise< number > {
		const currentPostId = resolvePostId( postId );
		const diffBlocks = FindDiffBlocks.findAllDiffBlocks();

		console.log(
			'HandleAcceptAll: Rejecting',
			diffBlocks.length,
			'diff blocks'
		);

		actionTracker.startBulkOperation();

		for ( const diffBlock of diffBlocks ) {
			try {
				await ActionResolver.handleReject(
					diffBlock.attributes,
					diffBlock.clientId,
					currentPostId,
					true
				);
				console.log(
					'HandleAcceptAll: Rejected diff block',
					diffBlock.attributes.actionId
				);
			} catch ( error ) {
				console.error(
					'HandleAcceptAll: Error rejecting diff block',
					diffBlock.attributes.actionId,
					error
				);
			}
		}

		actionTracker.endBulkOperation( 'rejected' );
		return diffBlocks.length;
	}
}
