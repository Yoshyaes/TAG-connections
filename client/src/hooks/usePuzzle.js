import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchTodayPuzzle,
  fetchPuzzleByDate,
  submitGuess,
  revealAllGroups,
  completePuzzle,
  isLoggedIn,
} from '../lib/api';
import { haptic, reducedMotion, isRepeatGuess } from '../lib/touch';

const GAME_STATES = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  SUBMITTED: 'SUBMITTED',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
};

export const MAX_MISTAKES = 4;
const MAX_SELECTED = 4;
// How long the wrong-guess shake holds the board before play resumes, and
// how long each toast stays up. The toast is an overlay, so it can outlive
// the lock without moving the grid.
const WRONG_LOCK_MS = 500;
const TOAST_MS = { oneAway: 1600, repeat: 1400 };
// The four solved tiles slide together into the top row before the group
// bar replaces them. 0 under reduced motion.
const SOLVE_COLLAPSE_MS = 420;

function getStorageKey(date) {
  return `tag_connections_${date}`;
}

function loadGameState(date) {
  try {
    const saved = JSON.parse(localStorage.getItem(getStorageKey(date)));
    return saved || null;
  } catch {
    return null;
  }
}

function saveGameState(date, state) {
  localStorage.setItem(getStorageKey(date), JSON.stringify(state));
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function usePuzzle(date = null) {
  const [puzzle, setPuzzle] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  // One entry per submission attempt, correct or wrong, in the order they
  // happened — this is what lets the share grid show "the mistakes are the
  // story" instead of just the 4 solved groups. Only raw item ids + outcome
  // are recorded here; color resolution happens later (ShareCard), once
  // every group's true membership is known (win: all 4 solved; loss: the
  // reveal-all-groups response), so nothing about a wrong guess's true
  // group is exposed to the client any earlier than it already is today.
  const [guessHistory, setGuessHistory] = useState([]);
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [wrongIds, setWrongIds] = useState([]);
  const [oneAway, setOneAway] = useState(false);
  // { text, kind, n }: n changes on every show so a repeated message still
  // re-announces and restarts its timer.
  const [toast, setToast] = useState(null);
  // The tiles of a just-solved group while they collapse, and its color.
  const [solving, setSolving] = useState(null);
  const toastTimerRef = useRef(0);
  const toastSeqRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const startTimeRef = useRef(null);
  const elapsedRef = useRef(0);

  // Pause timer when tab is hidden
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        if (startTimeRef.current) {
          elapsedRef.current += Date.now() - startTimeRef.current;
          startTimeRef.current = null;
        }
      } else {
        if (gameState === GAME_STATES.PLAYING) {
          startTimeRef.current = Date.now();
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [gameState]);

  const showToast = useCallback((text, kind, ms) => {
    clearTimeout(toastTimerRef.current);
    toastSeqRef.current += 1;
    setToast({ text, kind, n: toastSeqRef.current });
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Load puzzle on mount or when date changes
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setPuzzle(null);
        setItems([]);
        setSolvedGroups([]);
        setSelectedIds([]);
        setMistakes(0);
        setGuessHistory([]);
        setGameState(GAME_STATES.IDLE);
        const data = date ? await fetchPuzzleByDate(date) : await fetchTodayPuzzle();
        setPuzzle(data);

        // Check for saved game state
        const saved = loadGameState(data.puzzle_date);
        if (saved) {
          if (saved.gameState === GAME_STATES.COMPLETE || saved.gameState === GAME_STATES.FAILED) {
            setItems(saved.items || []);
            setSolvedGroups(saved.solvedGroups || []);
            setMistakes(saved.mistakes || 0);
            setGuessHistory(saved.guessHistory || []);
            setGameState(saved.gameState);
            setLoading(false);
            return;
          }
          // Resume in-progress game
          setItems(saved.items || shuffleArray(data.items));
          setSolvedGroups(saved.solvedGroups || []);
          setMistakes(saved.mistakes || 0);
          setGuessHistory(saved.guessHistory || []);
          setSelectedIds(saved.selectedIds || []);
          setGameState(GAME_STATES.PLAYING);
        } else {
          setItems(shuffleArray(data.items));
          setGameState(GAME_STATES.PLAYING);
        }

        startTimeRef.current = Date.now();
      } catch (err) {
        setError({ message: err.message, code: err.code || null, status: err.status || 0, data: err.data || null });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [date]);

  // Persist game state on changes
  useEffect(() => {
    if (puzzle && gameState !== GAME_STATES.IDLE) {
      saveGameState(puzzle.puzzle_date, {
        items,
        selectedIds,
        solvedGroups,
        mistakes,
        guessHistory,
        gameState,
      });
    }
  }, [puzzle, items, selectedIds, solvedGroups, mistakes, guessHistory, gameState]);

  const toggleTile = useCallback((id) => {
    if (gameState !== GAME_STATES.PLAYING) return;

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= MAX_SELECTED) {
        return prev;
      }
      return [...prev, id];
    });
  }, [gameState]);

  // Explicit set/unset for drag-select, where one stroke either adds every
  // tile it crosses or removes every tile it crosses.
  const setSelection = useCallback((updater) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    setSelectedIds(updater);
  }, [gameState]);

  // Reorders the remaining tiles. Selection, mistakes and history are
  // untouched; only the on-screen order changes (and is saved, so a reload
  // keeps the new order).
  const shuffle = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    setItems(prev => shuffleArray(prev));
  }, [gameState]);

  const handleFail = useCallback(async (finalMistakes) => {
    try {
      const result = await revealAllGroups(puzzle.puzzle_date);
      // Add remaining unsolved groups
      const solvedGroupIds = new Set(solvedGroups.map(g => g.id));
      const remainingGroups = result.groups.filter(g => !solvedGroupIds.has(g.id));
      const allGroups = [...solvedGroups, ...remainingGroups];

      setSolvedGroups(allGroups);
      setItems([]);
      setSelectedIds([]);
      setGameState(GAME_STATES.FAILED);

      const solveTime = startTimeRef.current
        ? Math.round((elapsedRef.current + Date.now() - startTimeRef.current) / 1000)
        : elapsedRef.current > 0 ? Math.round(elapsedRef.current / 1000) : null;

      if (isLoggedIn()) {
        completePuzzle({
          puzzle_date: puzzle.puzzle_date,
          solved: false,
          mistakes: finalMistakes,
          solve_time_secs: solveTime,
          groups_order: allGroups.map(g => g.id),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Reveal error:', err);
      setGameState(GAME_STATES.FAILED);
    }
  }, [puzzle, solvedGroups]);

  const submitSelection = useCallback(async () => {
    if (selectedIds.length !== MAX_SELECTED || !puzzle) return;
    if (gameState !== GAME_STATES.PLAYING) return;

    // The same wrong set again costs nothing: no request, no mistake, no
    // history entry. Only wrong sets can repeat (a correct set leaves the
    // grid).
    if (isRepeatGuess(guessHistory, selectedIds)) {
      haptic('tap');
      showToast('Already guessed!', 'repeat', TOAST_MS.repeat);
      return;
    }

    setGameState(GAME_STATES.SUBMITTED);
    // A fresh guess replaces any toast still up from the last one.
    clearTimeout(toastTimerRef.current);
    setToast(null);

    try {
      const result = await submitGuess(puzzle.puzzle_date, selectedIds);
      setGuessHistory(prev => [...prev, { ids: [...selectedIds], correct: result.correct }]);

      if (result.correct) {
        haptic('success');
        const newSolvedGroups = [...solvedGroups, result.group];
        const solvedItemIds = new Set(result.group.items.map(i => i.id));

        // Collapse the four tiles together first, then swap them for the
        // group bar. The board stays locked (SUBMITTED) for the animation.
        const collapseMs = reducedMotion() ? 0 : SOLVE_COLLAPSE_MS;
        if (collapseMs > 0) {
          setSolving({ ids: [...solvedItemIds], color: result.group.color });
          await new Promise(r => setTimeout(r, collapseMs));
        }
        setSolving(null);
        setSolvedGroups(newSolvedGroups);

        // Remove solved items from the grid
        setItems(prev => prev.filter(item => !solvedItemIds.has(item.id)));
        setSelectedIds([]);

        // Check win condition
        if (newSolvedGroups.length === (puzzle.group_count || 4)) {
          setGameState(GAME_STATES.COMPLETE);

          const solveTime = startTimeRef.current
            ? Math.round((elapsedRef.current + Date.now() - startTimeRef.current) / 1000)
            : elapsedRef.current > 0 ? Math.round(elapsedRef.current / 1000) : null;

          if (isLoggedIn()) {
            completePuzzle({
              puzzle_date: puzzle.puzzle_date,
              solved: true,
              mistakes,
              solve_time_secs: solveTime,
              groups_order: newSolvedGroups.map(g => g.id),
            }).catch(() => {});
          }

          return;
        }

        setGameState(GAME_STATES.PLAYING);
      } else {
        // Wrong guess. The selection stays, so "One away" can be fixed by
        // swapping a single tile instead of rebuilding the set.
        haptic('fail');
        setWrongIds([...selectedIds]);
        setOneAway(!!result.one_away);
        if (result.one_away) showToast('One away!', 'oneAway', TOAST_MS.oneAway);
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);
        const final = newMistakes >= MAX_MISTAKES;

        setTimeout(() => {
          setWrongIds([]);
          setOneAway(false);

          if (final) {
            setSelectedIds([]);
            handleFail(newMistakes);
          } else {
            setGameState(GAME_STATES.PLAYING);
          }
        }, final && result.one_away ? 1500 : WRONG_LOCK_MS);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setGameState(GAME_STATES.PLAYING);
    }
  }, [selectedIds, puzzle, gameState, solvedGroups, mistakes, guessHistory, handleFail, showToast]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    puzzle,
    items,
    selectedIds,
    solvedGroups,
    mistakes,
    guessHistory,
    gameState,
    wrongIds,
    oneAway,
    toast,
    solving,
    loading,
    error,
    toggleTile,
    submitSelection,
    deselectAll,
    setSelection,
    shuffle,
    isComplete: gameState === GAME_STATES.COMPLETE,
    isFailed: gameState === GAME_STATES.FAILED,
    isPlaying: gameState === GAME_STATES.PLAYING,
    // A guess is in flight (or its shake / solve animation is running).
    isSubmitting: gameState === GAME_STATES.SUBMITTED,
    canSubmit: selectedIds.length === MAX_SELECTED && gameState === GAME_STATES.PLAYING,
  };
}
