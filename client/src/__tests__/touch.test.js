import { describe, it, expect, afterEach, vi } from 'vitest';
import { guessKey, isRepeatGuess, applyDragSelect, haptic, isTouchInput } from '../lib/touch';

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
