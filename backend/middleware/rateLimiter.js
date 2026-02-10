const rateLimit = require('express-rate-limit');

const voteLimiter = rateLimit({
  windowMs: 3 * 1000,    // 3 secondes
  max: 1,                // 1 requete max par fenetre
  message: { error: 'Attends quelques secondes entre chaque vote' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { voteLimiter };
