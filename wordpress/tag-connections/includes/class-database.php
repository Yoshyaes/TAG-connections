<?php
if (!defined('ABSPATH')) exit;

class TAG_Connections_Database {

    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        $prefix = $wpdb->prefix;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $sql = "CREATE TABLE {$prefix}tag_puzzles (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            puzzle_date DATE UNIQUE NOT NULL,
            title VARCHAR(255),
            items JSON NOT NULL,
            groups_data JSON NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) $charset_collate;";
        dbDelta($sql);

        $sql = "CREATE TABLE {$prefix}tag_results (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            puzzle_date DATE NOT NULL,
            solved TINYINT(1) NOT NULL,
            mistakes INT NOT NULL DEFAULT 0,
            solve_time_secs INT,
            groups_order JSON,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY user_puzzle (user_id, puzzle_date)
        ) $charset_collate;";
        dbDelta($sql);

        $sql = "CREATE TABLE {$prefix}tag_streaks (
            user_id BIGINT UNSIGNED PRIMARY KEY,
            current_streak INT DEFAULT 0,
            longest_streak INT DEFAULT 0,
            last_played DATE,
            shield_available TINYINT(1) DEFAULT 1
        ) $charset_collate;";
        dbDelta($sql);
    }

    public static function seed_sample_puzzles() {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_puzzles';

        // Only seed if table is empty
        $count = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table");
        if ($count > 0) return;

        $today = current_time('Y-m-d');
        $yesterday = date('Y-m-d', strtotime($today . ' -1 day'));
        $tomorrow = date('Y-m-d', strtotime($today . ' +1 day'));

        $puzzles = [
            [
                'puzzle_date' => $yesterday,
                'title' => 'Legends Never Die',
                'items' => json_encode([
                    ['id' => 1, 'text' => 'Wraith', 'group_id' => 'A'],
                    ['id' => 2, 'text' => 'Octane', 'group_id' => 'A'],
                    ['id' => 3, 'text' => 'Valkyrie', 'group_id' => 'A'],
                    ['id' => 4, 'text' => 'Horizon', 'group_id' => 'A'],
                    ['id' => 5, 'text' => 'Tilted Towers', 'group_id' => 'B'],
                    ['id' => 6, 'text' => 'Salty Springs', 'group_id' => 'B'],
                    ['id' => 7, 'text' => 'Dusty Depot', 'group_id' => 'B'],
                    ['id' => 8, 'text' => 'Greasy Grove', 'group_id' => 'B'],
                    ['id' => 9, 'text' => 'Joel', 'group_id' => 'C'],
                    ['id' => 10, 'text' => 'Booker DeWitt', 'group_id' => 'C'],
                    ['id' => 11, 'text' => 'Sam Drake', 'group_id' => 'C'],
                    ['id' => 12, 'text' => 'Pagan Min', 'group_id' => 'C'],
                    ['id' => 13, 'text' => 'Master Chief', 'group_id' => 'D'],
                    ['id' => 14, 'text' => 'Doom Slayer', 'group_id' => 'D'],
                    ['id' => 15, 'text' => 'Gordon Freeman', 'group_id' => 'D'],
                    ['id' => 16, 'text' => 'Jack Cooper', 'group_id' => 'D'],
                ]),
                'groups_data' => json_encode([
                    ['id' => 'A', 'name' => 'Apex Legends Characters', 'tier' => 1, 'color' => 'green'],
                    ['id' => 'B', 'name' => 'Fortnite Chapter 1 POIs', 'tier' => 2, 'color' => 'blue'],
                    ['id' => 'C', 'name' => 'Voiced by Troy Baker', 'tier' => 3, 'color' => 'purple'],
                    ['id' => 'D', 'name' => 'FPS Protagonists', 'tier' => 4, 'color' => 'gold'],
                ]),
            ],
            [
                'puzzle_date' => $today,
                'title' => 'Press Start',
                'items' => json_encode([
                    ['id' => 1, 'text' => 'Peacekeeper', 'group_id' => 'A'],
                    ['id' => 2, 'text' => 'Wingman', 'group_id' => 'A'],
                    ['id' => 3, 'text' => 'Kraber', 'group_id' => 'A'],
                    ['id' => 4, 'text' => 'Devotion', 'group_id' => 'A'],
                    ['id' => 5, 'text' => 'Sanctuary', 'group_id' => 'B'],
                    ['id' => 6, 'text' => 'Vault of Glass', 'group_id' => 'B'],
                    ['id' => 7, 'text' => 'Wrath of the Machine', 'group_id' => 'B'],
                    ['id' => 8, 'text' => "King's Fall", 'group_id' => 'B'],
                    ['id' => 9, 'text' => 'Pikachu', 'group_id' => 'C'],
                    ['id' => 10, 'text' => 'Charizard', 'group_id' => 'C'],
                    ['id' => 11, 'text' => 'Mewtwo', 'group_id' => 'C'],
                    ['id' => 12, 'text' => 'Jigglypuff', 'group_id' => 'C'],
                    ['id' => 13, 'text' => 'Ellie', 'group_id' => 'D'],
                    ['id' => 14, 'text' => 'Clementine', 'group_id' => 'D'],
                    ['id' => 15, 'text' => 'Elizabeth', 'group_id' => 'D'],
                    ['id' => 16, 'text' => 'Aloy', 'group_id' => 'D'],
                ]),
                'groups_data' => json_encode([
                    ['id' => 'A', 'name' => 'Apex Legends Weapons', 'tier' => 1, 'color' => 'green'],
                    ['id' => 'B', 'name' => 'Destiny Raids', 'tier' => 2, 'color' => 'blue'],
                    ['id' => 'C', 'name' => 'OG Smash Bros Roster', 'tier' => 3, 'color' => 'purple'],
                    ['id' => 'D', 'name' => "Gaming's Toughest Daughters", 'tier' => 4, 'color' => 'gold'],
                ]),
            ],
            [
                'puzzle_date' => $tomorrow,
                'title' => 'GG No Re',
                'items' => json_encode([
                    ['id' => 1, 'text' => 'The Witcher', 'group_id' => 'A'],
                    ['id' => 2, 'text' => 'Arcane', 'group_id' => 'A'],
                    ['id' => 3, 'text' => 'Castlevania', 'group_id' => 'A'],
                    ['id' => 4, 'text' => 'Cyberpunk', 'group_id' => 'A'],
                    ['id' => 5, 'text' => 'Diamond', 'group_id' => 'B'],
                    ['id' => 6, 'text' => 'Master', 'group_id' => 'B'],
                    ['id' => 7, 'text' => 'Predator', 'group_id' => 'B'],
                    ['id' => 8, 'text' => 'Radiant', 'group_id' => 'B'],
                    ['id' => 9, 'text' => 'Mercy', 'group_id' => 'C'],
                    ['id' => 10, 'text' => 'Ana', 'group_id' => 'C'],
                    ['id' => 11, 'text' => 'Moira', 'group_id' => 'C'],
                    ['id' => 12, 'text' => 'Kiriko', 'group_id' => 'C'],
                    ['id' => 13, 'text' => 'Nuke', 'group_id' => 'D'],
                    ['id' => 14, 'text' => 'Dust', 'group_id' => 'D'],
                    ['id' => 15, 'text' => 'Mirage', 'group_id' => 'D'],
                    ['id' => 16, 'text' => 'Inferno', 'group_id' => 'D'],
                ]),
                'groups_data' => json_encode([
                    ['id' => 'A', 'name' => 'Games Turned Netflix Shows', 'tier' => 1, 'color' => 'green'],
                    ['id' => 'B', 'name' => 'Valorant/Apex Rank Names', 'tier' => 2, 'color' => 'blue'],
                    ['id' => 'C', 'name' => 'Overwatch 2 Healers', 'tier' => 3, 'color' => 'purple'],
                    ['id' => 'D', 'name' => 'Classic CS:GO Maps', 'tier' => 4, 'color' => 'gold'],
                ]),
            ],
        ];

        foreach ($puzzles as $puzzle) {
            $wpdb->replace($table, $puzzle);
        }
    }

    // --- Query helpers ---

    public static function get_puzzle_by_date($date) {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_puzzles';
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE puzzle_date = %s", $date
        ));
    }

    public static function get_all_puzzles() {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_puzzles';
        return $wpdb->get_results(
            "SELECT id, puzzle_date, title, created_at FROM $table ORDER BY puzzle_date DESC"
        );
    }

    public static function save_puzzle($data) {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_puzzles';

        $existing = self::get_puzzle_by_date($data['puzzle_date']);

        if ($existing) {
            $wpdb->update($table, [
                'title' => $data['title'],
                'items' => is_string($data['items']) ? $data['items'] : json_encode($data['items']),
                'groups_data' => is_string($data['groups_data']) ? $data['groups_data'] : json_encode($data['groups_data']),
            ], ['puzzle_date' => $data['puzzle_date']]);
            return self::get_puzzle_by_date($data['puzzle_date']);
        }

        $wpdb->insert($table, [
            'puzzle_date' => $data['puzzle_date'],
            'title' => $data['title'],
            'items' => is_string($data['items']) ? $data['items'] : json_encode($data['items']),
            'groups_data' => is_string($data['groups_data']) ? $data['groups_data'] : json_encode($data['groups_data']),
        ]);
        return self::get_puzzle_by_date($data['puzzle_date']);
    }

    public static function delete_puzzle($id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_puzzles';
        return $wpdb->delete($table, ['id' => $id]);
    }

    public static function save_result($user_id, $data) {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_results';

        $wpdb->replace($table, [
            'user_id' => $user_id,
            'puzzle_date' => $data['puzzle_date'],
            'solved' => $data['solved'] ? 1 : 0,
            'mistakes' => $data['mistakes'],
            'solve_time_secs' => $data['solve_time_secs'],
            'groups_order' => is_string($data['groups_order']) ? $data['groups_order'] : json_encode($data['groups_order']),
            'completed_at' => current_time('mysql'),
        ]);
    }

    public static function get_streak($user_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_streaks';
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE user_id = %d", $user_id
        ));
    }

    public static function update_streak($user_id, $data) {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_streaks';

        $wpdb->replace($table, [
            'user_id' => $user_id,
            'current_streak' => $data['current_streak'],
            'longest_streak' => $data['longest_streak'],
            'last_played' => $data['last_played'],
            'shield_available' => $data['shield_available'] ? 1 : 0,
        ]);
    }

    public static function get_user_stats($user_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'tag_results';

        return $wpdb->get_row($wpdb->prepare(
            "SELECT
                COUNT(*) AS played,
                SUM(CASE WHEN solved = 1 THEN 1 ELSE 0 END) AS won,
                COALESCE(AVG(mistakes), 0) AS avg_mistakes,
                COALESCE(AVG(CASE WHEN solved = 1 THEN solve_time_secs ELSE NULL END), 0) AS avg_solve_time
            FROM $table WHERE user_id = %d",
            $user_id
        ));
    }
}
