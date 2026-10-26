import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Tile from './Tile';
import GroupReveal from './GroupReveal';
import MistakeTracker from './MistakeTracker';
import ResultsModal from './ResultsModal';
import RulesModal from './RulesModal';
import Header from './Header';
import { usePuzzle } from '../hooks/usePuzzle';
import { haptic, applyDragSelect, isTouchInput, juicePop, startCoach, coachSeen, COACH_KEY } from '../lib/touch';

const RULES_SEEN_KEY = 'tag_connections_seen_rules';
const TIER_BG = {
  green: 'var(--tier-green)',
  blue: 'var(--tier-blue)',
  purple: 'var(--tier-purple)',
  gold: 'var(--tier-gold)',
};
// A drag only claims a tile once the finger is this far inside it, so a
// stroke that grazes a corner on its way past does not pick it up.
const DRAG_INSET_PX = 10;
// After a touch ends (tap or drag, both handled on pointerup), swallow the
// click the browser may still send, so a tile never toggles twice.
const DRAG_CLICK_GUARD_MS = 400;

function now() {
  return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
}

/**
 * Touch input for the grid.
 *  - Drag-select: one finger stroke across the grid selects every tile it
 *    crosses (or, when the stroke starts on a selected tile, deselects them).
 *  - Tap: toggles on pointerup instead of waiting for the browser's click.
 *    Chrome drops the click for a quick second tap near the last touch
 *    (double-tap detection), which made fast tapping lose picks; handling
 *    the tap here makes every tap count, and the click that may follow is
 *    swallowed so it cannot toggle twice.
 * Touch and pen only; a mouse and the keyboard keep the tile's own
 * onClick / Enter / Space, so desktop is unchanged.
 */
function useDragSelect(gridRef, { enabled, selectedIds, items, setSelection, onTap }) {
  const live = useRef({});
  live.current = { enabled, selectedIds, items, setSelection, onTap };
  const hasGrid = items.length > 0;

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;
    let drag = null;
    let suppressUntil = 0;

    const idFor = (el) => {
      const raw = el.getAttribute('data-tile-id');
      const match = live.current.items.find(it => String(it.id) === raw);
      return match ? match.id : null;
    };
    const tileAt = (x, y) => {
      const hit = document.elementFromPoint(x, y);
      const tile = hit && hit.closest ? hit.closest('[data-tile-id]') : null;
      if (!tile || !grid.contains(tile)) return null;
      const r = tile.getBoundingClientRect();
      const inset = Math.min(DRAG_INSET_PX, r.width * 0.15, r.height * 0.15);
      if (x < r.left + inset || x > r.right - inset || y < r.top + inset || y > r.bottom - inset) return null;
      return tile;
    };
    const apply = (id) => {
      const next = applyDragSelect(drag.sel, id, drag.mode);
      if (next === drag.sel) return;
      drag.sel = next;
      haptic('tick');
      live.current.setSelection(() => next);
    };

    function down(e) {
      // A new touch is a new gesture: only a click with no pointerdown of
      // its own (the one some browsers send at the end of a drag) is eaten.
      suppressUntil = 0;
      if (e.pointerType === 'mouse' || !e.isPrimary || drag) return;
      if (!live.current.enabled) return;
      const tile = e.target && e.target.closest ? e.target.closest('[data-tile-id]') : null;
      if (!tile || !grid.contains(tile)) return;
      const id = idFor(tile);
      if (id === null) return;
      const sel = live.current.selectedIds;
      drag = {
        pointerId: e.pointerId,
        startId: id,
        mode: sel.includes(id) ? 'deselect' : 'select',
        sel,
        visited: new Set([String(id)]),
        active: false,
      };
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.pointerId || !live.current.enabled) return;
      const tile = tileAt(e.clientX, e.clientY);
      if (!tile) return;
      const key = tile.getAttribute('data-tile-id');
      if (drag.visited.has(key)) return;
      const id = idFor(tile);
      if (id === null) return;
      if (!drag.active) {
        drag.active = true;
        apply(drag.startId);
      }
      drag.visited.add(key);
      apply(id);
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const d = drag;
      drag = null;
      if (e.type === 'pointercancel') return;
      suppressUntil = now() + DRAG_CLICK_GUARD_MS;
      if (d.active || !live.current.enabled) return;
      // A tap: it must end on the tile it started on.
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const tile = hit && hit.closest ? hit.closest('[data-tile-id]') : null;
      if (tile && tile.getAttribute('data-tile-id') === String(d.startId)) live.current.onTap(d.startId);
    }
    function clickGuard(e) {
      if (now() < suppressUntil) {
        suppressUntil = 0;
        e.stopPropagation();
        e.preventDefault();
      }
    }

    grid.addEventListener('pointerdown', down);
    grid.addEventListener('pointermove', move);
    grid.addEventListener('pointerup', up);
    grid.addEventListener('pointercancel', up);
    grid.addEventListener('click', clickGuard, true);
    return () => {
      grid.removeEventListener('pointerdown', down);
      grid.removeEventListener('pointermove', move);
      grid.removeEventListener('pointerup', up);
      grid.removeEventListener('pointercancel', up);
      grid.removeEventListener('click', clickGuard, true);
    };
  }, [gridRef, hasGrid]);
}

