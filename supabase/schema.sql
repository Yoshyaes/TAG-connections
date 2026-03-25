-- TAG Connections — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS puzzles (
  id           SERIAL PRIMARY KEY,
  puzzle_date  DATE UNIQUE NOT NULL,
  title        TEXT,
  items        JSONB NOT NULL,
  groups       JSONB NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
  id               SERIAL PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id),
  puzzle_date      DATE NOT NULL,
  solved           BOOLEAN NOT NULL,
  mistakes         INTEGER NOT NULL DEFAULT 0,
  solve_time_secs  INTEGER,
  groups_order     JSONB,
  completed_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, puzzle_date)
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id          UUID REFERENCES auth.users(id) PRIMARY KEY,
  current_streak   INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_played      DATE,
  shield_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name  TEXT,
  avatar_url    TEXT,
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puzzles_date ON puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(puzzle_date);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Puzzles: no direct read from client (use RPC functions instead)
-- Admins can CRUD via dashboard or admin RPC
CREATE POLICY "Admins can manage puzzles"
  ON puzzles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Results: users can read/insert their own
CREATE POLICY "Users can read own results"
  ON results FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own results"
  ON results FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own results"
  ON results FOR UPDATE
  USING (user_id = auth.uid());

-- Streaks: users can read/upsert their own
CREATE POLICY "Users can read own streak"
  ON streaks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own streak"
  ON streaks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING (user_id = auth.uid());

-- Profiles: users can read/update their own
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Admins can read all profiles (for admin panel)
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- RPC FUNCTIONS (server-side logic, SECURITY DEFINER)
-- These run as the DB owner — clients cannot see raw puzzle answers
-- ============================================================

-- Get a puzzle by date (strips group_id from items)
CREATE OR REPLACE FUNCTION get_puzzle(p_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'puzzle_date', p.puzzle_date,
    'title', p.title,
    'items', (
      SELECT json_agg(
        json_build_object(
          'id', (item->>'id')::INTEGER,
          'text', item->>'text'
        )
      )
      FROM jsonb_array_elements(p.items) AS item
    ),
    'group_count', jsonb_array_length(p.groups)
  ) INTO result
  FROM puzzles p
  WHERE p.puzzle_date = p_date;

  RETURN result;
END;
$$;

