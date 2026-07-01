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
        self::render_queue_widget();
        echo '<div id="tag-connections-root" data-mode="admin" style="max-width: 1200px;"></div>';
        echo '</div>';
    }

    /**
     * Queue health summary above the puzzle editor. Always computed fresh
     * here (this page is where you act on it).
     */
    private static function render_queue_widget() {
        $status = TAG_Connections_Scheduler::queue_status();
        $low = $status['runway_days'] < TAG_Connections_Health::RUNWAY_THRESHOLD_DAYS;

        echo '<div style="max-width: 1200px; margin: 12px 0; padding: 12px 16px; background: #fff; border: 1px solid #c3c4c7; border-left: 4px solid ' . ($low ? '#d63638' : '#00a32a') . ';">';
        echo '<h2 style="margin: 0 0 8px; font-size: 14px;">Puzzle queue health</h2>';
        echo '<table class="widefat striped" style="max-width: 640px;">';
        echo '<tbody>';
        echo '<tr><td><strong>Fresh runway</strong></td><td>' . (int) $status['runway_days'] . ' days' . ($low ? ' <span style="color:#d63638;font-weight:600;">(LOW, add puzzles below)</span>' : '') . '</td></tr>';
        echo '<tr><td>Scheduled future puzzles</td><td>' . (int) $status['future_days'] . '</td></tr>';
        echo '<tr><td>Unused pool puzzles</td><td>' . (int) $status['pool_unused'] . ' of ' . (int) $status['pool_size'] . '</td></tr>';
        echo '<tr><td>Next unfilled date</td><td>' . esc_html($status['next_unfilled'] !== '' ? $status['next_unfilled'] : 'none in window') . '</td></tr>';
        echo '<tr><td>Pool last recycled</td><td>' . esc_html($status['recycled_at'] !== '' ? $status['recycled_at'] : 'never recorded') . '</td></tr>';
        echo '</tbody></table>';
        echo '<p style="margin: 8px 0 0; color: #646970;">When the pool runs dry the scheduler recycles old puzzles rather than going dark, and players see repeats. Keep the runway above ' . (int) TAG_Connections_Health::RUNWAY_THRESHOLD_DAYS . ' days.</p>';
        echo '</div>';
    }

    public static function add_module_type($tag, $handle) {
        if (in_array($handle, ['tag-connections', 'tag-connections-admin'])) {
            return str_replace('<script ', '<script type="module" ', $tag);
        }
        return $tag;
    }
}
