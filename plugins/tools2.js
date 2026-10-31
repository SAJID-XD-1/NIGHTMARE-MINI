// 🧰 Extra tools: fancy, qr, tts, trt, reminder, task, budget, schedule, setstatus
const axios = require('axios');
const { cmd } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');
const cron = require('../lib/cron');
const { box, ok, err, usage, mini, onOff } = require('../lib/style');

/* ───────────── QR / TTS / TRANSLATE ───────────── */
cmd({ pattern: 'qr', alias: ['qrcode'], desc: 'Text / link ka QR code', category: 'tools', react: '🔳' },
  async (sock, mek, m, { from, q, quoted, reply, prefix }) => {
    const text = q || quoted?.text;
    if (!text) return reply(usage(prefix, 'qr https://google.com'));
    await sock.sendMessage(from, { image: { url: `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(text)}` }, caption: box('ǫʀ ᴄᴏᴅᴇ', [['🔳', 'Data', text.slice(0, 80)]]) }, { quoted: mek });
  });

cmd({ pattern: 'tts', alias: ['speak'], desc: 'Text ko awaaz mein: .tts ur Salam', category: 'tools', react: '🗣️' },
  async (sock, mek, m, { from, args, quoted, reply, prefix }) => {
    let lang = 'en';
    if (/^[a-z]{2}(-[A-Za-z]{2})?$/.test(args[0] || '') && (args.length > 1 || quoted?.text)) lang = args.shift();
    const text = (args.join(' ') || quoted?.text || '').slice(0, 200);
    if (!text) return reply(usage(prefix, 'tts ur Assalam o alaikum', 'Language code: en, ur, hi, ar, ...'));
    try {
      const { data } = await axios.get('https://translate.google.com/translate_tts', {
        params: { ie: 'UTF-8', q: text, tl: lang, client: 'tw-ob' }, responseType: 'arraybuffer', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      await sock.sendMessage(from, { audio: Buffer.from(data), mimetype: 'audio/mpeg' }, { quoted: mek });
    } catch { await reply(err('Awaaz nahi ban saki (TTS service busy hai).')); }
  });

cmd({ pattern: 'trt', alias: ['translate', 'tr'], desc: 'Translate: .trt ur Hello', category: 'tools', react: '🌐' },
  async (sock, mek, m, { args, quoted, reply, prefix }) => {
    let lang = 'en';
    if (/^[a-z]{2}(-[A-Za-z]{2})?$/.test(args[0] || '') && (args.length > 1 || quoted?.text)) lang = args.shift();
    const text = (args.join(' ') || quoted?.text || '').slice(0, 480);
    if (!text) return reply(usage(prefix, 'trt ur Good morning', 'Pehle language code, phir text. Ya kisi message ko reply karein.'));
    try {
      const { data } = await axios.get('https://api.mymemory.translated.net/get', { params: { q: text, langpair: `autodetect|${lang}` }, timeout: 15000 });
      const out = data?.responseData?.translatedText;
      if (!out) throw new Error('empty');
      await reply(box('ᴛʀᴀɴꜱʟᴀᴛᴇ', [['🌐', 'To', lang], '', out]), { noFont: true });
    } catch { await reply(err('Translate nahi ho saka. Thori der baad try karein.')); }
  });

/* ───────────── REMINDER ───────────── */
const unitMs = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 };

cmd({ pattern: 'reminder', alias: ['remind', 'remindme'], desc: 'Yaad dihani: .reminder 10m text | 18:30 text', category: 'tools', react: '⏰' },
  async (sock, mek, m, { from, number, sender, args, q, reply, prefix }) => {
    const list = settings.getData('reminders', []);
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'list' || !sub) {
      const mine = list.filter((r) => r.jid === from);
      return reply(mine.length
        ? box('ʀᴇᴍɪɴᴅᴇʀꜱ', mine.map((r, i) => `${i + 1}. ${new Date(r.at).toLocaleString('en-GB', { timeZone: config.TIMEZONE })} — ${r.text}`))
        : usage(prefix, 'reminder 10m Chai peeni hai', 'Format: 30s / 10m / 2h / 1d  ya  18:30'));
    }
    if (sub === 'del') {
      const mine = list.filter((r) => r.jid === from);
      const target = mine[parseInt(args[1], 10) - 1];
      if (!target) return reply(err('Aisa reminder nahi mila.'));
      settings.setData('reminders', list.filter((r) => r !== target));
      return reply(ok('Reminder hata diya.'));
    }
    const text = args.slice(1).join(' ').trim();
    if (!text) return reply(usage(prefix, 'reminder 10m Chai peeni hai'));
    let delay;
    const d = sub.match(/^(\d+)(s|m|h|d)$/);
    const t = sub.match(/^(\d{1,2}):(\d{2})$/);
    if (d) delay = parseInt(d[1], 10) * unitMs[d[2]];
    else if (t) {
      const [nh, nm] = cron.nowIn(config.TIMEZONE).time.split(':').map(Number);
      let diff = (parseInt(t[1], 10) * 60 + parseInt(t[2], 10)) - (nh * 60 + nm);
      if (diff <= 0) diff += 1440;
      delay = diff * 6e4;
    } else return reply(err('Waqt ka format: 30s, 10m, 2h, 1d ya 18:30'));
    if (delay < 5000 || delay > 30 * 864e5) return reply(err('Waqt 5 second se 30 din ke darmiyan rakhein.'));
    list.push({ jid: from, who: sender, at: Date.now() + delay, text });
    settings.setData('reminders', list);
    await reply(ok(`⏰ Theek hai @${number}! ${new Date(Date.now() + delay).toLocaleString('en-GB', { timeZone: config.TIMEZONE })} par yaad dilaunga.`), { mentions: [sender] });
  });

