/**
 * Shared types for the Data Machine Editor plugin.
 */

import type { CanonicalDiffData, CanonicalDiffType } from './diff/canonicalDiff';

/** Diff mode: how the change is applied to the content. */
export type DiffType = CanonicalDiffType | 'write' | 'delete';

/** Review status of a diff block. */
export type DiffStatus = 'pending' | 'accepted' | 'rejected';

/** Target of the edit within the post. */
export type EditType = 'content' | 'title' | 'excerpt';

/** Decision the user makes on a diff. */
export type DiffDecision = 'accepted' | 'rejected';

/** Attributes stored on the datamachine/diff block. */
export interface DiffBlockAttributes {
	diffId: string;
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

/** Info tracked per diff block by DiffTracker. */
export interface DiffInfo {
	diffId: string;
	toolCallId: string;
	diffType: DiffType;
	originalBlockIndex?: number;
	timestamp: number;
}

/** Shape returned by the resolve-diff REST endpoint. */
export interface ResolveResponse {
	success: boolean;
	continue_chat: boolean;
	decision?: DiffDecision;
	diff_id?: string;
	error?: string;
}

/** Payload sent to the resolve-diff endpoint. */
export interface ResolvePayload {
	tool_call_id: string;
	diff_id: string;
	post_id: number;
}

/** Status snapshot from DiffTracker. */
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
	diff_id?: string;
	tool_call_id: string;
	diff: CanonicalDiffData;
	target_blocks?: TargetBlockInfo[];
}

export interface DiffContext {
	diffs: DiffContextItem[];
}
