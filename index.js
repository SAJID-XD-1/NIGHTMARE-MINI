const express = require('express');
const path = require('path');
const config = require('./config');
const { startBot, botEvents } = require('./main');

process.on('unhandledRejection', (e) => console.error('⚠️ unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('⚠️ uncaughtException:', e));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'online', bot: config.BOT_NAME, uptime: process.uptime() });
});

app.post('/api/pair', (req, res) => {
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  let done = false;
  const finish = (status, body) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    res.status(status).json(body);
  };

  const timer = setTimeout(
    () => finish(504, { error: 'WhatsApp server ne jawab nahi diya. Country code ke saath number likhein (jaise 92...) aur dobara try karein.' }),
    25000
  );

  botEvents.emit('requestPairing', phone, (err, code) => {
    if (err) return finish(500, { error: String(err) });
    finish(200, { code });
  });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(config.PORT, () => {
  console.log(`\n🌐 NIGHTMARE Dashboard running on port ${config.PORT}`);
  console.log(`👉 Link: http://localhost:${config.PORT}\n`);
  startBot();
});
