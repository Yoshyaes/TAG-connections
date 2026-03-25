# TAG Connections

A daily gaming-themed puzzle game by Two Average Gamers. Sort 16 items into 4 secret categories — test your gaming knowledge!

## Architecture

- **Frontend:** React (Vite) + Tailwind CSS — builds to static JS/CSS
- **Backend:** WordPress plugin (PHP) with custom REST API endpoints
- **Database:** WordPress MySQL (custom tables via `$wpdb`)
- **Auth:** WordPress/BuddyPress user system (cookie-based)
- **No external services required**

## Development

```bash
npm install
npm run dev    # Vite dev server at http://localhost:5173
npm run build  # Builds to /dist
```

## Deploying to WordPress

### 1. Build the frontend

```bash
npm run build
```

### 2. Copy dist into the plugin

```bash
cp -r dist/ wordpress/tag-connections/dist/
```

### 3. Upload to WordPress

Upload the `wordpress/tag-connections/` folder to your site:

```
wp-content/plugins/tag-connections/
```

Or zip it and upload via WP admin > Plugins > Add New > Upload.

### 4. Activate

Activate **TAG Connections** in Plugins. On activation it creates 3 database tables and seeds 3 sample puzzles.

### 5. Create a page

Create a WordPress page (e.g. `/connections`) and add the shortcode:

```
[tag_connections]
```

## Admin Panel

Access puzzle management in **two ways:**

1. **WP Dashboard:** Look for "TAG Connections" in the WordPress admin sidebar
2. **Frontend:** Visit your connections page and add `#/admin` to the URL

Both use the same REST API. You must be logged in as a WordPress administrator.

## How It Works

- The plugin registers REST API endpoints under `/wp-json/tag-connections/v1/`
- The React app calls these endpoints using `fetch()` with WP nonce authentication
- Puzzle answers (`group_id`) are **never sent to the browser** — only the server knows which items belong to which group
- Answer validation happens server-side in PHP
- BuddyPress users who are logged in can save their scores and track streaks
- All database queries use `$wpdb->prepare()` to prevent SQL injection

## Custom Tables

The plugin creates three tables (using your WordPress table prefix):

- `{prefix}tag_puzzles` — daily puzzles with items and groups
- `{prefix}tag_results` — per-user game results
- `{prefix}tag_streaks` — streak tracking per user