cron.every(async (sock) => {
  const list = settings.getData('reminders', []);
  const now = Date.now();
  const due = list.filter((r) => r.at <= now);
  if (!due.length) return;
  settings.setData('reminders', list.filter((r) => r.at > now));
  for (const r of due) await sock.sendMessage(r.jid, { text: box('ʀᴇᴍɪɴᴅᴇʀ', [['⏰', 'Yaad dihani', `@${String(r.who).split('@')[0].split(':')[0]}`], '', r.text]), mentions: [r.who], noFont: true }).catch(() => {});
});

/* ───────────── SCHEDULED MESSAGE (roz is waqt) ───────────── */
cmd({ pattern: 'setschedule', desc: 'Roz is waqt message bhejein: .setschedule 08:30 Subah bakhair', category: 'owner', owner: true, react: '🗓️' },
  async (sock, mek, m, { from, args, reply, prefix }) => {
    const t = (args[0] || '').match(/^(\d{1,2}):(\d{2})$/);
    const text = args.slice(1).join(' ').trim();
    if (!t || !text || +t[1] > 23 || +t[2] > 59) return reply(usage(prefix, 'setschedule 08:30 Subah bakhair', `24-ghante format (${config.TIMEZONE})`));
    const list = settings.getData('schedules', []);
    list.push({ jid: from, time: `${t[1].padStart(2, '0')}:${t[2]}`, text, last: '' });
    settings.setData('schedules', list);
    await reply(ok(`🗓️ Roz *${t[1].padStart(2, '0')}:${t[2]}* par is chat mein message jayega.`));
  });

cmd({ pattern: 'getschedule', desc: 'Is chat ke schedules', category: 'owner', owner: true, react: '🗓️' },
  async (sock, mek, m, { from, reply }) => {
    const mine = settings.getData('schedules', []).filter((s) => s.jid === from);
    await reply(mine.length ? box('ꜱᴄʜᴇᴅᴜʟᴇꜱ', mine.map((s, i) => `${i + 1}. ${s.time} — ${s.text}`)) : err('Is chat mein koi schedule nahi.'));
  });

cmd({ pattern: 'delschedule', desc: 'Schedule hatayein: .delschedule 1', category: 'owner', owner: true, react: '🗑️' },
  async (sock, mek, m, { from, args, reply }) => {
    const all = settings.getData('schedules', []);
    const target = all.filter((s) => s.jid === from)[parseInt(args[0], 10) - 1];
    if (!target) return reply(err('Aisa schedule nahi mila.'));
    settings.setData('schedules', all.filter((s) => s !== target));
    await reply(ok('Schedule hata diya.'));
  });

cron.every(async (sock) => {
  const { date, time } = cron.nowIn(config.TIMEZONE);
  const all = settings.getData('schedules', []);
  let changed = false;
  for (const s of all) {
    if (s.time !== time || s.last === date) continue;
    s.last = date; changed = true;
    await sock.sendMessage(s.jid, { text: s.text, noFont: true }).catch(() => {});
  }
  if (changed) settings.setData('schedules', all);
});

