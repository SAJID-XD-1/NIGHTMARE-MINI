// Group protection: antilink, slink, antiword, antibad, antifake, antispam, antigm, antigstatus, antimod, pdm, warn, amute/aunmute
const { cmd, onMessage } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');
const cron = require('../lib/cron');
const { box, ok, err, warn, usage, mini, onOff } = require('../lib/style');

const num = (j = '') => String(j).split('@')[0].split(':')[0];
const MAX_WARNS = 3;
const counters = new Map();

/* ---------------- helpers ---------------- */
const normalizeUrl = (u) => String(u).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
const LINK_RE = /(https?:\/\/\S+|www\.\S+|chat\.whatsapp\.com\/\S+|wa\.me\/\S+|\b[a-z0-9-]+\.(?:com|net|org|io|me|xyz|info|link|app|gg|tv|pk|co|in)\b(?:\/\S*)?)/gi;
const WA_LINK_RE = /(chat\.whatsapp\.com\/|wa\.me\/|whatsapp\.com\/channel)/i;

async function applyAction(sock, msg, ctx, action, reason, key) {
  const { from, number, sender } = ctx;
  if (action !== 'warn') await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
  if (action === 'null') return;                      // sirf delete
  const k = `${key}:${from}:${number}`;
  const count = (counters.get(k) || 0) + 1;
  counters.set(k, count);
  await sock.sendMessage(from, { text: warn(`${reason}\n👤 @${number}\n📊 Warn: ${count}/${MAX_WARNS}`), mentions: [sender] });
  if (action === 'kick' && count >= MAX_WARNS) {
    counters.delete(k);
    await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
    await sock.sendMessage(from, { text: mini('👢 ᴋɪᴄᴋᴇᴅ', `@${number} ko ${MAX_WARNS} warnings ke baad nikal diya.`), mentions: [sender] });
  }
}

/* ---------------- ANTILINK ---------------- */
// .antilink on/off | kick/warn/null | allow a.com,b.com | disallow x.com | list | clear
cmd({ pattern: 'antilink', alias: ['al', 'nolink'], desc: 'Links block karein (on/off, kick/warn/null, allow, disallow)', category: 'security', admin: true, botAdmin: true, react: '🔗' },
  async (sock, mek, m, { from, args, q, reply, prefix }) => {
    const g = settings.group(from);
    const cur = g.antilink || { on: false, action: 'null', allow: [], deny: [] };
    const c = (args[0] || '').toLowerCase();
    const rest = q.slice(c.length).trim();
    const save = (patch) => settings.setGroup(from, { antilink: { ...cur, ...patch } });
    const list = (s) => rest.split(',').map((x) => normalizeUrl(x.trim())).filter(Boolean);

    if (c === 'on' || c === 'off') { await save({ on: c === 'on' }); return reply(ok(`🔗 Anti-link: ${onOff(String(c === 'on'))}`)); }
    if (['kick', 'warn', 'null'].includes(c)) { await save({ action: c, on: true }); return reply(ok(`Action: *${c}*  (null = sirf delete, warn = warning, kick = ${MAX_WARNS} warn par kick)`)); }
    if (c === 'allow') { if (!rest) return reply(usage(prefix, 'antilink allow youtube.com,github.com')); await save({ allow: [...new Set([...cur.allow, ...list()])] }); return reply(ok('Allowed list update ho gayi.')); }
    if (c === 'disallow') { if (!rest) return reply(usage(prefix, 'antilink disallow site.com')); await save({ deny: [...new Set([...cur.deny, ...list()])] }); return reply(ok('Blocked list update ho gayi.')); }
    if (c === 'clear') { await save({ allow: [], deny: [] }); return reply(ok('Allow/disallow lists saaf.')); }
    if (c === 'list' || c === 'info' || !c)
      return reply(box('ᴀɴᴛɪ ʟɪɴᴋ', [
        ['📌', 'Status', onOff(String(!!cur.on))], ['⚡', 'Action', cur.action], ['✅', 'Allowed', cur.allow.join(', ') || '-'], ['🚫', 'Blocked', cur.deny.join(', ') || '-'], '',
        `${prefix}antilink on|off`, `${prefix}antilink kick|warn|null`, `${prefix}antilink allow a.com,b.com`, `${prefix}antilink disallow x.com`, `${prefix}antilink clear`
      ]));
    return reply(usage(prefix, 'antilink on | off | kick | warn | null | allow | disallow | list | clear'));
  });

