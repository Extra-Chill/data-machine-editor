/**
 * Editor sidebar entry point.
 *
 * Registers a PluginSidebar in the wp-admin Gutenberg editor that provides
 * a chat panel powered by @extrachill/chat + Data Machine.
 *
 * Wraps in WpAdminEditorProvider so the diff system reads post context
 * from core/editor store (wp-admin only).
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar } from '@wordpress/editor';
import { WpAdminEditorProvider } from '../context/WpAdminEditorProvider';
import { EditorChatSidebar } from './EditorChatSidebar';
import '@extrachill/chat/css';
import './sidebar.css';

registerPlugin( 'datamachine-editor-chat', {
	render: () => (
		<WpAdminEditorProvider>
			<PluginSidebar
				name="datamachine-editor-chat"
				title="Data Machine"
				icon="admin-comments"
			>
				<EditorChatSidebar />
			</PluginSidebar>
		</WpAdminEditorProvider>
	),
} );
