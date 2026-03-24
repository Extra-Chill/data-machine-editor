/**
 * HandleAcceptAll — bulk accept/reject for all diff blocks in the editor.
 */

import { DiffActions } from './DiffActions';
import { FindDiffBlocks } from './FindDiffBlocks';
import { diffTracker } from '../editor/DiffTracker';

export class HandleAcceptAll {
	/** Accept all diff blocks in the editor. */
	static async acceptAll(): Promise< number > {
		const { getCurrentPostId } = wp.data.select( 'core/editor' );

		const diffBlocks = FindDiffBlocks.findAllDiffBlocks();
		const currentPostId: number = getCurrentPostId();

		console.log(
			'HandleAcceptAll: Processing',
			diffBlocks.length,
			'diff blocks'
		);

		diffTracker.startBulkOperation();

		for ( const diffBlock of diffBlocks ) {
			try {
				await DiffActions.handleAccept(
					diffBlock.attributes,
					diffBlock.clientId,
					currentPostId,
					true
				);
				console.log(
					'HandleAcceptAll: Accepted diff block',
					diffBlock.attributes.diffId
				);
			} catch ( error ) {
				console.error(
					'HandleAcceptAll: Error accepting diff block',
					diffBlock.attributes.diffId,
					error
				);
			}
		}

		diffTracker.endBulkOperation( 'accepted' );
		return diffBlocks.length;
	}

	/** Reject all diff blocks in the editor. */
	static async rejectAll(): Promise< number > {
		const { getCurrentPostId } = wp.data.select( 'core/editor' );

		const diffBlocks = FindDiffBlocks.findAllDiffBlocks();
		const currentPostId: number = getCurrentPostId();

		console.log(
			'HandleAcceptAll: Rejecting',
			diffBlocks.length,
			'diff blocks'
		);

		diffTracker.startBulkOperation();

		for ( const diffBlock of diffBlocks ) {
			try {
				await DiffActions.handleReject(
					diffBlock.attributes,
					diffBlock.clientId,
					currentPostId,
					true
				);
				console.log(
					'HandleAcceptAll: Rejected diff block',
					diffBlock.attributes.diffId
				);
			} catch ( error ) {
				console.error(
					'HandleAcceptAll: Error rejecting diff block',
					diffBlock.attributes.diffId,
					error
				);
			}
		}

		diffTracker.endBulkOperation( 'rejected' );
		return diffBlocks.length;
	}
}