/* ───────────── TASK LIST ───────────── */
cmd({ pattern: 'task', alias: ['todo', 'tasks'], desc: 'Todo list: add / done / del / clear', category: 'tools', react: '📝' },
  async (sock, mek, m, { number, args, reply, prefix }) => {
    const key = `tasks:${number}`;
    const list = settings.getData(key, []);
    const sub = (args[0] || '').toLowerCase();
    const show = () => reply(list.length
      ? box('ᴛᴀꜱᴋ ʟɪꜱᴛ', list.map((t, i) => `${t.done ? '✅' : '🔲'} ${i + 1}. ${t.text}`).concat(['', `${list.filter((t) => t.done).length}/${list.length} mukammal`]))
      : usage(prefix, 'task add Assignment likhni hai'));

    if (!sub || sub === 'list') return show();
    if (sub === 'add') { const text = args.slice(1).join(' ').trim(); if (!text) return reply(usage(prefix, 'task add <kaam>')); list.push({ text, done: false }); settings.setData(key, list); return show(); }
    const idx = parseInt(args[1], 10) - 1;
    if (sub === 'done') { if (!list[idx]) return reply(err('Number galat hai.')); list[idx].done = !list[idx].done; settings.setData(key, list); return show(); }
    if (sub === 'del') { if (!list[idx]) return reply(err('Number galat hai.')); list.splice(idx, 1); settings.setData(key, list); return show(); }
    if (sub === 'clear') { settings.setData(key, []); return reply(ok('Saari tasks saaf.')); }
    return reply(err('Ghalat command. add / done / del / clear / list'));
  });

/* ───────────── BUDGET ───────────── */
const fmt = (n) => Number(n).toLocaleString('en-US');
function addEntry(type) {
  return async (sock, mek, m, { number, args, reply, prefix, command }) => {
    const amt = parseFloat(args[0]);
    if (!(amt > 0)) return reply(usage(prefix, `${command} 500 chai`, 'Pehle raqam, phir tafseel.'));
    const key = `budget:${number}`;
    const b = settings.getData(key, { limit: 0, items: [] });
    b.items.push({ type, amt, note: args.slice(1).join(' ') || '-', d: new Date().toISOString().slice(0, 10) });
    settings.setData(key, b);
    await reply(ok(`${type === 'in' ? '💰 Income' : '💸 Expense'}: ${fmt(amt)}  (${args.slice(1).join(' ') || '-'})`));
  };
}
cmd({ pattern: 'income', alias: ['earn'], desc: 'Aamdani likhein: .income 5000 salary', category: 'tools', react: '💰' }, addEntry('in'));
cmd({ pattern: 'expense', alias: ['spend', 'kharcha'], desc: 'Kharcha likhein: .expense 200 khana', category: 'tools', react: '💸' }, addEntry('out'));

cmd({ pattern: 'summary', alias: ['budget'], desc: 'Budget summary (.budget 20000 se limit set)', category: 'tools', react: '📊' },
  async (sock, mek, m, { number, args, command, reply }) => {
    const key = `budget:${number}`;
    const b = settings.getData(key, { limit: 0, items: [] });
    if (command === 'budget' && parseFloat(args[0]) > 0) { b.limit = parseFloat(args[0]); settings.setData(key, b); return reply(ok(`Budget limit: ${fmt(b.limit)}`)); }
    const inc = b.items.filter((i) => i.type === 'in').reduce((a, i) => a + i.amt, 0);
    const out = b.items.filter((i) => i.type === 'out').reduce((a, i) => a + i.amt, 0);
    if (!b.items.length) return reply(err('Abhi koi entry nahi. `.income` ya `.expense` se shuru karein.'));
    const rows = [['💰', 'Income', fmt(inc)], ['💸', 'Expense', fmt(out)], ['🏦', 'Balance', fmt(inc - out)]];
    if (b.limit) rows.push(['🎯', 'Limit', `${fmt(out)} / ${fmt(b.limit)} (${Math.round((out / b.limit) * 100)}%)${out > b.limit ? ' ⚠️ ZAYADA' : ''}`]);
    rows.push('', '*Aakhri 8 entries:*', ...b.items.slice(-8).map((i) => `${i.type === 'in' ? '➕' : '➖'} ${fmt(i.amt)} — ${i.note} (${i.d})`));
    await reply(box('ʙᴜᴅɢᴇᴛ', rows));
  });

cmd({ pattern: 'delbudget', alias: ['resetbudget'], desc: 'Apna poora budget record mita dein', category: 'tools', react: '🗑️' },
  async (sock, mek, m, { number, reply }) => { settings.delData(`budget:${number}`); await reply(ok('Budget record mita diya.')); });

/* ───────────── SET ABOUT ───────────── */
cmd({ pattern: 'setstatus', alias: ['setbio', 'setabout'], desc: 'WhatsApp about / bio badlein', category: 'owner', owner: true, react: '✍️' },
  async (sock, mek, m, { q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'setstatus Busy hoon 🖤'));
    await sock.updateProfileStatus(q.slice(0, 139));
    await reply(ok('About update ho gaya.'));
  });
