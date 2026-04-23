<?php
/**
 * ActionResolverAbilities — Editor-side bridge to the unified pending-action lane.
 *
 * Core (`data-machine`) owns `datamachine/resolve-pending-action` and
 * `POST /datamachine/v1/actions/resolve` for universal server-side
 * resolution (Roadie, CLI, chat tool). This class provides the
 * editor-specific REST endpoint at
 * `/datamachine/v1/editor/actions/resolve` which:
 *
 *   - Fires the `datamachine_editor_action_resolved` action for Gutenberg
 *     side effects (block cleanup, continue_chat signalling).
 *   - Delegates to core's ResolvePendingActionAbility when a pending
 *     action exists in PendingActionStore (for actions staged via the
 *     preview branch of the content abilities).
 *   - Returns `continue_chat` for the frontend ActionTracker.
 *
 * @package DataMachineEditor\Abilities
 * @since 0.4.0
 */

namespace DataMachineEditor\Abilities;

use DataMachine\Abilities\PermissionHelper;
use DataMachine\Engine\AI\Actions\PendingActionStore;
use DataMachine\Engine\AI\Actions\ResolvePendingActionAbility;

class ActionResolverAbilities {

	private static bool $registered = false;

	public function __construct() {
		if ( self::$registered ) {
			return;
		}

		$this->register_rest_routes();
		self::$registered = true;
	}

	/**
	 * Register REST routes for editor action resolution.
	 */
	private function register_rest_routes(): void {
		add_action(
			'rest_api_init',
			function () {
				register_rest_route(
					'datamachine/v1',
					'/editor/actions/resolve',
					array(
						'methods'             => 'POST',
						'callback'            => array( self::class, 'handle_rest_resolve' ),
						'permission_callback' => fn() => PermissionHelper::can( 'chat' ),
						'args'                => array(
							'decision'     => array(
								'required'          => true,
								'type'              => 'string',
								'enum'              => array( 'accepted', 'rejected' ),
								'sanitize_callback' => 'sanitize_text_field',
							),
							'action_id'    => array(
								'required'          => true,
								'type'              => 'string',
								'sanitize_callback' => 'sanitize_text_field',
							),
							'tool_call_id' => array(
								'type'              => 'string',
								'sanitize_callback' => 'sanitize_text_field',
							),
							'post_id'      => array(
								'required'          => true,
								'type'              => 'integer',
								'sanitize_callback' => 'absint',
							),
						),
					)
				);
			}
		);
	}

	/**
	 * REST handler — editor bridge.
	 *
	 * Two flows funnel through this endpoint:
	 *
	 *   1. Server-side apply (preview branch of a content ability staged a
	 *      payload in PendingActionStore) → delegate to core and fire the
	 *      editor hook with the response.
	 *   2. Legacy client-side resolution (editor parsed + rendered diffs
	 *      without a server payload) → fire the editor hook and signal
	 *      continuation so the chat keeps moving.
	 */
	public static function handle_rest_resolve( \WP_REST_Request $request ): \WP_REST_Response {
		$decision     = $request->get_param( 'decision' );
		$action_id    = $request->get_param( 'action_id' );
		$tool_call_id = $request->get_param( 'tool_call_id' ) ?? '';
		$post_id      = (int) $request->get_param( 'post_id' );

		// Verify the user can edit this post.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_REST_Response(
				array(
					'success'       => false,
					'continue_chat' => false,
					'error'         => 'You do not have permission to edit this post.',
				),
				403
			);
		}

		// If core has a pending action for this ID, delegate to the unified resolver.
		if ( class_exists( PendingActionStore::class ) && null !== PendingActionStore::get( $action_id ) ) {
			$core_result = ResolvePendingActionAbility::execute(
				array(
					'action_id' => $action_id,
					'decision'  => $decision,
				)
			);

			/**
			 * Fires after an editor-driven pending action is resolved.
			 *
			 * @since 0.4.0
			 *
			 * @param string $decision     accepted|rejected.
			 * @param string $action_id    Action identifier.
			 * @param string $tool_call_id Originating tool call id (UI correlation).
			 * @param int    $post_id      Target post.
			 */
			do_action( 'datamachine_editor_action_resolved', $decision, $action_id, $tool_call_id, $post_id );

			return new \WP_REST_Response(
				array_merge(
					$core_result,
					array( 'continue_chat' => true )
				),
				! empty( $core_result['success'] ) ? 200 : 400
			);
		}

		// Legacy flow: no pending action in core store. The editor resolved
		// the diff client-side (ContentUpdater.removeDiffWrapper). Just
		// fire the action and signal continuation.
		do_action( 'datamachine_editor_action_resolved', $decision, $action_id, $tool_call_id, $post_id );

		return new \WP_REST_Response(
			array(
				'success'       => true,
				'continue_chat' => true,
				'decision'      => $decision,
				'action_id'     => $action_id,
			),
			200
		);
	}
}
