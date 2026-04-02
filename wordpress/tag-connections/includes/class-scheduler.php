<?php
if (!defined('ABSPATH')) exit;

/**
 * Auto-schedules puzzles from the puzzle pool to fill upcoming dates.
 *
 * Runs daily via WP-Cron. Checks the next 7 days for missing puzzles
 * and assigns unused pool puzzles to fill gaps.
 */
class TAG_Connections_Scheduler {

    const CRON_HOOK = 'tag_connections_auto_schedule';
    const POOL_OPTION = 'tag_connections_used_pool_ids';

    /**
     * Register the daily cron event if not already scheduled.
     */
    public static function init() {
        if (!wp_next_scheduled(self::CRON_HOOK)) {
            wp_schedule_event(time(), 'daily', self::CRON_HOOK);
        }
        add_action(self::CRON_HOOK, [__CLASS__, 'fill_upcoming_puzzles']);
    }

    /**
     * Remove cron event on plugin deactivation.
     */
    public static function deactivate() {
        wp_clear_scheduled_hook(self::CRON_HOOK);
    }

    /**
     * Fill the next 7 days with puzzles from the pool.
     * Called by WP-Cron daily and on plugin activation.
     */
    public static function fill_upcoming_puzzles($days_ahead = 7) {
        require_once TAG_CONNECTIONS_PATH . 'includes/puzzle-content.php';

        $pool = tag_connections_get_puzzle_pool();
        $used_ids = get_option(self::POOL_OPTION, []);
        $today = current_time('Y-m-d');

        for ($i = 0; $i < $days_ahead; $i++) {
            $date = date('Y-m-d', strtotime($today . " +{$i} day"));

            // Skip if puzzle already exists for this date
            $existing = TAG_Connections_Database::get_puzzle_by_date($date);
            if ($existing) continue;

            // Find next unused puzzle from pool
            $puzzle_data = null;
            foreach ($pool as $index => $p) {
                if (!in_array($index, $used_ids, true)) {
                    $puzzle_data = $p;
                    $used_ids[] = $index;
                    break;
                }
            }

            // If all puzzles used, reset the pool and start over
            if (!$puzzle_data) {
                $used_ids = [];
                update_option(self::POOL_OPTION, $used_ids);
                foreach ($pool as $index => $p) {
                    if (!in_array($index, $used_ids, true)) {
                        $puzzle_data = $p;
                        $used_ids[] = $index;
                        break;
                    }
                }
            }

            if (!$puzzle_data) continue;

            TAG_Connections_Database::save_puzzle([
                'puzzle_date' => $date,
                'title' => $puzzle_data['title'],
                'items' => $puzzle_data['items'],
                'groups_data' => $puzzle_data['groups'],
            ]);
        }

        update_option(self::POOL_OPTION, $used_ids);
    }

    /**
     * Seed the next N days on plugin activation.
     * Uses a larger window than the daily cron.
     */
    public static function seed_initial($days = 30) {
        self::fill_upcoming_puzzles($days);
    }
}
