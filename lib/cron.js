// Chhote periodic jobs (har 30 sec): schedules, reminders, auto mute, always online ...
const jobs = [];
let timer = null;
let sockRef = null;

const every = (fn) => jobs.push(fn);

function start(sock) {
  sockRef = sock;
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    for (const job of jobs) {
      try { await job(sockRef); } catch (e) { console.error('⚠️ cron job error:', e.message); }
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

module.exports = { every, start, nowIn };
