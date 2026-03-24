/**
 * ContentUpdater Module
 * 
 * Centralized handler for surgical content updates in diff blocks.
 * Maintains block structure while only updating the content that changed.
 */

export class ContentUpdater {

    /**
     * Remove diff wrapper and convert back to original block type
     * This happens after accept/reject to clean up the diff block
     */
    static removeDiffWrapper(diffBlockClientId, accepted = false) {
        const { replaceBlocks } = wp.data.dispatch('core/block-editor');
        const { getBlocks } = wp.data.select('core/block-editor');
        
        // Get the diff block and its inner blocks
        const diffBlock = wp.data.select('core/block-editor').getBlock(diffBlockClientId);
        if (!diffBlock) {
            throw new Error('Diff block not found');
        }

        // Get the inner blocks (these contain the actual content with diff tags)
        const innerBlocks = getBlocks(diffBlockClientId);
        
        if (!innerBlocks || innerBlocks.length === 0) {
            // Fallback: just remove the diff block
            const { removeBlocks } = wp.data.dispatch('core/block-editor');
            removeBlocks([diffBlockClientId]);
            return;
        }

        // Process each inner block to remove diff tags
        const cleanedBlocks = innerBlocks.map(block => {
            return ContentUpdater.removeDiffTags(block, accepted);
        });

        // Replace the diff block with the cleaned inner blocks
        replaceBlocks(diffBlockClientId, cleanedBlocks);
        
        return cleanedBlocks;
    }

    /**
     * Remove diff tags from a block based on accept/reject
     * Accept: Remove <del> tags, keep <ins> content
     * Reject: Remove <ins> tags, keep <del> content  
     */
    static removeDiffTags(block, accepted) {
        // Clone the block to avoid mutations
        const cleanedBlock = { ...block };
        
        // If block has content attribute, clean the diff tags
        if (cleanedBlock.attributes && cleanedBlock.attributes.content) {
            let content = cleanedBlock.attributes.content;
            
            if (accepted) {
                // Accept: Remove <del> tags and their content, keep <ins> content
                content = content.replace(/<del[^>]*>.*?<\/del>/gi, '');
                content = content.replace(/<ins[^>]*>(.*?)<\/ins>/gi, '$1');
            } else {
                // Reject: Remove <ins> tags and their content, keep <del> content  
                content = content.replace(/<ins[^>]*>.*?<\/ins>/gi, '');
                content = content.replace(/<del[^>]*>(.*?)<\/del>/gi, '$1');
            }
            
            cleanedBlock.attributes = {
                ...cleanedBlock.attributes,
                content: content
            };
        }
        
        // Recursively clean inner blocks if they exist
        if (cleanedBlock.innerBlocks && cleanedBlock.innerBlocks.length > 0) {
            cleanedBlock.innerBlocks = cleanedBlock.innerBlocks.map(innerBlock => 
                ContentUpdater.removeDiffTags(innerBlock, accepted)
            );
        }
        
        return cleanedBlock;
    }

    /**
     * Smart text replacement that only replaces visible text content, not HTML attributes
     * JavaScript version of the PHP function
     */
    static smartTextReplace(content, searchText, replacement, caseSensitive = false) {
        // If content doesn't contain HTML tags, do simple replacement
        if (!content.includes('<')) {
            return caseSensitive ? 
                content.split(searchText).join(replacement) : 
                content.replace(new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
        }
        
        // For HTML content, we need to be more careful
        // Split content into HTML tags and text nodes
        const parts = content.split(/(<[^>]+>)/);
        
        let result = '';
        
        for (const part of parts) {
            if (part.startsWith('<') && part.endsWith('>')) {
                // This is an HTML tag - don't modify it
                result += part;
            } else {
                // This is text content - safe to modify
                if (caseSensitive) {
                    result += part.split(searchText).join(replacement);
                } else {
                    result += part.replace(new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
                }
            }
        }
        
        return result;
    }

    /**
     * Check if content can be updated
     */
    static canApplyDiff(content, searchPattern, originalContent) {
        const searchText = searchPattern || originalContent;
        return content && searchText && content.includes(searchText);
    }
}