/**
 * Solve animation: before the group bar replaces them, the four solved tiles
 * slide into the top row of the grid (each to one slot, in their current
 * reading order) and settle in the group's color. Offsets are measured
 * before paint and handed to the CSS keyframes as --dx/--dy.
 */
function useSolveCollapse(gridRef, solving) {
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || !solving) return;
    const tiles = Array.from(grid.querySelectorAll('[data-tile-id]'));
    const ids = new Set(solving.ids.map(String));
    const moving = tiles.filter(t => ids.has(t.getAttribute('data-tile-id')));
    moving.forEach((tile, k) => {
      const slot = tiles[k];
      if (!slot) return;
      const a = tile.getBoundingClientRect();
      const b = slot.getBoundingClientRect();
      tile.style.setProperty('--dx', `${Math.round(b.left - a.left)}px`);
      tile.style.setProperty('--dy', `${Math.round(b.top - a.top)}px`);
    });
  }, [gridRef, solving]);
}

/**
 * Success beat (Phase 3): when a group is solved in play, the new group bar
 * pops (kit juice.pop: scale + flash, flash only under reduced motion). The
 * success haptic already fired in-gesture when the answer came back, so the
 * pop is visual only. Groups restored from a saved game, and the reveal of
 * every group after a loss, do not pop.
 */
function useSolvePop(rootRef, { count, loading, isFailed }) {
  const prevRef = useRef(null);
  useEffect(() => {
    if (loading) { prevRef.current = null; return; }
    const prev = prevRef.current;
    prevRef.current = count;
    if (prev === null || isFailed || count !== prev + 1) return;
    const root = rootRef.current;
    const bars = root ? root.querySelectorAll('[data-group-bar]') : [];
    if (bars.length) juicePop(bars[bars.length - 1]);
  }, [rootRef, count, loading, isFailed]);
}

/**
 * First 20 seconds (Phase 3): on a first visit by touch, a ghost hand shows
 * the drag-select stroke across the top row, then points at Submit. Kit 1.1
 * coach only (no-op on 1.0.0 / no kit); it never blocks input (the overlay
 * is pointer-events:none), shows once per device (key connections-v1), and
 * waits for the rules sheet to close. Started at most once per mount.
 */
