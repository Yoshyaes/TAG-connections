<?php
/**
 * Plugin Name: TAG Connections
 * Description: Embeds the TAG Connections daily puzzle game via shortcode [tag_connections]
 * Version: 1.0.0
 * Author: Two Average Gamers
 */

if (!defined('ABSPATH')) exit;

// Register shortcode
add_shortcode('tag_connections', 'tag_connections_render');

function tag_connections_render($atts) {
    // Enqueue the built React app assets
    $plugin_url = plugin_dir_url(__FILE__);

    // Find the built CSS and JS files (Vite generates hashed filenames)
    $dist_dir = plugin_dir_path(__FILE__) . 'dist/assets/';

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
            '1.0.0'
        );
    }

    if ($js_file) {
        wp_enqueue_script(
            'tag-connections',
            $plugin_url . 'dist/assets/' . $js_file,
            [],
            '1.0.0',
            true // Load in footer
        );
        // Mark as ES module
        add_filter('script_loader_tag', function($tag, $handle) {
            if ($handle === 'tag-connections') {
                return str_replace('<script ', '<script type="module" ', $tag);
            }
            return $tag;
        }, 10, 2);
    }

    // Google Fonts
    wp_enqueue_style(
        'tag-connections-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@700;800&display=swap',
        [],
        null
    );

    // Return the mount point — React app attaches here
    return '<div id="tag-connections-root" style="max-width: 480px; margin: 0 auto;"></div>';
}