/* ---------------- SLINK (WhatsApp links ka strict panel, owner) ---------------- */
const SDEF = { enabled: false, limit: 6, cooldown: 120, allowed: [], mode: 'warn', message: '' };
const sCount = new Map(); const sLast = new Map(); const sWarned = new Set();

cmd({ pattern: 'slink', desc: 'Strict WhatsApp-link filter panel (limit, cooldown, allow)', category: 'security', owner: true, group: true, react: '🛡️' },
  async (sock, mek, m, { from, args, q, reply, prefix }) => {
    const cur = { ...SDEF, ...(settings.group(from).slink || {}) };
    const save = (p) => settings.setGroup(from, { slink: { ...cur, ...p } });
    const c = (args[0] || '').toLowerCase();
    if (!c) return reply(box('ꜱʟɪɴᴋ', [['📌', 'Status', onOff(String(cur.enabled))], ['⚡', 'Mode', cur.mode], ['🔢', 'Limit', cur.limit], ['⏳', 'Cooldown', `${cur.cooldown}s`], ['💬', 'Message', cur.message || '-'], ['✅', 'Allowed', cur.allowed.join(', ') || '-'], '',
      `${prefix}slink on|off`, `${prefix}slink warn|null`, `${prefix}slink <limit number>`, `${prefix}slink cooldown <sec>`, `${prefix}slink set <warn message>`, `${prefix}slink allow|remove <link>`]));
    if (c === 'on' || c === 'off') { await save({ enabled: c === 'on' }); return reply(ok(`Slink ${c.toUpperCase()}`)); }
    if (c === 'warn' || c === 'null') { await save({ mode: c }); return reply(ok(`Mode: ${c === 'warn' ? 'WARN (delete + warning)' : 'NULL (sirf delete)'}`)); }
    if (c === 'set') { const t = q.slice(3).trim(); if (!t) return reply(usage(prefix, 'slink set Links allowed nahi hain')); await save({ message: t }); return reply(ok('Warn message save ho gaya.')); }
    if (c === 'cooldown') { const n = parseInt(args[1]); if (!(n > 0)) return reply(usage(prefix, 'slink cooldown 120')); await save({ cooldown: n }); return reply(ok(`Cooldown: ${n}s`)); }
    if (c === 'allow') { const l = args.slice(1).join(' ').trim(); if (!l) return reply(usage(prefix, 'slink allow chat.whatsapp.com/xyz')); await save({ allowed: [...new Set([...cur.allowed, l])] }); return reply(ok('Allowed list mein add.')); }
    if (c === 'remove') { const l = args.slice(1).join(' ').trim(); await save({ allowed: cur.allowed.filter((x) => x !== l) }); return reply(ok('Allowed list se hata diya.')); }
    const n = parseInt(c);
    if (n > 0) { await save({ limit: n }); return reply(ok(`Limit: ${n}`)); }
    return reply(err('Galat option. Sirf `.slink` likh kar help dekhein.'));
  });

