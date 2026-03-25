import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUserStats, getStreak } from '../db/queries.js';

const router = Router();

// GET /api/user/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [stats, streak] = await Promise.all([
      getUserStats(req.user.id),
      getStreak(req.user.id),
    ]);

    res.json({
      played: parseInt(stats.played),
      won: parseInt(stats.won),
      win_rate: stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0,
      avg_mistakes: parseFloat(stats.avg_mistakes).toFixed(1),
      avg_solve_time: Math.round(parseFloat(stats.avg_solve_time)),
      current_streak: streak?.current_streak || 0,
      longest_streak: streak?.longest_streak || 0,
      last_played: streak?.last_played || null,
      shield_available: streak?.shield_available ?? true,
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
