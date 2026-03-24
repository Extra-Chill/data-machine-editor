import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit from './edit';
import Save from './save';
import './style.css';

/**
 * Datamachine Diff Block
 * 
 * A custom block that wraps AI-suggested changes with metadata and UI controls.
 * Each diff gets its own block for granular control and persistence.
 */
console.log('Data Machine Editor: Registering diff block');

registerBlockType('datamachine/diff', {
    title: __('Data Machine Diff', 'data-machine-editor'),
    description: __('A block containing AI-suggested changes that can be accepted or rejected.', 'data-machine-editor'),
    category: 'common',
    icon: 'editor-code',
    supports: {
        html: false,
        align: false,
        anchor: true,
    },
    attributes: {
        diffId: {
            type: 'string',
            default: '',
        },
        diffType: {
            type: 'string',
            default: 'edit', // edit, insert, delete
        },
        originalContent: {
            type: 'string',
            default: '',
        },
        replacementContent: {
            type: 'string',
            default: '',
        },
        status: {
            type: 'string',
            default: 'pending', // pending, accepted, rejected
        },
        toolCallId: {
            type: 'string',
            default: '',
        },
        editType: {
            type: 'string',
            default: 'content', // content, title, excerpt
        },
        searchPattern: {
            type: 'string',
            default: '',
        },
        caseSensitive: {
            type: 'boolean',
            default: false,
        },
        isPreview: {
            type: 'boolean',
            default: true,
        },
        originalBlockContent: {
            type: 'string',
            default: '',
        },
        originalBlockType: {
            type: 'string',
            default: 'core/paragraph',
        },
        position: {
            type: 'string',
            default: '',
        },
        insertionPoint: {
            type: 'string',
            default: '',
        },
    },
    
    edit: Edit,
    save: Save,
}); 