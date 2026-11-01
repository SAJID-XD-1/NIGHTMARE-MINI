// Extra group commands: welcome/goodbye (custom), invite, join, revoke, ginfo, common, tag, gpp, msgs/reset/inactive, timed mute
const { cmd, onMessage } = require('../nightmare');
const config = require('../config');
const { botIds, participantIds, anyIn } = require('../lib/jid');
const settings = require('../lib/settings');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, warn, usage, mini, onOff } = require('../lib/style');

const num = (j = '') => String(j).split('@')[0].split(':')[0];

/* ---------- welcome / goodbye (custom text) ---------- */
for (const [name, key, msgKey, icon, title] of [['welcome', 'welcome', 'welcomeMsg', '👋', 'ᴡᴇʟᴄᴏᴍᴇ'], ['goodbye', 'goodbye', 'goodbyeMsg', '🥀', 'ɢᴏᴏᴅʙʏᴇ']]) {
  cmd({ pattern: name, desc: `${name} message set/on/off/delete`, category: 'group', admin: true, react: icon },
    async (sock, mek, m, { from, q, reply, prefix }) => {
      const g = settings.group(from);
      if (!q) return reply(box(title, [['📌', 'Status', onOff(String(g[key] === true))], ['💬', 'Message', g[msgKey]?.text || 'default (NIGHTMARE style)'], '',
        `${prefix}${name} on | off`, `${prefix}${name} <text>`, `${prefix}${name} delete`, '', 'Placeholders: @user  @group  @count  &pp (profile photo)']));
      const c = q.toLowerCase();
      if (c === 'on' || c === 'off') { await settings.setGroup(from, { [key]: c === 'on' }); return reply(ok(`${title}: ${onOff(String(c === 'on'))}`)); }
      if (c === 'delete') { await settings.setGroup(from, { [msgKey]: null }); return reply(ok('Custom message hata diya (default wapas).')); }
      await settings.setGroup(from, { [msgKey]: { text: q }, [key]: true });
      await reply(ok(`${title} message save + ON.\n\n${q}`));
    });
}

/* ---------- invite / revoke / join / ginfo ---------- */
cmd({ pattern: 'invite', alias: ['link', 'gclink'], desc: 'Group invite link', category: 'group', group: true, botAdmin: true, react: '🔗' },
  async (sock, mek, m, { from, reply }) => reply(box('ɪɴᴠɪᴛᴇ', [`https://chat.whatsapp.com/${await sock.groupInviteCode(from)}`])));

cmd({ pattern: 'revoke', alias: ['resetlink'], desc: 'Invite link reset', category: 'group', group: true, admin: true, botAdmin: true, react: '♻️' },
  async (sock, mek, m, { from, reply }) => { await sock.groupRevokeInvite(from); await reply(ok('Purana link band, naya ban gaya. `.invite` se lein.')); });

const CODE_RE = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
cmd({ pattern: 'join', desc: 'Link se group join karein', category: 'group', owner: true, react: '🚪' },
  async (sock, mek, m, { q, quoted, reply, prefix }) => {
    const code = ((q || quoted?.text || '').match(CODE_RE) || [])[1];
    if (!code) return reply(usage(prefix, 'join https://chat.whatsapp.com/xxxx'));
    const info = await sock.groupGetInviteInfo(code);
    if (info.size > 1024) return reply(err('Group full hai.'));
    await sock.groupAcceptInvite(code);
    await reply(ok(`Join ho gaya: *${info.subject}*`));
  });

cmd({ pattern: 'ginfo', desc: 'Invite link se group ki info', category: 'group', react: 'ℹ️' },
  async (sock, mek, m, { q, quoted, reply, prefix }) => {
    const code = ((q || quoted?.text || '').match(CODE_RE) || [])[1];
    if (!code) return reply(usage(prefix, 'ginfo https://chat.whatsapp.com/xxxx'));
    const r = await sock.groupGetInviteInfo(code);
    await reply(box('ɢʀᴏᴜᴘ ɪɴꜰᴏ', [['🕸️', 'Name', r.subject], ['🆔', 'ID', r.id], ['👑', 'Owner', r.owner ? `+${num(r.owner)}` : '-'], ['👥', 'Members', r.size],
      ['📅', 'Created', r.creation ? new Date(r.creation * 1000).toLocaleDateString() : '-'], '', `📝 ${r.desc || '-'}`]));
  });

