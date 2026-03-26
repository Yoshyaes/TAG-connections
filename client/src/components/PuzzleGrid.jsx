import { useState, useEffect } from 'react';
import Tile from './Tile';
import GroupReveal from './GroupReveal';
import MistakeTracker from './MistakeTracker';
import ResultsModal from './ResultsModal';
import Header from './Header';
import { usePuzzle } from '../hooks/usePuzzle';

export default function PuzzleGrid() {
  const {
    puzzle,
    items,
    selectedIds,
    solvedGroups,
    mistakes,
    wrongIds,
    loading,
    error,
    toggleTile,
    submitSelection,
    deselectAll,
    isComplete,
    isFailed,
    isPlaying,
    canSubmit,
  } = usePuzzle();

  const [showResults, setShowResults] = useState(false);

  // Show results modal when game ends
  useEffect(() => {
    if (isComplete || isFailed) {
      const timer = setTimeout(() => setShowResults(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isFailed]);

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
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div
          className="text-[15px] font-semibold text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          {error === 'No puzzle available for today'
            ? "No puzzle today — check back tomorrow!"
            : `Error: ${error}`}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Header with puzzle info */}
      <Header puzzleNumber={puzzle?.id} puzzleDate={puzzle?.puzzle_date} />

      {/* Solved groups */}
      {solvedGroups.map((group, i) => (
        <GroupReveal key={group.id} group={group} index={i} />
      ))}

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
