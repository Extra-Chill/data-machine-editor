import apiFetch from '@wordpress/api-fetch';
import { ContentUpdater } from './ContentUpdater';
import { FindDiffBlocks } from './FindDiffBlocks';
import { diffTracker } from '../editor/DiffTracker';

/**
 * DiffActions Module
 *
 * Handles all diff-related actions including:
 * - Accept/reject logic
 * - Backend communication via DM REST API
 * - Coordinating content updates
 * - State management
 */

export class DiffActions {
    /**
     * Handle accepting a diff
     */
    static async handleAccept( attributes, clientId, currentPostId, suppressContinuation = false ) {
        const { toolCallId, diffId } = attributes;

        try {
            // Remove the diff wrapper and apply the accepted changes
            ContentUpdater.removeDiffWrapper( clientId, true );

            // Send acceptance signal to backend via REST API
            const responseData = await DiffActions.sendUserDecision( 'accepted', {
                tool_call_id: toolCallId,
                diff_id: diffId,
                post_id: currentPostId,
            } );

            // Check if backend indicates we should continue the chat
            if ( responseData.continue_chat && ! suppressContinuation ) {
                const remainingPendingBlocks = FindDiffBlocks.findDiffBlocksByDiffId( diffId )
                    .filter( block => block.attributes?.status === 'pending' );

                if ( remainingPendingBlocks.length === 0 ) {
                    diffTracker.markDiffBlockResolved( clientId, 'accepted' );
                }
            }

            return { success: true };
        } catch ( error ) {
            console.error( 'Error accepting diff:', error );
            throw error;
        }
    }

    /**
     * Handle rejecting a diff
     */
    static async handleReject( attributes, clientId, currentPostId, suppressContinuation = false ) {
        const { toolCallId, diffId } = attributes;

        try {
            // Remove the diff wrapper and restore original content
            ContentUpdater.removeDiffWrapper( clientId, false );

            // Send rejection signal to backend via REST API
            const responseData = await DiffActions.sendUserDecision( 'rejected', {
                tool_call_id: toolCallId,
                diff_id: diffId,
                post_id: currentPostId,
            } );

            // Check if backend indicates we should continue the chat
            if ( responseData.continue_chat && ! suppressContinuation ) {
                const remainingPendingBlocks = FindDiffBlocks.findDiffBlocksByDiffId( diffId )
                    .filter( block => block.attributes?.status === 'pending' );

                if ( remainingPendingBlocks.length === 0 ) {
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
    static async sendUserDecision( decision, data ) {
        return apiFetch( {
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
     * Calls the DM /chat/continue endpoint to resume the AI conversation.
     */
    static async triggerChatContinuation( sessionId ) {
        if ( ! sessionId ) {
            console.warn( 'DiffActions: No session ID for chat continuation' );
            return;
        }

        try {
            const response = await apiFetch( {
                path: '/datamachine/v1/chat/continue',
                method: 'POST',
                data: { session_id: sessionId },
            } );

            console.log( 'DiffActions: Chat continuation response:', response );
            return response;
        } catch ( error ) {
            console.error( 'DiffActions: Chat continuation failed:', error );
            throw error;
        }
    }

    /**
     * Create action handlers with proper context
     */
    static createActionHandlers( attributes, clientId, currentPostId, setIsProcessing, setAttributes ) {
        const handleAccept = async () => {
            setIsProcessing( true );
            try {
                setAttributes( { status: 'accepted' } );
                await DiffActions.handleAccept( attributes, clientId, currentPostId );
            } catch ( error ) {
                setAttributes( { status: 'pending' } );
                throw error;
            } finally {
                setIsProcessing( false );
            }
        };

        const handleReject = async () => {
            setIsProcessing( true );
            try {
                setAttributes( { status: 'rejected' } );
                await DiffActions.handleReject( attributes, clientId, currentPostId );
            } catch ( error ) {
                setAttributes( { status: 'pending' } );
                throw error;
            } finally {
                setIsProcessing( false );
            }
        };

        return { handleAccept, handleReject };
    }
}