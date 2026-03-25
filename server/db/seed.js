import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

const puzzles = [
  {
    puzzle_date: formatDate(yesterday),
    title: 'Legends Never Die',
    items: [
      { id: 1, text: 'Wraith', group_id: 'A' },
      { id: 2, text: 'Octane', group_id: 'A' },
      { id: 3, text: 'Valkyrie', group_id: 'A' },
      { id: 4, text: 'Horizon', group_id: 'A' },
      { id: 5, text: 'Tilted Towers', group_id: 'B' },
      { id: 6, text: 'Salty Springs', group_id: 'B' },
      { id: 7, text: 'Dusty Depot', group_id: 'B' },
      { id: 8, text: 'Greasy Grove', group_id: 'B' },
      { id: 9, text: 'Joel', group_id: 'C' },
      { id: 10, text: 'Booker DeWitt', group_id: 'C' },
      { id: 11, text: 'Sam Drake', group_id: 'C' },
      { id: 12, text: 'Pagan Min', group_id: 'C' },
      { id: 13, text: 'Master Chief', group_id: 'D' },
      { id: 14, text: 'Doom Slayer', group_id: 'D' },
      { id: 15, text: 'Gordon Freeman', group_id: 'D' },
      { id: 16, text: 'Jack Cooper', group_id: 'D' },
    ],
    groups: [
      { id: 'A', name: 'Apex Legends Characters', tier: 1, color: 'green' },
      { id: 'B', name: 'Fortnite Chapter 1 POIs', tier: 2, color: 'blue' },
      { id: 'C', name: 'Voiced by Troy Baker', tier: 3, color: 'purple' },
      { id: 'D', name: 'FPS Protagonists', tier: 4, color: 'gold' },
    ],
  },
  {
    puzzle_date: formatDate(today),
    title: 'Press Start',
    items: [
      { id: 1, text: 'Peacekeeper', group_id: 'A' },
      { id: 2, text: 'Wingman', group_id: 'A' },
      { id: 3, text: 'Kraber', group_id: 'A' },
      { id: 4, text: 'Devotion', group_id: 'A' },
      { id: 5, text: 'Sanctuary', group_id: 'B' },
      { id: 6, text: 'Vault of Glass', group_id: 'B' },
      { id: 7, text: 'Wrath of the Machine', group_id: 'B' },
      { id: 8, text: 'King\'s Fall', group_id: 'B' },
      { id: 9, text: 'Pikachu', group_id: 'C' },
      { id: 10, text: 'Charizard', group_id: 'C' },
      { id: 11, text: 'Mewtwo', group_id: 'C' },
      { id: 12, text: 'Jigglypuff', group_id: 'C' },
      { id: 13, text: 'Ellie', group_id: 'D' },
      { id: 14, text: 'Clementine', group_id: 'D' },
      { id: 15, text: 'Elizabeth', group_id: 'D' },
      { id: 16, text: 'Aloy', group_id: 'D' },
    ],
    groups: [
      { id: 'A', name: 'Apex Legends Weapons', tier: 1, color: 'green' },
      { id: 'B', name: 'Destiny Raids', tier: 2, color: 'blue' },
      { id: 'C', name: 'OG Smash Bros Roster', tier: 3, color: 'purple' },
      { id: 'D', name: 'Gaming\'s Toughest Daughters', tier: 4, color: 'gold' },
    ],
  },
  {
    puzzle_date: formatDate(tomorrow),
    title: 'GG No Re',
    items: [
      { id: 1, text: 'The Witcher', group_id: 'A' },
      { id: 2, text: 'Arcane', group_id: 'A' },
      { id: 3, text: 'Castlevania', group_id: 'A' },
      { id: 4, text: 'Cyberpunk', group_id: 'A' },
      { id: 5, text: 'Diamond', group_id: 'B' },
      { id: 6, text: 'Master', group_id: 'B' },
      { id: 7, text: 'Predator', group_id: 'B' },
      { id: 8, text: 'Radiant', group_id: 'B' },
      { id: 9, text: 'Mercy', group_id: 'C' },
      { id: 10, text: 'Ana', group_id: 'C' },
      { id: 11, text: 'Moira', group_id: 'C' },
      { id: 12, text: 'Kiriko', group_id: 'C' },
      { id: 13, text: 'Nuke', group_id: 'D' },
      { id: 14, text: 'Dust', group_id: 'D' },
      { id: 15, text: 'Mirage', group_id: 'D' },
      { id: 16, text: 'Inferno', group_id: 'D' },
    ],
    groups: [
      { id: 'A', name: 'Games Turned Netflix Shows', tier: 1, color: 'green' },
      { id: 'B', name: 'Valorant/Apex Rank Names', tier: 2, color: 'blue' },
      { id: 'C', name: 'Overwatch 2 Healers', tier: 3, color: 'purple' },
      { id: 'D', name: 'Classic CS:GO Maps', tier: 4, color: 'gold' },
    ],
  },
];

async function seed() {
  try {
    for (const puzzle of puzzles) {
      await pool.query(
        `INSERT INTO puzzles (puzzle_date, title, items, groups)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (puzzle_date) DO UPDATE
         SET title = $2, items = $3, groups = $4`,
        [puzzle.puzzle_date, puzzle.title, JSON.stringify(puzzle.items), JSON.stringify(puzzle.groups)]
      );
      console.log(`Seeded puzzle for ${puzzle.puzzle_date}: "${puzzle.title}"`);
    }
    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
