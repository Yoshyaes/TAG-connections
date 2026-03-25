import { Router } from 'express';
import { getPuzzleByDate } from '../db/queries.js';

const router = Router();

function getTodayEST() {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return est.toISOString().split('T')[0];
}

function stripAnswers(puzzle) {
  return {
    id: puzzle.id,
    puzzle_date: puzzle.puzzle_date,
    title: puzzle.title,
    items: puzzle.items.map(item => ({ id: item.id, text: item.text })),
    group_count: puzzle.groups.length,
  };
}

// GET /api/puzzle/today
router.get('/today', async (req, res) => {
  try {
    const today = getTodayEST();
    const puzzle = await getPuzzleByDate(today);

    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzle available for today' });
    }

    res.json(stripAnswers(puzzle));
  } catch (err) {
    console.error('Error fetching today\'s puzzle:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/puzzle/:date
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const puzzle = await getPuzzleByDate(date);

    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzle found for this date' });
    }

    res.json(stripAnswers(puzzle));
  } catch (err) {
    console.error('Error fetching puzzle:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
