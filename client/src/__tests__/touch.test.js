import { describe, it, expect, afterEach, vi } from 'vitest';
import { guessKey, isRepeatGuess, applyDragSelect, haptic, isTouchInput, juicePop, trackSuccess, trackRoundComplete, startCoach, coachSeen, COACH_KEY } from '../lib/touch';

afterEach(() => {
  delete window.tagArcade;
});

describe('guessKey / isRepeatGuess', () => {
  it('ignores selection order', () => {
    expect(guessKey([4, 1, 3, 2])).toBe(guessKey([1, 2, 3, 4]));
  });

  it('flags only a repeated WRONG set', () => {
    const history = [
      { ids: [1, 2, 3, 4], correct: false },
      { ids: [5, 6, 7, 8], correct: true },
    ];
    expect(isRepeatGuess(history, [4, 3, 2, 1])).toBe(true);
    expect(isRepeatGuess(history, [5, 6, 7, 8])).toBe(false);
    expect(isRepeatGuess(history, [1, 2, 3, 9])).toBe(false);
    expect(isRepeatGuess([], [1, 2, 3, 4])).toBe(false);
  });
});

describe('applyDragSelect', () => {
  it('adds up to four and never past it', () => {
    let s = [];
    for (const id of [1, 2, 3, 4, 5]) s = applyDragSelect(s, id, 'select');
    expect(s).toEqual([1, 2, 3, 4]);
  });

  it('removes in deselect mode and returns the same array when nothing changes', () => {
    const s = [1, 2, 3];
    expect(applyDragSelect(s, 2, 'deselect')).toEqual([1, 3]);
    expect(applyDragSelect(s, 9, 'deselect')).toBe(s);
    expect(applyDragSelect(s, 1, 'select')).toBe(s);
  });
});

describe('kit bridge', () => {
  it('is a silent no-op without the kit, and with the bare shell object', () => {
    expect(haptic('tick')).toBe(false);
    window.tagArcade = { registerPause() {} };
    expect(haptic('tick')).toBe(false);
  });

  it('calls the kit haptic and reads its input mode when present', () => {
    const spy = vi.fn(() => true);
    window.tagArcade = { haptic: spy, inputMode: 'touch' };
    expect(haptic('success')).toBe(true);
    expect(spy).toHaveBeenCalledWith('success');
    expect(isTouchInput()).toBe(true);
    window.tagArcade.inputMode = 'mouse';
    expect(isTouchInput()).toBe(false);
  });
});

describe('Phase 3 bridge (kit 1.1 juice / telemetry / coach)', () => {
  it('is a no-op on kit 1.0.0 (haptic only, no juice/success/coach)', () => {
    window.tagArcade = { haptic: () => true, inputMode: 'touch' };
    expect(juicePop(document.createElement('div'))).toBe(false);
    expect(trackSuccess('first_group')).toBe(false);
    expect(trackRoundComplete({ result: 'solved' })).toBe(false);
    expect(startCoach({ steps: [{}] })).toBe(null);
    expect(coachSeen()).toBe(true);
  });

  it('forwards to kit 1.1, pop without its own haptic', () => {
    const pop = vi.fn(() => true), success = vi.fn(() => true), rc = vi.fn(() => true);
    const handle = { stop() {} };
    const coach = Object.assign(vi.fn(() => handle), { seen: vi.fn(() => false) });
    window.tagArcade = { haptic: () => true, juice: { pop }, success, roundComplete: rc, coach };
    const el = document.createElement('div');
    expect(juicePop(el)).toBe(true);
    expect(pop).toHaveBeenCalledWith(el, { haptic: false });
    expect(trackSuccess('first_group')).toBe(true);
    expect(success).toHaveBeenCalledWith('first_group');
    trackRoundComplete({ result: 'failed', mistakes: 4 });
    expect(rc).toHaveBeenCalledWith({ result: 'failed', mistakes: 4 });
    expect(coachSeen()).toBe(false);
    expect(coach.seen).toHaveBeenCalledWith(COACH_KEY);
    expect(startCoach({ key: COACH_KEY, steps: [] })).toBe(handle);
  });

  it('swallows kit errors', () => {
    window.tagArcade = { haptic: () => true, success() { throw new Error('x'); } };
    expect(trackSuccess('a')).toBe(false);
  });
});
