/**
 * DiffRenderer — rendering logic for diff blocks.
 *
 * Creates inline diff HTML with `<ins>` / `<del>` tags,
 * preserving unchanged content and applying diff styling.
 */

import type { DiffBlockAttributes, GutenbergBlock } from '../types';

export class DiffRenderer {
	/**
	 * Apply `<ins>` / `<del>` tags directly to inner block content.
	 */
	static applyDiffTagsToBlocks(
		innerBlocks: GutenbergBlock[],
		attributes: DiffBlockAttributes
	): GutenbergBlock[] {
		const { diffType, originalContent, replacementContent, searchPattern } =
			attributes;

		if ( diffType === 'edit' && originalContent && replacementContent ) {
			const searchText = searchPattern || originalContent;
			return DiffRenderer.applyEditTags(
				innerBlocks,
				searchText,
				originalContent,
				replacementContent
			);
		}

		if ( diffType === 'write' && originalContent && replacementContent ) {
			return DiffRenderer.applyWriteTags(
				innerBlocks,
				originalContent,
				replacementContent
			);
		}

		if ( diffType === 'insert' && replacementContent ) {
			return DiffRenderer.applyInsertTags(
				innerBlocks,
				replacementContent
			);
		}

		return innerBlocks;
	}

	/** Apply edit diff tags to specific text. */
	static applyEditTags(
		innerBlocks: GutenbergBlock[],
		searchText: string,
		originalContent: string,
		replacementContent: string
	): GutenbergBlock[] {
		return innerBlocks.map( ( block ) => {
			const content = block.attributes?.content as string | undefined;
			if ( content?.includes( searchText ) ) {
				const newContent = content.replace(
					searchText,
					`<del class="datamachine-diff-removed">${ originalContent }</del>` +
						`<ins class="datamachine-diff-added">${ replacementContent }</ins>`
				);
				return {
					...block,
					attributes: { ...block.attributes, content: newContent },
				};
			}
			return block;
		} );
	}

	/** Apply write diff tags for full content replacement. */
	static applyWriteTags(
		innerBlocks: GutenbergBlock[],
		_originalContent: string,
		replacementContent: string
	): GutenbergBlock[] {
		const newBlocks: GutenbergBlock[] = wp.blocks.parse( replacementContent );
		const maxBlocks = Math.max( innerBlocks.length, newBlocks.length );
		const diffBlocks: GutenbergBlock[] = [];

		for ( let i = 0; i < maxBlocks; i++ ) {
			const oldBlock = innerBlocks[ i ];
			const newBlock = newBlocks[ i ];

			if ( oldBlock && newBlock ) {
				const oldContent =
					( oldBlock.attributes?.content as string ) ?? '';
				const newContent =
					( newBlock.attributes?.content as string ) ?? '';

				if ( oldContent === newContent ) {
					diffBlocks.push( newBlock );
				} else {
					const diffContent = DiffRenderer.createWordLevelDiff(
						oldContent,
						newContent
					);
					diffBlocks.push( {
						...newBlock,
						attributes: {
							...newBlock.attributes,
							content: diffContent,
						},
					} );
				}
			} else if ( oldBlock ) {
				diffBlocks.push( {
					...oldBlock,
					attributes: {
						...oldBlock.attributes,
						content: `<del class="datamachine-diff-removed">${
							( oldBlock.attributes?.content as string ) ?? ''
						}</del>`,
					},
				} );
			} else if ( newBlock ) {
				diffBlocks.push( {
					...newBlock,
					attributes: {
						...newBlock.attributes,
						content: `<ins class="datamachine-diff-added">${
							( newBlock.attributes?.content as string ) ?? ''
						}</ins>`,
					},
				} );
			}
		}

		return diffBlocks;
	}

	/** Apply insert diff tags for new content. */
	static applyInsertTags(
		innerBlocks: GutenbergBlock[],
		replacementContent: string
	): GutenbergBlock[] {
		const newBlocks: GutenbergBlock[] = wp.blocks.parse( replacementContent );

		const withInsTags = newBlocks.map( ( block ) => {
			const content = block.attributes?.content as string | undefined;
			if ( content ) {
				return {
					...block,
					attributes: {
						...block.attributes,
						content: `<ins class="datamachine-diff-added">${ content }</ins>`,
					},
				};
			}
			return block;
		} );

		return [ ...innerBlocks, ...withInsTags ];
	}

	/** Create word-level diff between two pieces of content. */
	static createWordLevelDiff(
		oldContent: string,
		newContent: string
	): string {
		if ( oldContent === newContent ) {
			return newContent;
		}
		return (
			`<del class="datamachine-diff-removed">${ oldContent }</del>` +
			`<ins class="datamachine-diff-added">${ newContent }</ins>`
		);
	}

	/** Validate if a diff can be applied to content. */
	static canApplyDiff(
		content: string,
		searchPattern: string,
		originalContent: string
	): boolean {
		const searchText = searchPattern || originalContent;
		return !! content && !! searchText && content.includes( searchText );
	}
}
