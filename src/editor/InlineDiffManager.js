import React, { useEffect, useState, useRef } from 'react';
import { useSelect, useDispatch } from '@wordpress/data';
import { PinnedItems } from '@wordpress/interface';
import { Button, Fill } from '@wordpress/components';
import { diffTracker } from './DiffTracker';

/**
 * InlineDiffManager Component V4: Modern Block Editor Only
 * 
 * Revolutionary WordPress diff system - modern block editor only.
 * Backend wraps target blocks with diff metadata, frontend renders diff blocks.
 * No classic editor fallback - transient wrapper blocks that disappear after action.
 */
export const InlineDiffManager = ({ diffContext, onAccept, onReject }) => {
    const { diffs } = diffContext;
    
    const [originalBlocks, setOriginalBlocks] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const processedDiffsRef = useRef(new Set());

    const { blocks, postContent } = useSelect(select => ({
        blocks: select('core/block-editor').getBlocks(),
        postContent: select('core/editor').getEditedPostAttribute('content'),
    }));

    const { lockPostSaving, unlockPostSaving } = useDispatch('core/editor');
    const { updateBlockAttributes, insertBlocks, replaceBlock, resetBlocks } = useDispatch('core/block-editor');


    useEffect(() => {
        if (diffs.length > 0 && !isPreviewing) {
            const currentDiff = diffs[0];
            const diffId = currentDiff.diff_id || currentDiff.tool_call_id;
            
            // Prevent processing the same diff multiple times
            if (processedDiffsRef.current.has(diffId)) {
                return;
            }
            
            console.log('InlineDiffManager: Processing new diff:', currentDiff);
            console.log('InlineDiffManager: Diff has target_blocks:', !!currentDiff.target_blocks);
            if (currentDiff.target_blocks) {
                console.log('InlineDiffManager: Number of target blocks:', currentDiff.target_blocks.length);
            }
            
            try {
                // Store original state and lock editor
                setOriginalBlocks([...blocks]);
                lockPostSaving('datamachine-diff-preview');
                setIsPreviewing(true);
                processedDiffsRef.current.add(diffId);

                // Check if we have target blocks info from the backend (new granular approach)
                if (currentDiff.target_blocks && currentDiff.target_blocks.length > 0) {
                    // Check if this is a full replacement (write_to_post)
                    if (currentDiff.target_blocks[0].is_full_replacement) {
                        console.log('InlineDiffManager: Processing full post replacement');
                        const diffBlocks = wp.blocks.parse(currentDiff.target_blocks[0].diff_block_content);
                        if (diffBlocks.length > 0) {
                            resetBlocks(diffBlocks);
                            console.log('InlineDiffManager: Successfully applied full replacement');
                        } else {
                            setIsPreviewing(false);
                            processedDiffsRef.current.delete(diffId);
                        }
                        return;
                    }
                    console.log('InlineDiffManager: Using granular target blocks approach');
                    
                    // Filter out empty blocks to match backend filtering
                    const nonEmptyBlocks = blocks.filter(block => block.name !== null);
                    
                    console.log('InlineDiffManager: Frontend blocks - total:', blocks.length, ', non-empty:', nonEmptyBlocks.length);
                    console.log('InlineDiffManager: Frontend non-empty blocks array:', nonEmptyBlocks.map((block, idx) => ({ 
                        index: idx, 
                        name: block.name, 
                        clientId: block.clientId 
                    })));
                    console.log('InlineDiffManager: Backend target blocks:', currentDiff.target_blocks.map(t => ({ 
                        block_index: t.block_index, 
                        preview: t.block_content_preview 
                    })));
                    
                    try {
                        // Process each target block individually
                        currentDiff.target_blocks.forEach((targetInfo, index) => {
                            const { block_index, diff_wrapper_block } = targetInfo;
                            
                            console.log(`InlineDiffManager: Processing target block ${block_index}, total non-empty blocks: ${nonEmptyBlocks.length}`);
                            
                            // Parse the diff wrapper block
                            const parsedDiffBlock = wp.blocks.parse(diff_wrapper_block)[0];
                            
                            if (!parsedDiffBlock) {
                                console.error(`InlineDiffManager: Failed to parse diff wrapper block for index ${block_index}`);
                                return;
                            }
                            
                            if (block_index >= nonEmptyBlocks.length || block_index < 0) {
                                console.warn(`InlineDiffManager: Skipping block index ${block_index} - out of bounds (total non-empty blocks: ${nonEmptyBlocks.length})`);
                                return;
                            }
                            
                            const targetBlock = nonEmptyBlocks[block_index];
                            if (!targetBlock) {
                                console.error(`InlineDiffManager: Target block at index ${block_index} is undefined`);
                                return;
                            }
                            
                            console.log(`InlineDiffManager: Replacing block ${block_index} (clientId: ${targetBlock.clientId}) with diff wrapper`);
                            replaceBlock(targetBlock.clientId, parsedDiffBlock);
                            
                            // Register the new diff block with DiffTracker
                            if (parsedDiffBlock.clientId && parsedDiffBlock.attributes) {
                                diffTracker.addDiffBlock(parsedDiffBlock.clientId, {
                                    diffId: parsedDiffBlock.attributes.diffId,
                                    toolCallId: parsedDiffBlock.attributes.toolCallId,
                                    diffType: parsedDiffBlock.attributes.diffType,
                                    originalBlockIndex: block_index
                                });
                            }
                        });
                        
                        console.log('InlineDiffManager: Successfully processed', currentDiff.target_blocks.length, 'target blocks granularly');
                    } catch (error) {
                        console.error('InlineDiffManager: Error processing target blocks:', error);
                        setIsPreviewing(false);
                        processedDiffsRef.current.delete(diffId);
                    }
                } else {
                    console.error('InlineDiffManager: No target_blocks provided');
                    setIsPreviewing(false);
                    processedDiffsRef.current.delete(diffId);
                }
                
            } catch (error) {
                console.error('InlineDiffManager: Error processing diff:', error);
                setIsPreviewing(false);
                processedDiffsRef.current.delete(diffId);
            }
        }
    }, [diffs.length, isPreviewing]); // Simplified dependencies to prevent infinite loops


    // These handlers are no longer needed - diff blocks handle their own accept/reject
    // The InlineDiffManager only needs to handle the initial diff preview setup
    const handleDiffBlockAccept = (diffId) => {
        console.log('InlineDiffManager: Diff block accepted', diffId);
        
        // Clean up and notify parent
        const currentDiff = diffs[0];
        unlockPostSaving('datamachine-diff-preview');
        setOriginalBlocks(null);
        setIsPreviewing(false);
        processedDiffsRef.current.delete(currentDiff.tool_call_id);
        onAccept(currentDiff);
    };

    const handleDiffBlockReject = (diffId) => {
        console.log('InlineDiffManager: Diff block rejected', diffId);
        
        // Clean up and notify parent
        const currentDiff = diffs[0];
        unlockPostSaving('datamachine-diff-preview');
        setOriginalBlocks(null);
        setIsPreviewing(false);
        processedDiffsRef.current.delete(currentDiff.tool_call_id);
        onReject(currentDiff);
    };

    const handleAccept = () => {
        const currentDiff = diffs[0];
        
        console.log('InlineDiffManager: Header accept clicked for diff block');
        
        unlockPostSaving('datamachine-diff-preview');
        setOriginalBlocks(null);
        setIsPreviewing(false);
        processedDiffsRef.current.delete(currentDiff.tool_call_id);
        onAccept(currentDiff);
    };

    const handleReject = () => {
        const currentDiff = diffs[0];
        
        console.log('InlineDiffManager: Header reject clicked for diff block');
        
        unlockPostSaving('datamachine-diff-preview');
        setOriginalBlocks(null);
        setIsPreviewing(false);
        processedDiffsRef.current.delete(currentDiff.tool_call_id);
        onReject(currentDiff);
    };


    return (
        <Fill name="PluginHeader">
            {isPreviewing && (
                <PinnedItems>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#1e1e1e', backgroundColor: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                        <strong>Data Machine Change Preview:</strong>
                        <Button isPrimary onClick={handleAccept}>Accept Changes</Button>
                        <Button isSecondary onClick={handleReject}>Reject</Button>
                    </div>
                </PinnedItems>
            )}
        </Fill>
    );
};
// Add CSS for .datamachine-diff-ins and .datamachine-diff-del in your stylesheet for green/red highlights 