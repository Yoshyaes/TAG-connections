<?php
/**
 * Plugin Name: TAG Connections
 * Plugin URI: https://twoaveragegamers.com
 * Description: A daily gaming-themed puzzle game. Sort 16 items into 4 secret categories!
 * Version: 1.0.0
 * Author: Two Average Gamers
 * License: GPL v2 or later
 * Text Domain: tag-connections
 */

if (!defined('ABSPATH')) exit;

define('TAG_CONNECTIONS_VERSION', '1.0.0');
define('TAG_CONNECTIONS_PATH', plugin_dir_path(__FILE__));
define('TAG_CONNECTIONS_URL', plugin_dir_url(__FILE__));

// Load classes
require_once TAG_CONNECTIONS_PATH . 'includes/class-database.php';
require_once TAG_CONNECTIONS_PATH . 'includes/class-rest-api.php';
require_once TAG_CONNECTIONS_PATH . 'includes/class-admin.php';
require_once TAG_CONNECTIONS_PATH . 'includes/class-scheduler.php';

// Activation: create tables + seed puzzles for next 30 days
register_activation_hook(__FILE__, function() {
    TAG_Connections_Database::create_tables();
    TAG_Connections_Scheduler::seed_initial(30);
});

// Deactivation: clean up cron
register_deactivation_hook(__FILE__, ['TAG_Connections_Scheduler', 'deactivate']);

// Initialize daily auto-scheduler
TAG_Connections_Scheduler::init();

// Register REST API routes
add_action('rest_api_init', ['TAG_Connections_REST_API', 'register_routes']);

// Register admin menu
add_action('admin_menu', ['TAG_Connections_Admin', 'register_menu']);

// Add type="module" to script tags
add_filter('script_loader_tag', ['TAG_Connections_Admin', 'add_module_type'], 10, 2);

// Register [tag_connections] shortcode
add_shortcode('tag_connections', 'tag_connections_shortcode');

function tag_connections_shortcode($atts) {
    $plugin_url = TAG_CONNECTIONS_URL;
    $dist_dir = TAG_CONNECTIONS_PATH . 'dist/assets/';

    $js_file = '';
    $css_file = '';

    if (is_dir($dist_dir)) {
        foreach (scandir($dist_dir) as $file) {
            if (preg_match('/^index-.*\.js$/', $file)) $js_file = $file;
            if (preg_match('/^index-.*\.css$/', $file)) $css_file = $file;
        }
    }

    if ($css_file) {
        wp_enqueue_style(
            'tag-connections',
            $plugin_url . 'dist/assets/' . $css_file,
            [],
            TAG_CONNECTIONS_VERSION
        );
    }

    if ($js_file) {
        wp_enqueue_script(
            'tag-connections',
            $plugin_url . 'dist/assets/' . $js_file,
            [],
            TAG_CONNECTIONS_VERSION,
            true
        );

        // Inject config for the React app
        wp_localize_script('tag-connections', 'tagConnections', [
            'apiUrl'  => rest_url('tag-connections/v1'),
            'nonce'   => wp_create_nonce('wp_rest'),
            'userId'  => get_current_user_id(),
            'isAdmin' => current_user_can('manage_options'),
            'mode'    => 'game',
        ]);
    }

    // Google Fonts
    wp_enqueue_style(
        'tag-connections-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@700;800&display=swap',
        [],
        null
    );

    return '<div id="tag-connections-root" style="max-width: 480px; margin: 0 auto;"></div>';
}