/* ---------------- ANTIWORD / ANTIBAD ---------------- */
cmd({ pattern: 'antiword', alias: ['aw'], desc: 'Custom words block (on/off, add, remove, list, kick/warn/null)', category: 'security', admin: true, botAdmin: true, react: '🚫' },
  async (sock, mek, m, { from, args, q, reply, prefix }) => {
    const cur = settings.group(from).antiword || { on: false, action: 'null', words: [] };
    const save = (p) => settings.setGroup(from, { antiword: { ...cur, ...p } });
    const c = (args[0] || '').toLowerCase();
    const rest = q.slice(c.length).trim();
    if (c === 'on' || c === 'off') { await save({ on: c === 'on' }); return reply(ok(`Anti-word: ${onOff(String(c === 'on'))}`)); }
    if (['kick', 'warn', 'null'].includes(c)) { await save({ action: c, on: true }); return reply(ok(`Action: *${c}*`)); }
    if (c === 'add') { if (!rest) return reply(usage(prefix, 'antiword add word1,word2')); await save({ words: [...new Set([...cur.words, ...rest.toLowerCase().split(',').map((w) => w.trim()).filter(Boolean)])] }); return reply(ok('Words add ho gaye.')); }
    if (c === 'remove') { const rm = rest.toLowerCase().split(',').map((w) => w.trim()); await save({ words: cur.words.filter((w) => !rm.includes(w)) }); return reply(ok('Words hata diye.')); }
    if (c === 'clear') { await save({ words: [] }); return reply(ok('Saare words saaf.')); }
    return reply(box('ᴀɴᴛɪ ᴡᴏʀᴅ', [['📌', 'Status', onOff(String(!!cur.on))], ['⚡', 'Action', cur.action], ['📝', 'Words', cur.words.join(', ') || '-'], '',
      `${prefix}antiword on|off`, `${prefix}antiword kick|warn|null`, `${prefix}antiword add w1,w2`, `${prefix}antiword remove w1`, `${prefix}antiword clear`]));
  });

// Built-in gali filter (Urdu/English)
const BAD_WORDS = new Set(['fuck', 'fucker', 'fucking', 'shit', 'bitch', 'asshole', 'bastard', 'motherfucker', 'dick', 'pussy', 'cock', 'whore', 'slut', 'nigga', 'nigger',
  'bhosdi', 'bhosri', 'bhosdike', 'bhosdiwale', 'chutiya', 'chutiyapa', 'madarchod', 'behenchod', 'bhenchod', 'bhenkelode', 'lund', 'lode', 'gaand', 'gand', 'randi', 'rndi', 'harami', 'kutti', 'kutta', 'hijda', 'bsdk', 'mc', 'bc', 'mkc', 'bkc']);
const BAD_PHRASES = ['teri maa ki', 'teri behan ki', 'maa chod', 'behan chod'];
const hasBad = (t) => { t = t.toLowerCase(); return BAD_PHRASES.some((p) => t.includes(p)) || (t.match(/[a-z]+/g) || []).some((w) => BAD_WORDS.has(w)); };

cmd({ pattern: 'antibad', alias: ['badword', 'ab'], desc: 'Built-in gali filter (on/off, kick/warn/null)', category: 'security', admin: true, botAdmin: true, react: '🚫' },
  async (sock, mek, m, { from, args, reply, prefix }) => {
    const cur = settings.group(from).antibad || { on: false, action: 'warn' };
    const c = (args[0] || '').toLowerCase();
    if (c === 'on' || c === 'off') { await settings.setGroup(from, { antibad: { ...cur, on: c === 'on' } }); return reply(ok(`Anti-bad: ${onOff(String(c === 'on'))}`)); }
    if (['kick', 'warn', 'null', 'delete'].includes(c)) { await settings.setGroup(from, { antibad: { on: true, action: c === 'delete' ? 'null' : c } }); return reply(ok(`Action: *${c}*`)); }
    return reply(box('ᴀɴᴛɪ ʙᴀᴅ', [['📌', 'Status', onOff(String(!!cur.on))], ['⚡', 'Action', cur.action], '', `${prefix}antibad on|off`, `${prefix}antibad kick|warn|null`]));
  });

