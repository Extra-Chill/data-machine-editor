/**
 * InlineDiffManager — applies backend-produced diff blocks to the Gutenberg editor.
 *
 * Wraps target blocks with datamachine/diff wrappers that carry inline
 * `<ins>` / `<del>` tags. Diff blocks handle their own accept/reject;
 * this component only manages the initial preview setup.
 */

import { useEffect, useState, useRef } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { useEditorContext } from '../context/EditorContext';
import { diffTracker } from './DiffTracker';
import type { DiffContext, DiffContextItem, GutenbergBlock } from '../types';

function buildDiffWrapperBlock( diff: DiffContextItem, blocks: GutenbergBlock[] ): GutenbergBlock | null {
	const item = diff.diff.items?.[ 0 ];
	const blockIndex = typeof item?.blockIndex === 'number' ? item.blockIndex : 0;
	const targetBlock = blocks[ blockIndex ];

	if ( ! targetBlock && diff.diff.diffType !== 'insert' ) {
		return null;
	}

	const originalBlocks = targetBlock ? [ targetBlock ] : [];
	const originalBlockContent = originalBlocks.length > 0 ? wp.blocks.serialize( originalBlocks ) : '';

	return wp.blocks.createBlock( 'datamachine/diff', {
		diffId: diff.diff.diffId,
		diffType: diff.diff.diffType,
		originalContent: diff.diff.originalContent,
		replacementContent: diff.diff.replacementContent,
		summary: diff.diff.summary ?? '',
		status: diff.diff.status ?? 'pending',
		toolCallId: diff.tool_call_id,
		editType: ( diff.diff.editor?.editType as string ) ?? 'content',
		searchPattern: ( diff.diff.editor?.searchPattern as string ) ?? '',
		caseSensitive: Boolean( diff.diff.editor?.caseSensitive ),
		isPreview: true,
		originalBlockContent,
		originalBlockType: targetBlock?.name ?? 'core/paragraph',
		position: diff.diff.position ?? '',
		insertionPoint: diff.diff.insertionPoint ?? '',
		previewBlockContent: ( diff.diff.editor?.previewBlockContent as string ) ?? '',
	} ) as GutenbergBlock;
}

interface InlineDiffManagerProps {
	diffContext: DiffContext;
	onAccept: ( diff: DiffContextItem ) => void;
	onReject: ( diff: DiffContextItem ) => void;
}

