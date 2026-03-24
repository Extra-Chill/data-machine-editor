/**
 * EditorChatSidebar — chat panel for the Gutenberg editor.
 *
 * Uses @extrachill/chat's useChat hook with editor context metadata
 * and onToolCalls to intercept block edits and pipe them to InlineDiffManager.
 */

import { useCallback, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import {
	useChat,
	ChatMessages,
	ChatInput,
	TypingIndicator,
	ErrorBoundary,
	SessionSwitcher,
} from '@extrachill/chat';
import type { ToolCall } from '@extrachill/chat';
import { InlineDiffManager } from '../editor/InlineDiffManager';
import type { DiffContext, DiffContextItem } from '../types';

/**
 * Extract diff-producing tool call results into a DiffContext
 * that InlineDiffManager can consume.
 */
function extractDiffContext( toolCalls: ToolCall[] ): DiffContextItem[] {
	const diffs: DiffContextItem[] = [];

	for ( const tc of toolCalls ) {
		// Content editing tools produce target_blocks in their parameters.
		if (
			tc.name === 'edit_post_blocks' ||
			tc.name === 'replace_post_blocks'
		) {
			const params = tc.parameters as Record< string, unknown >;
			const targetBlocks = params.target_blocks as
				| DiffContextItem[ 'target_blocks' ]
				| undefined;

			if ( targetBlocks?.length ) {
				diffs.push( {
					tool_call_id: tc.id,
					diff_id: ( params.diff_id as string ) ?? tc.id,
					target_blocks: targetBlocks,
				} );
			}
		}
	}

	return diffs;
}

export function EditorChatSidebar(): JSX.Element {
	const currentPostId: number = useSelect(
		( select ) => select( 'core/editor' ).getCurrentPostId(),
		[]
	);

	const postTitle: string = useSelect(
		( select ) =>
			select( 'core/editor' ).getEditedPostAttribute( 'title' ),
		[]
	);

	const [ diffContext, setDiffContext ] = useState< DiffContext >( {
		diffs: [],
	} );
	const [ showSessions, setShowSessions ] = useState( false );

	const handleToolCalls = useCallback(
		( toolCalls: ToolCall[] ) => {
			const diffs = extractDiffContext( toolCalls );
			if ( diffs.length > 0 ) {
				setDiffContext( ( prev ) => ( {
					diffs: [ ...prev.diffs, ...diffs ],
				} ) );
			}
		},
		[]
	);

	const chat = useChat( {
		basePath: '/datamachine/v1/chat',
		fetchFn: apiFetch as Parameters< typeof useChat >[ 0 ][ 'fetchFn' ],
		metadata: {
			post_id: currentPostId,
			context: 'editor',
		},
		sessionContext: 'editor',
		onToolCalls: handleToolCalls,
	} );

	const handleDiffAccept = useCallback( ( diff: DiffContextItem ) => {
		setDiffContext( ( prev ) => ( {
			diffs: prev.diffs.filter(
				( d ) => d.tool_call_id !== diff.tool_call_id
			),
		} ) );
	}, [] );

	const handleDiffReject = useCallback( ( diff: DiffContextItem ) => {
		setDiffContext( ( prev ) => ( {
			diffs: prev.diffs.filter(
				( d ) => d.tool_call_id !== diff.tool_call_id
			),
		} ) );
	}, [] );

	return (
		<ErrorBoundary>
			<div className="datamachine-editor-sidebar">
				{ showSessions ? (
					<div className="datamachine-editor-sidebar__sessions">
						<SessionSwitcher
							sessions={ chat.sessions }
							activeSessionId={ chat.sessionId ?? undefined }
							onSelect={ ( id ) => {
								chat.switchSession( id );
								setShowSessions( false );
							} }
							onNew={ () => {
								chat.newSession();
								setShowSessions( false );
							} }
							onDelete={ chat.deleteSession }
							loading={ chat.sessionsLoading }
						/>
					</div>
				) : (
					<>
						<div className="datamachine-editor-sidebar__header">
							<span className="datamachine-editor-sidebar__title">
								{ postTitle
									? `Editing: ${ postTitle }`
									: 'Editor Chat' }
							</span>
							<button
								className="datamachine-editor-sidebar__sessions-btn"
								onClick={ () =>
									setShowSessions( true )
								}
								title="View sessions"
								type="button"
							>
								Sessions
							</button>
						</div>

						<div className="datamachine-editor-sidebar__messages">
							<ChatMessages
								messages={ chat.messages }
								showTools={ true }
								emptyState={
									<div className="datamachine-editor-sidebar__empty">
										Ask me to edit, proofread, or
										rewrite this post.
									</div>
								}
							/>
							<TypingIndicator
								visible={ chat.isLoading }
								turnCount={ chat.turnCount }
								label={ ( turn ) =>
									`Working... (turn ${ turn })`
								}
							/>
						</div>

						<div className="datamachine-editor-sidebar__input">
							<ChatInput
								onSend={ chat.sendMessage }
								disabled={ chat.isLoading }
								placeholder="Ask about this post..."
							/>
						</div>
					</>
				) }

				{ /* InlineDiffManager applies diffs to editor blocks */ }
				{ diffContext.diffs.length > 0 && (
					<InlineDiffManager
						diffContext={ diffContext }
						onAccept={ handleDiffAccept }
						onReject={ handleDiffReject }
					/>
				) }
			</div>
		</ErrorBoundary>
	);
}