/* ---------- tag ---------- */
cmd({ pattern: 'tag', desc: 'tag all | admin | notadmin | <text> | reply', category: 'group', group: true, admin: true, react: '📣' },
  async (sock, mek, m, { from, q, quoted, getGroupMetadata, reply, prefix }) => {
    const ps = (await getGroupMetadata()).participants;
    const all = ps.map((p) => p.id);
    const c = q.toLowerCase();
    if (c === 'all') return sock.sendMessage(from, { text: '```' + all.map((j, i) => `${i + 1}. @${num(j)}`).join('\n') + '```', mentions: all }, { quoted: mek, noFont: true });
    if (c === 'admin' || c === 'admins') { const a = ps.filter((p) => p.admin).map((p) => p.id); return sock.sendMessage(from, { text: a.map((j) => `🛡️ @${num(j)}`).join('\n'), mentions: a }, { quoted: mek, noFont: true }); }
    if (c === 'notadmin') { const a = ps.filter((p) => !p.admin).map((p) => p.id); return sock.sendMessage(from, { text: a.map((j) => `👤 @${num(j)}`).join('\n'), mentions: a }, { quoted: mek, noFont: true }); }
    if (q || quoted?.text) return sock.sendMessage(from, { text: q || quoted.text, mentions: all }, { quoted: mek, noFont: true });
    return reply(usage(prefix, 'tag all | admin | notadmin | <text>'));
  });

/* ---------- common members ---------- */
cmd({ pattern: 'common', desc: 'Do groups ke common members: common <jid> | kick', category: 'group', group: true, admin: true, react: '🔍' },
  async (sock, mek, m, { from, args, getGroupMetadata, reply, prefix }) => {
    const other = args.find((a) => a.endsWith('@g.us'));
    if (!other) return reply(usage(prefix, 'common 120363xxxx@g.us', 'Ya `common <jid> kick` (is group se common members nikalne ke liye, bot admin ho).'));
    const a = (await getGroupMetadata()).participants.filter((p) => !p.admin).map((p) => p.id);
    const b = (await sock.groupMetadata(other)).participants.map((p) => num(p.id));
    const common = a.filter((j) => b.includes(num(j)));
    if (!common.length) return reply(mini('🔍 ᴄᴏᴍᴍᴏɴ', 'Koi common member nahi mila.'));
    if (args.includes('kick')) { await sock.groupParticipantsUpdate(from, common, 'remove'); return reply(ok(`${common.length} common members nikal diye.`)); }
    await sock.sendMessage(from, { text: box('ᴄᴏᴍᴍᴏɴ', [...common.map((j, i) => `${i + 1}. @${num(j)}`), '', `Total: ${common.length}`]), mentions: common }, { quoted: mek });
  });

/* ---------- gpp (group photo) ---------- */
cmd({ pattern: 'gpp', alias: ['setgpp'], desc: 'Group ki photo badlein (image reply)', category: 'group', group: true, admin: true, botAdmin: true, react: '🖼️' },
  async (sock, mek, m, { from, quoted, reply, prefix }) => {
    if (quoted?.type !== 'imageMessage') return reply(usage(prefix, 'gpp', 'Kisi image ko reply karein.'));
    const media = await downloadFromMessage(quoted.message);
    await sock.updateProfilePicture(from, media.buffer);
    await reply(ok('Group photo update ho gayi.'));
  });

/* ---------- timed mute ---------- */
cmd({ pattern: 'timemute', alias: ['tmute'], desc: 'Kuch minute ke liye group band: timemute 10', category: 'group', group: true, admin: true, botAdmin: true, react: '⏳' },
  async (sock, mek, m, { from, args, reply, prefix }) => {
    const min = Number(args[0]);
    if (!(min > 0)) return reply(usage(prefix, 'timemute 10', 'Minutes likhein.'));
    await sock.groupSettingUpdate(from, 'announcement');
    await reply(ok(`Group ${min} minute ke liye band.`));
    setTimeout(() => sock.groupSettingUpdate(from, 'not_announcement').then(() => sock.sendMessage(from, { text: '🔊 Group khul gaya.' })).catch(() => {}), min * 60 * 1000);
  });

