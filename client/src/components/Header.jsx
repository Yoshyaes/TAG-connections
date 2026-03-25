import { useStreak } from '../hooks/useStreak';

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
    <header className="w-full flex flex-col items-center gap-1 mb-6">
      <h1
        className="font-display text-[28px] font-extrabold tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        TAG Connections
      </h1>
      <div className="flex items-center gap-3">
        {puzzleNumber && (
          <span
            className="text-[13px] font-normal"
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
            <span>{currentStreak}</span>
          </span>
        )}
      </div>
    </header>
  );
}
