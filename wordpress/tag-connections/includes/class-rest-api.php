<?php
if (!defined('ABSPATH')) exit;

class TAG_Connections_REST_API {

    const NAMESPACE = 'tag-connections/v1';

    public static function register_routes() {
        // --- Public game endpoints ---
        register_rest_route(self::NAMESPACE, '/puzzle/today', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_today_puzzle'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(self::NAMESPACE, '/puzzle/(?P<date>\d{4}-\d{2}-\d{2})', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_puzzle_by_date'],
            'permission_callback' => '__return_true',
            'args' => [
                'date' => [
                    'validate_callback' => function($param) {
                        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $param);
                    },
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/puzzle/submit', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'submit_guess'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(self::NAMESPACE, '/puzzle/reveal', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'reveal_all_groups'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
        ]);

        register_rest_route(self::NAMESPACE, '/puzzle/complete', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'complete_puzzle'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
        ]);

        // --- Authenticated user endpoints ---
        register_rest_route(self::NAMESPACE, '/user/stats', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_user_stats'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
        ]);

        // --- Admin endpoints ---
        register_rest_route(self::NAMESPACE, '/admin/puzzles', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'admin_get_puzzles'],
            'permission_callback' => [__CLASS__, 'check_admin'],
        ]);

        register_rest_route(self::NAMESPACE, '/admin/puzzle/(?P<date>\d{4}-\d{2}-\d{2})', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'admin_get_puzzle'],
            'permission_callback' => [__CLASS__, 'check_admin'],
        ]);

        register_rest_route(self::NAMESPACE, '/admin/puzzle', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'admin_save_puzzle'],
            'permission_callback' => [__CLASS__, 'check_admin'],
        ]);

        register_rest_route(self::NAMESPACE, '/admin/schedule', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'admin_trigger_schedule'],
            'permission_callback' => [__CLASS__, 'check_admin'],
        ]);

        register_rest_route(self::NAMESPACE, '/admin/puzzle/(?P<id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [__CLASS__, 'admin_delete_puzzle'],
            'permission_callback' => [__CLASS__, 'check_admin'],
        ]);
    }

    public static function check_admin() {
        return current_user_can('manage_options');
    }

    // =========================================================
    // Game endpoints
    // =========================================================

    public static function get_today_puzzle($request) {
        $today = current_time('Y-m-d');
        $puzzle = TAG_Connections_Database::get_puzzle_by_date($today);

        if (!$puzzle) {
            return new WP_Error('not_found', 'No puzzle available for today', ['status' => 404]);
        }

        return rest_ensure_response(self::strip_answers($puzzle));
    }

    public static function get_puzzle_by_date($request) {
        $date = $request['date'];
        $puzzle = TAG_Connections_Database::get_puzzle_by_date($date);

        if (!$puzzle) {
            return new WP_Error('not_found', 'No puzzle found for this date', ['status' => 404]);
        }

        return rest_ensure_response(self::strip_answers($puzzle));
    }

    public static function submit_guess($request) {
        $params = $request->get_json_params();
        $puzzle_date = sanitize_text_field($params['puzzle_date'] ?? current_time('Y-m-d'));
        $selected_ids = $params['selected_ids'] ?? [];

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $puzzle_date)) {
            return new WP_Error('invalid', 'Invalid date format', ['status' => 400]);
        }

        if (!is_array($selected_ids) || count($selected_ids) !== 4) {
            return new WP_Error('invalid', 'Must submit exactly 4 item IDs', ['status' => 400]);
        }

        $selected_ids = array_map('intval', $selected_ids);

        $puzzle = TAG_Connections_Database::get_puzzle_by_date($puzzle_date);
        if (!$puzzle) {
            return new WP_Error('not_found', 'No puzzle found', ['status' => 404]);
        }

        $items = json_decode($puzzle->items, true);
        $groups = json_decode($puzzle->groups_data, true);

        if (!is_array($items) || !is_array($groups)) {
            return new WP_Error('server_error', 'Invalid puzzle data', ['status' => 500]);
        }

        // Find group_ids for selected items
        $group_ids = [];
        foreach ($items as $item) {
            if (in_array((int)$item['id'], $selected_ids, true)) {
                $group_ids[] = $item['group_id'];
            }
        }

        if (count($group_ids) !== 4) {
            return new WP_Error('invalid', 'Invalid item IDs', ['status' => 400]);
        }

        // Check if all same group
        if (count(array_unique($group_ids)) === 1) {
            $target_group_id = $group_ids[0];
            $group = null;
            foreach ($groups as $g) {
                if ($g['id'] === $target_group_id) {
                    $group = $g;
                    break;
                }
            }

            $group_items = [];
            foreach ($items as $item) {
                if ($item['group_id'] === $target_group_id) {
                    $group_items[] = ['id' => (int)$item['id'], 'text' => $item['text']];
                }
            }

            return rest_ensure_response([
                'correct' => true,
                'group' => [
                    'id' => $group['id'],
                    'name' => $group['name'],
                    'tier' => (int)$group['tier'],
                    'color' => $group['color'],
                    'items' => $group_items,
                ],
            ]);
        }

        return rest_ensure_response(['correct' => false]);
    }

    public static function reveal_all_groups($request) {
        $params = $request->get_json_params();
        $puzzle_date = sanitize_text_field($params['puzzle_date'] ?? current_time('Y-m-d'));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $puzzle_date)) {
            return new WP_Error('invalid', 'Invalid date format', ['status' => 400]);
        }

        $puzzle = TAG_Connections_Database::get_puzzle_by_date($puzzle_date);
        if (!$puzzle) {
            return new WP_Error('not_found', 'No puzzle found', ['status' => 404]);
        }

        $items = json_decode($puzzle->items, true);
        $groups = json_decode($puzzle->groups_data, true);

        if (!is_array($items) || !is_array($groups)) {
            return new WP_Error('server_error', 'Invalid puzzle data', ['status' => 500]);
        }

        $result_groups = [];
        foreach ($groups as $group) {
            $group_items = [];
            foreach ($items as $item) {
                if ($item['group_id'] === $group['id']) {
                    $group_items[] = ['id' => (int)$item['id'], 'text' => $item['text']];
                }
            }
            $result_groups[] = [
                'id' => $group['id'],
                'name' => $group['name'],
                'tier' => (int)$group['tier'],
                'color' => $group['color'],
                'items' => $group_items,
            ];
        }

        return rest_ensure_response(['groups' => $result_groups]);
    }

    public static function complete_puzzle($request) {
        $user_id = get_current_user_id();
        $params = $request->get_json_params();

        $puzzle_date = sanitize_text_field($params['puzzle_date'] ?? '');
        $solved = (bool)($params['solved'] ?? false);
        $mistakes = (int)($params['mistakes'] ?? 0);
        $solve_time_secs = isset($params['solve_time_secs']) ? (int)$params['solve_time_secs'] : null;
        $groups_order = $params['groups_order'] ?? [];

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $puzzle_date)) {
            return new WP_Error('invalid', 'Invalid date format', ['status' => 400]);
        }

        // Verify puzzle exists before saving result
        $puzzle = TAG_Connections_Database::get_puzzle_by_date($puzzle_date);
        if (!$puzzle) {
            return new WP_Error('not_found', 'No puzzle found for this date', ['status' => 404]);
        }

        // Save result
        TAG_Connections_Database::save_result($user_id, [
            'puzzle_date' => $puzzle_date,
            'solved' => $solved,
            'mistakes' => $mistakes,
            'solve_time_secs' => $solve_time_secs,
            'groups_order' => $groups_order,
        ]);

        // Update streak
        $streak = TAG_Connections_Database::get_streak($user_id);
        $yesterday = date('Y-m-d', strtotime($puzzle_date . ' -1 day'));

        $new_streak = 0;
        if ($solved) {
            if ($streak && $streak->last_played === $yesterday) {
                $new_streak = ($streak->current_streak ?? 0) + 1;
            } elseif ($streak && $streak->last_played === $puzzle_date) {
                $new_streak = $streak->current_streak ?? 1;
            } else {
                $new_streak = 1;
            }
        }

        $longest = max($new_streak, ($streak ? $streak->longest_streak : 0));

        TAG_Connections_Database::update_streak($user_id, [
            'current_streak' => $new_streak,
            'longest_streak' => $longest,
            'last_played' => $puzzle_date,
            'shield_available' => $streak ? (bool)$streak->shield_available : true,
        ]);

        return rest_ensure_response(['saved' => true]);
    }

    public static function get_user_stats($request) {
        $user_id = get_current_user_id();

        $stats = TAG_Connections_Database::get_user_stats($user_id);
        $streak = TAG_Connections_Database::get_streak($user_id);

        $played = (int)($stats->played ?? 0);
        $won = (int)($stats->won ?? 0);

        return rest_ensure_response([
            'played' => $played,
            'won' => $won,
            'win_rate' => $played > 0 ? round(($won / $played) * 100) : 0,
            'avg_mistakes' => round((float)($stats->avg_mistakes ?? 0), 1),
            'avg_solve_time' => (int)round((float)($stats->avg_solve_time ?? 0)),
            'current_streak' => (int)($streak ? $streak->current_streak : 0),
            'longest_streak' => (int)($streak ? $streak->longest_streak : 0),
            'last_played' => $streak ? $streak->last_played : null,
            'shield_available' => $streak ? (bool)$streak->shield_available : true,
        ]);
    }

    // =========================================================
    // Admin endpoints
    // =========================================================

    public static function admin_get_puzzles($request) {
        $puzzles = TAG_Connections_Database::get_all_puzzles();
        return rest_ensure_response($puzzles);
    }

    public static function admin_get_puzzle($request) {
        $date = $request['date'];
        $puzzle = TAG_Connections_Database::get_puzzle_by_date($date);

        if (!$puzzle) {
            return new WP_Error('not_found', 'No puzzle found', ['status' => 404]);
        }

        // Return full puzzle with answers for admin
        return rest_ensure_response([
            'id' => (int)$puzzle->id,
            'puzzle_date' => $puzzle->puzzle_date,
            'title' => $puzzle->title,
            'items' => json_decode($puzzle->items, true),
            'groups' => json_decode($puzzle->groups_data, true),
            'created_at' => $puzzle->created_at,
        ]);
    }

    public static function admin_save_puzzle($request) {
        $params = $request->get_json_params();

        $puzzle_date = sanitize_text_field($params['puzzle_date'] ?? '');
        $title = sanitize_text_field($params['title'] ?? '');
        $items = $params['items'] ?? [];
        $groups = $params['groups'] ?? [];

        // Validate counts
        if (count($items) !== 16) {
            return new WP_Error('invalid', 'Must have exactly 16 items', ['status' => 400]);
        }
        if (count($groups) !== 4) {
            return new WP_Error('invalid', 'Must have exactly 4 groups', ['status' => 400]);
        }

        // Validate date format
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $puzzle_date)) {
            return new WP_Error('invalid', 'Invalid date format', ['status' => 400]);
        }

        // Validate each group has required fields
        $group_ids = [];
        foreach ($groups as $group) {
            if (empty($group['id']) || empty(trim($group['name'] ?? ''))) {
                return new WP_Error('invalid', 'Each group must have an id and name', ['status' => 400]);
            }
            $group_ids[] = $group['id'];
        }

        // Validate each item has required fields and valid group reference
        $item_texts = [];
        foreach ($items as $item) {
            if (empty(trim($item['text'] ?? ''))) {
                return new WP_Error('invalid', 'Each item must have text', ['status' => 400]);
            }
            if (!isset($item['group_id']) || !in_array($item['group_id'], $group_ids, true)) {
                return new WP_Error('invalid', 'Each item must reference a valid group', ['status' => 400]);
            }
            $lower = strtolower(trim($item['text']));
            if (in_array($lower, $item_texts, true)) {
                return new WP_Error('invalid', 'Duplicate item text: ' . $item['text'], ['status' => 400]);
            }
            $item_texts[] = $lower;
        }

        $result = TAG_Connections_Database::save_puzzle([
            'puzzle_date' => $puzzle_date,
            'title' => $title,
            'items' => $items,
            'groups_data' => $groups,
        ]);

        return rest_ensure_response($result);
    }

    public static function admin_delete_puzzle($request) {
        $id = (int)$request['id'];
        $deleted = TAG_Connections_Database::delete_puzzle($id);

        if (!$deleted) {
            return new WP_Error('not_found', 'Puzzle not found', ['status' => 404]);
        }

        return rest_ensure_response(['success' => true]);
    }

    public static function admin_trigger_schedule($request) {
        $params = $request->get_json_params();
        $days = (int)($params['days'] ?? 30);
        $days = max(1, min($days, 60));

        TAG_Connections_Scheduler::fill_upcoming_puzzles($days);

        return rest_ensure_response([
            'success' => true,
            'message' => "Scheduled puzzles for the next {$days} days",
        ]);
    }

    // =========================================================
    // Helpers
    // =========================================================

    private static function strip_answers($puzzle) {
        $items = json_decode($puzzle->items, true);
        $groups = json_decode($puzzle->groups_data, true);

        if (!is_array($items) || !is_array($groups)) {
            return ['id' => (int)$puzzle->id, 'puzzle_date' => $puzzle->puzzle_date, 'title' => $puzzle->title, 'items' => [], 'group_count' => 0];
        }

        // Strip group_id from items
        $safe_items = array_map(function($item) {
            return ['id' => (int)$item['id'], 'text' => $item['text']];
        }, $items);

        return [
            'id' => (int)$puzzle->id,
            'puzzle_date' => $puzzle->puzzle_date,
            'title' => $puzzle->title,
            'items' => $safe_items,
            'group_count' => count($groups),
        ];
    }
}
