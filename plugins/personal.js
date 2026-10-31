// Personal / WhatsApp utilities: afk, greet, mention, filters, setcmd, tog, forward, poll, react, dlt, clear, delete/antiedit config, status/call/read/online
const { cmd, onMessage, onOwnMessage } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');
const cron = require('../lib/cron');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, usage, mini, onOff } = require('../lib/style');

const num = (j = '') => String(j).split('@')[0].split(':')[0];
const ownerJid = () => `${config.OWNER_NUMBER}@s.whatsapp.net`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------------- PERSONAL GREET (pehli DM par) ---------------- */
cmd({ pattern: 'setgreet', desc: 'Pehli DM par auto greeting set karein', category: 'personal', owner: true, react: '👋' },
  async (sock, mek, m, { q, reply, prefix }) => { if (!q) return reply(usage(prefix, 'setgreet Salam! Main abhi busy hoon.')); settings.setData('greet', q); await reply(ok('Greeting save ho gayi.')); });
cmd({ pattern: 'getgreet', desc: 'Greeting dekhein', category: 'personal', owner: true },
  async (sock, mek, m, { reply }) => reply(settings.getData('greet', null) ? box('ɢʀᴇᴇᴛ', [settings.getData('greet')]) : err('Koi greeting set nahi.')));
cmd({ pattern: 'delgreet', desc: 'Greeting hata dein', category: 'personal', owner: true },
  async (sock, mek, m, { reply }) => { settings.delData('greet'); await reply(ok('Greeting hata di.')); });

onMessage(async (sock, msg, ctx) => {
  const g = settings.getData('greet', null);
  if (!g || ctx.isGroup || ctx.isOwner || !ctx.body) return;
  const seen = settings.getData('greeted', {});
  if (Date.now() - (seen[ctx.number] || 0) < 24 * 3600 * 1000) return;
  seen[ctx.number] = Date.now(); settings.setData('greeted', seen);
  await sock.sendMessage(ctx.from, { text: g }, { quoted: msg, noFont: true });
});

/* ---------------- MENTION auto-reply ---------------- */
cmd({ pattern: 'mention', desc: 'Jab owner ko mention karein to auto reply: mention on|off|<text>|get', category: 'personal', owner: true, react: '📣' },
  async (sock, mek, m, { q, reply, prefix }) => {
    const cur = settings.getData('mention', { on: false, text: '' });
    if (!q) return reply(box('ᴍᴇɴᴛɪᴏɴ', [['📌', 'Status', onOff(String(cur.on))], ['💬', 'Text', cur.text || '-'], '', `${prefix}mention on|off`, `${prefix}mention <text>`]));
    if (q === 'on' || q === 'off') { settings.setData('mention', { ...cur, on: q === 'on' }); return reply(ok(`Mention reply: ${onOff(String(q === 'on'))}`)); }
    if (q === 'get') return reply(cur.text || err('Text set nahi.'));
    settings.setData('mention', { on: true, text: q }); await reply(ok('Mention reply save + ON.'));
  });
onMessage(async (sock, msg, ctx) => {
  const cur = settings.getData('mention', null);
  if (!cur?.on || !cur.text || !ctx.isGroup) return;
  const me = num(sock.user?.id);
  if (!ctx.mentioned.some((j) => num(j) === me || num(j) === config.OWNER_NUMBER)) return;
  await sock.sendMessage(ctx.from, { text: cur.text }, { quoted: msg, noFont: true });
});

/* ---------------- FILTERS ---------------- */
function defineFilters(addName, delName, scope, desc, groupOnly) {
  const key = (ctx) => (scope === 'group' ? `filters:${ctx.from}` : `filters:${scope}`);
  cmd({ pattern: addName, desc: `${desc}: ${addName} <word> (reply to text) | list`, category: 'personal', owner: scope !== 'group', admin: scope === 'group', group: groupOnly, react: '🧲' },
    async (sock, mek, m, ctx) => {
      const { q, quoted, reply, prefix } = ctx;
      const all = settings.getData(key(ctx), {});
      if (!q) return reply(usage(prefix, `${addName} hello`, 'Kisi text message ko reply karke likhein.'));
      if (q.toLowerCase() === 'list' && !quoted) return reply(Object.keys(all).length ? box('ꜰɪʟᴛᴇʀꜱ', Object.keys(all).map((k) => `• ${k}`)) : err('Koi filter nahi.'));
      if (!quoted?.text) return reply(err('Pehle kisi text message ko reply karein.'));
      all[q.toLowerCase()] = quoted.text; settings.setData(key(ctx), all);
      await reply(ok(`Filter set: *${q}*`));
    });
  cmd({ pattern: delName, desc: `${desc} hatayein`, category: 'personal', owner: scope !== 'group', admin: scope === 'group', group: groupOnly },
    async (sock, mek, m, ctx) => {
      const all = settings.getData(key(ctx), {}); const k = ctx.q.toLowerCase();
      if (!all[k]) return ctx.reply(err('Ye filter nahi mila.'));
      delete all[k]; settings.setData(key(ctx), all); await ctx.reply(ok(`Filter hata diya: *${k}*`));
    });
}
defineFilters('filter', 'stop', 'group', 'Is group ka filter', true);
defineFilters('gfilter', 'gstop', 'g', 'Saare groups ka filter', false);
defineFilters('pfilter', 'pstop', 'p', 'Personal chats ka filter', false);

