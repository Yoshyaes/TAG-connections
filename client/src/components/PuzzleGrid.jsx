import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Tile from './Tile';
import GroupReveal from './GroupReveal';
import MistakeTracker from './MistakeTracker';
import ResultsModal from './ResultsModal';
import RulesModal from './RulesModal';
import Header from './Header';
import { usePuzzle } from '../hooks/usePuzzle';

const RULES_SEEN_KEY = 'tag_connections_seen_rules';

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
    wrongIds,
    oneAway,
    loading,
    error,
    toggleTile,
    submitSelection,
    deselectAll,
    isComplete,
    isFailed,
    isPlaying,
    canSubmit,
  } = usePuzzle(date);

  const [showResults, setShowResults] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const countdown = useNextPuzzleCountdown();

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
    <div className="w-full flex flex-col items-center gap-3">
      {/* Header with puzzle info */}
      <Header puzzleNumber={puzzle?.id} puzzleDate={puzzle?.puzzle_date} />

      <button
        onClick={() => setShowRules(true)}
        className="text-[12px] font-semibold -mt-2 underline"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="How to play"
      >
        How to play
      </button>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Solved groups */}
      {solvedGroups.map((group, i) => (
        <GroupReveal key={group.id} group={group} index={i} />
      ))}

      {/* Near-miss toast: exactly 3 of 4 selected items shared a group */}
      {oneAway && (
        <div
          className="px-4 py-1.5 rounded-tile text-[13px] font-semibold animate-pulse"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
        >
          One away!
        </div>
      )}

      {/* Tile grid */}
      {items.length > 0 && (
        <div className="w-full grid grid-cols-4 gap-2">
          {items.map(item => (
            <Tile
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              isWrong={wrongIds.includes(item.id)}
              onToggle={toggleTile}
              disabled={!isPlaying}
            />
          ))}
        </div>
      )}

      {/* Mistake tracker */}
      <div className="w-full flex justify-center mt-2">
        <MistakeTracker mistakes={mistakes} />
      </div>

      {/* Action buttons */}
      {isPlaying && (
        <div className="flex gap-3 mt-2">
          <button
            onClick={deselectAll}
            className="px-6 py-2.5 rounded-tile text-[14px] font-semibold transition-all duration-150"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Deselect All
          </button>
          <button
            onClick={submitSelection}
            disabled={!canSubmit}
            className="px-6 py-2.5 rounded-tile text-[14px] font-semibold transition-all duration-150"
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
          solved={isComplete}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
