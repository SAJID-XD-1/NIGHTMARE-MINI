const config = require('../config');
const { runtime } = require('./functions');

let timer = null;

async function update(sock) {
  try { await sock.updateProfileStatus(`🕷️ ${config.BOT_NAME} ACTIVE • ${runtime(process.uptime())} 🇦🇱`); }
  catch (e) { console.log('❌ Bio update fail:', e.message); }
}

function start(sock) {
  stop();
  update(sock);
  timer = setInterval(() => update(sock), 60 * 1000);
}
function stop() { if (timer) clearInterval(timer); timer = null; }

module.exports = { start, stop };
