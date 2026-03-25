export default function MistakeTracker({ mistakes, maxMistakes = 4 }) {
  const remaining = maxMistakes - mistakes;

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[13px] font-normal"
        style={{ color: 'var(--text-secondary)' }}
      >
        Mistakes remaining:
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: maxMistakes }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i < remaining
                ? 'var(--text-primary)'
                : 'var(--border)',
              opacity: i < remaining ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
