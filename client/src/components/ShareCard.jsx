import { useState } from 'react';

const COLOR_EMOJI = {
  green: '🟢',
  blue: '🔵',
  purple: '🟣',
  gold: '🟡',
};

export default function ShareCard({ puzzle, solvedGroups, mistakes, solved }) {
  const [copyState, setCopyState] = useState('idle'); // idle | copied | shared | error

  const puzzleNumber = puzzle?.id || '?';
  const date = puzzle?.puzzle_date
    ? new Date(puzzle.puzzle_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // Build emoji grid in solve order
  const emojiRows = solvedGroups.map(group => {
    const emoji = COLOR_EMOJI[group.color] || '⬜';
    return `${emoji}${emoji}${emoji}${emoji}`;
  });

  const statusLine = solved
    ? `✅ Solved in ${mistakes} mistake${mistakes !== 1 ? 's' : ''}!`
    : `❌ ${mistakes} mistakes`;

  const shareText = [
    `TAG Connections #${puzzleNumber} — ${date}`,
    ...emojiRows,
    '',
    statusLine,
    'Play at https://twoaveragegamers.com/connections',
  ].join('\n');

  async function handleCopy() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopyState('copied');
      } catch {
        setCopyState('error');
      }
      setTimeout(() => setCopyState('idle'), 2000);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        setCopyState('shared');
        setTimeout(() => setCopyState('idle'), 2000);
      } catch {
        // Thrown when the user just closes the native share sheet — not a
        // failure, so no error state.
      }
      return;
    }

    setCopyState('error');
    setTimeout(() => setCopyState('idle'), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Preview */}
      <div
        className="w-full rounded-tile p-4 text-center font-mono text-[14px] leading-relaxed whitespace-pre-line"
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        {shareText}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="px-8 py-3 rounded-tile text-[14px] font-semibold transition-all duration-150"
        style={{
          backgroundColor: copyState === 'copied' || copyState === 'shared' ? 'var(--tier-green)' : 'var(--accent-primary)',
          color: copyState === 'copied' || copyState === 'shared' ? '#0F0F14' : 'var(--text-primary)',
        }}
      >
        {copyState === 'copied' ? 'Copied!'
          : copyState === 'shared' ? 'Shared!'
          : 'Share Results'}
      </button>
      {copyState === 'error' && (
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          Couldn't copy automatically — select the text above and copy it manually.
        </p>
      )}
    </div>
  );
}
