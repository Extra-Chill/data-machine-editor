/**
 * Shared types for the Data Machine Editor plugin.
 */

import type { CanonicalDiffData, CanonicalDiffType } from '@extrachill/chat';

/** Diff mode: how the change is applied to the content. */
export type DiffType = CanonicalDiffType | 'write' | 'delete';

/** Review status of a diff block. */
export type DiffStatus = 'pending' | 'accepted' | 'rejected';

/** Target of the edit within the post. */
export type EditType = 'content' | 'title' | 'excerpt';

/** Decision the user makes on a pending action. */
export type ActionDecision = 'accepted' | 'rejected';

/** Attributes stored on the datamachine/diff block. */
export interface DiffBlockAttributes {
	[ key: string ]: unknown;
	actionId: string;
	diffType: DiffType;
	originalContent: string;
	replacementContent: string;
	summary?: string;
	status: DiffStatus;
	toolCallId: string;
	editType: EditType;
	searchPattern: string;
	caseSensitive: boolean;
	isPreview: boolean;
	originalBlockContent: string;
	originalBlockType: string;
	position: string;
	insertionPoint: string;
	previewBlockContent?: string;
}

/** A Gutenberg block as returned by the block-editor store. */
export interface GutenbergBlock {
	clientId: string;
	name: string;
	attributes: Record< string, unknown >;
	innerBlocks: GutenbergBlock[];
}

/** A diff block is a GutenbergBlock with typed attributes. */
export interface DiffBlock extends GutenbergBlock {
	name: 'datamachine/diff';
	attributes: DiffBlockAttributes;
}

/** Info tracked per diff block by ActionTracker. */
export interface ActionInfo {
	actionId: string;
	toolCallId: string;
	diffType: DiffType;
	originalBlockIndex?: number;
	timestamp: number;
}

/** Shape returned by the /editor/actions/resolve REST endpoint. */
export interface ResolveResponse {
	success: boolean;
	continue_chat: boolean;
	decision?: ActionDecision;
	action_id?: string;
	error?: string;
}

/** Payload sent to the /editor/actions/resolve endpoint. */
export interface ResolvePayload {
	tool_call_id: string;
	action_id: string;
	post_id: number;
}

/** Status snapshot from ActionTracker. */
export interface TrackerStatus {
	activeDiffBlocks: string[];
	totalDiffBlocks: number;
	currentToolCallId: string | null;
	currentSessionId: string | null;
	isBulkOperation: boolean;
	allResolved: boolean;
	postId: number | null;
}

/** Target block info from the backend for InlineDiffManager. */
export interface TargetBlockInfo {
	block_index: number;
	diff_wrapper_block: string;
	block_content_preview?: string;
	is_full_replacement?: boolean;
	diff_block_content?: string;
}

/** Diff context passed to InlineDiffManager. */
export interface DiffContextItem {
	action_id?: string;
	tool_call_id: string;
	diff: CanonicalDiffData;
	target_blocks?: TargetBlockInfo[];
}

export interface DiffContext {
	diffs: DiffContextItem[];
}
