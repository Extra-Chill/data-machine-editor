/**
 * AutoEditorProvider — auto-detects the editor environment.
 *
 * If core/editor store exists (wp-admin), reads from it.
 * Otherwise, uses defaults (headless/frontend IBE mode where a parent
 * EditorProvider should be wrapping the editor tree).
 *
 * This is used by the diff block's Edit component, which may be rendered
 * in any Gutenberg context. If a parent EditorProvider exists, this
 * wrapper is a no-op (context is already provided).
 */

import { useContext } from '@wordpress/element';
import { EditorContext, EditorProvider } from './EditorContext';
import { WpAdminEditorProvider } from './WpAdminEditorProvider';
import type { ReactNode } from 'react';

/**
 * Check if core/editor store is available (wp-admin context).
 */
function hasCoreEditorStore(): boolean {
	try {
		const store = wp?.data?.select?.( 'core/editor' );
		return store != null && typeof ( store as Record< string, unknown > ).getCurrentPostId === 'function';
	} catch {
		return false;
	}
}

export function AutoEditorProvider( { children }: { children: ReactNode } ) {
	const existing = useContext( EditorContext );

	// If a parent already provides a non-default postId, skip — context is set.
	if ( existing.postId > 0 ) {
		return <>{ children }</>;
	}

	// Try wp-admin store.
	if ( hasCoreEditorStore() ) {
		return <WpAdminEditorProvider>{ children }</WpAdminEditorProvider>;
	}

	// Headless fallback — postId=0, no-op save locks.
	return <EditorProvider>{ children }</EditorProvider>;
}
