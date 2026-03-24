/**
 * Edit component for the datamachine/diff block.
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	InnerBlocks,
} from '@wordpress/block-editor';
import {
	PanelBody,
	Button,
	TextControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { DiffRenderer } from './DiffRenderer';
import { DiffActions } from './DiffActions';
import type { DiffBlockAttributes, GutenbergBlock } from '../types';

interface EditProps {
	attributes: DiffBlockAttributes;
	setAttributes: ( attrs: Partial< DiffBlockAttributes > ) => void;
	clientId: string;
}

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
}: EditProps ): JSX.Element {
	const {
		diffId,
		diffType,
		status,
		caseSensitive,
		originalBlockContent,
	} = attributes;

	const [ isProcessing, setIsProcessing ] = useState( false );
	const [ innerBlocksInitialized, setInnerBlocksInitialized ] =
		useState( false );

	const currentPostId: number = useSelect(
		( select ) => select( 'core/editor' ).getCurrentPostId(),
		[]
	);

	const { replaceInnerBlocks } = useDispatch( 'core/block-editor' );
	const innerBlocks: GutenbergBlock[] = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks( clientId ),
		[ clientId ]
	);

	// Initialize inner blocks from originalBlockContent on first render.
	useEffect( () => {
		if ( innerBlocksInitialized || ! originalBlockContent ) {
			return;
		}
		try {
			const parsedBlocks: GutenbergBlock[] =
				wp.blocks.parse( originalBlockContent );

			if ( parsedBlocks.length > 0 ) {
				const blocks =
					status === 'pending'
						? DiffRenderer.applyDiffTagsToBlocks(
								parsedBlocks,
								attributes
						  )
						: parsedBlocks;

				replaceInnerBlocks( clientId, blocks, false );
				setInnerBlocksInitialized( true );
			}
		} catch ( error ) {
			console.error(
				'Error parsing original block content:',
				error
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		originalBlockContent,
		innerBlocks.length,
		innerBlocksInitialized,
		clientId,
	] );

	const blockProps = useBlockProps( {
		className: `datamachine-diff-block datamachine-diff-${ diffType } datamachine-diff-${ status }`,
	} );

	const { handleAccept, handleReject } = DiffActions.createActionHandlers(
		attributes,
		clientId,
		currentPostId,
		setIsProcessing,
		setAttributes
	);

	const renderActionButtons = () => {
		if ( status !== 'pending' ) {
			return (
				<div className="datamachine-diff-status">
					{ status === 'accepted' ? '✓ Accepted' : '✗ Rejected' }
				</div>
			);
		}

		return (
			<div className="datamachine-diff-actions">
				<Button
					variant="primary"
					onClick={ handleAccept }
					disabled={ isProcessing }
					className="datamachine-accept-btn"
				>
					{ isProcessing ? 'Accepting...' : 'Accept' }
				</Button>
				<Button
					variant="secondary"
					onClick={ handleReject }
					disabled={ isProcessing }
					className="datamachine-reject-btn"
				>
					{ isProcessing ? 'Rejecting...' : 'Reject' }
				</Button>
			</div>
		);
	};

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Diff Settings', 'data-machine-editor' ) }
				>
					<TextControl
						label={ __( 'Diff ID', 'data-machine-editor' ) }
						value={ diffId }
						onChange={ ( value: string ) =>
							setAttributes( { diffId: value } )
						}
						readOnly
					/>
					<SelectControl
						label={ __(
							'Diff Type',
							'data-machine-editor'
						) }
						value={ diffType }
						options={ [
							{ label: 'Edit', value: 'edit' },
							{ label: 'Insert', value: 'insert' },
							{ label: 'Delete', value: 'delete' },
						] }
						onChange={ ( value: string ) =>
							setAttributes( { diffType: value as DiffBlockAttributes[ 'diffType' ] } )
						}
					/>
					<SelectControl
						label={ __( 'Status', 'data-machine-editor' ) }
						value={ status }
						options={ [
							{ label: 'Pending', value: 'pending' },
							{ label: 'Accepted', value: 'accepted' },
							{ label: 'Rejected', value: 'rejected' },
						] }
						onChange={ ( value: string ) =>
							setAttributes( { status: value as DiffBlockAttributes[ 'status' ] } )
						}
					/>
					<ToggleControl
						label={ __(
							'Case Sensitive',
							'data-machine-editor'
						) }
						checked={ caseSensitive }
						onChange={ ( value: boolean ) =>
							setAttributes( { caseSensitive: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="datamachine-diff-header">
					<span className="datamachine-diff-type-label">
						{ diffType === 'write'
							? 'Full Post Replacement'
							: diffType === 'edit'
							? 'Text Edit'
							: diffType === 'insert'
							? 'Text Insertion'
							: 'Text Change' }
					</span>
					{ renderActionButtons() }
				</div>

				<div className="datamachine-diff-content">
					<InnerBlocks
						templateLock={
							status === 'pending' ? 'all' : false
						}
					/>
				</div>
			</div>
		</>
	);
}
