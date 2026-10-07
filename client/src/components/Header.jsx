import { Link } from 'react-router-dom';
import { useStreak } from '../hooks/useStreak';

// A1: the theme's title row already renders the page H1 ("Connections"),
// so this no longer repeats it as a second, redundant H1 -- that duplicate
// was the real substance of C2, just missed earlier because a bundle-only
// check can't see the server-rendered H1 it collides with. The remaining
// row (puzzle number/date pill, streak badge) is styled to match Rank
// Arena's equivalent row, the closest this pair of separately-built React
// apps can get to a literally shared header component.
export default function Header({ puzzleNumber, puzzleDate }) {
  const { currentStreak } = useStreak();

  const formattedDate = puzzleDate
    ? new Date(puzzleDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <header className="w-full flex flex-col items-center gap-2 mb-6">
      <div className="flex items-center gap-3">
        {puzzleNumber && (
          <span
            className="text-[13px] uppercase tracking-wide font-normal"
            style={{ color: 'var(--text-secondary)' }}
          >
            Puzzle #{puzzleNumber}
          </span>
        )}
        {formattedDate && (
          <span
            className="text-[13px] font-normal"
            style={{ color: 'var(--text-secondary)' }}
          >
            {formattedDate}
          </span>
        )}
        {currentStreak > 0 && (
          <span
            className="text-[13px] font-semibold flex items-center gap-1"
            style={{ color: 'var(--tier-gold)' }}
          >
            <span>🔥</span>
            <span>{currentStreak} day streak</span>
          </span>
        )}
      </div>
      <Link
        to="/archive"
        className="text-[12px] font-semibold underline"
        style={{ color: 'var(--text-secondary)' }}
      >
        Archive
      </Link>
    </header>
  );
}
