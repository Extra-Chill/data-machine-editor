/**
 * EditorChatSidebar — chat panel for the Gutenberg editor.
 *
 * Uses @extrachill/chat's useChat hook with editor context metadata
 * and onToolCalls to intercept block edits and pipe them to InlineDiffManager.
 */

import { useCallback, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { useEditorContext } from '../context/EditorContext';
import {
	useChat,
	ChatMessages,
	ChatInput,
	TypingIndicator,
	ErrorBoundary,
	SessionSwitcher,
	type ChatMessage,
} from '@extrachill/chat';
import { InlineDiffManager } from '../editor/InlineDiffManager';
import type { DiffContext, DiffContextItem } from '../types';
import { parseCanonicalDiffFromJson } from '../diff/canonicalDiff';

/**
 * Extract diff-producing tool call results into a DiffContext
 * that InlineDiffManager can consume.
 */
function extractDiffContextFromMessages( messages: ChatMessage[] ): DiffContextItem[] {
	const diffs: DiffContextItem[] = [];

	for ( const message of messages ) {
		if ( message.role !== 'tool_result' || ! message.toolResult?.toolName ) {
			continue;
		}

		if ( ! [ 'edit_post_blocks', 'replace_post_blocks', 'insert_content' ].includes( message.toolResult.toolName ) ) {
			continue;
		}

		const diff = parseCanonicalDiffFromJson( message.content );
		if ( diff ) {
			diffs.push( {
				tool_call_id: diff.editor?.toolCallId as string ?? message.id,
				diff_id: diff.diffId,
				diff,
			} );
		}
	}

	return diffs;
}

export function EditorChatSidebar(): JSX.Element {
	const { postId: currentPostId, postTitle } = useEditorContext();

	const [ diffContext, setDiffContext ] = useState< DiffContext >( {
		diffs: [],
	} );
	const [ showSessions, setShowSessions ] = useState( false );

	const chat = useChat( {
		basePath: '/datamachine/v1/chat',
		fetchFn: apiFetch as Parameters< typeof useChat >[ 0 ][ 'fetchFn' ],
		metadata: {
			post_id: currentPostId,
			context: 'editor',
		},
		sessionContext: 'editor',
	} );

	useEffect( () => {
		const diffs = extractDiffContextFromMessages( chat.messages );
		if ( diffs.length === 0 ) {
			return;
		}

		setDiffContext( ( prev ) => {
			const seen = new Set( prev.diffs.map( ( diff ) => diff.diff.diffId ) );
			const additions = diffs.filter( ( diff ) => ! seen.has( diff.diff.diffId ) );
			if ( additions.length === 0 ) {
				return prev;
			}

			return {
				diffs: [ ...prev.diffs, ...additions ],
			};
		} );
	}, [ chat.messages ] );

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
								label={ chat.isLoading ? `Working... (turn ${ chat.turnCount })` : undefined }
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
