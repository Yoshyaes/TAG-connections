# TAG Connections — Product Requirements Document

> **Build Target:** Replit (React + Node.js + PostgreSQL)
> **Version:** 1.0 | **Owner:** Fred Twum-Acheampong / Two Average Gamers

---

## Executive Summary

TAG Connections is a daily web-based puzzle game for Two Average Gamers where players sort 16 gaming-themed items into four secret categories of four. It is the first gaming-specific adaptation of the NYT Connections format — a game that generated 3.3 billion plays in its first full year. The goal is to create a sticky daily ritual for TAG's 28–42 year-old casual-core audience that drives measurable repeat traffic, streak behavior, and social sharing.

---

## Problem Statement

Two Average Gamers publishes high-quality gaming content but lacks an on-site interactive engagement loop that brings users back daily. Blog articles drive one-time visits via SEO; there is no mechanism to create daily return behavior. Gaming-themed daily puzzle games are completely uncontested — no major gaming media outlet (IGN, Kotaku, Polygon) has built one. The few gaming quizzes that exist (Sporcle gaming category, basic trivia) have no daily format, no streak mechanics, and no social sharing. TAG's audience already plays games daily and shares gaming takes on social media — they just need a reason to do it on TAG.

---

## Solution Overview

A daily browser game playable at `twaveragegamers.com/connections` (or subdomain). Every day at midnight EST, a new puzzle drops: 16 gaming-related words/phrases that players must sort into four hidden groups of four. Each group has a color-coded difficulty tier. Players get four mistakes before failing. Upon completion, results are displayed as a shareable color grid. User accounts track streaks, win rates, and play history. A puzzle admin panel allows manual puzzle creation and scheduling.

---

## Target Users

**Primary:** TAG readers, ages 28–42, casual-core gamers who play mainstream titles (Marvel Rivals, Fortnite, Apex, Diablo 4, Palworld) and have 10–20+ years of gaming history. They play daily but in short sessions. They share gaming takes on Twitter/X, Reddit, and Discord.

**Secondary:** Casual gaming fans who discover the game via social sharing or search ("gaming connections game") and become new TAG readers.

---

## Design System

### Brand Identity
TAG Connections should feel like a premium gaming product — not a cheap clone. The visual language borrows from modern game UI (dark mode, neon accents, smooth animations) while staying legible and mobile-friendly.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0F0F14` | Main background |
| `--bg-card` | `#1A1A24` | Puzzle tile backgrounds |
| `--bg-surface` | `#22222E` | Modal, sidebar surfaces |
| `--accent-primary` | `#7C4DFF` | CTA buttons, selected state, brand color |
| `--accent-secondary` | `#00E5FF` | Hover states, links |
| `--text-primary` | `#F0F0FF` | Headings, tile text |
| `--text-secondary` | `#9090AA` | Labels, subtext, hints |
| `--border` | `#2E2E3E` | Tile borders, dividers |

### Difficulty Tier Colors (Category Reveal)

| Tier | Color Name | Hex | Description |
|------|-----------|-----|-------------|
| 1 (Easiest) | `--tier-green` | `#22C55E` | Obvious grouping |
| 2 | `--tier-blue` | `#3B82F6` | Moderate |
| 3 | `--tier-purple` | `#A855F7` | Tricky |
| 4 (Hardest) | `--tier-gold` | `#EAB308` | Requires deep knowledge |

### Typography

| Use | Font | Size | Weight |
|-----|------|------|--------|
| Game title | `Inter` or `Space Grotesk` | 28px | 800 |
| Tile text | `Inter` | 14–16px | 600 |
| Body/labels | `Inter` | 13–14px | 400 |
| Category reveal | `Space Grotesk` | 15px | 700 |

### Layout Principles
- Max width: `480px` centered on desktop (mobile-first card layout)
- Puzzle grid: `4×4` CSS Grid, `gap: 8px`, tiles with `border-radius: 10px`
- Tile states: default / hovered / selected (purple border + slight lift) / correct (tier color fill) / wrong (shake animation + red flash)
- Subtle grain texture on `--bg-primary` for depth
- Confetti burst (canvas-based) on puzzle completion

### Animations
- Tile select: `scale(1.03)` + border glow — 100ms ease
- Wrong guess: `shake` keyframe — 400ms
- Correct group: tiles flip face-down, fade in with tier color — 500ms stagger
- Completion: confetti + score card slide-up — 800ms total
- Streak milestone (7, 30, 100 days): full-screen particle burst

---

## Core Features

