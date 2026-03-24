import apiFetch from '@wordpress/api-fetch';

/**
 * DiffTracker - Centralized diff state management and continuation triggering
 *
 * This module decouples diff acceptance/rejection from continuation logic.
 * It tracks diff blocks by their Gutenberg clientId and triggers continuation events
 * when all diffs have been resolved (accepted or rejected).
 *
 * Continuation calls the Data Machine /chat/continue REST endpoint directly.
 */

export class DiffTracker {
    constructor() {
        this.activeDiffBlocks = new Map(); // clientId -> diffInfo
        this.currentToolCallId = null;
        this.currentSessionId = null;
        this.isTrackingBulkOperation = false;
        this.postId = null;

        // Subscribe to Gutenberg block changes to keep state in sync
        if ( typeof wp !== 'undefined' && wp.data ) {
            wp.data.subscribe( () => {
                this.syncWithEditor();
            } );
        }
    }

    /**
     * Initialize tracking for a new tool call
     * Called when tool results are about to create new diffs
     */
    startTracking( toolCallId, postId = null, sessionId = null ) {
        console.log( 'DiffTracker: Starting tracking for tool:', toolCallId );

        this.currentToolCallId = toolCallId;
        this.currentSessionId = sessionId;
        this.postId = postId;
        this.activeDiffBlocks.clear();

        console.log( 'DiffTracker: Ready to track diff blocks for tool:', toolCallId );
    }

    /**
     * Add a diff block to tracking when it's created in the editor
     */
    addDiffBlock(clientId, diffInfo) {
        console.log('DiffTracker: Adding diff block:', clientId, diffInfo);
        
        this.activeDiffBlocks.set(clientId, {
            ...diffInfo,
            timestamp: Date.now()
        });
        
        console.log('DiffTracker: Now tracking', this.activeDiffBlocks.size, 'active diff blocks');
    }

    /**
     * Mark a diff block as resolved (accepted or rejected)
     */
    markDiffBlockResolved(clientId, action) {
        if (!this.activeDiffBlocks.has(clientId)) {
            console.log('DiffTracker: Diff block', clientId, 'not in active tracking, ignoring');
            return;
        }

        console.log('DiffTracker: Marking diff block as resolved:', clientId, 'action:', action);
        this.activeDiffBlocks.delete(clientId);
        
        const remainingBlocks = this.activeDiffBlocks.size;
        console.log('DiffTracker: Remaining active diff blocks:', remainingBlocks);

        // If no more active diff blocks, trigger continuation
        if (remainingBlocks === 0 && this.currentToolCallId) {
            console.log('DiffTracker: All diff blocks resolved, triggering continuation');
            this.triggerContinuation(action);
        }
    }

    /**
     * Start bulk operation tracking
     * This suppresses individual continuation events
     */
    startBulkOperation() {
        console.log('DiffTracker: Starting bulk operation');
        this.isTrackingBulkOperation = true;
    }

    /**
     * End bulk operation tracking
     * This triggers continuation if all diffs are resolved
     */
    endBulkOperation(action) {
        console.log('DiffTracker: Ending bulk operation');
        this.isTrackingBulkOperation = false;
        
        // If all diffs are resolved, trigger continuation
        if (this.activeDiffBlocks.size === 0 && this.currentToolCallId) {
            console.log('DiffTracker: Bulk operation complete, triggering continuation');
            this.triggerContinuation(action);
        }
    }

    /**
     * Sync tracker state with current editor state
     * Called when Gutenberg blocks change
     */
    syncWithEditor() {
        // Only sync if we have active tracking
        if (this.activeDiffBlocks.size === 0 || !this.currentToolCallId) {
            return;
        }

        // Get current diff blocks from editor
        const currentDiffBlocks = this.getCurrentDiffBlocks();
        const currentClientIds = new Set(currentDiffBlocks.map(block => block.clientId));
        
        // Check if any of our tracked blocks no longer exist
        const removedBlocks = [];
        for (const clientId of this.activeDiffBlocks.keys()) {
            if (!currentClientIds.has(clientId)) {
                removedBlocks.push(clientId);
            }
        }
        
        // Remove blocks that no longer exist (user manually deleted)
        removedBlocks.forEach(clientId => {
            console.log('DiffTracker: Diff block', clientId, 'no longer exists, removing from tracking');
            this.activeDiffBlocks.delete(clientId);
        });
        
        // Check if all blocks are resolved
        if (this.activeDiffBlocks.size === 0 && this.currentToolCallId && !this.isTrackingBulkOperation) {
            console.log('DiffTracker: All diff blocks manually removed, triggering continuation');
            this.triggerContinuation('resolved');
        }
    }

    /**
     * Get current diff blocks from Gutenberg editor
     */
    getCurrentDiffBlocks() {
        if (typeof wp === 'undefined' || !wp.data) {
            return [];
        }

        const blocks = wp.data.select('core/block-editor').getBlocks();
        return blocks.filter(block => block.name === 'datamachine/diff');
    }

    /**
     * Check if we're currently tracking a bulk operation
     */
    isBulkOperation() {
        return this.isTrackingBulkOperation;
    }

    /**
     * Get current tracking status
     */
    getStatus() {
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
     * Trigger chat continuation via DM REST API.
     * If a session ID is available, calls /chat/continue directly.
     * Falls back to a DOM event for consumers without a session.
     */
    async triggerContinuation( action ) {
        if ( ! this.currentToolCallId ) {
            console.log( 'DiffTracker: No current tool call ID, skipping continuation' );
            return;
        }

        console.log( 'DiffTracker: Triggering continuation for tool:', this.currentToolCallId );

        if ( this.currentSessionId ) {
            try {
                const response = await apiFetch( {
                    path: '/datamachine/v1/chat/continue',
                    method: 'POST',
                    data: { session_id: this.currentSessionId },
                } );
                console.log( 'DiffTracker: Chat continuation response:', response );

                // Dispatch event so UI can update with new messages
                document.dispatchEvent( new CustomEvent( 'datamachine-chat-continued', {
                    detail: {
                        sessionId: this.currentSessionId,
                        response,
                    },
                } ) );
            } catch ( error ) {
                console.error( 'DiffTracker: Chat continuation failed:', error );
            }
        } else {
            // Fallback: dispatch DOM event for consumers that manage their own session
            document.dispatchEvent( new CustomEvent( 'datamachine-continue-chat', {
                detail: {
                    trigger: 'diff_resolved',
                    toolResult: {
                        action,
                        toolCallId: this.currentToolCallId,
                        postId: this.postId,
                        totalDiffBlocks: this.activeDiffBlocks.size,
                        timestamp: Date.now(),
                    },
                },
            } ) );
        }

        // Reset tracking for next tool
        this.reset();
    }

    /**
     * Reset tracking state
     */
    reset() {
        console.log( 'DiffTracker: Resetting tracking state' );
        this.activeDiffBlocks.clear();
        this.currentToolCallId = null;
        this.currentSessionId = null;
        this.isTrackingBulkOperation = false;
        this.postId = null;
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!DiffTracker.instance) {
            DiffTracker.instance = new DiffTracker();
        }
        return DiffTracker.instance;
    }
}

// Export singleton instance
export const diffTracker = DiffTracker.getInstance();