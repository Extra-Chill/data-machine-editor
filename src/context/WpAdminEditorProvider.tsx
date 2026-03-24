/**
 * WpAdminEditorProvider — EditorContext backed by core/editor store.
 *
 * Use this inside wp-admin Gutenberg where the core/editor store exists.
 * Reads postId, postTitle, and provides lockPostSaving/unlockPostSaving
 * from the wp-admin post editor.
 */

import { useSelect, useDispatch } from '@wordpress/data';
import { EditorContext } from './EditorContext';
import type { EditorContextValue } from './EditorContext';
import type { ReactNode } from 'react';

export function WpAdminEditorProvider( { children }: { children: ReactNode } ) {
	const postId: number = useSelect(
		( select ) => {
			const editor = select( 'core/editor' ) as Record< string, CallableFunction > | undefined;
			return editor?.getCurrentPostId?.() ?? 0;
		},
		[]
	);

	const postTitle: string = useSelect(
		( select ) => {
			const editor = select( 'core/editor' ) as Record< string, CallableFunction > | undefined;
			return editor?.getEditedPostAttribute?.( 'title' ) ?? '';
		},
		[]
	);

	const coreEditorDispatch = useDispatch( 'core/editor' ) as Record< string, CallableFunction > | undefined;

	const value: EditorContextValue = {
		postId,
		postTitle,
		lockPostSaving: ( lockName: string ) => {
			coreEditorDispatch?.lockPostSaving?.( lockName );
		},
		unlockPostSaving: ( lockName: string ) => {
			coreEditorDispatch?.unlockPostSaving?.( lockName );
		},
	};

	return (
		<EditorContext.Provider value={ value }>
			{ children }
		</EditorContext.Provider>
	);
}
