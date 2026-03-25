<?php
/**
 * DiffAbilities — Editor-specific diff resolution.
 *
 * The Gutenberg bridge for diff resolution. Core (`data-machine`) owns the
 * `datamachine/resolve-diff` ability and `/datamachine/v1/diff/resolve`
 * endpoint for universal server-side diff resolution (Roadie, CLI, etc.).
 *
 * This class provides the editor-specific REST endpoint at
 * `/datamachine/v1/editor/diff/resolve` which:
 *   - Fires the `datamachine_editor_diff_resolved` action for Gutenberg
 *     side effects (DiffTracker, block cleanup)
 *   - Delegates to core's ResolveDiffAbility when a pending diff exists
 *     in the PendingDiffStore (for diffs created via preview mode)
 *   - Returns `continue_chat` for the frontend DiffTracker
 *
 * @package DataMachineEditor\Abilities
 * @since 0.2.0
 */

namespace DataMachineEditor\Abilities;

use DataMachine\Abilities\PermissionHelper;
use DataMachine\Abilities\Content\PendingDiffStore;
use DataMachine\Abilities\Content\ResolveDiffAbility;

class DiffAbilities {

	private static bool $registered = false;

	public function __construct() {
		if ( self::$registered ) {
			return;
		}

		$this->register_rest_routes();
		self::$registered = true;
	}

	/**
	 * Register REST routes for editor diff resolution.
	 */
	private function register_rest_routes(): void {
		add_action( 'rest_api_init', function () {
			register_rest_route( 'datamachine/v1', '/editor/diff/resolve', array(
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
					'diff_id'      => array(
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
			) );
		} );
	}

	/**
	 * REST handler — editor bridge.
	 *
	 * Handles both the legacy Gutenberg-only flow (client-side block
	 * resolution) and the new core preview flow (server-side apply).
	 */
	public static function handle_rest_resolve( \WP_REST_Request $request ): \WP_REST_Response {
		$decision     = $request->get_param( 'decision' );
		$diff_id      = $request->get_param( 'diff_id' );
		$tool_call_id = $request->get_param( 'tool_call_id' ) ?? '';
		$post_id      = (int) $request->get_param( 'post_id' );

		// Verify the user can edit this post.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_REST_Response( array(
				'success'       => false,
				'continue_chat' => false,
				'error'         => 'You do not have permission to edit this post.',
			), 403 );
		}

		// If core has a pending diff for this ID, delegate to core's resolver.
		// This handles diffs created via preview mode on edit/replace abilities.
		if ( class_exists( PendingDiffStore::class ) && PendingDiffStore::get( $diff_id ) !== null ) {
			$core_result = ResolveDiffAbility::execute( array(
				'diff_id'  => $diff_id,
				'decision' => $decision,
			) );

			// Fire the editor-specific action for Gutenberg side effects.
			do_action( 'datamachine_editor_diff_resolved', $decision, $diff_id, $tool_call_id, $post_id );

			return new \WP_REST_Response( array_merge( $core_result, array(
				'continue_chat' => true,
			) ), $core_result['success'] ? 200 : 400 );
		}

		// Legacy flow: no pending diff in core store. The editor resolved
		// the diff client-side (ContentUpdater.removeDiffWrapper). Just
		// fire the action and signal continuation.
		do_action( 'datamachine_editor_diff_resolved', $decision, $diff_id, $tool_call_id, $post_id );

		return new \WP_REST_Response( array(
			'success'       => true,
			'continue_chat' => true,
			'decision'      => $decision,
			'diff_id'       => $diff_id,
		), 200 );
	}
}
