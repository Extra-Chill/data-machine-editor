import { DiffActions } from './DiffActions';
import { FindDiffBlocks } from './FindDiffBlocks';
import { diffTracker } from '../editor/DiffTracker';

/**
 * HandleAcceptAll - Clean bridge for bulk diff operations
 * 
 * Provides clean interface between chat UI and individual diff block handlers
 */
export class HandleAcceptAll {
    /**
     * Accept all diff blocks in the editor
     */
    static async acceptAll() {
        const { getCurrentPostId } = wp.data.select('core/editor');
        
        const diffBlocks = FindDiffBlocks.findAllDiffBlocks();
        const currentPostId = getCurrentPostId();
        
        console.log('HandleAcceptAll: Processing', diffBlocks.length, 'diff blocks');
        
        // Start bulk operation tracking
        diffTracker.startBulkOperation();
        
        // Process each diff block using DiffActions.handleAccept
        // Suppress individual continuation events during bulk operation
        for (let i = 0; i < diffBlocks.length; i++) {
            const diffBlock = diffBlocks[i];
            
            try {
                await DiffActions.handleAccept(
                    diffBlock.attributes,
                    diffBlock.clientId,
                    currentPostId,
                    true // suppressContinuation = true for all blocks in bulk operation
                );
                console.log('HandleAcceptAll: Accepted diff block', diffBlock.attributes.diffId);
            } catch (error) {
                console.error('HandleAcceptAll: Error accepting diff block', diffBlock.attributes.diffId, error);
            }
        }
        
        // End bulk operation - DiffTracker will trigger continuation if all diffs are resolved
        diffTracker.endBulkOperation('accepted');
        
        return diffBlocks.length;
    }
    
    /**
     * Reject all diff blocks in the editor
     */
    static async rejectAll() {
        const { getCurrentPostId } = wp.data.select('core/editor');
        
        const diffBlocks = FindDiffBlocks.findAllDiffBlocks();
        const currentPostId = getCurrentPostId();
        
        console.log('HandleAcceptAll: Rejecting', diffBlocks.length, 'diff blocks');
        
        // Start bulk operation tracking
        diffTracker.startBulkOperation();
        
        // Process each diff block using DiffActions.handleReject
        // Suppress individual continuation events during bulk operation
        for (let i = 0; i < diffBlocks.length; i++) {
            const diffBlock = diffBlocks[i];
            
            try {
                await DiffActions.handleReject(
                    diffBlock.attributes,
                    diffBlock.clientId,
                    currentPostId,
                    true // suppressContinuation = true for all blocks in bulk operation
                );
                console.log('HandleAcceptAll: Rejected diff block', diffBlock.attributes.diffId);
            } catch (error) {
                console.error('HandleAcceptAll: Error rejecting diff block', diffBlock.attributes.diffId, error);
            }
        }
        
        // End bulk operation - DiffTracker will trigger continuation if all diffs are resolved
        diffTracker.endBulkOperation('rejected');
        
        return diffBlocks.length;
    }
}