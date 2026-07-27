import { useEffect, useRef, useState } from 'react';
import { MAX_MISTAKES } from '../hooks/usePuzzle';
import { isLoggedIn } from '../lib/api';

// Tier N always pairs with this color name in every puzzle's content
// (class-database.php / puzzle-content.php) — a stable content contract,
// not a guess. This is also the shared glyph vocabulary the Arcade's other
// share grids (Rank Arena) reuse, so a stranger recognizes the shape across
// games.
const TIER_EMOJI = {
  green: '🟩',
  blue: '🟦',
  purple: '🟪',
  gold: '🟥',
};

const SHARE_URL =
  'https://savepoint.twoaveragegamers.com/arcade?utm_source=arcade&utm_medium=share_grid&utm_campaign=connections';

export default function ShareCard({ puzzle, solvedGroups, mistakes, guessHistory, solved }) {
  const [copyState, setCopyState] = useState('idle'); // idle | copied | shared | error
  const containerRef = useRef(null);

  // Board resolution scrolls the share block into view — most relevant on
  // short viewports where the modal's content scrolls internally.
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const puzzleNumber = puzzle?.id || '?';

  // Every group's true item->color mapping is fully known by the time this
  // renders — a win means all 4 groups are in solvedGroups, a loss means
  // usePuzzle's handleFail already merged in the revealed remainder — so
  // resolving each guess attempt's colors here exposes nothing that wasn't
  // already revealed to the player at game-end.
  const itemColorById = {};
  for (const group of solvedGroups) {
    for (const item of group.items || []) {
      itemColorById[item.id] = group.color;
    }
  }

  // One row per guess attempt — correct or wrong — in the order they
  // happened. A wrong guess mixes colors from whichever groups those tiles
  // actually belong to; a correct guess is a solid row. This is what makes
  // the mistakes part of the story instead of erasing them.
  const rows = (guessHistory || []).map(attempt =>
    attempt.ids.map(id => TIER_EMOJI[itemColorById[id]] || '⬜').join('')
  );

  // "Lives remaining," not groups solved or mistakes made: 4 max mistakes,
  // so a perfect game reads 4/4 and a loss (all 4 mistakes spent) always
  // reads 0/4. Matches the spec's own perfect (4/4) and default (3/4, one
  // mistake) examples exactly.
  const livesRemaining = Math.max(0, MAX_MISTAKES - mistakes);

  let headerSuffix = '';
  if (solved && mistakes === 0) {
    headerSuffix = ' · no mistakes';
  } else if (!solved) {
    // Category-level theme hint, never answer-level — this is the one
    // deliberate exception to "no category names," and only on a loss.
    const hardestGroup = solvedGroups.find(g => g.tier === 4);
    if (hardestGroup) {
      headerSuffix = ` · beaten by a puzzle about ${hardestGroup.name}`;
    }
  }

  const shareText = [
    `TAG Connections #${puzzleNumber}`,
    `🎮 ${livesRemaining}/4${headerSuffix}`,
    '',
    ...rows,
    '',
    SHARE_URL,
  ].join('\n');

  function trackShare(method) {
    if (typeof window !== 'undefined' && typeof window.tagArcadeTrack === 'function') {
      window.tagArcadeTrack('arcade_share_copied', {
        game: 'connections',
        puzzle_number: puzzleNumber,
        result: solved ? (mistakes === 0 ? 'perfect' : 'solved') : 'lost',
        logged_in: isLoggedIn(),
        method,
      });
    }
  }

  async function handleCopy() {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState('copied');
      trackShare('copy');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  }

  async function handleNativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ text: shareText });
      setCopyState('shared');
      trackShare('native_share');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      // Thrown when the user just closes the native share sheet — not a failure.
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
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

      {/* Copy / share buttons */}
      <div className="flex gap-3 w-full">
        <button
          onClick={handleCopy}
          className="flex-1 px-6 py-3 rounded-tile text-[14px] font-semibold transition-all duration-150"
          style={{
            backgroundColor: copyState === 'copied' ? 'var(--tier-green)' : 'var(--accent-primary)',
            color: copyState === 'copied' ? '#0F0F14' : 'var(--text-primary)',
          }}
        >
          {copyState === 'copied' ? 'Copied!' : 'Copy Result'}
        </button>
        {canNativeShare && (
          <button
            onClick={handleNativeShare}
            className="flex-1 px-6 py-3 rounded-tile text-[14px] font-semibold transition-all duration-150"
            style={{
              backgroundColor: copyState === 'shared' ? 'var(--tier-green)' : 'var(--bg-card)',
              color: copyState === 'shared' ? '#0F0F14' : 'var(--text-primary)',
              border: copyState === 'shared' ? 'none' : '1px solid var(--border)',
            }}
          >
            {copyState === 'shared' ? 'Shared!' : 'Share'}
          </button>
        )}
      </div>
      {copyState === 'error' && (
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          Couldn't copy automatically — select the text above and copy it manually.
        </p>
      )}
    </div>
  );
}
