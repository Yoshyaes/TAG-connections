// WordPress REST API client
// Config injected by WordPress via wp_localize_script -> window.tagConnections

function getConfig() {
  return window.tagConnections || {
    apiUrl: '/wp-json/tag-connections/v1',
    nonce: '',
    userId: 0,
    isAdmin: false,
  };
}

async function request(endpoint, options = {}) {
  const { apiUrl, nonce } = getConfig();

  const res = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
      ...options.headers,
    },
    credentials: 'same-origin',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// --- Game API ---

export function fetchTodayPuzzle() {
  return request('/puzzle/today');
}

export function fetchPuzzleByDate(date) {
  return request(`/puzzle/${date}`);
}

export function submitGuess(puzzleDate, selectedIds) {
  return request('/puzzle/submit', {
    method: 'POST',
    body: JSON.stringify({ puzzle_date: puzzleDate, selected_ids: selectedIds }),
  });
}

export function revealAllGroups(puzzleDate) {
  return request('/puzzle/reveal', {
    method: 'POST',
    body: JSON.stringify({ puzzle_date: puzzleDate }),
  });
}

export function completePuzzle({ puzzle_date, solved, mistakes, solve_time_secs, groups_order }) {
  return request('/puzzle/complete', {
    method: 'POST',
    body: JSON.stringify({ puzzle_date, solved, mistakes, solve_time_secs, groups_order }),
  });
}

export function fetchUserStats() {
  return request('/user/stats');
}

// --- Admin API ---

export function fetchAdminPuzzles() {
  return request('/admin/puzzles');
}

export function fetchAdminPuzzle(date) {
  return request(`/admin/puzzle/${date}`);
}

export function saveAdminPuzzle(puzzle) {
  return request('/admin/puzzle', {
    method: 'POST',
    body: JSON.stringify(puzzle),
  });
}

export function updateAdminPuzzle(_id, puzzle) {
  return saveAdminPuzzle(puzzle);
}

export function deleteAdminPuzzle(id) {
  return request(`/admin/puzzle/${id}`, {
    method: 'DELETE',
  });
}

// Helper: check if current user is logged in
export function isLoggedIn() {
  return (getConfig().userId || 0) > 0;
}

// Helper: check if current user is admin
export function isAdmin() {
  return !!getConfig().isAdmin;
}
