require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString(), version: '9.0' }));
app.get('/ping', (req, res) => res.send('pong'));

// Routes
app.use('/api/predict',     require('./routes/predict'));
app.use('/api/topics',      require('./routes/topics'));
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/notify',      require('./routes/notify'));
app.use('/api/chat',        require('./routes/chat'));
app.use('/api/email',       require('./routes/email'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 NeuralPrep v9.0 running at http://localhost:${PORT}`);
  console.log(`🤖 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`🏆 Leaderboard API: http://localhost:${PORT}/api/leaderboard`);
  console.log(`❤️  Health: http://localhost:${PORT}/health\n`);
});
