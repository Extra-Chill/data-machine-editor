/**
 * FindDiffBlocks — centralized utility for locating diff blocks in the editor.
 */

import type { DiffBlock, DiffStatus, GutenbergBlock } from '../types';

const BLOCK_NAME = 'datamachine/diff';

export class FindDiffBlocks {
	/** Get all diff blocks currently in the editor. */
	static findAllDiffBlocks(): DiffBlock[] {
		const getBlocks = ( wp.data.select( 'core/block-editor' ) as {
			getBlocks: () => GutenbergBlock[];
		} ).getBlocks;
		const blocks = getBlocks();
		return blocks.filter( ( block ) => block.name === BLOCK_NAME ) as DiffBlock[];
	}

	/** Find diff blocks by pending-action ID. */
	static findDiffBlocksByActionId( actionId: string ): DiffBlock[] {
		return this.findAllDiffBlocks().filter(
			( block ) => block.attributes.actionId === actionId
		);
	}

	/** Find diff blocks by tool call ID. */
	static findDiffBlocksByToolCallId( toolCallId: string ): DiffBlock[] {
		return this.findAllDiffBlocks().filter(
			( block ) => block.attributes.toolCallId === toolCallId
		);
	}

	/** Check if any diff blocks exist. */
	static hasDiffBlocks(): boolean {
		return this.findAllDiffBlocks().length > 0;
	}

	/** Get count of diff blocks. */
	static getDiffBlockCount(): number {
		return this.findAllDiffBlocks().length;
	}

	/** Find a specific diff block by client ID. */
	static findDiffBlockByClientId( clientId: string ): DiffBlock | null {
		return (
			this.findAllDiffBlocks().find(
				( block ) => block.clientId === clientId
			) ?? null
		);
	}

	/** Get all diff blocks with a specific status. */
	static findDiffBlocksByStatus( status: DiffStatus ): DiffBlock[] {
		return this.findAllDiffBlocks().filter(
			( block ) => block.attributes.status === status
		);
	}

	/** Get all pending diff blocks. */
	static findPendingDiffBlocks(): DiffBlock[] {
		return this.findDiffBlocksByStatus( 'pending' );
	}

	/** Get the original block content for a diff block. */
	static getOriginalBlockContent( diffBlock: DiffBlock ): string {
		return diffBlock.attributes.originalBlockContent ?? '';
	}

	/** Get the original block type for a diff block. */
	static getOriginalBlockType( diffBlock: DiffBlock ): string {
		return diffBlock.attributes.originalBlockType ?? 'core/paragraph';
	}

	/** Check if a block is a diff block. */
	static isDiffBlock( block: GutenbergBlock ): block is DiffBlock {
		return block?.name === BLOCK_NAME;
	}
}
