const express = require('express');
const cors = require('cors');
require('dotenv').config();

const gameRoutes = require('./routes/game');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // Allow all origins (for development)
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Dungeon API is running' });
});

// Game routes
app.use('/api/game', gameRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n⚔️  AI Dungeon API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