function useFirstVisitCoach(gridRef, { ready }) {
  const startedRef = useRef(false);
  const handleRef = useRef(null);
  useEffect(() => {
    if (!ready || startedRef.current) return;
    if (!isTouchInput() || coachSeen(COACH_KEY)) return;
    const grid = gridRef.current;
    const tiles = grid ? grid.querySelectorAll('[data-tile-id]') : [];
    if (tiles.length < 3) return;
    startedRef.current = true;
    const a = tiles[0].getBoundingClientRect();
    const c = tiles[2].getBoundingClientRect();
    const distance = Math.max(60, Math.round((c.left + c.width / 2) - (a.left + a.width / 2)));
    handleRef.current = startCoach({
      key: COACH_KEY,
      delay: 700,
      steps: [
        { target: tiles[0], gesture: 'drag', dir: 'right', distance, text: 'Drag across tiles to pick them' },
        { target: '#tag-connections-root .tag-action-primary', gesture: 'tap', text: 'Pick 4 that belong together, then Submit' },
      ],
    });
  }, [gridRef, ready]);
  useEffect(() => () => {
    if (handleRef.current) handleRef.current.stop();
  }, []);
}

function msUntilNextEstMidnight() {
  const now = new Date();
  const nowEst = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nextMidnightEst = new Date(nowEst);
  nextMidnightEst.setHours(24, 0, 0, 0);
  return nextMidnightEst.getTime() - nowEst.getTime();
}

