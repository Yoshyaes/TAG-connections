import { useState } from 'react';

const COLOR_EMOJI = {
  green: '🟢',
  blue: '🔵',
  purple: '🟣',
  gold: '🟡',
};

export default function ShareCard({ puzzle, solvedGroups, mistakes, solved }) {
  const [copied, setCopied] = useState(false);

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
    'Play at twaveragegamers.com/connections',
  ].join('\n');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for mobile
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          backgroundColor: copied ? 'var(--tier-green)' : 'var(--accent-primary)',
          color: copied ? '#0F0F14' : 'var(--text-primary)',
        }}
      >
        {copied ? 'Copied!' : 'Share Results'}
      </button>
    </div>
  );
}
