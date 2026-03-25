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
      <span
        className="text-[13px] font-normal opacity-80"
        style={{ color: '#0F0F14' }}
      >
        {group.items.map(i => i.text).join(', ')}
      </span>
    </div>
  );
}
