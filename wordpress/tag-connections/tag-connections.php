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

// TAG Arcade registration. tag-membership exposes tag_arcade_register_game()
// globally; the function check guards against tag-membership being deactivated.
add_action('plugins_loaded', function () {
    if (!function_exists('tag_arcade_register_game')) {
        return;
    }
    tag_arcade_register_game([
        'slug'           => 'connections',
        'title'          => 'TAG Connections',
        'pitch'          => 'A daily gaming-themed puzzle. Sort 16 items into 4 secret categories.',
        'play_url'       => '/connections/',
        'required_tier'  => 'free',
        'pro_features'   => ['archive'],
        'stat_renderer'  => 'tag_connections_arcade_stats',
        'featured'       => true,
    ]);
}, 20);

/**
 * Stat renderer for the Arcade profile tab. Returns HTML (or empty string if
 * the user has no logged plays). Pulled stats: current streak, longest streak,
 * total puzzles solved, win rate.
 */
function tag_connections_arcade_stats($user_id) {
    $user_id = (int) $user_id;
    if ($user_id <= 0) {
        return '';
    }
    $stats = TAG_Connections_Database::get_user_stats($user_id);
    $streak = TAG_Connections_Database::get_streak($user_id);

    $played = $stats ? (int) $stats->played : 0;
    if ($played === 0) {
        return '';
    }
    $won = $stats ? (int) $stats->won : 0;
    $winrate = $played > 0 ? round(($won / $played) * 100) : 0;
    $current = $streak ? (int) $streak->current_streak : 0;
    $longest = $streak ? (int) $streak->longest_streak : 0;

    ob_start();
    ?>
    <div class="tag-arcade-stats tag-arcade-stats--connections">
        <div class="tag-arcade-stat"><span class="tag-arcade-stat__value"><?php echo esc_html((string) $current); ?></span><span class="tag-arcade-stat__label">Current streak</span></div>
        <div class="tag-arcade-stat"><span class="tag-arcade-stat__value"><?php echo esc_html((string) $longest); ?></span><span class="tag-arcade-stat__label">Longest streak</span></div>
        <div class="tag-arcade-stat"><span class="tag-arcade-stat__value"><?php echo esc_html((string) $won); ?></span><span class="tag-arcade-stat__label">Solved</span></div>
        <div class="tag-arcade-stat"><span class="tag-arcade-stat__value"><?php echo esc_html($winrate . '%'); ?></span><span class="tag-arcade-stat__label">Win rate</span></div>
    </div>
    <?php
    return (string) ob_get_clean();
}

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