/* ---------------- ANTIFAKE ---------------- */
// .antifake on/off | allow 92,91 | disallow 1,212 | list | remove 92 | clear
cmd({ pattern: 'antifake', alias: ['af'], desc: 'Country code filter jab koi join kare', category: 'security', admin: true, botAdmin: true, react: '🕵️' },
  async (sock, mek, m, { from, args, q, reply, prefix }) => {
    const cur = settings.group(from).antifake || { on: false, mode: 'deny', codes: [] };
    const save = (p) => settings.setGroup(from, { antifake: { ...cur, ...p } });
    const c = (args[0] || '').toLowerCase();
    const codes = () => q.slice(c.length).split(',').map((x) => x.replace(/\D/g, '')).filter(Boolean);
    if (c === 'on' || c === 'off') { await save({ on: c === 'on' }); return reply(ok(`Anti-fake: ${onOff(String(c === 'on'))}`)); }
    if (c === 'allow') { if (!codes().length) return reply(usage(prefix, 'antifake allow 92,91')); await save({ on: true, mode: 'allow', codes: cur.mode === 'allow' ? [...new Set([...cur.codes, ...codes()])] : codes() }); return reply(ok(`Whitelist mode: sirf ${codes().join(', ')} wale join kar sakenge.`)); }
    if (c === 'disallow') { if (!codes().length) return reply(usage(prefix, 'antifake disallow 1,212')); await save({ on: true, mode: 'deny', codes: cur.mode === 'deny' ? [...new Set([...cur.codes, ...codes()])] : codes() }); return reply(ok(`Blacklist mode: ${codes().join(', ')} wale block.`)); }
    if (c === 'remove') { const rm = codes(); await save({ codes: cur.codes.filter((x) => !rm.includes(x)) }); return reply(ok('Codes hata diye.')); }
    if (c === 'clear') { await save({ on: false, codes: [] }); return reply(ok('Anti-fake saaf + OFF.')); }
    return reply(box('ᴀɴᴛɪ ꜰᴀᴋᴇ', [['📌', 'Status', onOff(String(!!cur.on))], ['🧭', 'Mode', cur.mode === 'allow' ? 'Whitelist' : 'Blacklist'], ['🌍', 'Codes', cur.codes.join(', ') || '-'], '',
      `${prefix}antifake on|off`, `${prefix}antifake allow 92,91`, `${prefix}antifake disallow 1,212`, `${prefix}antifake remove 92`, `${prefix}antifake clear`]));
  });

/* ---------------- ANTISPAM ---------------- */
const LEVELS = { low: { max: 9, secs: 10 }, medium: { max: 6, secs: 10 }, high: { max: 4, secs: 10 } };
cmd({ pattern: 'antispam', alias: ['nospam'], desc: 'Spam rokein (on low|medium|high, warn/delete/kick, info, off)', category: 'security', admin: true, botAdmin: true, react: '🚨' },
  async (sock, mek, m, { from, args, reply, prefix }) => {
    const cur = settings.group(from).antispam || { on: false, level: 'medium', action: 'kick' };
    const c = (args[0] || '').toLowerCase();
    if (c === 'off') { await settings.setGroup(from, { antispam: { ...cur, on: false } }); return reply(ok('Anti-spam OFF.')); }
    if (c === 'on') { const lvl = (args[1] || 'medium').toLowerCase(); if (!LEVELS[lvl]) return reply(err('Level: low | medium | high')); await settings.setGroup(from, { antispam: { ...cur, on: true, level: lvl } }); return reply(ok(`Anti-spam ON • ${lvl} • action ${cur.action}`)); }
    if (LEVELS[c]) { await settings.setGroup(from, { antispam: { ...cur, level: c } }); return reply(ok(`Level: ${c}`)); }
    if (['warn', 'delete', 'kick'].includes(c)) { await settings.setGroup(from, { antispam: { ...cur, action: c } }); return reply(ok(`Action: ${c}`)); }
    const L = LEVELS[cur.level];
    return reply(box('ᴀɴᴛɪ ꜱᴘᴀᴍ', [['📌', 'Status', onOff(String(!!cur.on))], ['📊', 'Level', `${cur.level} (${L.max} msgs / ${L.secs}s)`], ['⚡', 'Action', cur.action], '', `${prefix}antispam on low|medium|high`, `${prefix}antispam warn|delete|kick`, `${prefix}antispam off`]));
  });

