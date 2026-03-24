/**
 * Public context API for data-machine-editor.
 *
 * Headless consumers import EditorProvider to wrap their editor tree
 * with post context. The diff block auto-detects context via AutoEditorProvider.
 */

export { EditorContext, EditorProvider, useEditorContext } from './EditorContext';
export type { EditorContextValue } from './EditorContext';
export { WpAdminEditorProvider } from './WpAdminEditorProvider';
export { AutoEditorProvider } from './AutoEditorProvider';