/* ---------- msgs / reset / inactive ---------- */
const counts = () => settings.getData('msgcount', {});
onMessage(async (sock, msg, ctx) => {
  if (!ctx.isGroup) return;
  const all = counts();
  const g = (all[ctx.from] ||= {});
  const u = (g[ctx.number] ||= { name: ctx.pushname, total: 0, time: 0, types: {} });
  u.name = ctx.pushname; u.total += 1; u.time = Date.now();
  const t = (ctx.mtype || 'other').replace('Message', '');
  u.types[t] = (u.types[t] || 0) + 1;
  settings.setData('msgcount', all);
});

const ago = (ms) => { const s = Math.floor(ms / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };

cmd({ pattern: 'msgs', alias: ['activity'], desc: 'Group members ki message count (ya mention/reply)', category: 'group', group: true, react: '📊' },
  async (sock, mek, m, { from, mentioned, quotedParticipant, reply }) => {
    const g = counts()[from];
    if (!g) return reply(mini('📊 ᴍꜱɢꜱ', 'Abhi koi activity record nahi hui.'));
    const target = mentioned[0] || quotedParticipant;
    const fmt = (n, u) => `🥀 *+${n}* ${u.name ? `(${u.name})` : ''}\n📨 Total: ${u.total}\n${Object.entries(u.types).map(([k, v]) => `   ${k}: ${v}`).join('\n')}\n🕒 Aakhri msg: ${ago(Date.now() - u.time)} pehle`;
    if (target) { const u = g[num(target)]; return reply(u ? box('ᴍꜱɢꜱ', [fmt(num(target), u)]) : err('Is user ki activity nahi mili.')); }
    const top = Object.entries(g).sort((a, b) => b[1].total - a[1].total).slice(0, 15);
    await reply(box('ᴛᴏᴘ ᴍᴇᴍʙᴇʀꜱ', top.map(([n, u], i) => `${i + 1}. +${n} ${u.name ? `(${u.name})` : ''} — ${u.total}`)));
  });

cmd({ pattern: 'reset', desc: 'Msg count reset: reset all | reset @user', category: 'group', group: true, admin: true, react: '♻️' },
  async (sock, mek, m, { from, args, mentioned, quotedParticipant, reply, prefix }) => {
    const all = counts();
    if ((args[0] || '').toLowerCase() === 'all') { delete all[from]; settings.setData('msgcount', all); return reply(ok('Saari counts reset.')); }
    const t = mentioned[0] || quotedParticipant;
    if (!t) return reply(usage(prefix, 'reset all | reset @user'));
    if (all[from]) delete all[from][num(t)];
    settings.setData('msgcount', all);
    await reply(ok(`@${num(t)} ki count reset.`), { mentions: [t] });
  });

cmd({ pattern: 'inactive', desc: 'Inactive members: inactive day 7 | total 5 | kick', category: 'group', group: true, admin: true, react: '😴' },
  async (sock, mek, m, ctx) => {
    const { from, args, reply, getAdminInfo, prefix } = ctx;
    const a = args.map((x) => x.toLowerCase());
    const val = (k) => { const i = a.indexOf(k); return i >= 0 && !isNaN(Number(a[i + 1])) ? Number(a[i + 1]) : null; };
    const days = val('day'), total = val('total');
    if (days === null && total === null) return reply(usage(prefix, 'inactive day 7', 'Ya `inactive total 3`, ya dono. Aakhir mein `kick` likhne par nikal bhi dega.'));
    const { participants, isBotAdmin } = await getAdminInfo();
    const data = counts()[from] || {};
    const bot = botIds(sock);
    const list = participants.filter((p) => !p.admin && !anyIn(participantIds(p), bot)).filter((p) => {
      const u = data[num(p.id)] || { total: 0, time: 0 };
      const okDay = days === null || u.time === 0 || (Date.now() - u.time) / 86400000 >= days;
      const okTotal = total === null || u.total <= total;
      return okDay && okTotal;
    }).map((p) => p.id);
    if (!list.length) return reply(ok('Koi inactive member nahi mila.'));
    if (a.includes('kick')) {
      if (!isBotAdmin) return reply(warn('Pehle bot ko admin banayein.'));
      await sock.groupParticipantsUpdate(from, list, 'remove');
      return reply(ok(`${list.length} inactive members nikal diye.`));
    }
    await sock.sendMessage(from, { text: box('ɪɴᴀᴄᴛɪᴠᴇ', [...list.slice(0, 60).map((j, i) => `${i + 1}. @${num(j)}`), '', `Total: ${list.length}`]), mentions: list.slice(0, 60) }, { quoted: mek });
  });