onMessage(async (sock, msg, ctx) => {
  if (!ctx.body || ctx.body.startsWith(ctx.prefix)) return;
  const lists = ctx.isGroup ? [settings.getData(`filters:${ctx.from}`, {}), settings.getData('filters:g', {})] : [settings.getData('filters:p', {})];
  for (const all of lists)
    for (const [word, text] of Object.entries(all))
      if (new RegExp(`(?:^|\\W)${esc(word)}(?:$|\\W)`, 'i').test(ctx.body)) { await sock.sendMessage(ctx.from, { text }, { quoted: msg, noFont: true }); return true; }
});

/* ---------------- SETCMD (sticker -> command) ---------------- */
const shaOf = (q) => q?.message?.stickerMessage?.fileSha256 && Buffer.from(q.message.stickerMessage.fileSha256).toString('base64');
cmd({ pattern: 'setcmd', desc: 'Sticker ko command bana dein: sticker reply + setcmd ping', category: 'personal', owner: true, react: '🧷' },
  async (sock, mek, m, { q, quoted, reply, prefix }) => {
    const sha = shaOf(quoted);
    if (!sha) return reply(err('Pehle kisi *sticker* ko reply karein.'));
    if (!q) return reply(usage(prefix, 'setcmd ping'));
    const map = settings.getData('stickercmds', {}); map[sha] = q; settings.setData('stickercmds', map);
    await reply(ok(`Ye sticker ab *${prefix}${q}* chalayega.`));
  });
cmd({ pattern: 'getcmd', desc: 'Sticker commands ki list', category: 'personal', owner: true },
  async (sock, mek, m, { reply }) => { const v = Object.values(settings.getData('stickercmds', {})); await reply(v.length ? box('ꜱᴛɪᴄᴋᴇʀ ᴄᴍᴅꜱ', v.map((c, i) => `${i + 1}. ${c}`)) : err('Koi sticker command set nahi.')); });
cmd({ pattern: 'delcmd', desc: 'Sticker command hatayein (sticker reply ya naam)', category: 'personal', owner: true },
  async (sock, mek, m, { q, quoted, reply }) => {
    const map = settings.getData('stickercmds', {}); const sha = shaOf(quoted);
    const k = sha && map[sha] ? sha : Object.keys(map).find((x) => map[x] === q);
    if (!k) return reply(err('Aisa koi sticker command nahi mila.'));
    delete map[k]; settings.setData('stickercmds', map); await reply(ok('Hata diya.'));
  });

/* ---------------- TOG (command on/off) ---------------- */
cmd({ pattern: 'tog', desc: 'Command band/chalu: tog menu off', category: 'personal', owner: true, react: '🎚️' },
  async (sock, mek, m, { args, reply, prefix }) => {
    const [c, v] = [(args[0] || '').toLowerCase(), (args[1] || '').toLowerCase()];
    if (!c || !['on', 'off'].includes(v)) return reply(usage(prefix, 'tog play off', `Abhi band: ${settings.getData('disabled', []).join(', ') || 'koi nahi'}`));
    if (c === 'tog') return reply(err('tog ko tog nahi kar sakte 😅'));
    let list = settings.getData('disabled', []).filter((x) => x !== c);
    if (v === 'off') list.push(c);
    settings.setData('disabled', list);
    await reply(ok(`${prefix}${c} ab ${v === 'on' ? '✅ ON' : '❌ OFF'} hai.`));
  });

/* ---------------- forward / poll / react / dlt / clear ---------------- */
cmd({ pattern: 'forward', alias: ['fwd'], desc: 'Reply kiya message jids par bhejein: forward 9230..@s.whatsapp.net', category: 'whatsapp', owner: true, react: '↪️' },
  async (sock, mek, m, { args, quoted, reply, prefix }) => {
    if (!quoted) return reply(err('Pehle kisi message ko reply karein.'));
    const jids = args.map((a) => (a.includes('@') ? a : `${a.replace(/\D/g, '')}@s.whatsapp.net`)).filter((j) => j.length > 8);
    if (!jids.length) return reply(usage(prefix, 'forward 923001234567 120363xxx@g.us'));
    for (const j of jids) { await sock.sendMessage(j, { forward: { key: quoted.key, message: quoted.message } }); await new Promise((r) => setTimeout(r, 1200)); }
    await reply(ok(`${jids.length} jagah forward ho gaya.`));
  });

cmd({ pattern: 'react', desc: 'Reply kiye message par reaction: react 🔥', category: 'whatsapp' },
  async (sock, mek, m, { from, q, quoted, reply, prefix }) => {
    if (!q || !quoted) return reply(usage(prefix, 'react 🔥', 'Kisi message ko reply karke likhein.'));
    await sock.sendMessage(from, { react: { text: q, key: quoted.key } });
  });