### Phase 1: MVP (Weeks 1–2)

| Feature | Description | Priority | Complexity |
|---------|-------------|----------|------------|
| Daily puzzle engine | Date-indexed puzzle loads from DB at midnight EST | P0 | Low |
| 4×4 puzzle grid | Selectable tiles, 4-tile group validation | P0 | Low |
| Mistake tracker | 4 mistakes = fail state with reveal | P0 | Low |
| Correct group reveal | Color-coded tier reveal with animation | P0 | Med |
| Share results card | Spoiler-free emoji grid + copy-to-clipboard | P0 | Low |
| localStorage persistence | Game state survives page refresh | P0 | Low |
| Mobile responsive layout | Full playability on 375px+ screens | P0 | Low |
| Puzzle admin panel | Auth-protected CRUD for daily puzzles | P0 | Med |

### Phase 2: Accounts + Streaks (Weeks 3–4)

| Feature | Description | Priority | Complexity |
|---------|-------------|----------|------------|
| User auth | Email/password + Google OAuth via Supabase Auth or Replit Auth | P0 | Med |
| Streak tracking | Current streak, longest streak, displayed on profile | P0 | Med |
| Win rate stats | Played / won / win % / avg mistakes | P0 | Low |
| Profile page | `/profile` — stats, streak calendar heatmap, recent results | P1 | Med |
| Streak recovery | One free "streak shield" per 30 days for missed day | P2 | Med |

### Phase 3: Community + Discovery (Weeks 5–8)

| Feature | Description | Priority | Complexity |
|---------|-------------|----------|------------|
| Global leaderboard | Daily leaderboard: fastest solve, fewest mistakes | P1 | Med |
| Archive mode | Play any past puzzle (no streak impact) | P1 | Low |
| Discord share button | Pre-formatted post for TAG Discord server | P2 | Low |
| TAG blog integration | Each puzzle links to a relevant TAG article | P2 | Low |
| Community puzzle submissions | Users suggest category ideas (moderated queue) | P2 | High |

---

## Technical Architecture

### System Overview

```
Browser (React SPA)
    │
    ├── Static game UI (tiles, animations, share card)
    ├── localStorage (today's game state, guest streaks)
    └── REST API calls ──► Node.js/Express (Replit)
                              │
                              ├── /api/puzzle/today     (GET daily puzzle)
                              ├── /api/puzzle/submit    (POST result)
                              ├── /api/user/stats       (GET streak/stats)
                              ├── /api/admin/puzzle     (POST/PUT/DELETE — protected)
                              └── PostgreSQL (Replit DB)
                                    ├── puzzles
                                    ├── users
                                    ├── results
                                    └── streaks
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React (Vite) | Component model fits tile/grid architecture; fast build pipeline on Replit |
| Styling | Tailwind CSS + custom CSS vars | Rapid dark-mode theming; utility classes for grid/layout |
| Animations | CSS keyframes + Framer Motion (light) | Tile flip and shake effects without heavy library |
| Backend | Node.js + Express | Lightweight; Replit-native; easy to add endpoints incrementally |
| Database | PostgreSQL (Replit DB) | Included in Replit Core; handles relational streak/result data cleanly |
| Auth | Replit Auth or Supabase Auth (free tier) | Zero-config OAuth; handles Google + email |
| Deployment | Replit Autoscale | Always-on, handles traffic spikes from viral sharing moments |

### Data Model

```sql
-- Daily puzzles
puzzles (
  id          SERIAL PRIMARY KEY,
  puzzle_date DATE UNIQUE NOT NULL,
  title       TEXT,                    -- Optional fun puzzle name
  items       JSONB NOT NULL,          -- Array of 16 {text, group_id}
  groups      JSONB NOT NULL,          -- Array of 4 {id, name, tier, color}
  created_at  TIMESTAMP DEFAULT NOW()
)

-- Users
users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
)

-- Individual game results
results (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  puzzle_date DATE NOT NULL,
  solved      BOOLEAN NOT NULL,
  mistakes    INTEGER NOT NULL DEFAULT 0,
  solve_time_seconds INTEGER,
  groups_order JSONB,                  -- Order groups were solved in
  completed_at TIMESTAMP DEFAULT NOW()
)

