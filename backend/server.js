const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const cron = require('node-cron');
const { initDb } = require('./models/database');
const playersRoutes = require('./routes/players');
const votesRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const { updateMatches } = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust first proxy (Render) pour obtenir la vraie IP client
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Gere par Vercel cote frontend
  crossOriginEmbedderPolicy: false,
}));

// Rate limit global : 100 req/min par IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requetes, reessaye dans 1 minute' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// CORS
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
app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/api', playersRoutes);
app.use('/api', votesRoutes);
app.use('/api/admin', adminRoutes);

// Health check (with DB connectivity test)
app.get('/api/health', async (req, res) => {
  try {
    const { queryOne } = require('./models/database');
    await queryOne('SELECT 1');
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[HEALTH] DB check failed:', err.message);
    res.status(503).json({ status: 'degraded', db: 'error', timestamp: new Date().toISOString() });
  }
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
let cronRunning = false;
cron.schedule('0 19,23 * * 5,6,0', () => {
  if (cronRunning) {
    console.log(`[CRON] Skipped — previous run still in progress`);
    return;
  }
  cronRunning = true;
  console.log(`[CRON] Auto update-matches at ${new Date().toISOString()}`);
  updateMatches()
    .catch(err => console.error(`[CRON] Auto update-matches failed:`, err.message))
    .finally(() => { cronRunning = false; });
}, { timezone: 'Europe/Paris' });

// Error handler global (catch-all)
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

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
