import { supabase } from './supabase';

function getTodayEST() {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return est.toISOString().split('T')[0];
}

function handleRpcResult(result) {
  if (result.error) throw new Error(result.error.message);
  if (result.data?.error) throw new Error(result.data.error);
  return result.data;
}

// --- Game API (uses RPC — answers never sent to client) ---

export async function fetchTodayPuzzle() {
  const today = getTodayEST();
  const result = await supabase.rpc('get_puzzle', { p_date: today });
  const data = handleRpcResult(result);
  if (!data) throw new Error('No puzzle available for today');
  return data;
}

export async function fetchPuzzleByDate(date) {
  const result = await supabase.rpc('get_puzzle', { p_date: date });
  const data = handleRpcResult(result);
  if (!data) throw new Error('No puzzle found for this date');
  return data;
}

export async function submitGuess(puzzleDate, selectedIds) {
  const result = await supabase.rpc('submit_guess', {
    p_date: puzzleDate,
    p_selected_ids: selectedIds,
  });
  return handleRpcResult(result);
}

export async function revealAllGroups(puzzleDate) {
  const result = await supabase.rpc('reveal_all_groups', { p_date: puzzleDate });
  return handleRpcResult(result);
}

export async function completePuzzle({ puzzle_date, solved, mistakes, solve_time_secs, groups_order }) {
  const result = await supabase.rpc('complete_puzzle', {
    p_date: puzzle_date,
    p_solved: solved,
    p_mistakes: mistakes,
    p_solve_time: solve_time_secs,
    p_groups_order: groups_order,
  });
  return handleRpcResult(result);
}

export async function fetchUserStats() {
  const result = await supabase.rpc('get_user_stats');
  return handleRpcResult(result);
}

// --- Admin API (RPC with admin check inside the function) ---

export async function fetchAdminPuzzles() {
  const result = await supabase.rpc('admin_get_puzzles');
  const data = handleRpcResult(result);
  return data || [];
}

export async function fetchAdminPuzzle(date) {
  const result = await supabase.rpc('admin_get_puzzle', { p_date: date });
  const data = handleRpcResult(result);
  if (!data) throw new Error('No puzzle found for this date');
  return data;
}

export async function saveAdminPuzzle(puzzle) {
  const result = await supabase.rpc('admin_save_puzzle', {
    p_date: puzzle.puzzle_date,
    p_title: puzzle.title || null,
    p_items: puzzle.items,
    p_groups: puzzle.groups,
  });
  return handleRpcResult(result);
}

export async function updateAdminPuzzle(_id, puzzle) {
  // Supabase version upserts by date, so same as save
  return saveAdminPuzzle(puzzle);
}

export async function deleteAdminPuzzle(id) {
  const result = await supabase.rpc('admin_delete_puzzle', { p_id: id });
  return handleRpcResult(result);
}
