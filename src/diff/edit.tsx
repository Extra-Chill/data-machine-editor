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
import { ActionRow, InlineStatus } from '@extrachill/components';
import { useEditorContext } from '../context/EditorContext';
import { AutoEditorProvider } from '../context/AutoEditorProvider';
import { DiffRenderer } from './DiffRenderer';
import { DiffActions } from './DiffActions';
import type { DiffBlockAttributes, GutenbergBlock } from '../types';

interface EditProps {
	attributes: DiffBlockAttributes;
	setAttributes: ( attrs: Partial< DiffBlockAttributes > ) => void;
	clientId: string;
}

function EditInner( {
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
		summary,
		previewBlockContent,
	} = attributes;

	const [ isProcessing, setIsProcessing ] = useState( false );
	const [ innerBlocksInitialized, setInnerBlocksInitialized ] =
		useState( false );

	const { postId: currentPostId } = useEditorContext();

	const { replaceInnerBlocks } = useDispatch( 'core/block-editor' );
	const innerBlocks: GutenbergBlock[] = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks( clientId ),
		[ clientId ]
	);

	// Initialize inner blocks from originalBlockContent on first render.
	useEffect( () => {
		const seedContent = diffType === 'insert' ? ( previewBlockContent || originalBlockContent ) : originalBlockContent;

		if ( innerBlocksInitialized || ! seedContent ) {
			return;
		}
		try {
			const parsedBlocks: GutenbergBlock[] =
				wp.blocks.parse( seedContent );

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
		diffType,
		previewBlockContent,
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
				<InlineStatus
					tone={ status === 'accepted' ? 'success' : 'error' }
					className="datamachine-diff-status"
				>
					{ status === 'accepted' ? '✓ Accepted' : '✗ Rejected' }
				</InlineStatus>
			);
		}

		return (
			<ActionRow className="datamachine-diff-actions">
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
			</ActionRow>
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
							: diffType === 'replace'
							? 'Content Replacement'
							: diffType === 'edit'
							? 'Text Edit'
							: diffType === 'insert'
							? 'Text Insertion'
							: 'Text Change' }
					</span>
					{ renderActionButtons() }
				</div>

				{ summary ? (
					<p className="datamachine-diff-summary">{ summary }</p>
				) : null }

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

/**
 * Edit component wrapped with AutoEditorProvider.
 *
 * In wp-admin: reads postId from core/editor.
 * In headless/frontend IBE: uses parent EditorProvider or defaults.
 */
export default function Edit( props: EditProps ): JSX.Element {
	return (
		<AutoEditorProvider>
			<EditInner { ...props } />
		</AutoEditorProvider>
	);
}