/* ---------------- ANTIGM / ANTIGSTATUS ---------------- */
function makeStatusGuard(name, key, title, desc) {
  cmd({ pattern: name, desc, category: 'security', admin: true, botAdmin: true, react: '🛡️' },
    async (sock, mek, m, { from, args, reply, prefix }) => {
      const cur = settings.group(from)[key] || { on: false, action: 'delete' };
      const c = (args[0] || '').toLowerCase();
      if (c === 'on' || c === 'off') { await settings.setGroup(from, { [key]: { ...cur, on: c === 'on' } }); return reply(ok(`${title}: ${onOff(String(c === 'on'))}`)); }
      if (['delete', 'warn', 'kick'].includes(c)) { await settings.setGroup(from, { [key]: { on: true, action: c } }); return reply(ok(`Action: *${c}*`)); }
      return reply(box(title, [['📌', 'Status', onOff(String(!!cur.on))], ['⚡', 'Action', cur.action], '', `${prefix}${name} on|off`, `${prefix}${name} delete|warn|kick`, '', 'Sirf non-admins par lagu hota hai.']));
    });
}
makeStatusGuard('antigm', 'antigm', 'ᴀɴᴛɪ ɢʀᴏᴜᴘ ᴍᴇɴᴛɪᴏɴ', 'Group-mention wale status messages block');
makeStatusGuard('antigstatus', 'antigstatus', 'ᴀɴᴛɪ ɢʀᴏᴜᴘ ꜱᴛᴀᴛᴜꜱ', 'Group status messages block');

/* ---------------- ANTIMOD / PDM ---------------- */
for (const [name, key, title, desc] of [['antimod', 'antimod', 'ᴀɴᴛɪ ᴍᴏᴅ', 'Unauthorized promote/demote ulta kar do'], ['pdm', 'pdm', 'ᴘᴅᴍ', 'Promote/demote ka notification']]) {
  cmd({ pattern: name, desc: `${desc} (on/off)`, category: 'security', admin: true, botAdmin: key === 'antimod', react: '🛡️' },
    async (sock, mek, m, { from, args, reply, prefix }) => {
      const c = (args[0] || '').toLowerCase();
      if (!['on', 'off'].includes(c)) return reply(usage(prefix, `${name} on | off`, `Abhi: ${onOff(String(!!settings.group(from)[key]))}`));
      await settings.setGroup(from, { [key]: c === 'on' });
      await reply(ok(`${title}: ${onOff(String(c === 'on'))}`));
    });
}

/* ---------------- WARN ---------------- */
cmd({ pattern: 'warn', desc: 'User ko warning (reply/mention) | warn reset @user', category: 'security', admin: true, botAdmin: true, react: '⚠️' },
  async (sock, mek, m, ctx) => {
    const { from, args, q, mentioned, quotedParticipant, reply, getAdminInfo, prefix } = ctx;
    const isReset = (args[0] || '').toLowerCase() === 'reset';
    const user = mentioned[0] || quotedParticipant;
    if (!user) return reply(usage(prefix, 'warn @user sabab', 'Ya warn reset @user  |  Ya kisi message ko reply karein.'));
    const key = `warns`;
    const all = settings.getData(key, {});
    const id = `${from}|${num(user)}`;

    if (isReset) { delete all[id]; settings.setData(key, all); return reply(ok(`@${num(user)} ki warnings reset.`), { mentions: [user] }); }

    const { participants } = await getAdminInfo();
    if (participants.some((p) => p.admin && num(p.id) === num(user))) return reply(err('Admin ko warn nahi kar sakte.'));

    all[id] = (all[id] || 0) + 1;
    settings.setData(key, all);
    const left = config.WARN_LIMIT - all[id];
    if (all[id] > config.WARN_LIMIT) {
      delete all[id]; settings.setData(key, all);
      await sock.sendMessage(from, { text: mini('👢 ᴋɪᴄᴋᴇᴅ', `@${num(user)} ne warn limit (${config.WARN_LIMIT}) cross kar di.`), mentions: [user] });
      return sock.groupParticipantsUpdate(from, [user], 'remove');
    }
    const reason = q.replace(/@\d+/g, '').trim() || 'No reason';
    await sock.sendMessage(from, { text: box('ᴡᴀʀɴɪɴɢ', [['🥀', 'User', `@${num(user)}`], ['📌', 'Reason', reason], ['📊', 'Warn', `${all[id]}/${config.WARN_LIMIT}`], ['⏳', 'Bache', left]]), mentions: [user] }, { quoted: mek });
  });

