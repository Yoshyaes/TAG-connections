# TAG Connections

A daily gaming-themed puzzle game by Two Average Gamers. Sort 16 items into 4 secret categories — test your gaming knowledge!

## Architecture

- **Frontend:** React (Vite) + Tailwind CSS — builds to static files
- **Backend:** Supabase (PostgreSQL + RPC functions + Auth)
- **Hosting:** WordPress plugin embed or any static host
- **No server required** — the frontend talks directly to Supabase

## Setup

### 1. Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
   - This creates all tables, RLS policies, and RPC functions
3. Copy your project URL and anon key from **Settings > API**

### 2. Local Development

```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_KEY
npm run seed   # Seeds 3 sample puzzles
npm run dev    # Opens at http://localhost:5173
```

### 3. Admin Setup

1. Create a user in Supabase Auth (Dashboard > Authentication > Users > Add User)
2. In the SQL Editor, mark that user as admin:
   ```sql
   INSERT INTO profiles (id, display_name, is_admin)
   VALUES ('your-user-uuid', 'Fred', TRUE);
   ```
3. Navigate to `/admin` in the app and log in with that user's email/password

## WordPress Integration

### Install as Plugin

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Copy the `dist/` folder into `wordpress/`:
   ```bash
   cp -r dist/ wordpress/dist/
   ```
3. Upload the entire `wordpress/` folder to your WordPress plugins directory:
   ```
   wp-content/plugins/tag-connections/
   ```
4. Activate the **TAG Connections** plugin in WordPress admin
5. Create a page and add the shortcode: `[tag_connections]`

### How it Works

- The plugin enqueues the built React JS/CSS on any page with the `[tag_connections]` shortcode
- The React app mounts to a `<div>` and talks directly to your Supabase project
- No server-side PHP processing — WordPress just serves the static assets
- The game lives at whatever URL you put the shortcode on (e.g., `/connections`)

## Adding Puzzles

Use the admin panel at `/admin` (or `yoursite.com/connections#/admin` when embedded in WordPress).

Alternatively, add puzzles directly via the Supabase Dashboard table editor — insert rows into the `puzzles` table using the JSON format documented in the PRD.

## Security

- Puzzle answers are **never sent to the browser** — the `get_puzzle` RPC function strips `group_id` from items
- Answer validation happens server-side in the `submit_guess` PostgreSQL function
- Admin functions check `is_admin` on the `profiles` table before executing
- All functions use `SECURITY DEFINER` to run with elevated privileges while keeping table access locked down via RLS
