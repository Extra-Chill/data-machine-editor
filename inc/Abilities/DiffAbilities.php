<?php
/**
 * DiffAbilities — Registers diff-related abilities for the editor extension.
 *
 * @package DataMachineEditor\Abilities
 */

namespace DataMachineEditor\Abilities;

use DataMachine\Abilities\PermissionHelper;

class DiffAbilities {

	private static bool $registered = false;

	public function __construct() {
		if ( ! class_exists( 'WP_Ability' ) ) {
			return;
		}

		if ( self::$registered ) {
			return;
		}

		$this->register_abilities();
		$this->register_rest_routes();

		self::$registered = true;
	}

	/**
	 * Register WordPress Abilities.
	 */
	private function register_abilities(): void {
		$register = function () {
			wp_register_ability( 'datamachine/resolve-diff', array(
				'label'               => 'Resolve Diff',
				'description'         => 'Resolve an editor diff block (accept or reject).',
				'category'            => 'datamachine',
				'input_schema'        => array(
					'type'       => 'object',
					'required'   => array( 'decision', 'diff_id', 'post_id' ),
					'properties' => array(
						'decision'     => array(
							'type'        => 'string',
							'enum'        => array( 'accepted', 'rejected' ),
							'description' => 'Whether the diff was accepted or rejected.',
						),
						'diff_id'      => array(
							'type'        => 'string',
							'description' => 'The diff block identifier.',
						),
						'tool_call_id' => array(
							'type'        => 'string',
							'description' => 'The originating tool call identifier.',
						),
						'post_id'      => array(
							'type'    => 'integer',
							'description' => 'The post being edited.',
						),
					),
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'success'       => array( 'type' => 'boolean' ),
						'continue_chat' => array( 'type' => 'boolean' ),
					),
				),
				'execute_callback'    => array( self::class, 'resolve_diff' ),
				'permission_callback' => fn() => PermissionHelper::can( 'chat' ),
				'meta'                => array( 'show_in_rest' => false ),
			) );
		};

		if ( doing_action( 'wp_abilities_api_init' ) ) {
			$register();
		} elseif ( ! did_action( 'wp_abilities_api_init' ) ) {
			add_action( 'wp_abilities_api_init', $register );
		}
	}

	/**
	 * Register REST routes for diff resolution.
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
	 * REST handler — delegates to the ability.
	 */
	public static function handle_rest_resolve( \WP_REST_Request $request ): \WP_REST_Response {
		$result = self::resolve_diff( array(
			'decision'     => $request->get_param( 'decision' ),
			'diff_id'      => $request->get_param( 'diff_id' ),
			'tool_call_id' => $request->get_param( 'tool_call_id' ) ?? '',
			'post_id'      => $request->get_param( 'post_id' ),
		) );

		return new \WP_REST_Response( $result, $result['success'] ? 200 : 400 );
	}

	/**
	 * Execute callback for the resolve-diff ability.
	 *
	 * Records the user decision and signals whether the chat conversation
	 * should continue (i.e. the AI had pending tool calls).
	 */
	public static function resolve_diff( array $input ): array {
		$decision     = $input['decision'];
		$diff_id      = $input['diff_id'];
		$tool_call_id = $input['tool_call_id'] ?? '';
		$post_id      = (int) $input['post_id'];

		// Verify the user can edit this post.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return array(
				'success'       => false,
				'continue_chat' => false,
				'error'         => 'You do not have permission to edit this post.',
			);
		}

		/**
		 * Fires when a diff block is resolved.
		 *
		 * Other plugins (e.g. analytics, chat session managers) can hook here
		 * to record the decision or trigger side effects.
		 *
		 * @param string $decision     'accepted' or 'rejected'.
		 * @param string $diff_id      The diff block identifier.
		 * @param string $tool_call_id The originating tool call.
		 * @param int    $post_id      The post being edited.
		 */
		do_action( 'datamachine_editor_diff_resolved', $decision, $diff_id, $tool_call_id, $post_id );

		// Signal chat continuation — the frontend DiffTracker handles
		// calling /chat/continue when all blocks are resolved.
		return array(
			'success'       => true,
			'continue_chat' => true,
			'decision'      => $decision,
			'diff_id'       => $diff_id,
		);
	}
}
