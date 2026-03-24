/**
 * DiffRenderer Module
 * 
 * Handles rendering logic for diff blocks, including:
 * - Creating inline diff HTML
 * - Preserving unchanged content
 * - Applying diff styling
 */

export class DiffRenderer {

    /**
     * Apply ins/del tags directly to inner block content
     * This modifies the actual block content with diff tags
     */
    static applyDiffTagsToBlocks(innerBlocks, attributes) {
        const {
            diffType,
            originalContent,
            replacementContent,
            searchPattern,
        } = attributes;

        // For 'edit' type - find and replace specific text with ins/del tags
        if (diffType === 'edit' && originalContent && replacementContent) {
            const searchText = searchPattern || originalContent;
            return DiffRenderer.applyEditTags(innerBlocks, searchText, originalContent, replacementContent);
        }

        // For 'write' type - wrap all content with ins/del for full replacement
        if (diffType === 'write' && originalContent && replacementContent) {
            return DiffRenderer.applyWriteTags(innerBlocks, originalContent, replacementContent);
        }

        // For 'insert' type - add ins tags for new content
        if (diffType === 'insert' && replacementContent) {
            return DiffRenderer.applyInsertTags(innerBlocks, replacementContent);
        }

        return innerBlocks;
    }

    /**
     * Apply edit diff tags to specific text
     */
    static applyEditTags(innerBlocks, searchText, originalContent, replacementContent) {
        // Find blocks containing the search text and apply ins/del tags
        // This will modify the block content directly
        return innerBlocks.map(block => {
            if (block.attributes && block.attributes.content && block.attributes.content.includes(searchText)) {
                const newContent = block.attributes.content.replace(
                    searchText,
                    `<del class="datamachine-diff-removed">${originalContent}</del><ins class="datamachine-diff-added">${replacementContent}</ins>`
                );
                return {
                    ...block,
                    attributes: {
                        ...block.attributes,
                        content: newContent
                    }
                };
            }
            return block;
        });
    }

    /**
     * Apply write diff tags for full content replacement
     * Creates block-level word-by-word diff
     */
    static applyWriteTags(innerBlocks, _originalContent, replacementContent) {
        // Parse the replacement content into blocks
        const newBlocks = wp.blocks.parse(replacementContent);
        
        // Create smart block-level diff
        const maxBlocks = Math.max(innerBlocks.length, newBlocks.length);
        const diffBlocks = [];
        
        for (let i = 0; i < maxBlocks; i++) {
            const oldBlock = innerBlocks[i];
            const newBlock = newBlocks[i];
            
            if (oldBlock && newBlock) {
                // Both blocks exist - create word-level diff within the block
                const oldContent = oldBlock.attributes?.content || '';
                const newContent = newBlock.attributes?.content || '';
                
                if (oldContent === newContent) {
                    // No change - keep as is
                    diffBlocks.push(newBlock);
                } else {
                    // Create inline diff within the block
                    const diffContent = DiffRenderer.createWordLevelDiff(oldContent, newContent);
                    diffBlocks.push({
                        ...newBlock,
                        attributes: {
                            ...newBlock.attributes,
                            content: diffContent
                        }
                    });
                }
            } else if (oldBlock && !newBlock) {
                // Block was removed
                diffBlocks.push({
                    ...oldBlock,
                    attributes: {
                        ...oldBlock.attributes,
                        content: `<del class="datamachine-diff-removed">${oldBlock.attributes?.content || ''}</del>`
                    }
                });
            } else if (!oldBlock && newBlock) {
                // Block was added
                diffBlocks.push({
                    ...newBlock,
                    attributes: {
                        ...newBlock.attributes,
                        content: `<ins class="datamachine-diff-added">${newBlock.attributes?.content || ''}</ins>`
                    }
                });
            }
        }
        
        return diffBlocks;
    }

    /**
     * Apply insert diff tags
     */
    static applyInsertTags(innerBlocks, replacementContent) {
        // Parse the replacement content into blocks  
        const newBlocks = wp.blocks.parse(replacementContent);
        
        // Wrap new content in ins tags
        const newBlocksWithInsTags = newBlocks.map(block => {
            if (block.attributes && block.attributes.content) {
                const wrappedContent = `<ins class="datamachine-diff-added">${block.attributes.content}</ins>`;
                return {
                    ...block,
                    attributes: {
                        ...block.attributes,
                        content: wrappedContent
                    }
                };
            }
            return block;
        });
        
        // Add new blocks to the end of existing blocks
        return [...innerBlocks, ...newBlocksWithInsTags];
    }

    /**
     * Create word-level diff between two pieces of content
     */
    static createWordLevelDiff(oldContent, newContent) {
        // Simple word-by-word diff algorithm
        const oldWords = oldContent.split(/(\s+|<[^>]*>)/);
        const newWords = newContent.split(/(\s+|<[^>]*>)/);
        
        // For now, use a simple approach: if content is different, show old/new
        if (oldContent === newContent) {
            return newContent;
        }
        
        // If completely different, show full replacement
        return `<del class="datamachine-diff-removed">${oldContent}</del><ins class="datamachine-diff-added">${newContent}</ins>`;
    }

    /**
     * Validate if diff can be applied to content
     */
    static canApplyDiff(content, searchPattern, originalContent) {
        const searchText = searchPattern || originalContent;
        return content && searchText && content.includes(searchText);
    }
}