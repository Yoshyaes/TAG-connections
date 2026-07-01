<?php
if (!defined('ABSPATH')) exit;

/**
 * Watches the puzzle queue so it never runs dry silently.
 *
 * Two surfaces:
 *   - Daily check on the scheduler cron (after seeding): emails the site
 *     admin when fresh runway drops below the threshold, or when the
 *     scheduler had to recycle the pool. Throttled to one email per 24h.
 *   - Persistent wp-admin notice while runway is low.
 */
class TAG_Connections_Health {

    const RUNWAY_THRESHOLD_DAYS = 14;
    const ALERT_THROTTLE_OPTION = 'tag_connections_health_last_alert';
    const RECYCLE_NOTIFIED_OPTION = 'tag_connections_recycle_notified_at';

    public static function init() {
        // Priority 20: runs after the scheduler's default-priority seeding
        // on the same daily cron hook, so the check sees post-seed state.
        add_action(TAG_Connections_Scheduler::CRON_HOOK, [__CLASS__, 'check'], 20);
        add_action('admin_notices', [__CLASS__, 'admin_notice']);
    }

    public static function check() {
        $status = TAG_Connections_Scheduler::queue_status();

        $low = $status['runway_days'] < self::RUNWAY_THRESHOLD_DAYS;
        $recycle_unseen = $status['recycled_at'] !== ''
            && $status['recycled_at'] !== get_option(self::RECYCLE_NOTIFIED_OPTION, '');

        if (!$low && !$recycle_unseen) {
            return;
        }

        $last_alert = (int) get_option(self::ALERT_THROTTLE_OPTION, 0);
        if (time() - $last_alert < DAY_IN_SECONDS) {
            return;
        }

        $subject = $recycle_unseen
            ? 'TAG Connections: puzzle pool RECYCLED (players are seeing repeats)'
            : sprintf('TAG Connections: puzzle queue low (%d fresh days left)', $status['runway_days']);

        $lines = [
            'TAG Connections puzzle queue health check:',
            '',
            sprintf('Fresh runway: %d days (scheduled future puzzles + unused pool)', $status['runway_days']),
            sprintf('Scheduled future puzzles: %d', $status['future_days']),
            sprintf('Unused pool puzzles: %d of %d', $status['pool_unused'], $status['pool_size']),
            sprintf('Next unfilled date: %s', $status['next_unfilled'] !== '' ? $status['next_unfilled'] : 'none in window'),
        ];
        if ($status['recycled_at'] !== '') {
            $lines[] = sprintf('Pool last recycled: %s', $status['recycled_at']);
        }
        $lines[] = '';
        $lines[] = 'Add puzzles in wp-admin: ' . admin_url('admin.php?page=tag-connections');

        wp_mail(get_option('admin_email'), $subject, implode("\n", $lines));

        update_option(self::ALERT_THROTTLE_OPTION, time());
        if ($recycle_unseen) {
            update_option(self::RECYCLE_NOTIFIED_OPTION, $status['recycled_at']);
        }
    }

    public static function admin_notice() {
        if (!current_user_can('manage_options')) {
            return;
        }
        $status = TAG_Connections_Scheduler::queue_status_cached();
        if ($status['runway_days'] >= self::RUNWAY_THRESHOLD_DAYS) {
            return;
        }
        printf(
            '<div class="notice notice-error"><p><strong>TAG Connections queue low:</strong> %d fresh days left before puzzles recycle. <a href="%s">Add puzzles in Puzzle Admin</a>.</p></div>',
            (int) $status['runway_days'],
            esc_url(admin_url('admin.php?page=tag-connections'))
        );
    }
}
