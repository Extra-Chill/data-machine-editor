/**
 * ContentUpdater — surgical content updates in diff blocks.
 *
 * Maintains block structure while only modifying the content that changed.
 */

import type { GutenbergBlock } from '../types';

export class ContentUpdater {
	/**
	 * Remove the diff wrapper and convert back to original block type.
	 * Called after accept/reject to clean up the diff block.
	 */
	static removeDiffWrapper(
		diffBlockClientId: string,
		accepted: boolean
	): GutenbergBlock[] | undefined {
		const { replaceBlocks, removeBlocks } =
			wp.data.dispatch( 'core/block-editor' );
		const { getBlocks, getBlock } =
			wp.data.select( 'core/block-editor' );

		const diffBlock = getBlock( diffBlockClientId );
		if ( ! diffBlock ) {
			throw new Error( 'Diff block not found' );
		}

		const innerBlocks: GutenbergBlock[] = getBlocks( diffBlockClientId );

		if ( ! innerBlocks || innerBlocks.length === 0 ) {
			removeBlocks( [ diffBlockClientId ] );
			return undefined;
		}

		const cleanedBlocks = innerBlocks.map( ( block ) =>
			ContentUpdater.removeDiffTags( block, accepted )
		);

		replaceBlocks( diffBlockClientId, cleanedBlocks );
		return cleanedBlocks;
	}

	/**
	 * Remove diff tags from a block based on accept/reject.
	 *
	 * Accept → remove `<del>` tags, keep `<ins>` content.
	 * Reject → remove `<ins>` tags, keep `<del>` content.
	 */
	static removeDiffTags(
		block: GutenbergBlock,
		accepted: boolean
	): GutenbergBlock {
		const cleaned: GutenbergBlock = { ...block };

		if ( cleaned.attributes?.content ) {
			let content = cleaned.attributes.content as string;

			if ( accepted ) {
				content = content.replace( /<del[^>]*>.*?<\/del>/gi, '' );
				content = content.replace(
					/<ins[^>]*>(.*?)<\/ins>/gi,
					'$1'
				);
			} else {
				content = content.replace( /<ins[^>]*>.*?<\/ins>/gi, '' );
				content = content.replace(
					/<del[^>]*>(.*?)<\/del>/gi,
					'$1'
				);
			}

			cleaned.attributes = { ...cleaned.attributes, content };
		}

		if ( cleaned.innerBlocks?.length ) {
			cleaned.innerBlocks = cleaned.innerBlocks.map( ( inner ) =>
				ContentUpdater.removeDiffTags( inner, accepted )
			);
		}

		return cleaned;
	}

	/**
	 * Smart text replacement that only replaces visible text, not HTML attributes.
	 */
	static smartTextReplace(
		content: string,
		searchText: string,
		replacement: string,
		caseSensitive = false
	): string {
		if ( ! content.includes( '<' ) ) {
			if ( caseSensitive ) {
				return content.split( searchText ).join( replacement );
			}
			const escaped = searchText.replace(
				/[.*+?^${}()|[\]\\]/g,
				'\\$&'
			);
			return content.replace( new RegExp( escaped, 'gi' ), replacement );
		}

		const parts = content.split( /(<[^>]+>)/ );
		let result = '';

		for ( const part of parts ) {
			if ( part.startsWith( '<' ) && part.endsWith( '>' ) ) {
				result += part;
			} else if ( caseSensitive ) {
				result += part.split( searchText ).join( replacement );
			} else {
				const escaped = searchText.replace(
					/[.*+?^${}()|[\]\\]/g,
					'\\$&'
				);
				result += part.replace(
					new RegExp( escaped, 'gi' ),
					replacement
				);
			}
		}

		return result;
	}

	/** Check if a diff can be applied to the given content. */
	static canApplyDiff(
		content: string,
		searchPattern: string,
		originalContent: string
	): boolean {
		const searchText = searchPattern || originalContent;
		return !! content && !! searchText && content.includes( searchText );
	}
}
