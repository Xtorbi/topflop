const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const cron = require('node-cron');
const { initDb } = require('./models/database');
const playersRoutes = require('./routes/players');
const votesRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const { updateMatches } = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5180', 'http://localhost:5185'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, cron, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  }
}));
app.use(express.json());

// Routes
app.use('/api', playersRoutes);
app.use('/api', votesRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Keep-alive : empêche Render free tier de s'endormir
// Ping toutes les 14 minutes (Render sleep après 15 min d'inactivité)
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(`${RENDER_URL}/api/health`).catch(() => {});
  }, 14 * 60 * 1000);
}

// Cron interne : mise à jour matchs ven/sam/dim à 19h et 23h (Europe/Paris)
cron.schedule('0 19,23 * * 5,6,0', () => {
  console.log(`[CRON] Auto update-matches at ${new Date().toISOString()}`);
  updateMatches().catch(err => {
    console.error(`[CRON] Auto update-matches failed:`, err.message);
  });
}, { timezone: 'Europe/Paris' });

// Init DB then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Topflop API running on port ${PORT}`);
    console.log(`[CRON] Scheduled: update-matches Fri/Sat/Sun at 19h & 23h Europe/Paris`);
    if (RENDER_URL) console.log(`Keep-alive enabled for ${RENDER_URL}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
