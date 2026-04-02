<?php
/**
 * Plugin Name:       Data Machine Editor
 * Plugin URI:        https://github.com/Extra-Chill/data-machine-editor
 * Description:       Editor integration extension for Data Machine. Inline diff visualization, accept/reject review workflow, and Gutenberg editor tools for AI-powered content editing.
 * Version:           0.3.1
 * Author:            Chris Huber
 * Author URI:        https://chubes.net
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       data-machine-editor
 * Domain Path:       /languages
 * Requires Plugins:  data-machine
 * Requires PHP:      8.2
 * Requires at least: 6.5
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Plugin constants.
 */
define( 'DATAMACHINE_EDITOR_VERSION', '0.3.1' );
define( 'DATAMACHINE_EDITOR_PATH', plugin_dir_path( __FILE__ ) );
define( 'DATAMACHINE_EDITOR_URL', plugin_dir_url( __FILE__ ) );

/**
 * PSR-4 autoloader.
 */
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
}

/**
 * Bootstrap the plugin at plugins_loaded priority 20 (after DM core).
 */
add_action( 'plugins_loaded', function () {

	// Guard: Data Machine core must be active.
	if ( ! class_exists( 'DataMachine\Abilities\PermissionHelper' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-error"><p>';
			echo '<strong>Data Machine Editor</strong> requires the <strong>Data Machine</strong> plugin to be active.';
			echo '</p></div>';
		} );
		return;
	}

	// Register abilities.
	new DataMachineEditor\Abilities\DiffAbilities();

	// Register editor execution context.
	add_action( 'datamachine_contexts', function () {
		\DataMachine\Engine\AI\ContextRegistry::register( 'editor', 40, array(
			'label'       => __( 'Editor Agent', 'data-machine-editor' ),
			'description' => __( 'Content editing in the Gutenberg block editor. Inline diff visualization with accept/reject workflow.', 'data-machine-editor' ),
		) );
	} );

	// Register editor context memory file.
	add_filter( 'datamachine_default_context_files', 'datamachine_editor_register_context' );

	// Register the diff block.
	add_action( 'init', 'datamachine_editor_register_blocks' );

	// Enqueue editor assets.
	add_action( 'enqueue_block_editor_assets', 'datamachine_editor_enqueue_assets' );
}, 20 );

/**
 * Register editor context memory file.
 *
 * Scaffolds contexts/editor.md with diff workflow and content editing instructions.
 * The file is written once — after that, the agent owns it.
 *
 * @param array $defaults Context slug => markdown content.
 * @return array
 */
function datamachine_editor_register_context( array $defaults ): array {
	$defaults['editor'] = <<<'MD'
# Editor Context

This context is active when you are editing post content through the Gutenberg block editor. You have tools for surgical block-level edits with inline diff visualization.

## Diff Workflow

When editing content, changes are presented as inline diffs using `<ins>` (additions) and `<del>` (removals) tags inside `datamachine/diff` blocks. The user reviews each change and accepts or rejects it individually.

Three diff modes are available:
- **edit** — Surgical text replacement within an existing block. Shows word-level changes.
- **write** — Full block replacement. Shows the complete before/after with word-level diff.
- **insert** — New content added between existing blocks. Shows the addition only.

## Review Protocol

- Present changes as diffs — never silently modify content.
- Each diff block can be accepted or rejected independently.
- When all diffs in a tool call are resolved, chat continuation fires automatically.
- Bulk accept/reject is available for batching multiple changes.

## Content Editing Principles

- Preserve the author's voice — suggest improvements, don't rewrite.
- Focus on clarity, grammar, and factual accuracy.
- When restructuring, explain why in the diff context.
- Never remove content without a clear reason.
MD;

	return $defaults;
}

/**
 * Register Gutenberg blocks.
 */
function datamachine_editor_register_blocks(): void {
	register_block_type( DATAMACHINE_EDITOR_PATH . 'inc/Blocks/Diff' );
}

/**
 * Enqueue editor scripts and styles.
 */
function datamachine_editor_enqueue_assets(): void {
	// Diff block assets.
	$diff_asset_file = DATAMACHINE_EDITOR_PATH . 'build/diff-block.asset.php';
	if ( file_exists( $diff_asset_file ) ) {
		$asset = require $diff_asset_file;

		wp_enqueue_script(
			'datamachine-diff-block',
			DATAMACHINE_EDITOR_URL . 'build/diff-block.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_enqueue_style(
			'datamachine-diff-block',
			DATAMACHINE_EDITOR_URL . 'build/style-diff-block.css',
			array(),
			$asset['version']
		);
	}

	// Editor chat sidebar assets.
	$sidebar_asset_file = DATAMACHINE_EDITOR_PATH . 'build/editor-sidebar.asset.php';
	if ( file_exists( $sidebar_asset_file ) ) {
		$sidebar_asset = require $sidebar_asset_file;

		wp_enqueue_script(
			'datamachine-editor-sidebar',
			DATAMACHINE_EDITOR_URL . 'build/editor-sidebar.js',
			$sidebar_asset['dependencies'],
			$sidebar_asset['version'],
			true
		);

		wp_enqueue_style(
			'datamachine-editor-sidebar',
			DATAMACHINE_EDITOR_URL . 'build/editor-sidebar.css',
			array(),
			$sidebar_asset['version']
		);
	}
}