/* ---------------- AMUTE / AUNMUTE (daily schedule) ---------------- */
for (const [name, mode, setting] of [['amute', 'mute', 'announcement'], ['aunmute', 'unmute', 'not_announcement']]) {
  cmd({ pattern: name, desc: `Roz ${mode === 'mute' ? 'band' : 'khulne'} ka waqt: ${name} 22 30 | info | on | off`, category: 'security', admin: true, botAdmin: true, react: '⏰' },
    async (sock, mek, m, { from, args, q, reply, quoted, prefix }) => {
      const key = `${mode}Sched`;
      const cur = settings.group(from)[key];
      const c = (args[0] || '').toLowerCase();
      if (c === 'info') return reply(cur ? box(name, [['⏰', 'Time', `${String(cur.h).padStart(2, '0')}:${String(cur.m).padStart(2, '0')} (${config.TIMEZONE})`], ['📌', 'Status', onOff(String(cur.enabled))], ['💬', 'Msg', cur.msg || '-']]) : err('Koi schedule set nahi.'));
      if (c === 'on' || c === 'off') { if (!cur) return reply(err('Pehle time set karein.')); await settings.setGroup(from, { [key]: { ...cur, enabled: c === 'on' } }); return reply(ok(`${name}: ${onOff(String(c === 'on'))}`)); }
      const h = Number(args[0]), mi = Number(args[1]);
      if (!(h >= 0 && h < 24 && mi >= 0 && mi < 60) || args[0] === undefined || args[1] === undefined) return reply(usage(prefix, `${name} 22 30`, '24 ghante ka waqt (hour minute). Optional: kisi message ko reply karein to wo group mein bheji jayegi.'));
      await settings.setGroup(from, { [key]: { h, m: mi, enabled: true, msg: quoted?.text || '' } });
      const known = settings.getData('__groups', []); if (!known.includes(from)) settings.setData('__groups', [...known, from]);
      await reply(ok(`Roz ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')} par group ${mode === 'mute' ? 'band' : 'khul'} hoga (${config.TIMEZONE}).`));
    });
}

cron.every(async (sock) => {
  const { time, date } = cron.nowIn(config.TIMEZONE);
  const groups = settings.getData('__groups', []);
  for (const jid of groups) {
    const g = settings.group(jid);
    for (const [key, setting] of [['muteSched', 'announcement'], ['unmuteSched', 'not_announcement']]) {
      const s = g[key];
      if (!s?.enabled) continue;
      const t = `${String(s.h).padStart(2, '0')}:${String(s.m).padStart(2, '0')}`;
      if (t !== time || s.last === date) continue;
      await settings.setGroup(jid, { [key]: { ...s, last: date } });
      await sock.groupSettingUpdate(jid, setting).catch(() => {});
      if (s.msg) await sock.sendMessage(jid, { text: s.msg }).catch(() => {});
    }
  }
});

