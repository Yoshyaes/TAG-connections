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

  return (
    <button
      onClick={() => !disabled && onToggle(item.id)}
      disabled={disabled}
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
      <span className="tag-tile-text">{item.text}</span>
    </button>
  );
}
