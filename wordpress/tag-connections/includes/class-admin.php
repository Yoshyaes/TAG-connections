<?php
if (!defined('ABSPATH')) exit;

class TAG_Connections_Admin {

    public static function register_menu() {
        add_menu_page(
            'TAG Connections',
            'TAG Connections',
            'manage_options',
            'tag-connections',
            [__CLASS__, 'render_admin_page'],
            'dashicons-games',
            30
        );
    }

    public static function render_admin_page() {
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
                'tag-connections-admin',
                $plugin_url . 'dist/assets/' . $css_file,
                [],
                TAG_CONNECTIONS_VERSION
            );
        }

        if ($js_file) {
            wp_enqueue_script(
                'tag-connections-admin',
                $plugin_url . 'dist/assets/' . $js_file,
                [],
                TAG_CONNECTIONS_VERSION,
                true
            );

            // Inject config for the React app
            wp_localize_script('tag-connections-admin', 'tagConnections', [
                'apiUrl'  => rest_url('tag-connections/v1'),
                'nonce'   => wp_create_nonce('wp_rest'),
                'userId'  => get_current_user_id(),
                'isAdmin' => current_user_can('manage_options'),
                'mode'    => 'admin',
            ]);
        }

        // Google Fonts
        wp_enqueue_style(
            'tag-connections-fonts',
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@700;800&display=swap',
            [],
            null
        );

        echo '<div class="wrap">';
        echo '<div id="tag-connections-root" data-mode="admin" style="max-width: 1200px;"></div>';
        echo '</div>';
    }

    public static function add_module_type($tag, $handle) {
        if (in_array($handle, ['tag-connections', 'tag-connections-admin'])) {
            return str_replace('<script ', '<script type="module" ', $tag);
        }
        return $tag;
    }
}
