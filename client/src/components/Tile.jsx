import { useState, useEffect } from 'react';

export default function Tile({ item, isSelected, isWrong, isSolving = false, solveColor = null, onToggle, disabled }) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (isWrong) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isWrong]);

  // Auto-shrink font for long text. Thresholds lowered from 16/10 -- at the
  // 12px floor (C6) single words of exactly 9-10 characters ("Alchemist",
  // "Blacksmith") were falling just outside the old 10-char cutoff and
  // wrapping mid-word instead of shrinking.
  const text = item.text;
  const len = text.length;
  let sizeClass = '';
  if (len > 14) sizeClass = 'tag-tile-text-xs';
  else if (len > 8) sizeClass = 'tag-tile-text-sm';

  return (
    <button
      type="button"
      data-tile-id={String(item.id)}
      onClick={() => !disabled && onToggle(item.id)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle(item.id);
        }
      }}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={`${text}${isSelected ? ', selected' : ''}`}
      className={`
        tag-tile
        ${isSelected ? 'tag-tile-selected' : ''}
        ${shaking ? 'animate-shake' : ''}
        ${isSolving ? 'tag-tile-solving' : ''}
        ${disabled && !isSolving ? 'tag-tile-disabled' : ''}
      `}
      style={isSolving && solveColor ? { '--solve-color': solveColor } : undefined}
    >
      {shaking && (
        <div className="absolute inset-0 rounded-tile animate-red-flash pointer-events-none" />
      )}
      <span className={`tag-tile-text ${sizeClass}`}>{text}</span>
    </button>
  );
}