/* ---------------- MAIN WATCHER ---------------- */
const spamLog = new Map();
onMessage(async (sock, msg, ctx) => {
  if (!ctx.isGroup || ctx.isOwner) return;
  const g = settings.group(ctx.from);

  // group list yaad rakho (cron ke liye)
  const known = settings.getData('__groups', []);
  if ((g.muteSched || g.unmuteSched) && !known.includes(ctx.from)) settings.setData('__groups', [...known, ctx.from]);

  const message = ctx.message || {};
  const isStatusGm = !!message.groupStatusMentionMessage;
  const isGroupStatus = !!(message.groupStatusMessageV2 || message.groupStatusMessage);
  const wantsAny = g.antilink?.on || g.slink?.enabled || g.antiword?.on || g.antibad?.on || g.antispam?.on ||
    (g.antigm?.on && isStatusGm) || (g.antigstatus?.on && isGroupStatus);
  if (!wantsAny) return;

  const { isAdmin, isBotAdmin } = await ctx.getAdminInfo();
  if (isAdmin || !isBotAdmin) return;

  if (g.antigm?.on && isStatusGm) { await applyAction(sock, msg, ctx, g.antigm.action === 'delete' ? 'null' : g.antigm.action, '📢 Group mention status allowed nahi.', 'gm'); return true; }
  if (g.antigstatus?.on && isGroupStatus) { await applyAction(sock, msg, ctx, g.antigstatus.action === 'delete' ? 'null' : g.antigstatus.action, '📡 Group status allowed nahi.', 'gs'); return true; }

  if (g.antispam?.on) {
    const L = LEVELS[g.antispam.level] || LEVELS.medium;
    const k = `${ctx.from}:${ctx.number}`;
    const now = Date.now();
    const arr = (spamLog.get(k) || []).filter((t) => now - t < L.secs * 1000);
    arr.push(now); spamLog.set(k, arr);
    if (arr.length > L.max) {
      spamLog.delete(k);
      await sock.sendMessage(ctx.from, { delete: msg.key }).catch(() => {});
      if (g.antispam.action === 'kick') { await sock.groupParticipantsUpdate(ctx.from, [ctx.sender], 'remove').catch(() => {}); await sock.sendMessage(ctx.from, { text: `🚨 @${ctx.number} spam ki wajah se nikal diya.`, mentions: [ctx.sender] }); }
      else await sock.sendMessage(ctx.from, { text: warn(`🚨 Spam mat karein!\n👤 @${ctx.number}`), mentions: [ctx.sender] });
      return true;
    }
  }

  const body = ctx.body;
  if (!body) return;

  if (g.slink?.enabled) {
    const s = { ...SDEF, ...g.slink };
    const hasLink = (body.match(LINK_RE) || []).some((l) => WA_LINK_RE.test(l));
    if (hasLink && !s.allowed.some((a) => body.includes(a))) {
      await sock.sendMessage(ctx.from, { delete: { ...msg.key, fromMe: false } }).catch(() => {});
      const k = `${ctx.from}_${ctx.number}`; const now = Date.now();
      if (!sLast.has(k) || now - sLast.get(k) > s.cooldown * 1000) { sCount.set(k, 0); sWarned.delete(k); }
      sLast.set(k, now); sCount.set(k, (sCount.get(k) || 0) + 1);
      if (sCount.get(k) >= s.limit) { await sock.groupParticipantsUpdate(ctx.from, [ctx.sender], 'remove').catch(() => {}); sCount.delete(k); sLast.delete(k); sWarned.delete(k); }
      else if (s.mode === 'warn' && !sWarned.has(k) && s.message) { sWarned.add(k); await sock.sendMessage(ctx.from, { text: `@${ctx.number} ${s.message.replace(/@user/gi, '').trim()}`, mentions: [ctx.sender] }); }
      return true;
    }
  }

  if (g.antilink?.on) {
    const a = g.antilink;
    const links = (body.match(LINK_RE) || []).filter((l) => {
      const n = normalizeUrl(l);
      if (a.deny.some((d) => n.includes(d))) return true;
      if (a.allow.some((d) => n.includes(d))) return false;
      return true;
    });
    if (links.length) { await applyAction(sock, msg, ctx, a.action, `🔗 Link allowed nahi hai!\n📌 ${links.slice(0, 2).join(', ')}`, 'link'); return true; }
  }

  if (g.antiword?.on && g.antiword.words.length) {
    const low = body.toLowerCase();
    const hit = g.antiword.words.find((w) => new RegExp(`(^|\\W)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`, 'i').test(low));
    if (hit) { await applyAction(sock, msg, ctx, g.antiword.action, `🚫 Ye word allowed nahi: *${hit}*`, 'word'); return true; }
  }

  if (g.antibad?.on && hasBad(body)) { await applyAction(sock, msg, ctx, g.antibad.action, '🚫 Gali / bad word allowed nahi hai!', 'bad'); return true; }
});

module.exports = { hasBad, normalizeUrl };
