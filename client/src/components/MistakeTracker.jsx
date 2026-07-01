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
            style={i < remaining
              ? { backgroundColor: 'var(--text-primary)', opacity: 1 }
              // Spent dots stay legible as a distinct "used" ring instead of
              // fading to near-invisible against the background.
              : { backgroundColor: 'transparent', border: '1.5px solid var(--text-secondary)', opacity: 0.7 }
            }
          />
        ))}
      </div>
    </div>
  );
}
