import { useState, useEffect } from 'react';

const TIER_COLORS = {
  green: 'var(--tier-green)',
  blue: 'var(--tier-blue)',
  purple: 'var(--tier-purple)',
  gold: 'var(--tier-gold)',
};

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
        relative w-full aspect-[1.4] flex items-center justify-center
        rounded-tile cursor-pointer select-none
        transition-all duration-100 ease-out
        font-sans text-[15px] font-semibold text-center
        leading-tight px-2
        ${shaking ? 'animate-shake' : ''}
        ${disabled ? 'cursor-default opacity-60' : ''}
      `}
      style={{
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
        boxShadow: isSelected
          ? '0 0 12px rgba(124, 77, 255, 0.4), 0 0 4px rgba(124, 77, 255, 0.2)'
          : 'none',
        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      {/* Red flash overlay for wrong guess */}
      {shaking && (
        <div
          className="absolute inset-0 rounded-tile animate-red-flash pointer-events-none"
        />
      )}
      <span className="relative z-10">{item.text}</span>
    </button>
  );
}
