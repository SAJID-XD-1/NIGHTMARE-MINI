// Chhote periodic jobs (har 30 sec): schedules, reminders, auto mute, always online ...
// Har connected number ke context mein alag chalte hain.
const { als } = require('./context');

const jobs = [];
const sessions = new Set();   // connected sessions
let timer = null;

const every = (fn) => jobs.push(fn);
const attach = (session) => { sessions.add(session); start(); };
const detach = (session) => sessions.delete(session);

function start() {
  if (timer) return;
  timer = setInterval(async () => {
    for (const session of [...sessions]) {
      if (!session.sock) continue;
      await als.run(session, async () => {
        for (const job of jobs) {
          try { await job(session.sock); } catch (e) { console.error('⚠️ cron job error:', e.message); }
        }
      });
    }
  }, 30 * 1000);
}

// Timezone ke hisaab se { date:'YYYY-MM-DD', time:'HH:MM' }
function nowIn(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date()).reduce((a, p) => ((a[p.type] = p.value), a), {});
  const hh = parts.hour === '24' ? '00' : parts.hour;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${hh}:${parts.minute}` };
}

module.exports = { every, attach, detach, start, nowIn };