export const InlineDiffManager = ( {
	diffContext,
	onAccept,
	onReject,
}: InlineDiffManagerProps ): JSX.Element | null => {
	const { diffs } = diffContext;

	const [ originalBlocks, setOriginalBlocks ] =
		useState< GutenbergBlock[] | null >( null );
	const [ isPreviewing, setIsPreviewing ] = useState( false );
	const processedDiffsRef = useRef< Set< string > >( new Set() );

	const blocks: GutenbergBlock[] = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks(),
		[]
	);

	const { lockPostSaving, unlockPostSaving } = useEditorContext();
	const { replaceBlock, resetBlocks } =
		useDispatch( 'core/block-editor' );

	useEffect( () => {
		if ( diffs.length === 0 || isPreviewing ) {
			return;
		}

		const currentDiff = diffs[ 0 ];
		const diffId =
			currentDiff.diff_id ?? currentDiff.tool_call_id;

		if ( processedDiffsRef.current.has( diffId ) ) {
			return;
		}

		try {
			setOriginalBlocks( [ ...blocks ] );
			lockPostSaving( 'datamachine-diff-preview' );
			setIsPreviewing( true );
			processedDiffsRef.current.add( diffId );

			if (
				currentDiff.target_blocks &&
				currentDiff.target_blocks.length > 0
			) {
				// Full replacement (write_to_post).
				if ( currentDiff.target_blocks[ 0 ].is_full_replacement ) {
					const parsed = wp.blocks.parse(
						currentDiff.target_blocks[ 0 ].diff_block_content ?? ''
					) as GutenbergBlock[];

					if ( parsed.length > 0 ) {
						resetBlocks( parsed );
					} else {
						setIsPreviewing( false );
						processedDiffsRef.current.delete( diffId );
					}
					return;
				}

				// Granular target blocks.
				const nonEmptyBlocks = blocks.filter(
					( b ) => b.name !== null
				);

				for ( const targetInfo of currentDiff.target_blocks ) {
					const { block_index, diff_wrapper_block } = targetInfo;

					const parsedDiffBlock = (
						wp.blocks.parse( diff_wrapper_block ) as GutenbergBlock[]
					)[ 0 ];

					if ( ! parsedDiffBlock ) {
						continue;
					}

					if (
						block_index < 0 ||
						block_index >= nonEmptyBlocks.length
					) {
						continue;
					}

					const targetBlock = nonEmptyBlocks[ block_index ];
					if ( ! targetBlock ) {
						continue;
					}

					replaceBlock( targetBlock.clientId, parsedDiffBlock );

					if (
						parsedDiffBlock.clientId &&
						parsedDiffBlock.attributes
					) {
						diffTracker.addDiffBlock(
							parsedDiffBlock.clientId,
							{
								diffId: parsedDiffBlock.attributes.diffId as string,
								toolCallId: parsedDiffBlock.attributes.toolCallId as string,
								diffType: parsedDiffBlock.attributes.diffType as 'edit' | 'write' | 'insert' | 'delete',
								originalBlockIndex: block_index,
							}
						);
					}
				}
			} else if ( currentDiff.diff ) {
				const nonEmptyBlocks = blocks.filter( ( b ) => b.name !== null );
				const item = currentDiff.diff.items?.[ 0 ];
				const blockIndex = typeof item?.blockIndex === 'number' ? item.blockIndex : 0;
				const diffBlock = buildDiffWrapperBlock( currentDiff, nonEmptyBlocks );

				if ( ! diffBlock ) {
					setIsPreviewing( false );
					processedDiffsRef.current.delete( diffId );
					return;
				}

				if ( currentDiff.diff.diffType === 'insert' ) {
					const insertionIndex = typeof item?.blockIndex === 'number'
						? item.blockIndex
						: currentDiff.diff.position === 'beginning'
							? 0
							: nonEmptyBlocks.length;
					const newBlocks = [ ...nonEmptyBlocks ];
					newBlocks.splice( insertionIndex, 0, diffBlock );
					resetBlocks( newBlocks );
				} else {
					const targetBlock = nonEmptyBlocks[ blockIndex ];
					if ( ! targetBlock ) {
						setIsPreviewing( false );
						processedDiffsRef.current.delete( diffId );
						return;
					}

					replaceBlock( targetBlock.clientId, diffBlock );
				}

				diffTracker.addDiffBlock( diffBlock.clientId, {
					diffId: diffBlock.attributes.diffId as string,
					toolCallId: diffBlock.attributes.toolCallId as string,
					diffType: diffBlock.attributes.diffType as 'edit' | 'write' | 'insert' | 'delete',
					originalBlockIndex: blockIndex,
				} );
			} else {
				setIsPreviewing( false );
				processedDiffsRef.current.delete( diffId );
			}
		} catch ( error ) {
			console.error(
				'InlineDiffManager: Error processing diff:',
				error
			);
			setIsPreviewing( false );
			processedDiffsRef.current.delete( diffId );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ diffs.length, isPreviewing ] );

	const cleanup = ( handler: ( diff: DiffContextItem ) => void ) => {
		const currentDiff = diffs[ 0 ];
		unlockPostSaving( 'datamachine-diff-preview' );
		setOriginalBlocks( null );
		setIsPreviewing( false );
		processedDiffsRef.current.delete( currentDiff.tool_call_id );
		handler( currentDiff );
	};

	if ( ! isPreviewing ) {
		return null;
	}

	return (
		<div
			style={ {
				display: 'flex',
				gap: '8px',
				alignItems: 'center',
				color: '#1e1e1e',
				backgroundColor: '#fff',
				padding: '4px 8px',
				borderRadius: '4px',
				border: '1px solid #ddd',
			} }
		>
			<strong>Data Machine Change Preview:</strong>
			<Button variant="primary" onClick={ () => cleanup( onAccept ) }>
				Accept Changes
			</Button>
			<Button variant="secondary" onClick={ () => cleanup( onReject ) }>
				Reject
			</Button>
		</div>
	);
};
