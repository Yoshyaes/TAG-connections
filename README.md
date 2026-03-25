# TAG Connections

A daily gaming-themed puzzle game by Two Average Gamers. Sort 16 items into 4 secret categories — test your gaming knowledge!

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Set up the database:
   ```bash
   psql -d your_database -f server/db/schema.sql
   npm run seed
   ```

## Development

```bash
npm run dev
```

This runs Express (port 3000) and Vite (port 5173) concurrently. Open http://localhost:5173.

## Production Build

```bash
npm run build
npm start
```

Express serves the built frontend from `/dist` on port 3000.

## Deploying to Replit

1. Import the repo into Replit
2. Set environment variables in the Secrets tab
3. Run `npm run build && npm start`
4. The app serves on the Replit-assigned port

## Admin Panel

Navigate to `/admin` in the browser. You'll be prompted for credentials:
- **Username:** `admin`
- **Password:** the value of `ADMIN_PASSWORD` in your `.env`

From the admin panel you can create, edit, and preview daily puzzles.

## Adding New Puzzles

Use the admin panel calendar view:
1. Click any date cell
2. Fill in 16 items and 4 group names
3. Assign items to groups and set difficulty tiers (1-4)
4. Preview the puzzle, then save

Puzzles go live automatically at midnight EST on their scheduled date.
