import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import puzzleRoutes from './routes/puzzle.js';
import submitRoutes from './routes/submit.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/puzzle', puzzleRoutes);
app.use('/api/puzzle/submit', submitRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TAG Connections server running on port ${PORT}`);
});