function formatCountdown(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function useNextPuzzleCountdown() {
  const [remainingMs, setRemainingMs] = useState(msUntilNextEstMidnight);
  useEffect(() => {
    const id = setInterval(() => setRemainingMs(msUntilNextEstMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return formatCountdown(remainingMs);
}

export default function PuzzleGrid({ date = null }) {
  const {
    puzzle,
    items,
    selectedIds,
    solvedGroups,
    mistakes,
    guessHistory,
    wrongIds,
    oneAway,
    loading,
    error,
    toggleTile,
    submitSelection,
    deselectAll,
    setSelection,
    shuffle,
    toast,
    solving,
    isComplete,
    isFailed,
    isPlaying,
    isSubmitting,
    canSubmit,
  } = usePuzzle(date);

  const [showResults, setShowResults] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const countdown = useNextPuzzleCountdown();
  const gridRef = useRef(null);
  const rootRef = useRef(null);

  // A light tick on every tap-toggle, fired inside the click / pointerup so
  // iOS allows it.
  const onToggle = useCallback((id) => {
    haptic('tick');
    toggleTile(id);
  }, [toggleTile]);

  useDragSelect(gridRef, { enabled: isPlaying, selectedIds, items, setSelection, onTap: onToggle });
  useSolveCollapse(gridRef, solving);
  useSolvePop(rootRef, { count: solvedGroups.length, loading, isFailed });
  useFirstVisitCoach(gridRef, { ready: isPlaying && !showRules && !showResults && items.length >= 4 });
  // Deselect All and Submit tick in-gesture like the tiles (Shuffle taps).
  const onDeselectAll = useCallback(() => {
    haptic('tick');
    deselectAll();
  }, [deselectAll]);
  const onSubmit = useCallback(() => {
    haptic('tick');
    submitSelection();
  }, [submitSelection]);
  const onShuffle = useCallback(() => {
    haptic('tap');
    shuffle();
  }, [shuffle]);
  const solvingIds = solving ? solving.ids : [];
  const solveColor = solving ? (TIER_BG[solving.color] || 'var(--accent-primary)') : null;

  // Show results modal when game ends
  useEffect(() => {
    if (isComplete || isFailed) {
      const timer = setTimeout(() => setShowResults(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isFailed]);

  // First-time visitors get the rules automatically; everyone else can
  // reopen them via the "?" button.
  useEffect(() => {
    if (!loading && !localStorage.getItem(RULES_SEEN_KEY)) {
      setShowRules(true);
      localStorage.setItem(RULES_SEEN_KEY, '1');
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div
          className="text-[15px] font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Loading puzzle...
        </div>
      </div>
    );
  }

  if (error) {
    const isProGated = error.code === 'pro_required' || error.status === 403;
    const upgradeUrl = error.data?.upgrade_url || '/pricing/';
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-4 text-center max-w-md mx-auto">
        {isProGated ? (
          <>
            <div className="text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>
              The Connections archive is a Pro feature.
            </div>
            <div className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Upgrade to TAG Pro to replay any past puzzle.
            </div>
            <a
              href={upgradeUrl}
              className="inline-block mt-2 px-5 py-2.5 rounded-tile text-[14px] font-semibold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
            >
              See pricing
            </a>
            <Link to="/" className="text-[13px] underline" style={{ color: 'var(--text-secondary)' }}>
              Back to today's puzzle
            </Link>
          </>
        ) : (
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {error.message === 'No puzzle available for today'
              ? "No puzzle today. Check back tomorrow."
              : `Error: ${error.message}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="w-full flex flex-col items-center gap-3">
      {/* Header with puzzle info */}
      <Header
        puzzleNumber={puzzle?.id}
        puzzleDate={puzzle?.puzzle_date}
        onOpenRules={() => setShowRules(true)}
      />

      {showRules && <RulesModal touch={isTouchInput()} onClose={() => setShowRules(false)} />}

      {/* Solved groups */}
      {solvedGroups.map((group, i) => (
        <div key={group.id} className="w-full" data-group-bar="">
          <GroupReveal group={group} index={i} />
        </div>
      ))}

      {/* Tile grid. The toast ("One away!", "Already guessed!") floats over
          the top edge of the grid instead of sitting in the flow, so the
          board never jumps down when it appears. */}
      {items.length > 0 && (
        <div className="w-full relative">
          <div className="tag-toast-slot" role="status" aria-live="polite" data-one-away={oneAway ? '1' : undefined}>
            {toast && (
              <div key={toast.n} className={`tag-toast tag-toast-${toast.kind}`}>
                {toast.text}
              </div>
            )}
          </div>
          <div
            ref={gridRef}
            className={`w-full grid grid-cols-4 gap-2 tag-grid${isPlaying ? ' tag-grid-live' : ''}`}
          >
            {items.map(item => (
              <Tile
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                isWrong={wrongIds.includes(item.id)}
                isSolving={solvingIds.includes(item.id)}
                solveColor={solveColor}
                onToggle={onToggle}
                disabled={!isPlaying}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mistake tracker */}
      <div className="w-full flex justify-center mt-2">
        <MistakeTracker mistakes={mistakes} />
      </div>

      {/* Action buttons. They stay on screen (disabled) while a guess
          resolves, so the page below the grid does not jump each guess. */}
      {(isPlaying || isSubmitting) && (
        <div className="w-full flex justify-center gap-2 mt-2">
          <button
            type="button"
            onClick={onShuffle}
            disabled={!isPlaying}
            className="tag-action-btn px-4 rounded-tile text-[14px] font-semibold transition-all duration-150"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={!isPlaying || selectedIds.length === 0}
            className="tag-action-btn px-4 rounded-tile text-[14px] font-semibold transition-all duration-150"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Deselect All
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="tag-action-btn tag-action-primary px-6 rounded-tile text-[14px] font-semibold transition-all duration-150"
            style={{
              backgroundColor: canSubmit ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: canSubmit ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: canSubmit ? 'pointer' : 'default',
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            Submit
          </button>
        </div>
      )}

      {/* Post-game state: the results modal gets dismissed with no other way
          back in and no sense of when the next puzzle arrives. */}
      {(isComplete || isFailed) && !showResults && (
        <div className="w-full flex flex-col items-center gap-2 mt-2">
          <button
            onClick={() => setShowResults(true)}
            className="px-6 py-2.5 rounded-tile text-[14px] font-semibold transition-all duration-150"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
          >
            {isComplete ? 'Solved' : 'Game Over'} &middot; View results
          </button>
          <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            Next puzzle in {countdown}
          </p>
        </div>
      )}

      {/* Results modal */}
      {showResults && (
        <ResultsModal
          puzzle={puzzle}
          solvedGroups={solvedGroups}
          mistakes={mistakes}
          guessHistory={guessHistory}
          solved={isComplete}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
