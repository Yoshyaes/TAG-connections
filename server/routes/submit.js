import { Router } from 'express';
import { getPuzzleByDate, upsertResult, getStreak, updateStreak, findOrCreateUser } from '../db/queries.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

function getTodayEST() {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return est.toISOString().split('T')[0];
}

// POST /api/puzzle/submit
// Body: { puzzle_date, selected_ids: [id, id, id, id] }
// Returns: { correct: true, group: { name, tier, color, items } } or { correct: false }
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { puzzle_date, selected_ids } = req.body;
    const date = puzzle_date || getTodayEST();

    if (!selected_ids || !Array.isArray(selected_ids) || selected_ids.length !== 4) {
      return res.status(400).json({ error: 'Must submit exactly 4 item IDs' });
    }

    const puzzle = await getPuzzleByDate(date);
    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzle found for this date' });
    }

    const selectedItems = puzzle.items.filter(item => selected_ids.includes(item.id));
    if (selectedItems.length !== 4) {
      return res.status(400).json({ error: 'Invalid item IDs' });
    }

    const groupIds = selectedItems.map(item => item.group_id);
    const allSameGroup = groupIds.every(gid => gid === groupIds[0]);

    if (allSameGroup) {
      const group = puzzle.groups.find(g => g.id === groupIds[0]);
      const groupItems = puzzle.items
        .filter(item => item.group_id === group.id)
        .map(item => ({ id: item.id, text: item.text }));

      return res.json({
        correct: true,
        group: {
          id: group.id,
          name: group.name,
          tier: group.tier,
          color: group.color,
          items: groupItems,
        },
      });
    }

    return res.json({ correct: false });
  } catch (err) {
    console.error('Error submitting guess:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/puzzle/complete
// Body: { puzzle_date, solved, mistakes, solve_time_secs, groups_order }
router.post('/complete', optionalAuth, async (req, res) => {
  try {
    const { puzzle_date, solved, mistakes, solve_time_secs, groups_order } = req.body;

    if (!req.user) {
      return res.json({ saved: false, message: 'Not authenticated — result not saved to server' });
    }

    await findOrCreateUser({
      id: req.user.id,
      email: req.user.email,
      display_name: req.user.user_metadata?.full_name || null,
      avatar_url: req.user.user_metadata?.avatar_url || null,
    });

    const result = await upsertResult({
      user_id: req.user.id,
      puzzle_date,
      solved,
      mistakes,
      solve_time_secs,
      groups_order,
    });

    // Update streak
    const streak = await getStreak(req.user.id);
    const today = getTodayEST();
    const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];

    let currentStreak = 1;
    let longestStreak = streak?.longest_streak || 0;
    let shieldAvailable = streak?.shield_available ?? true;

    if (streak && streak.last_played === yesterday) {
      currentStreak = (streak.current_streak || 0) + 1;
    } else if (streak && streak.last_played === today) {
      currentStreak = streak.current_streak || 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    await updateStreak(req.user.id, {
      current_streak: solved ? currentStreak : 0,
      longest_streak: longestStreak,
      last_played: today,
      shield_available: shieldAvailable,
    });

    res.json({ saved: true, result });
  } catch (err) {
    console.error('Error completing puzzle:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/puzzle/reveal-all
// Body: { puzzle_date }
// Returns all groups for the puzzle (used when player fails)
router.post('/reveal-all', async (req, res) => {
  try {
    const { puzzle_date } = req.body;
    const date = puzzle_date || getTodayEST();

    const puzzle = await getPuzzleByDate(date);
    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzle found' });
    }

    const groups = puzzle.groups.map(group => ({
      id: group.id,
      name: group.name,
      tier: group.tier,
      color: group.color,
      items: puzzle.items
        .filter(item => item.group_id === group.id)
        .map(item => ({ id: item.id, text: item.text })),
    }));

    res.json({ groups });
  } catch (err) {
    console.error('Error revealing groups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