-- Submit a guess (server-side group validation)
CREATE OR REPLACE FUNCTION submit_guess(p_date DATE, p_selected_ids INTEGER[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  puzzle_row puzzles%ROWTYPE;
  group_ids TEXT[];
  target_group_id TEXT;
  group_info JSONB;
  group_items JSON;
BEGIN
  SELECT * INTO puzzle_row FROM puzzles WHERE puzzle_date = p_date;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'No puzzle found for this date');
  END IF;

  IF array_length(p_selected_ids, 1) IS DISTINCT FROM 4 THEN
    RETURN json_build_object('error', 'Must submit exactly 4 items');
  END IF;

  -- Get group_ids for selected items
  SELECT array_agg(item->>'group_id')
  INTO group_ids
  FROM jsonb_array_elements(puzzle_row.items) AS item
  WHERE (item->>'id')::INTEGER = ANY(p_selected_ids);

  IF array_length(group_ids, 1) IS DISTINCT FROM 4 THEN
    RETURN json_build_object('error', 'Invalid item IDs');
  END IF;

  -- Check if all belong to the same group
  IF group_ids[1] = group_ids[2]
     AND group_ids[2] = group_ids[3]
     AND group_ids[3] = group_ids[4]
  THEN
    target_group_id := group_ids[1];

    SELECT elem INTO group_info
    FROM jsonb_array_elements(puzzle_row.groups) AS elem
    WHERE elem->>'id' = target_group_id;

    SELECT json_agg(json_build_object(
      'id', (item->>'id')::INTEGER,
      'text', item->>'text'
    )) INTO group_items
    FROM jsonb_array_elements(puzzle_row.items) AS item
    WHERE item->>'group_id' = target_group_id;

    RETURN json_build_object(
      'correct', TRUE,
      'group', json_build_object(
        'id', group_info->>'id',
        'name', group_info->>'name',
        'tier', (group_info->>'tier')::INTEGER,
        'color', group_info->>'color',
        'items', group_items
      )
    );
  ELSE
    RETURN json_build_object('correct', FALSE);
  END IF;
END;
$$;

-- Reveal all groups (called on failure)
CREATE OR REPLACE FUNCTION reveal_all_groups(p_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  puzzle_row puzzles%ROWTYPE;
  result JSON;
BEGIN
  SELECT * INTO puzzle_row FROM puzzles WHERE puzzle_date = p_date;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'No puzzle found');
  END IF;

  SELECT json_build_object(
    'groups', (
      SELECT json_agg(
        json_build_object(
          'id', g->>'id',
          'name', g->>'name',
          'tier', (g->>'tier')::INTEGER,
          'color', g->>'color',
          'items', (
            SELECT json_agg(json_build_object(
              'id', (item->>'id')::INTEGER,
              'text', item->>'text'
            ))
            FROM jsonb_array_elements(puzzle_row.items) AS item
            WHERE item->>'group_id' = g->>'id'
          )
        )
      )
      FROM jsonb_array_elements(puzzle_row.groups) AS g
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Complete puzzle (save result + update streak, called by authenticated users)
CREATE OR REPLACE FUNCTION complete_puzzle(
  p_date DATE,
  p_solved BOOLEAN,
  p_mistakes INTEGER,
  p_solve_time INTEGER,
  p_groups_order JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_streak streaks%ROWTYPE;
  v_yesterday DATE;
  v_new_streak INTEGER;
  v_longest INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('saved', FALSE, 'message', 'Not authenticated');
  END IF;

  -- Upsert result
  INSERT INTO results (user_id, puzzle_date, solved, mistakes, solve_time_secs, groups_order)
  VALUES (v_user_id, p_date, p_solved, p_mistakes, p_solve_time, p_groups_order)
  ON CONFLICT (user_id, puzzle_date) DO UPDATE
  SET solved = p_solved, mistakes = p_mistakes,
      solve_time_secs = p_solve_time, groups_order = p_groups_order,
      completed_at = NOW();

  -- Update streak
  v_yesterday := p_date - INTERVAL '1 day';

  SELECT * INTO v_streak FROM streaks WHERE user_id = v_user_id;

  IF p_solved THEN
    IF v_streak IS NOT NULL AND v_streak.last_played = v_yesterday THEN
      v_new_streak := COALESCE(v_streak.current_streak, 0) + 1;
    ELSIF v_streak IS NOT NULL AND v_streak.last_played = p_date THEN
      v_new_streak := COALESCE(v_streak.current_streak, 1);
    ELSE
      v_new_streak := 1;
    END IF;
  ELSE
    v_new_streak := 0;
  END IF;

  v_longest := GREATEST(v_new_streak, COALESCE(v_streak.longest_streak, 0));

  INSERT INTO streaks (user_id, current_streak, longest_streak, last_played, shield_available)
  VALUES (v_user_id, v_new_streak, v_longest, p_date, COALESCE(v_streak.shield_available, TRUE))
  ON CONFLICT (user_id) DO UPDATE
  SET current_streak = v_new_streak, longest_streak = v_longest,
      last_played = p_date;

  RETURN json_build_object('saved', TRUE);
END;
$$;

-- Get user stats
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_stats JSON;
  v_streak streaks%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT json_build_object(
    'played', COUNT(*),
    'won', COUNT(*) FILTER (WHERE solved = TRUE),
    'win_rate', CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE solved = TRUE))::NUMERIC / COUNT(*) * 100)
      ELSE 0 END,
    'avg_mistakes', COALESCE(ROUND(AVG(mistakes)::NUMERIC, 1), 0),
    'avg_solve_time', COALESCE(ROUND(AVG(solve_time_secs) FILTER (WHERE solved = TRUE)), 0)
  ) INTO v_stats
  FROM results WHERE user_id = v_user_id;

  SELECT * INTO v_streak FROM streaks WHERE user_id = v_user_id;

  RETURN json_build_object(
    'played', (v_stats->>'played')::INTEGER,
    'won', (v_stats->>'won')::INTEGER,
    'win_rate', (v_stats->>'win_rate')::INTEGER,
    'avg_mistakes', (v_stats->>'avg_mistakes')::NUMERIC,
    'avg_solve_time', (v_stats->>'avg_solve_time')::INTEGER,
    'current_streak', COALESCE(v_streak.current_streak, 0),
    'longest_streak', COALESCE(v_streak.longest_streak, 0),
    'last_played', v_streak.last_played,
    'shield_available', COALESCE(v_streak.shield_available, TRUE)
  );
END;
$$;

-- Admin: get all puzzles (list view)
CREATE OR REPLACE FUNCTION admin_get_puzzles()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  RETURN (
    SELECT json_agg(json_build_object(
      'id', id,
      'puzzle_date', puzzle_date,
      'title', title,
      'created_at', created_at
    ) ORDER BY puzzle_date DESC)
    FROM puzzles
  );
END;
$$;

-- Admin: get full puzzle by date (with answers)
CREATE OR REPLACE FUNCTION admin_get_puzzle(p_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  RETURN (
    SELECT row_to_json(p)
    FROM puzzles p
    WHERE p.puzzle_date = p_date
  );
END;
$$;

-- Admin: upsert puzzle
CREATE OR REPLACE FUNCTION admin_save_puzzle(
  p_date DATE,
  p_title TEXT,
  p_items JSONB,
  p_groups JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result puzzles%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  -- Validate: 16 items, 4 groups, 4 items per group
  IF jsonb_array_length(p_items) != 16 THEN
    RETURN json_build_object('error', 'Must have exactly 16 items');
  END IF;
  IF jsonb_array_length(p_groups) != 4 THEN
    RETURN json_build_object('error', 'Must have exactly 4 groups');
  END IF;

  INSERT INTO puzzles (puzzle_date, title, items, groups)
  VALUES (p_date, p_title, p_items, p_groups)
  ON CONFLICT (puzzle_date) DO UPDATE
  SET title = p_title, items = p_items, groups = p_groups
  RETURNING * INTO v_result;

  RETURN row_to_json(v_result);
END;
$$;

-- Admin: delete puzzle
CREATE OR REPLACE FUNCTION admin_delete_puzzle(p_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  DELETE FROM puzzles WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Puzzle not found');
  END IF;

  RETURN json_build_object('success', TRUE);
END;
$$;

-- Grant execute on all functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_puzzle(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_guess(DATE, INTEGER[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reveal_all_groups(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_puzzle(DATE, BOOLEAN, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_puzzles() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_puzzle(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_save_puzzle(DATE, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_puzzle(INTEGER) TO authenticated;
