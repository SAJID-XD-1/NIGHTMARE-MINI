const express = require('express');
const path = require('path');
const config = require('./config');
const manager = require('./main');

process.on('unhandledRejection', (e) => console.error('⚠️ unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('⚠️ uncaughtException:', e));

const app = express();
app.set('trust proxy', 1);   // Heroku proxy ke peeche asli IP
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'online', bot: config.BOT_NAME, uptime: process.uptime(), numbers: manager.list().length });
});

// Connected numbers (masked) - dashboard ke liye
app.get('/api/sessions', (req, res) => {
  res.json({ max: config.base.MAX_SESSIONS, sessions: manager.list() });
});

// Pairing ka misuse rokne ke liye: ek IP se 10 minute mein 6 requests
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 6;
}

app.post('/api/pair', async (req, res) => {
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  if (rateLimited(req.ip)) return res.status(429).json({ error: 'Bohat zyada koshishein. 10 minute baad try karein.' });

  let done = false;
  const finish = (status, body) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    res.status(status).json(body);
  };
  const timer = setTimeout(
    () => finish(504, { error: 'WhatsApp server ne jawab nahi diya. Country code ke saath number likhein (jaise 92...) aur dobara try karein.' }),
    30000
  );

  try {
    finish(200, { code: await manager.requestPairing(phone) });
  } catch (e) {
    finish(500, { error: e.message || String(e) });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(config.PORT, () => {
  console.log(`\n🌐 NIGHTMARE Dashboard running on port ${config.PORT}`);
  console.log(`👉 Link: http://localhost:${config.PORT}\n`);
  manager.startBot().catch((e) => console.error('❌ boot error:', e));
});
