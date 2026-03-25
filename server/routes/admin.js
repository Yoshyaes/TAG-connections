import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { createPuzzle, updatePuzzle, deletePuzzle, getAllPuzzles, getPuzzleByDate } from '../db/queries.js';

const router = Router();

router.use(adminAuth);

// GET /api/admin/puzzles
router.get('/puzzles', async (req, res) => {
  try {
    const puzzles = await getAllPuzzles();
    res.json(puzzles);
  } catch (err) {
    console.error('Error fetching puzzles:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/puzzle/:date
router.get('/puzzle/:date', async (req, res) => {
  try {
    const puzzle = await getPuzzleByDate(req.params.date);
    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzle found for this date' });
    }
    res.json(puzzle);
  } catch (err) {
    console.error('Error fetching puzzle:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/puzzle
router.post('/puzzle', async (req, res) => {
  try {
    const { puzzle_date, title, items, groups } = req.body;

    const validation = validatePuzzle(items, groups);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const puzzle = await createPuzzle({ puzzle_date, title, items, groups });
    res.status(201).json(puzzle);
  } catch (err) {
    console.error('Error creating puzzle:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/puzzle/:id
router.put('/puzzle/:id', async (req, res) => {
  try {
    const { title, items, groups } = req.body;

    const validation = validatePuzzle(items, groups);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const puzzle = await updatePuzzle(parseInt(req.params.id), { title, items, groups });
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }
    res.json(puzzle);
  } catch (err) {
    console.error('Error updating puzzle:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/puzzle/:id
router.delete('/puzzle/:id', async (req, res) => {
  try {
    const deleted = await deletePuzzle(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting puzzle:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function validatePuzzle(items, groups) {
  if (!items || !Array.isArray(items) || items.length !== 16) {
    return { valid: false, error: 'Must have exactly 16 items' };
  }

  if (!groups || !Array.isArray(groups) || groups.length !== 4) {
    return { valid: false, error: 'Must have exactly 4 groups' };
  }

  const texts = items.map(i => i.text?.trim().toLowerCase());
  const uniqueTexts = new Set(texts);
  if (uniqueTexts.size !== 16) {
    return { valid: false, error: 'All item texts must be unique' };
  }

  if (items.some(i => !i.text?.trim())) {
    return { valid: false, error: 'All items must have text' };
  }

  if (groups.some(g => !g.name?.trim())) {
    return { valid: false, error: 'All groups must have names' };
  }

  for (const group of groups) {
    const groupItems = items.filter(i => i.group_id === group.id);
    if (groupItems.length !== 4) {
      return { valid: false, error: `Group "${group.name}" must have exactly 4 items (has ${groupItems.length})` };
    }
  }

  return { valid: true };
}

export default router;
