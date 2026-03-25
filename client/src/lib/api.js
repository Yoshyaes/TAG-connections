const API_BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('supabase_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

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

export function completePuzzle({ puzzle_date, solved, mistakes, solve_time_secs, groups_order }) {
  return request('/puzzle/submit/complete', {
    method: 'POST',
    body: JSON.stringify({ puzzle_date, solved, mistakes, solve_time_secs, groups_order }),
  });
}

export function revealAllGroups(puzzleDate) {
  return request('/puzzle/submit/reveal-all', {
    method: 'POST',
    body: JSON.stringify({ puzzle_date: puzzleDate }),
  });
}

export function fetchUserStats() {
  return request('/user/stats');
}

// Admin API (uses Basic Auth)
function adminRequest(url, options = {}) {
  const credentials = sessionStorage.getItem('admin_credentials');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (credentials) {
    headers['Authorization'] = `Basic ${credentials}`;
  }

  return fetch(`${API_BASE}${url}`, { ...options, headers }).then(async (res) => {
    if (res.status === 401) {
      sessionStorage.removeItem('admin_credentials');
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  });
}

export function fetchAdminPuzzles() {
  return adminRequest('/admin/puzzles');
}

export function fetchAdminPuzzle(date) {
  return adminRequest(`/admin/puzzle/${date}`);
}

export function saveAdminPuzzle(puzzle) {
  return adminRequest('/admin/puzzle', {
    method: 'POST',
    body: JSON.stringify(puzzle),
  });
}

export function updateAdminPuzzle(id, puzzle) {
  return adminRequest(`/admin/puzzle/${id}`, {
    method: 'PUT',
    body: JSON.stringify(puzzle),
  });
}

export function deleteAdminPuzzle(id) {
  return adminRequest(`/admin/puzzle/${id}`, {
    method: 'DELETE',
  });
}
