import { useState, useEffect } from 'react';
import {
  fetchAdminPuzzles,
  fetchAdminPuzzle,
  saveAdminPuzzle,
  updateAdminPuzzle,
  deleteAdminPuzzle,
  isAdmin,
} from '../lib/api';

const GROUP_IDS = ['A', 'B', 'C', 'D'];
const TIER_OPTIONS = [
  { value: 1, label: 'Tier 1 (Easiest)', color: 'green' },
  { value: 2, label: 'Tier 2', color: 'blue' },
  { value: 3, label: 'Tier 3', color: 'purple' },
  { value: 4, label: 'Tier 4 (Hardest)', color: 'gold' },
];

const TIER_COLORS = {
  green: 'var(--tier-green)',
  blue: 'var(--tier-blue)',
  purple: 'var(--tier-purple)',
  gold: 'var(--tier-gold)',
};

function getMonthDates(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const dates = [];
  const startPad = firstDay.getDay();

  for (let i = 0; i < startPad; i++) dates.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

export default function AdminPanel() {
  const [puzzles, setPuzzles] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // WordPress handles auth — check if user is admin via injected config
  const authenticated = isAdmin();

  useEffect(() => {
    if (authenticated) {
      loadPuzzles();
    }
  }, [authenticated]);

  async function loadPuzzles() {
    try {
      const data = await fetchAdminPuzzles();
      setPuzzles(data);
    } catch (err) {
      if (err.message === 'Unauthorized') {
        // Admin privileges revoked — reload to reflect new state
        window.location.reload();
        return;
      }
      setError(err.message);
    }
  }

  function getEmptyPuzzle(date) {
    return {
      puzzle_date: date,
      title: '',
      items: Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        text: '',
        group_id: GROUP_IDS[Math.floor(i / 4)],
      })),
      groups: GROUP_IDS.map((id, i) => ({
        id,
        name: '',
        tier: i + 1,
        color: TIER_OPTIONS[i].color,
      })),
    };
  }

  async function handleDateClick(date) {
    setSelectedDate(date);
    setError(null);

    try {
      const existing = await fetchAdminPuzzle(date);
      setEditingPuzzle(existing);
    } catch {
      setEditingPuzzle(getEmptyPuzzle(date));
    }
  }

  function updateItem(index, field, value) {
    setEditingPuzzle(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function updateGroup(index, field, value) {
    setEditingPuzzle(prev => {
      const groups = [...prev.groups];
      groups[index] = { ...groups[index], [field]: value };

      if (field === 'tier') {
        const tierOption = TIER_OPTIONS.find(t => t.value === parseInt(value));
        if (tierOption) groups[index].color = tierOption.color;
      }

      return { ...prev, groups };
    });
  }

  function validatePuzzle() {
    if (!editingPuzzle) return 'No puzzle to validate';

    for (let i = 0; i < 16; i++) {
      if (!editingPuzzle.items[i].text.trim()) {
        return `Item ${i + 1} is empty`;
      }
    }

    const texts = editingPuzzle.items.map(i => i.text.trim().toLowerCase());
    const unique = new Set(texts);
    if (unique.size !== 16) return 'Duplicate item text found';

    for (const group of editingPuzzle.groups) {
      if (!group.name.trim()) return `Group ${group.id} needs a name`;
      const count = editingPuzzle.items.filter(i => i.group_id === group.id).length;
      if (count !== 4) return `Group "${group.name}" has ${count} items (needs 4)`;
    }

    return null;
  }

  async function handleSave() {
    const validationError = validatePuzzle();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingPuzzle.id) {
        await updateAdminPuzzle(editingPuzzle.id, editingPuzzle);
      } else {
        await saveAdminPuzzle(editingPuzzle);
      }
      await loadPuzzles();
      setSelectedDate(null);
      setEditingPuzzle(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingPuzzle?.id) return;
    if (!confirm('Delete this puzzle?')) return;

    try {
      await deleteAdminPuzzle(editingPuzzle.id);
      await loadPuzzles();
      setSelectedDate(null);
      setEditingPuzzle(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const puzzleDates = new Set(puzzles.map(p => {
    const d = new Date(p.puzzle_date);
    return d.toISOString().split('T')[0];
  }));

  const monthDates = getMonthDates(viewMonth.year, viewMonth.month);
  const today = new Date().toISOString().split('T')[0];

  const monthName = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (!authenticated) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-6 text-center"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <h1
            className="font-display text-[24px] font-extrabold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Access Denied
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            You must be logged in as a WordPress administrator to manage puzzles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-screen p-4 md:p-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-4xl mx-auto">
        <h1
          className="font-display text-[28px] font-extrabold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Puzzle Admin
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-tile text-[14px]" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewMonth(prev => {
              const d = new Date(prev.year, prev.month - 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            className="px-3 py-1 rounded-tile text-[14px]"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            ← Prev
          </button>
          <span
            className="font-display text-[18px] font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {monthName}
          </span>
          <button
            onClick={() => setViewMonth(prev => {
              const d = new Date(prev.year, prev.month + 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            className="px-3 py-1 rounded-tile text-[14px]"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-8">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center text-[12px] font-semibold py-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {day}
            </div>
          ))}
          {monthDates.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />;

            const hasP = puzzleDates.has(date);
            const isPast = date < today;
            let bgColor = 'var(--bg-card)'; // gray default
            if (hasP) bgColor = 'rgba(34, 197, 94, 0.2)'; // green
            else if (isPast) bgColor = 'rgba(239, 68, 68, 0.15)'; // red

            let borderColor = 'transparent';
            if (date === today) borderColor = 'var(--accent-secondary)';
            if (date === selectedDate) borderColor = 'var(--accent-primary)';

            return (
              <button
                key={date}
                onClick={() => handleDateClick(date)}
                className="aspect-square flex items-center justify-center rounded-lg text-[13px] font-semibold transition-all"
                style={{
                  backgroundColor: bgColor,
                  color: hasP ? 'var(--tier-green)' : isPast ? '#ef4444' : 'var(--text-secondary)',
                  border: `2px solid ${borderColor}`,
                }}
              >
                {parseInt(date.split('-')[2])}
              </button>
            );
          })}
        </div>

        {/* Puzzle Editor */}
        {editingPuzzle && (
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2
                className="font-display text-[20px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {selectedDate}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 rounded-tile text-[13px] font-semibold"
                  style={{ color: 'var(--accent-secondary)', border: '1px solid var(--accent-secondary)' }}
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button
                  onClick={() => { setSelectedDate(null); setEditingPuzzle(null); }}
                  className="px-4 py-2 rounded-tile text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {showPreview ? (
              <PuzzlePreview puzzle={editingPuzzle} />
            ) : (
              <>
                {/* Title */}
                <div className="mb-6">
                  <label className="block text-[13px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Puzzle Title (optional)
                  </label>
                  <input
                    value={editingPuzzle.title || ''}
                    onChange={(e) => setEditingPuzzle(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-tile text-[14px] outline-none"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                    placeholder="e.g. Press Start"
                  />
                </div>

                {/* Groups + Items */}
                {editingPuzzle.groups.map((group, gi) => (
                  <div key={group.id} className="mb-6 p-4 rounded-tile" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: TIER_COLORS[group.color] }}
                      />
                      <input
                        value={group.name}
                        onChange={(e) => updateGroup(gi, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-tile text-[14px] font-semibold outline-none"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                        placeholder={`Group ${group.id} name`}
                      />
                      <select
                        value={group.tier}
                        onChange={(e) => updateGroup(gi, 'tier', e.target.value)}
                        className="px-3 py-2 rounded-tile text-[13px] outline-none"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {TIER_OPTIONS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {editingPuzzle.items
                        .map((item, idx) => ({ item, idx }))
                        .filter(({ item }) => item.group_id === group.id)
                        .map(({ item, idx }) => (
                          <input
                            key={idx}
                            value={item.text}
                            onChange={(e) => updateItem(idx, 'text', e.target.value)}
                            className="px-3 py-2 rounded-tile text-[14px] text-center outline-none"
                            style={{
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border)',
                            }}
                            placeholder={`Item ${idx + 1}`}
                          />
                        ))}
                    </div>
                  </div>
                ))}

                {/* Save/Delete */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 rounded-tile text-[14px] font-semibold"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-primary)',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Puzzle'}
                  </button>
                  {editingPuzzle.id && (
                    <button
                      onClick={handleDelete}
                      className="px-6 py-3 rounded-tile text-[14px] font-semibold"
                      style={{ color: '#ef4444', border: '1px solid #ef4444' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Non-interactive puzzle preview
function PuzzlePreview({ puzzle }) {
  return (
    <div className="flex flex-col gap-3 max-w-game mx-auto">
      <p className="text-[13px] text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
        Preview — this is how players will see the puzzle
      </p>
      <div className="grid grid-cols-4 gap-2">
        {puzzle.items.map((item, i) => (
          <div
            key={i}
            className="aspect-[1.4] flex items-center justify-center rounded-tile text-[15px] font-semibold text-center px-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '2px solid transparent',
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
      {/* Answer key */}
      <div className="mt-4">
        <p className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>
          Answer Key:
        </p>
        {puzzle.groups.map(group => (
          <div key={group.id} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: TIER_COLORS[group.color] }}
            />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {group.name}:
            </span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {puzzle.items.filter(i => i.group_id === group.id).map(i => i.text).join(', ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