-- Streak tracking (denormalized for fast reads)
streaks (
  user_id       UUID REFERENCES users(id) PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played   DATE,
  shield_available BOOLEAN DEFAULT TRUE,
  shield_last_used DATE
)
```

### API Specifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/puzzle/today` | None | Returns today's puzzle (no answers — just items and group count) |
| GET | `/api/puzzle/:date` | None | Returns archive puzzle by date |
| POST | `/api/puzzle/submit` | Optional | Submits result, updates streak if authed |
| GET | `/api/user/stats` | Required | Returns streak, win rate, recent results |
| GET | `/api/leaderboard/daily` | None | Top 20 results for today's puzzle |
| POST | `/api/admin/puzzle` | Admin | Creates new puzzle |
| PUT | `/api/admin/puzzle/:id` | Admin | Updates existing puzzle |
| GET | `/api/admin/puzzles` | Admin | Lists all scheduled puzzles |

### Puzzle JSON Structure

```json
{
  "puzzle_date": "2026-04-01",
  "title": "\"These hands\" edition",
  "items": [
    {"id": 1, "text": "Kratos", "group_id": "A"},
    {"id": 2, "text": "Doom Slayer", "group_id": "A"},
    {"id": 3, "text": "Master Chief", "group_id": "A"},
    {"id": 4, "text": "B.J. Blazkowicz", "group_id": "A"},
    ... 12 more items
  ],
  "groups": [
    {"id": "A", "name": "FPS Protagonists", "tier": 1, "color": "green"},
    {"id": "B", "name": "Weapons in Apex Legends", "tier": 2, "color": "blue"},
    {"id": "C", "name": "Voiced by Nolan North", "tier": 3, "color": "purple"},
    {"id": "D", "name": "Name is also a city in Ohio", "tier": 4, "color": "gold"}
  ]
}
```

---

## User Flows

### First-Time Visitor (No Account)
1. User lands on `/connections` from TAG blog or social share link
2. Brief 3-second tutorial overlay: "Sort 16 items into 4 groups. 4 mistakes = game over."
3. User dismisses tutorial, sees puzzle grid + "Today's Puzzle #[N]" header
4. User taps tiles to select (purple highlight), taps "Submit" when 4 selected
5. Correct: group flips to tier color with label reveal + satisfying sound cue
6. Wrong: tiles shake, mistake counter increments (displayed as 4 dots → 3 → 2 → 1)
7. Puzzle complete (win or lose): results modal appears with emoji grid
8. Share button copies spoiler-free text to clipboard
9. Prompt: "Create a free account to track your streak" (soft CTA, dismissible)

### Returning User (Logged In)
1. User returns next day, sees streak counter in header: "🔥 14"
2. Plays puzzle as above
3. On completion: streak updates in real time, celebrates milestones (7/30/100 days)
4. Stats page shows calendar heatmap of all played days + win rate

### Puzzle Admin Flow
1. Fred navigates to `/admin` (password-protected)
2. Dashboard shows calendar: green = scheduled, red = missing, white = future
3. Fred clicks a future date, fills in the puzzle form:
   - 16 items (text input × 16)
   - 4 groups (name + assign items to each group + tier selector)
4. Preview mode shows the puzzle as players will see it
5. Saves to DB — goes live automatically at midnight on puzzle date

---

## Share Card Format

```
TAG Connections #47 — March 27, 2026
🟢🟢🟢🟢
🟣🟣🟣🟣
🔵🔵🔵🔵
🟡🟡🟡🟡

✅ Solved in 0 mistakes!
Play at twaveragegamers.com/connections
```

_(Failed puzzle replaces ✅ line with "❌ X mistakes")_

---

## Non-Functional Requirements

### Performance
- Puzzle load time: < 200ms (JSON payload < 2KB)
- Time to interactive: < 1.5s on 4G mobile
- API response time: < 100ms p95
- Zero downtime at midnight puzzle rollover

### Security
- Admin panel behind HTTP Basic Auth + IP allowlist (or Replit Auth admin role)
- Puzzle answers never sent to client before submission (server validates group membership)
- Rate limit: 60 requests/min per IP on submit endpoint

### Scalability
- Stateless API enables horizontal scaling on Replit Autoscale
- Daily puzzle cached at CDN layer — a viral share spike (10K simultaneous visits) should serve static assets without hitting DB
- Streak + result writes are async (non-blocking to UX)

---

## Success Metrics

| Metric | 30-Day Target | 90-Day Target | Measurement Method |
|--------|--------------|--------------|-------------------|
| Daily active players | 500 | 2,500 | Unique puzzle submits/day |
| 7-day retention | 25% | 40% | Players active on day 7 of first week |
| Streak rate (7+ days) | 15% of active users | 30% | DB streak query |
| Social shares/day | 50 | 300 | Share button click events |
| Avg session time | 3.5 min | 4 min | Analytics (Plausible or GA4) |
| New TAG readers via game | 200/month | 1,000/month | Referral source attribution |

