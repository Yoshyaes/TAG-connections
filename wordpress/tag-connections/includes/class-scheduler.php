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
    const RECYCLED_OPTION = 'tag_connections_pool_recycled_at';
    const STATUS_TRANSIENT = 'tag_connections_queue_status';

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

            // Pool exhausted: recycle as a last resort so the daily puzzle
            // never goes dark, but record it so the health check alerts.
            // Players WILL see repeats from this point until fresh puzzles land.
            if (!$puzzle_data) {
                update_option(self::RECYCLED_OPTION, current_time('mysql'));
                $used_ids = [];
                foreach ($pool as $index => $p) {
                    $puzzle_data = $p;
                    $used_ids[] = $index;
                    break;
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
        delete_transient(self::STATUS_TRANSIENT);
    }

    /**
     * Seed the next N days on plugin activation.
     * Uses a larger window than the daily cron.
     */
    public static function seed_initial($days = 30) {
        self::fill_upcoming_puzzles($days);
    }

    /**
     * Queue health snapshot. Runway counts both already-scheduled future
     * puzzles and unused pool entries (which the cron will seed); once the
     * pool is dry the scheduler recycles, so runway hitting zero means
     * players start seeing repeats.
     */
    public static function queue_status() {
        global $wpdb;
        require_once TAG_CONNECTIONS_PATH . 'includes/puzzle-content.php';

        $table = $wpdb->prefix . 'tag_puzzles';
        $today = current_time('Y-m-d');

        $future_days = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE puzzle_date > %s", $today
        ));

        $pool_size = count(tag_connections_get_puzzle_pool());
        $used_ids = get_option(self::POOL_OPTION, []);
        $pool_unused = max(0, $pool_size - count((array) $used_ids));

        // First calendar date with no puzzle row (the next gap the cron fills).
        $next_unfilled = '';
        for ($i = 0; $i <= $future_days + 1; $i++) {
            $date = date('Y-m-d', strtotime($today . " +{$i} day"));
            if (!TAG_Connections_Database::get_puzzle_by_date($date)) {
                $next_unfilled = $date;
                break;
            }
        }

        $status = [
            'future_days'   => $future_days,
            'pool_size'     => $pool_size,
            'pool_unused'   => $pool_unused,
            'runway_days'   => $future_days + $pool_unused,
            'next_unfilled' => $next_unfilled,
            'recycled_at'   => (string) get_option(self::RECYCLED_OPTION, ''),
            'checked_at'    => current_time('mysql'),
        ];

        set_transient(self::STATUS_TRANSIENT, $status, HOUR_IN_SECONDS);
        return $status;
    }

    /**
     * Cached variant for hot paths (admin_notices runs on every wp-admin load).
     */
    public static function queue_status_cached() {
        $status = get_transient(self::STATUS_TRANSIENT);
        return is_array($status) ? $status : self::queue_status();
    }
}
