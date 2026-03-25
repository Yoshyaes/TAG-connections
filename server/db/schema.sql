-- TAG Connections Database Schema

CREATE TABLE IF NOT EXISTS puzzles (
  id           SERIAL PRIMARY KEY,
  puzzle_date  DATE UNIQUE NOT NULL,
  title        TEXT,
  items        JSONB NOT NULL,
  groups       JSONB NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
  id               SERIAL PRIMARY KEY,
  user_id          UUID REFERENCES users(id),
  puzzle_date      DATE NOT NULL,
  solved           BOOLEAN NOT NULL,
  mistakes         INTEGER NOT NULL DEFAULT 0,
  solve_time_secs  INTEGER,
  groups_order     JSONB,
  completed_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, puzzle_date)
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id          UUID REFERENCES users(id) PRIMARY KEY,
  current_streak   INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_played      DATE,
  shield_available BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_puzzles_date ON puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(puzzle_date);
