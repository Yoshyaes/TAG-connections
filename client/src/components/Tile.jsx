import { useState, useEffect } from 'react';

export default function Tile({ item, isSelected, isWrong, onToggle, disabled }) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (isWrong) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isWrong]);

  // Auto-shrink font for long text
  const text = item.text;
  const len = text.length;
  let sizeClass = '';
  if (len > 16) sizeClass = 'tag-tile-text-xs';
  else if (len > 10) sizeClass = 'tag-tile-text-sm';

  return (
    <button
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
        ${disabled ? 'tag-tile-disabled' : ''}
      `}
    >
      {shaking && (
        <div className="absolute inset-0 rounded-tile animate-red-flash pointer-events-none" />
      )}
      <span className={`tag-tile-text ${sizeClass}`}>{text}</span>
    </button>
  );
}
