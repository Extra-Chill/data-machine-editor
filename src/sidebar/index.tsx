/**
 * Editor sidebar entry point.
 *
 * Registers a PluginSidebar in the Gutenberg editor that provides
 * a chat panel powered by @extrachill/chat + Data Machine.
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar } from '@wordpress/editor';
import { EditorChatSidebar } from './EditorChatSidebar';
import '@extrachill/chat/css';
import './sidebar.css';

registerPlugin( 'datamachine-editor-chat', {
	render: () => (
		<PluginSidebar
			name="datamachine-editor-chat"
			title="Data Machine"
			icon="admin-comments"
		>
			<EditorChatSidebar />
		</PluginSidebar>
	),
} );