---

## Content Curation Requirements

The game lives and dies by puzzle quality. Each puzzle needs:

- **4 categories**, each with exactly 4 items
- Difficulty curve: tier 1 (obvious) → tier 4 (requires expert knowledge or lateral thinking)
- At least one "trap" — an item that looks like it belongs to two groups but only fits one
- Mix of eras: not all modern titles, not all retro
- Category types to rotate: characters, weapons, maps, mechanics, studios, voice actors, franchises, genres, soundtracks, cultural references
- Pre-test: play it yourself in <5 minutes without looking at answers

**Content pipeline recommendation:**
- Build 90 puzzles before launch (3-month buffer)
- Add 7 puzzles/week ongoing (~1hr/week)
- Community submissions feed into a moderated staging queue for Phase 3

---

## Cost Estimates

### Development (One-Time)
| Phase | Est. Hours (Vibe Coding w/ Replit Agent) | Est. Cost |
|-------|------------------------------------------|-----------|
| MVP (Phase 1) | 8–12 hrs | $0 (self-build) |
| Accounts + Streaks (Phase 2) | 6–10 hrs | $0 |
| Community Features (Phase 3) | 10–16 hrs | $0 |

### Operations (Monthly)
| Service | Cost |
|---------|------|
| Replit Core (hosting + DB) | $20 |
| Domain (if subdomain of TAG) | $0 |
| Analytics (Plausible) | $9 |
| **Total** | **$29/month** |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Puzzle quality drops, players churn | High | Med | Build 90-puzzle buffer; quality checklist per puzzle; community submission queue |
| NYT sends C&D for Connections format | Med | Low | No use of "Connections" trademark in branding; different visual design; format itself is not IP |
| Low initial adoption — no one plays | High | Med | Launch alongside TAG article explaining the game; embed in newsletter; post in TAG Discord on day 1 |
| Audio/visual asset licensing issues | Low | Low | Text-only format — no IP-protected assets needed |
| Replit downtime during viral spike | Med | Low | CDN for static assets; Autoscale handles burst; graceful fallback to "Puzzle loading..." state |

---

## Timeline & Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | Core game built | Playable puzzle with tile grid, mistake tracking, group reveal |
| 1 | Admin panel | Puzzle CRUD with preview mode |
| 2 | Share card + polish | Emoji grid sharing, animations, mobile QA |
| 2 | Pre-launch content | 30 puzzles scheduled (buffer to grow) |
| 3 | Soft launch | Live on TAG site, announced in newsletter + Discord |
| 4 | Accounts + streaks | Auth, streak tracking, profile page live |
| 6 | Leaderboard | Daily top-20 leaderboard, archive mode |
| 8 | Community features | Submission queue, Discord integration |

---

## Open Questions

- [ ] Will the game live at `twaveragegamers.com/connections` or a standalone subdomain (`connections.twaveragegamers.com`)?
- [ ] What's the puzzle naming convention? (TAG Connections #1, or date-based?)
- [ ] Will there be a hard no-play cutoff at midnight or a grace period (e.g., 3am EST)?
- [ ] Should guest players (no account) have their streaks tracked via localStorage, or require signup to maintain streaks?
- [ ] Sound effects: yes/no? (correct group chime, mistake buzz)

---

## Appendix: Sample Puzzle Ideas

| # | Category Name | Items | Tier |
|---|--------------|-------|------|
| 1 | Apex Legends Legends | Wraith, Octane, Valkyrie, Horizon | 1 (Green) |
| 1 | Maps in Fortnite Chapter 1 | Tilted Towers, Salty Springs, Dusty Depot, Greasy Grove | 2 (Blue) |
| 1 | Games with "of the" in the title | God of the..., Shadow of the..., Last of the..., Rise of the... | 3 (Purple) |
| 1 | Diablo 4 Season Names | Blood, Loot Reborn, Infernal Hordes, Hatred Rising | 4 (Gold) |
| | | | |
| 2 | Pokémon that are also cities | Dayton, Canton, Lima, Troy | 4 (Gold) |
| 2 | Games voiced by Troy Baker | Joel, Booker, Sam Drake, Pagan Min | 2 (Blue) |

---

*PRD Version 1.0 — Two Average Gamers × TAG Connections*
*Build in Replit using Replit Agent. Reference this PRD as the system prompt context.*
