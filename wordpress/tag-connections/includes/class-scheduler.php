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

    /** No franchise may repeat within this many consecutive days. */
    const VARIETY_WINDOW = 4;

    /** Minimum gap between two "narrow" puzzles (3+ of 4 groups from one IP). */
    const NARROW_GAP = 3;

    /** Most puzzles from one broad genre allowed inside VARIETY_WINDOW days. */
    const FAMILY_MAX = 2;

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
     * Rough franchise label for a puzzle, derived from its group names.
     *
     * Only used to space the calendar out, so a wrong guess costs nothing worse
     * than a slightly worse spread. Ordered most-specific first: a Zelda puzzle
     * must not fall through to the generic "nintendo" bucket, or Mario, Zelda
     * and Kirby days would all look identical to the variety check and cluster
     * anyway.
     */
    public static function puzzle_franchise(array $groups): string {
        $haystack = '';
        foreach ($groups as $g) {
            $haystack .= ' ' . strtolower($g['name'] ?? '');
        }

        $map = [
            'mario'       => ['mario', 'bowser', 'peach', 'luigi', 'yoshi', 'koopa', 'mushroom kingdom', 'toad'],
            'zelda'       => ['zelda', 'hyrule', 'ganon', 'hylia', 'triforce', 'link to the past'],
            'pokemon'     => ['pokemon', 'pokÃ©mon', 'kanto', 'johto', 'pikachu', 'gym leader', 'starter'],
            'cod'         => ['call of duty', 'killstreak', 'zombies term'],
            'fortnite'    => ['fortnite'],
            'valorant'    => ['valorant'],
            'overwatch'   => ['overwatch'],
            'apex'        => ['apex legends'],
            'halo'        => ['halo', 'spartan'],
            'counter'     => ['counter-strike', 'cs2', 'csgo'],
            'sega'        => ['sonic', 'sega', 'genesis'],
            'minecraft'   => ['minecraft'],
            'soulslike'   => ['dark souls', 'elden ring', 'bloodborne', 'soulslike'],
            'finalfantasy'=> ['final fantasy'],
            'bethesda'    => ['elder scrolls', 'skyrim', 'fallout'],
            'playstation' => ['playstation', 'uncharted', 'god of war', 'last of us'],
            'xbox'        => ['xbox', 'gears of war'],
            'nintendo'    => ['nintendo', 'kirby', 'metroid', 'samus', 'donkey kong', 'star fox', 'smash', 'splatoon', 'animal crossing'],
            'retro'       => ['retro', 'arcade', 'atari', 'nes ', 'snes', 'game boy', '8-bit', '16-bit'],
            'shooter'     => ['shooter', 'fps'],
        ];

        foreach ($map as $label => $needles) {
            foreach ($needles as $needle) {
                if (strpos($haystack, $needle) !== false) {
                    return $label;
                }
            }
        }

        // Cross-franchise puzzles land here, and that is the good case: they are
        // the ones that give a player who does not know today's IP a foothold.
        return 'mixed';
    }

    /**
     * Coarse genre family for a franchise label.
     *
     * Distinct franchises are not the same thing as distinct *subject matter*:
     * Valorant, Overwatch, Halo and Apex are four labels but one topic, and a
     * run of them reads to a non-FPS player exactly like the Nintendo run read
     * to everyone else. The remaining pool is heavily shooter-themed, so
     * without this the calendar would simply swap one monoculture for another.
     */
    public static function puzzle_family(string $franchise): string {
        $families = [
            'fps'       => ['shooter', 'valorant', 'overwatch', 'apex', 'halo', 'counter', 'cod', 'fortnite'],
            'nintendo'  => ['mario', 'zelda', 'pokemon', 'nintendo', 'sega', 'retro'],
            'rpg'       => ['soulslike', 'finalfantasy', 'bethesda'],
            'platform'  => ['playstation', 'xbox', 'minecraft'],
        ];
        foreach ($families as $family => $labels) {
            if (in_array($franchise, $labels, true)) {
                return $family;
            }
        }
        return 'mixed';
    }

    /**
     * True when 3 or more of the four groups come from the same genre family.
     *
     * These are the days that are unsolvable rather than merely hard for anyone
     * outside that fandom: 2026-09-13 was four Call of Duty categories, so a
     * non-CoD player could not get a single group as a foothold.
     *
     * Measured on family rather than franchise on purpose. "Aim Assist" is
     * Overwatch / Apex / Valorant / shooter subgenres -- four different
     * franchises, so a franchise count says it is fine, but it is one subject
     * and it locks out exactly the same people. They stay in the rotation, they
     * just must not land near each other.
     */
    public static function puzzle_is_narrow(array $groups): bool {
        $counts = [];
        foreach ($groups as $g) {
            $family = self::puzzle_family(self::puzzle_franchise([$g]));
            if ($family === 'mixed') {
                continue;
            }
            $counts[$family] = ($counts[$family] ?? 0) + 1;
        }
        return $counts ? max($counts) >= 3 : false;
    }

    /**
     * Franchise/narrowness of the most recently scheduled puzzles, newest first.
     * Read back off the saved rows so a restart or a hand-scheduled puzzle is
     * still taken into account.
     */
    private static function recent_history(string $before_date, int $limit): array {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_puzzles';

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT groups_data FROM $table WHERE puzzle_date < %s ORDER BY puzzle_date DESC LIMIT %d",
            $before_date,
            $limit
        ));

        $out = [];
        foreach ((array) $rows as $row) {
            $groups = json_decode((string) $row->groups_data, true);
            if (!is_array($groups)) {
                continue;
            }
            $franchise = self::puzzle_franchise($groups);
            $out[] = [
                'franchise' => $franchise,
                'family'    => self::puzzle_family($franchise),
                'narrow'    => self::puzzle_is_narrow($groups),
            ];
        }
        return $out;
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

        // History seeds the variety check; extended below as this run schedules.
        $history = self::recent_history($today, self::VARIETY_WINDOW + self::NARROW_GAP);

        for ($i = 0; $i < $days_ahead; $i++) {
            $date = date('Y-m-d', strtotime($today . " +{$i} day"));

            // Skip if puzzle already exists for this date
            $existing = TAG_Connections_Database::get_puzzle_by_date($date);
            if ($existing) continue;

            // Pick the next unused puzzle that does not repeat a franchise seen
            // in the last few days, and does not stack two single-franchise
            // puzzles together.
            //
            // This used to take the first unused index, full stop -- and the
            // pool is authored in themed runs, so the pool's order WAS the
            // schedule. That is how the calendar ended up with roughly twenty
            // consecutive Nintendo days, with Pokemon in 8 of 25; the next
            // stretch of the pool is all shooters and would have done the same
            // thing again. Passes get progressively more permissive so the
            // queue can never go dark just because the constraints are tight.
            $puzzle_data = null;
            $window            = array_slice($history, 0, self::VARIETY_WINDOW);
            $recent_franchises = array_column($window, 'franchise');
            $recent_families   = array_count_values(array_column($window, 'family'));
            $narrow_recently   = in_array(true, array_column(array_slice($history, 0, self::NARROW_GAP), 'narrow'), true);

            foreach ([ 'strict', 'variety_only', 'any' ] as $pass) {
                foreach ($pool as $index => $p) {
                    if (in_array($index, $used_ids, true)) {
                        continue;
                    }
                    $groups    = $p['groups'] ?? [];
                    $franchise = self::puzzle_franchise($groups);
                    $family    = self::puzzle_family($franchise);
                    $narrow    = self::puzzle_is_narrow($groups);

                    if ($pass !== 'any') {
                        // 'mixed' is cross-franchise, so it never counts as a repeat.
                        if ($franchise !== 'mixed' && in_array($franchise, $recent_franchises, true)) {
                            continue;
                        }
                    }
                    if ($pass === 'strict') {
                        if ($narrow && $narrow_recently) {
                            continue;
                        }
                        if ($family !== 'mixed' && ($recent_families[$family] ?? 0) >= self::FAMILY_MAX) {
                            continue;
                        }
                    }

                    $puzzle_data = $p;
                    $used_ids[]  = $index;
                    array_unshift($history, ['franchise' => $franchise, 'family' => $family, 'narrow' => $narrow]);
                    break 2;
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
                    $recycled_franchise = self::puzzle_franchise($p['groups'] ?? []);
                    array_unshift($history, [
                        'franchise' => $recycled_franchise,
                        'family'    => self::puzzle_family($recycled_franchise),
                        'narrow'    => self::puzzle_is_narrow($p['groups'] ?? []),
                    ]);
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
