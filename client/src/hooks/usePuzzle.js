import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTodayPuzzle, submitGuess, revealAllGroups, completePuzzle } from '../lib/api';

const GAME_STATES = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  SUBMITTED: 'SUBMITTED',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
};

const MAX_MISTAKES = 4;
const MAX_SELECTED = 4;

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

export function usePuzzle() {
  const [puzzle, setPuzzle] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [wrongIds, setWrongIds] = useState([]);
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

  // Load puzzle on mount
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchTodayPuzzle();
        setPuzzle(data);

        // Check for saved game state
        const saved = loadGameState(data.puzzle_date);
        if (saved) {
          if (saved.gameState === GAME_STATES.COMPLETE || saved.gameState === GAME_STATES.FAILED) {
            setItems(saved.items || []);
            setSolvedGroups(saved.solvedGroups || []);
            setMistakes(saved.mistakes || 0);
            setGameState(saved.gameState);
            setLoading(false);
            return;
          }
          // Resume in-progress game
          setItems(saved.items || shuffleArray(data.items));
          setSolvedGroups(saved.solvedGroups || []);
          setMistakes(saved.mistakes || 0);
          setSelectedIds(saved.selectedIds || []);
          setGameState(GAME_STATES.PLAYING);
        } else {
          setItems(shuffleArray(data.items));
          setGameState(GAME_STATES.PLAYING);
        }

        startTimeRef.current = Date.now();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Persist game state on changes
  useEffect(() => {
    if (puzzle && gameState !== GAME_STATES.IDLE) {
      saveGameState(puzzle.puzzle_date, {
        items,
        selectedIds,
        solvedGroups,
        mistakes,
        gameState,
      });
    }
  }, [puzzle, items, selectedIds, solvedGroups, mistakes, gameState]);

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

      completePuzzle({
        puzzle_date: puzzle.puzzle_date,
        solved: false,
        mistakes: finalMistakes,
        solve_time_secs: solveTime,
        groups_order: allGroups.map(g => g.id),
      }).catch(() => {});
    } catch (err) {
      console.error('Reveal error:', err);
      setGameState(GAME_STATES.FAILED);
    }
  }, [puzzle, solvedGroups]);

  const submitSelection = useCallback(async () => {
    if (selectedIds.length !== MAX_SELECTED || !puzzle) return;
    if (gameState !== GAME_STATES.PLAYING) return;

    setGameState(GAME_STATES.SUBMITTED);

    try {
      const result = await submitGuess(puzzle.puzzle_date, selectedIds);

      if (result.correct) {
        const newSolvedGroups = [...solvedGroups, result.group];
        setSolvedGroups(newSolvedGroups);

        // Remove solved items from the grid
        const solvedItemIds = new Set(result.group.items.map(i => i.id));
        setItems(prev => prev.filter(item => !solvedItemIds.has(item.id)));
        setSelectedIds([]);

        // Check win condition
        if (newSolvedGroups.length === (puzzle.group_count || 4)) {
          setGameState(GAME_STATES.COMPLETE);

          const solveTime = startTimeRef.current
            ? Math.round((elapsedRef.current + Date.now() - startTimeRef.current) / 1000)
            : elapsedRef.current > 0 ? Math.round(elapsedRef.current / 1000) : null;

          completePuzzle({
            puzzle_date: puzzle.puzzle_date,
            solved: true,
            mistakes,
            solve_time_secs: solveTime,
            groups_order: newSolvedGroups.map(g => g.id),
          }).catch(() => {});

          return;
        }

        setGameState(GAME_STATES.PLAYING);
      } else {
        // Wrong guess
        setWrongIds([...selectedIds]);
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);

        setTimeout(() => {
          setWrongIds([]);
          setSelectedIds([]);

          if (newMistakes >= MAX_MISTAKES) {
            handleFail(newMistakes);
          } else {
            setGameState(GAME_STATES.PLAYING);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setGameState(GAME_STATES.PLAYING);
    }
  }, [selectedIds, puzzle, gameState, solvedGroups, mistakes, handleFail]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    puzzle,
    items,
    selectedIds,
    solvedGroups,
    mistakes,
    gameState,
    wrongIds,
    loading,
    error,
    toggleTile,
    submitSelection,
    deselectAll,
    isComplete: gameState === GAME_STATES.COMPLETE,
    isFailed: gameState === GAME_STATES.FAILED,
    isPlaying: gameState === GAME_STATES.PLAYING,
    canSubmit: selectedIds.length === MAX_SELECTED && gameState === GAME_STATES.PLAYING,
  };
}
