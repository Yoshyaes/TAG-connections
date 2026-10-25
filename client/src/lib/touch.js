// Thin, optional bridge to the shared TAG Arcade Touch Kit
// (tag-arcade/_shared/touch-kit, enqueued by the theme on game pages as
// window.tagArcade). The theme's arcade shell also creates a bare
// window.tagArcade, so the kit is detected by its functions, never by the
// object alone. Without the kit every call here is a silent no-op and the
// game behaves exactly as it did before.

function kit() {
  const ta = typeof window !== 'undefined' ? window.tagArcade : null;
  return ta && typeof ta.haptic === 'function' ? ta : null;
}

// tick | tap | success | fail | heavy. Call from inside the gesture handler
// where possible: iOS only plays the haptic during a user activation.
export function haptic(kind) {
  const ta = kit();
  if (!ta) return false;
  try {
    return ta.haptic(kind);
  } catch {
    return false;
  }
}

export function reducedMotion() {
  const ta = kit();
  if (ta && typeof ta.reducedMotion === 'boolean') return ta.reducedMotion;
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

// True when the last input was a finger. Prefers the kit's live input mode
// (the input actually used); falls back to a coarse-pointer media query.
export function isTouchInput() {
  const ta = kit();
  if (ta && typeof ta.inputMode === 'string') return ta.inputMode === 'touch';
  try {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  } catch {
    return false;
  }
}

// Stable key for a set of tile ids, independent of selection order.
export function guessKey(ids) {
  return [...ids].map(String).sort().join('|');
}

// True when this exact set of ids was already submitted as a wrong guess.
export function isRepeatGuess(history, ids) {
  const key = guessKey(ids);
  return (history || []).some((g) => !g.correct && guessKey(g.ids || []) === key);
}

// Applies one drag-select step: mode 'select' adds (up to max), 'deselect'
// removes. Returns the same array when nothing changes.
export function applyDragSelect(selected, id, mode, max = 4) {
  const has = selected.includes(id);
  if (mode === 'select') {
    if (has || selected.length >= max) return selected;
    return [...selected, id];
  }
  if (!has) return selected;
  return selected.filter((i) => i !== id);
}
