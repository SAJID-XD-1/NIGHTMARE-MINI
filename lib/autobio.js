const config = require('../config');
const { runtime } = require('./functions');
const { current } = require('./context');

const timers = new Map();   // number -> interval

async function update(sock) {
  try { await sock.updateProfileStatus(`🕷️ ${config.BOT_NAME} ACTIVE • ${runtime(process.uptime())} 🇦🇱`); }
  catch (e) { console.log('❌ Bio update fail:', e.message); }
}

function start(sock) {
  const sid = current()?.id || 'default';
  stop(sid);
  update(sock);
  timers.set(sid, setInterval(() => update(sock), 60 * 1000));
}
function stop(sid = current()?.id || 'default') {
  if (timers.has(sid)) clearInterval(timers.get(sid));
  timers.delete(sid);
}

module.exports = { start, stop };
