/**
 * EditorContext — headless post context for data-machine-editor.
 *
 * Provides post ID, post title, and save-lock functions to all diff
 * components without depending on `core/editor` (the wp-admin post editor store).
 *
 * In wp-admin: use <WpAdminEditorProvider> which reads from core/editor.
 * In headless/frontend IBE: use <EditorProvider> with explicit values.
 *
 * This abstraction makes the diff block work in any Gutenberg context:
 * wp-admin, Studio IBE, mobile app, or any future embedding.
 */

import { createContext, useContext } from '@wordpress/element';
import type { ReactNode } from 'react';

export interface EditorContextValue {
	/** The post ID being edited. 0 if unknown. */
	postId: number;
	/** The post title. Empty string if unknown. */
	postTitle: string;
	/** Lock saving (prevent publish while diffs are pending). No-op in headless. */
	lockPostSaving: ( lockName: string ) => void;
	/** Unlock saving. No-op in headless. */
	unlockPostSaving: ( lockName: string ) => void;
}

const defaultContext: EditorContextValue = {
	postId: 0,
	postTitle: '',
	lockPostSaving: () => {},
	unlockPostSaving: () => {},
};

export const EditorContext = createContext< EditorContextValue >( defaultContext );

/**
 * Hook to consume the editor context.
 */
export function useEditorContext(): EditorContextValue {
	return useContext( EditorContext );
}

/**
 * Generic provider — pass explicit values.
 * Use this for headless / frontend IBE / mobile.
 */
export function EditorProvider( {
	postId,
	postTitle = '',
	lockPostSaving,
	unlockPostSaving,
	children,
}: Partial< EditorContextValue > & { children: ReactNode } ) {
	const value: EditorContextValue = {
		postId: postId ?? 0,
		postTitle,
		lockPostSaving: lockPostSaving ?? ( () => {} ),
		unlockPostSaving: unlockPostSaving ?? ( () => {} ),
	};

	return (
		<EditorContext.Provider value={ value }>
			{ children }
		</EditorContext.Provider>
	);
}
