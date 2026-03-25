import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- Puzzles ---

export async function getPuzzleByDate(date) {
  const { rows } = await pool.query(
    'SELECT id, puzzle_date, title, items, groups FROM puzzles WHERE puzzle_date = $1',
    [date]
  );
  return rows[0] || null;
}

export async function getAllPuzzles() {
  const { rows } = await pool.query(
    'SELECT id, puzzle_date, title, created_at FROM puzzles ORDER BY puzzle_date DESC'
  );
  return rows;
}

export async function createPuzzle({ puzzle_date, title, items, groups }) {
  const { rows } = await pool.query(
    `INSERT INTO puzzles (puzzle_date, title, items, groups)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (puzzle_date) DO UPDATE
     SET title = $2, items = $3, groups = $4
     RETURNING *`,
    [puzzle_date, title, JSON.stringify(items), JSON.stringify(groups)]
  );
  return rows[0];
}

export async function updatePuzzle(id, { title, items, groups }) {
  const { rows } = await pool.query(
    `UPDATE puzzles SET title = $1, items = $2, groups = $3
     WHERE id = $4 RETURNING *`,
    [title, JSON.stringify(items), JSON.stringify(groups), id]
  );
  return rows[0] || null;
}

export async function deletePuzzle(id) {
  const { rowCount } = await pool.query('DELETE FROM puzzles WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- Results ---

export async function getResultByUserAndDate(userId, puzzleDate) {
  const { rows } = await pool.query(
    'SELECT * FROM results WHERE user_id = $1 AND puzzle_date = $2',
    [userId, puzzleDate]
  );
  return rows[0] || null;
}

export async function upsertResult({ user_id, puzzle_date, solved, mistakes, solve_time_secs, groups_order }) {
  const { rows } = await pool.query(
    `INSERT INTO results (user_id, puzzle_date, solved, mistakes, solve_time_secs, groups_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, puzzle_date) DO UPDATE
     SET solved = $3, mistakes = $4, solve_time_secs = $5, groups_order = $6, completed_at = NOW()
     RETURNING *`,
    [user_id, puzzle_date, solved, mistakes, solve_time_secs, JSON.stringify(groups_order)]
  );
  return rows[0];
}

// --- Streaks ---

export async function getStreak(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM streaks WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
}

export async function updateStreak(userId, { current_streak, longest_streak, last_played, shield_available }) {
  const { rows } = await pool.query(
    `INSERT INTO streaks (user_id, current_streak, longest_streak, last_played, shield_available)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
     SET current_streak = $2, longest_streak = $3, last_played = $4, shield_available = $5
     RETURNING *`,
    [userId, current_streak, longest_streak, last_played, shield_available]
  );
  return rows[0];
}

// --- User Stats ---

export async function getUserStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) AS played,
       COUNT(*) FILTER (WHERE solved = true) AS won,
       COALESCE(AVG(mistakes), 0) AS avg_mistakes,
       COALESCE(AVG(solve_time_secs) FILTER (WHERE solved = true), 0) AS avg_solve_time
     FROM results
     WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

// --- Users ---

export async function findOrCreateUser({ id, email, display_name, avatar_url }) {
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
     SET email = COALESCE($2, users.email),
         display_name = COALESCE($3, users.display_name),
         avatar_url = COALESCE($4, users.avatar_url)
     RETURNING *`,
    [id, email, display_name, avatar_url]
  );
  return rows[0];
}

export default pool;
