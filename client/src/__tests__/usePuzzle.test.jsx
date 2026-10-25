import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// 16 items, groups of four by id: 1-4, 5-8, 9-12, 13-16.
const ITEMS = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, text: `Item ${i + 1}` }));
const groupOf = (id) => Math.ceil(id / 4);

vi.mock('../lib/api', () => ({
  fetchTodayPuzzle: vi.fn(async () => ({ id: 7, puzzle_date: '2026-10-25', items: ITEMS, group_count: 4 })),
  fetchPuzzleByDate: vi.fn(),
  revealAllGroups: vi.fn(async () => ({ groups: [] })),
  completePuzzle: vi.fn(async () => ({})),
  isLoggedIn: () => false,
  submitGuess: vi.fn(async (_date, ids) => {
    const g = ids.map(groupOf);
    if (new Set(g).size === 1) {
      return {
        correct: true,
        group: { id: `g${g[0]}`, name: `Group ${g[0]}`, color: 'green', items: ids.map(id => ({ id, text: `Item ${id}` })) },
      };
    }
    const counts = {};
    g.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
    return { correct: false, one_away: Math.max(...Object.values(counts)) === 3 };
  }),
}));

const api = await import('../lib/api');
const { usePuzzle } = await import('../hooks/usePuzzle');

async function ready() {
  const hook = renderHook(() => usePuzzle());
  await waitFor(() => expect(hook.result.current.isPlaying).toBe(true));
  return hook;
}

function pick(result, ids) {
  act(() => { ids.forEach(id => result.current.toggleTile(id)); });
}

describe('usePuzzle touch redesign', () => {
  beforeEach(() => {
    localStorage.clear();
    api.submitGuess.mockClear();
    vi.useRealTimers();
  });

  it('keeps the selection after a wrong guess (one away), so one swap fixes it', async () => {
    const { result } = await ready();
    pick(result, [1, 2, 3, 5]);
    await act(async () => { await result.current.submitSelection(); });
    expect(result.current.mistakes).toBe(1);
    expect(result.current.toast && result.current.toast.text).toBe('One away!');
    await waitFor(() => expect(result.current.isPlaying).toBe(true));
    expect([...result.current.selectedIds].sort()).toEqual([1, 2, 3, 5]);

    // Swap one tile and solve.
    pick(result, [5, 4]);
    await act(async () => { await result.current.submitSelection(); });
    await waitFor(() => expect(result.current.solvedGroups).toHaveLength(1));
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.items).toHaveLength(12);
    expect(result.current.mistakes).toBe(1);
  });

  it('a repeated wrong set says "Already guessed!" and costs no mistake or request', async () => {
    const { result } = await ready();
    pick(result, [1, 5, 9, 13]);
    await act(async () => { await result.current.submitSelection(); });
    await waitFor(() => expect(result.current.isPlaying).toBe(true));
    expect(result.current.mistakes).toBe(1);
    expect(api.submitGuess).toHaveBeenCalledTimes(1);

    // Same four, different order.
    act(() => { result.current.deselectAll(); });
    pick(result, [13, 9, 5, 1]);
    await act(async () => { await result.current.submitSelection(); });
    expect(result.current.mistakes).toBe(1);
    expect(api.submitGuess).toHaveBeenCalledTimes(1);
    expect(result.current.toast.text).toBe('Already guessed!');
    expect(result.current.guessHistory).toHaveLength(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it('shuffle reorders the tiles and keeps the selection', async () => {
    const { result } = await ready();
    pick(result, [2, 7]);
    const before = result.current.items.map(i => i.id);
    let changed = false;
    for (let n = 0; n < 5 && !changed; n++) {
      act(() => { result.current.shuffle(); });
      changed = result.current.items.map(i => i.id).join() !== before.join();
    }
    expect(changed).toBe(true);
    expect([...result.current.items.map(i => i.id)].sort((a, b) => a - b)).toEqual(ITEMS.map(i => i.id));
    expect(result.current.selectedIds).toEqual([2, 7]);
  });

  it('the fourth mistake still ends the game (rules unchanged)', async () => {
    const { result } = await ready();
    const wrongSets = [[1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], [4, 8, 12, 16]];
    for (const set of wrongSets) {
      act(() => { result.current.deselectAll(); });
      pick(result, set);
      await act(async () => { await result.current.submitSelection(); });
      if (set !== wrongSets[3]) await waitFor(() => expect(result.current.isPlaying).toBe(true));
    }
    await waitFor(() => expect(result.current.isFailed).toBe(true));
    expect(result.current.mistakes).toBe(4);
  });

  it('drag-select helper sets a selection in one call and respects the 4 cap', async () => {
    const { result } = await ready();
    act(() => { result.current.setSelection(() => [1, 2, 3, 4]); });
    expect(result.current.selectedIds).toEqual([1, 2, 3, 4]);
    act(() => { result.current.toggleTile(5); });
    expect(result.current.selectedIds).toEqual([1, 2, 3, 4]);
  });
});
