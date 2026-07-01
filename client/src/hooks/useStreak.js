import { useState, useEffect, useCallback } from 'react';

const STREAK_KEY = 'tag_connections_streak';

function getStreakData() {
  try {
    const data = JSON.parse(localStorage.getItem(STREAK_KEY));
    return data || { currentStreak: 0, longestStreak: 0, lastPlayed: null };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastPlayed: null };
  }
}

function getTodayEST() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    .toISOString()
    .split('T')[0];
}

// A streak is only "alive" if the user played today or yesterday. Without
// this check, a streak from N days ago would keep displaying as active
// (e.g. "🔥 5 day streak") on every page load until the user plays again —
// the same read-time staleness bug fixed server-side in the other TAG
// arcade games' streak displays.
function isStreakAlive(lastPlayed) {
  if (!lastPlayed) return false;
  const today = getTodayEST();
  const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
  return lastPlayed === today || lastPlayed === yesterday;
}

export function useStreak() {
  const [streak, setStreak] = useState(() => {
    const data = getStreakData();
    return isStreakAlive(data.lastPlayed) ? data : { ...data, currentStreak: 0 };
  });

  useEffect(() => {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }, [streak]);

  const recordPlay = useCallback(function recordPlay(solved) {
    const today = getTodayEST();
    const data = getStreakData();

    if (data.lastPlayed === today) return data;

    const yesterday = new Date(new Date(today).getTime() - 86400000)
      .toISOString()
      .split('T')[0];

    let newStreak;
    if (solved) {
      if (data.lastPlayed === yesterday) {
        newStreak = (data.currentStreak || 0) + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 0;
    }

    const longestStreak = Math.max(newStreak, data.longestStreak || 0);

    const updated = {
      currentStreak: newStreak,
      longestStreak,
      lastPlayed: today,
    };

    setStreak(updated);
    localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
    return updated;
  }, []);

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastPlayed: streak.lastPlayed,
    recordPlay,
  };
}
