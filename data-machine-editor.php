<?php
/**
 * Plugin Name:       Data Machine Editor
 * Plugin URI:        https://github.com/Extra-Chill/data-machine-editor
 * Description:       Editor integration extension for Data Machine. Inline diff visualization, accept/reject review workflow, and Gutenberg editor tools for AI-powered content editing.
 * Version:           0.1.0
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
define( 'DATAMACHINE_EDITOR_VERSION', '0.1.0' );
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

	// Register the diff block.
	add_action( 'init', 'datamachine_editor_register_blocks' );

	// Enqueue editor assets.
	add_action( 'enqueue_block_editor_assets', 'datamachine_editor_enqueue_assets' );

}, 20 );

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
	$asset_file = DATAMACHINE_EDITOR_PATH . 'build/diff-block.asset.php';

	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = require $asset_file;

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
