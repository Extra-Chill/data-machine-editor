/**
 * FindDiffBlocks - Centralized utility for locating diff blocks in the editor
 * 
 * Provides consistent interface for finding and working with diff blocks
 * across all components in the revolutionary diff system.
 */
export class FindDiffBlocks {
    /**
     * Get all diff blocks currently in the editor
     * @returns {Array} Array of diff block objects
     */
    static findAllDiffBlocks() {
        const { getBlocks } = wp.data.select('core/block-editor');
        const blocks = getBlocks();
        return blocks.filter(block => block.name === 'datamachine/diff');
    }
    
    /**
     * Find diff blocks by specific diff ID
     * @param {string} diffId - The diff ID to search for
     * @returns {Array} Array of diff blocks with matching diffId
     */
    static findDiffBlocksByDiffId(diffId) {
        const diffBlocks = this.findAllDiffBlocks();
        return diffBlocks.filter(block => 
            block.attributes?.diffId === diffId
        );
    }
    
    /**
     * Find diff blocks by tool call ID
     * @param {string} toolCallId - The tool call ID to search for
     * @returns {Array} Array of diff blocks with matching toolCallId
     */
    static findDiffBlocksByToolCallId(toolCallId) {
        const diffBlocks = this.findAllDiffBlocks();
        return diffBlocks.filter(block => 
            block.attributes?.toolCallId === toolCallId
        );
    }
    
    /**
     * Check if any diff blocks exist in the editor
     * @returns {boolean} True if diff blocks exist, false otherwise
     */
    static hasDiffBlocks() {
        return this.findAllDiffBlocks().length > 0;
    }
    
    /**
     * Get count of diff blocks in the editor
     * @returns {number} Number of diff blocks
     */
    static getDiffBlockCount() {
        return this.findAllDiffBlocks().length;
    }
    
    /**
     * Find a specific diff block by its client ID
     * @param {string} clientId - The block's client ID
     * @returns {Object|null} The diff block or null if not found
     */
    static findDiffBlockByClientId(clientId) {
        const diffBlocks = this.findAllDiffBlocks();
        return diffBlocks.find(block => block.clientId === clientId) || null;
    }
    
    /**
     * Get all diff blocks with specific status
     * @param {string} status - The status to filter by (pending, accepted, rejected)
     * @returns {Array} Array of diff blocks with matching status
     */
    static findDiffBlocksByStatus(status) {
        const diffBlocks = this.findAllDiffBlocks();
        return diffBlocks.filter(block => 
            block.attributes?.status === status
        );
    }
    
    /**
     * Get all pending diff blocks
     * @returns {Array} Array of pending diff blocks
     */
    static findPendingDiffBlocks() {
        return this.findDiffBlocksByStatus('pending');
    }
    
    /**
     * Find the original block content for a diff block
     * @param {Object} diffBlock - The diff block
     * @returns {string} The original block content
     */
    static getOriginalBlockContent(diffBlock) {
        return diffBlock.attributes?.originalBlockContent || '';
    }
    
    /**
     * Find the original block type for a diff block
     * @param {Object} diffBlock - The diff block
     * @returns {string} The original block type
     */
    static getOriginalBlockType(diffBlock) {
        return diffBlock.attributes?.originalBlockType || 'core/paragraph';
    }
    
    /**
     * Check if a block is a diff block
     * @param {Object} block - The block to check
     * @returns {boolean} True if it's a diff block
     */
    static isDiffBlock(block) {
        return block?.name === 'datamachine/diff';
    }
}