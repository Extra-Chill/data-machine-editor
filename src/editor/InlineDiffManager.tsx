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
import { diffTracker } from './DiffTracker';
import type { DiffContext, DiffContextItem, GutenbergBlock } from '../types';

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

	const { lockPostSaving, unlockPostSaving } =
		useDispatch( 'core/editor' );
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