cmd({ pattern: 'dlt', alias: ['del'], desc: 'Reply kiya message delete', category: 'whatsapp', react: '🗑️' },
  async (sock, mek, m, { from, quoted, isGroup, getAdminInfo, isOwner, reply }) => {
    if (!quoted) return reply(err('Pehle kisi message ko reply karein.'));
    if (isGroup && !quoted.key.fromMe) { const { isAdmin, isBotAdmin } = await getAdminInfo(); if (!isBotAdmin) return reply(err('Doosron ke msgs delete karne ke liye bot admin hona chahiye.')); if (!isAdmin && !isOwner) return reply(err('Sirf admins.')); }
    await sock.sendMessage(from, { delete: quoted.key });
  });

cmd({ pattern: 'clear', desc: 'Chat clear karein', category: 'whatsapp', owner: true, react: '🧹' },
  async (sock, mek, m, { from, reply }) => {
    await sock.chatModify({ delete: true, lastMessages: [{ key: mek.key, messageTimestamp: mek.messageTimestamp }] }, from);
    await reply(ok('Chat clear.')).catch(() => {});
  });

/* ---------------- anti-delete / anti-edit destination ---------------- */
function destCommand(pattern, label, flag, destKey, scopeKey) {
  cmd({ pattern, desc: `${label}: ${pattern} p | g | <jid> [pm|gm|no-pm|no-gm] | off`, category: 'whatsapp', owner: true, react: '🛡️' },
    async (sock, mek, m, { args, reply, prefix }) => {
      const dest = (args[0] || '').toLowerCase(); const scope = (args[1] || '').toLowerCase();
      const valid = ['pm', 'gm', 'no-pm', 'no-gm'];
      if (!dest || (scope && !valid.includes(scope)))
        return reply(box(label, [['📌', 'Status', onOff(config[flag])], ['📍', 'Dest', config[destKey]], ['🎯', 'Scope', config[scopeKey] || 'all'], '',
          `${prefix}${pattern} p  ➜ mere inbox mein`, `${prefix}${pattern} g  ➜ usi chat mein`, `${prefix}${pattern} <jid>  ➜ kisi aur chat mein`, `Scope: pm | gm | no-pm | no-gm`, `${prefix}${pattern} off`]));
      if (dest === 'off' || dest === 'false') { await settings.set(flag, 'false'); return reply(ok(`${label} OFF.`)); }
      await settings.set(flag, 'true');
      await settings.set(destKey, dest === 'p' ? 'owner' : dest === 'g' ? 'chat' : (dest.includes('@') ? dest : `${dest.replace(/\D/g, '')}@s.whatsapp.net`));
      await settings.set(scopeKey, scope);
      await reply(ok(`${label} ON ➜ ${config[destKey]}${scope ? ` (${scope})` : ''}`));
    });
}
destCommand('delete', 'ᴀɴᴛɪ ᴅᴇʟᴇᴛᴇ', 'ANTIDELETE', 'ANTIDELETE_DEST', 'ANTIDELETE_SCOPE');
destCommand('antiedit', 'ᴀɴᴛɪ ᴇᴅɪᴛ', 'ANTI_EDIT', 'ANTI_EDIT_DEST', 'ANTI_EDIT_SCOPE');

/* ---------------- status / call / read / online toggles ---------------- */
cmd({ pattern: 'status', desc: 'Status auto-view on/off', category: 'whatsapp', owner: true, react: '👀' },
  async (sock, mek, m, { q, reply, prefix }) => { if (!['on', 'off'].includes(q)) return reply(usage(prefix, 'status on | off', `Abhi: ${onOff(config.AUTO_STATUS_SEEN)}`)); await settings.set('AUTO_STATUS_SEEN', q === 'on' ? 'true' : 'false'); await reply(ok(`Auto status view: ${onOff(config.AUTO_STATUS_SEEN)}`)); });
cmd({ pattern: 'call', desc: 'Calls auto-reject on/off', category: 'whatsapp', owner: true, react: '📵' },
  async (sock, mek, m, { q, reply, prefix }) => { if (!['on', 'off'].includes(q)) return reply(usage(prefix, 'call on | off', `Abhi: ${onOff(config.ANTI_CALL)}`)); await settings.set('ANTI_CALL', q === 'on' ? 'true' : 'false'); await reply(ok(`Reject calls: ${onOff(config.ANTI_CALL)}`)); });
cmd({ pattern: 'read', desc: 'Auto read: read on | off | p (sirf DM) | g (sirf groups)', category: 'whatsapp', owner: true, react: '👁️' },
  async (sock, mek, m, { q, reply, prefix }) => {
    if (!['on', 'off', 'p', 'g'].includes(q)) return reply(usage(prefix, 'read on | off | p | g', `Abhi: ${config.AUTO_READ}`));
    await settings.set('AUTO_READ', q === 'on' ? 'true' : q === 'off' ? 'false' : q);
    await reply(ok(`Auto read: ${config.AUTO_READ}`));
  });

cron.every(async (sock) => { if (config.ALWAYS_ONLINE === 'true') await sock.sendPresenceUpdate('available').catch(() => {}); });
