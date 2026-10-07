const TIER_BG = {
  green: 'var(--tier-green)',
  blue: 'var(--tier-blue)',
  purple: 'var(--tier-purple)',
  gold: 'var(--tier-gold)',
};

export default function GroupReveal({ group, index }) {
  return (
    <div
      className="w-full rounded-tile animate-flip-in flex flex-col items-center justify-center gap-1 py-3 px-4"
      style={{
        backgroundColor: TIER_BG[group.color] || 'var(--accent-primary)',
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <span
        className="font-display text-[15px] font-bold tracking-tight"
        style={{ color: '#0F0F14' }}
      >
        {group.name}
      </span>
      {/* C7: the row already has a solid tier-color background, so the old
          opacity-80 just dropped the text's contrast against it for no
          reason -- full opacity to clear the 4.5:1 AA floor. */}
      <span
        className="text-[13px] font-normal"
        style={{ color: '#0F0F14' }}
      >
        {group.items.map(i => i.text).join(', ')}
      </span>
    </div>
  );
}
