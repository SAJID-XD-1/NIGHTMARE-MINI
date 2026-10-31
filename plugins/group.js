const { cmd } = require('../nightmare');
const config = require('../config');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, warn, usage, mini } = require('../lib/style');

const num = (jid = '') => jid.split('@')[0].split(':')[0];

const target = (ctx) =>
  ctx.mentioned[0] || ctx.quotedParticipant ||
  (ctx.args[0] && ctx.args[0].replace(/\D/g, '') ? ctx.args[0].replace(/\D/g, '') + '@s.whatsapp.net' : null);

cmd({ pattern: 'groupinfo', alias: ['gcinfo'], desc: 'Group ki info', category: 'group', group: true, react: '👥' },
  async (sock, mek, m, { getGroupMetadata, reply }) => {
    const g = await getGroupMetadata();
    const admins = g.participants.filter((p) => p.admin).length;
    await reply(box('ɢʀᴏᴜᴘ ɪɴꜰᴏ', [
      ['🕸️', 'Name', g.subject], ['👤', 'Members', g.participants.length], ['🛡️', 'Admins', admins],
      ['🆔', 'ID', g.id.split('@')[0]], '', `📝 ${g.desc || 'No description'}`
    ]));
  });

cmd({ pattern: 'admincheck', alias: ['checkadmin'], desc: 'Admin status check', category: 'group', group: true, react: '🔍' },
  async (sock, mek, m, { sender, isOwner, getAdminInfo, reply }) => {
    const { isAdmin, isBotAdmin, participants } = await getAdminInfo();
    await sock.sendMessage(mek.key.remoteJid, {
      text: box('ᴀᴅᴍɪɴ ᴄʜᴇᴄᴋ', [
        ['👤', 'You', `@${num(sender)}`], ['👑', 'Owner', isOwner ? '✅' : '❌'], ['🛡️', 'You Admin', isAdmin ? '✅' : '❌'],
        ['🤖', 'Bot Admin', isBotAdmin ? '✅' : '❌ (manually admin banayein)'], ['👥', 'Members', participants.length]
      ]),
      mentions: [sender]
    }, { quoted: mek });
  });

cmd({ pattern: 'tagall', alias: ['everyone', 'mentionall'], desc: 'Sab members ko tag karein', category: 'group', admin: true, react: '📢' },
  async (sock, mek, m, { from, q, getGroupMetadata }) => {
    const g = await getGroupMetadata();
    const ids = g.participants.map((p) => p.id);
    const text = `📢 *${q || 'Attention everyone!'}*\n\n` + ids.map((id) => `🕷️ @${num(id)}`).join('\n');
    await sock.sendMessage(from, { text, mentions: ids }, { quoted: mek, noFont: true });
  });

cmd({ pattern: 'hidetag', alias: ['h'], desc: 'Bina naam dikhaye sab ko tag (text / reply media)', category: 'group', admin: true, react: '🔊' },
  async (sock, mek, m, { from, q, quoted, getGroupMetadata, reply, prefix }) => {
    const mentions = (await getGroupMetadata()).participants.map((p) => p.id);
    if (quoted) {
      const media = await downloadFromMessage(quoted.message).catch(() => null);
      if (media) {
        const caption = q || media.content.caption || '';
        const content = {
          imageMessage: { image: media.buffer, caption, mentions },
          videoMessage: { video: media.buffer, caption, mentions },
          audioMessage: { audio: media.buffer, mimetype: 'audio/mp4', mentions },
          stickerMessage: { sticker: media.buffer, mentions }
        }[media.type];
        if (content) return sock.sendMessage(from, content, { quoted: mek, noFont: true });
      }
      return sock.sendMessage(from, { text: q || quoted.text || '🕷️', mentions }, { quoted: mek, noFont: true });
    }
    if (!q) return reply(usage(prefix, 'hidetag Hello', 'Ya kisi message ko reply karein.'));
    await sock.sendMessage(from, { text: q, mentions }, { quoted: mek, noFont: true });
  });

cmd({ pattern: 'kick', alias: ['remove', 'k'], desc: 'Member ko nikalein (mention/reply)', category: 'group', admin: true, botAdmin: true, react: '👢' },
  async (sock, mek, m, ctx) => {
    const jid = target(ctx);
    if (!jid) return ctx.reply(usage(ctx.prefix, 'kick @user', 'Ya kisi ke message ko reply karein.'));
    await sock.groupParticipantsUpdate(ctx.from, [jid], 'remove');
    await ctx.reply(ok(`👢 @${num(jid)} ko nikal diya.`), { mentions: [jid] });
  });

cmd({ pattern: 'add', alias: ['adduser'], desc: 'Number se member add karein', category: 'group', admin: true, botAdmin: true, react: '➕' },
  async (sock, mek, m, ctx) => {
    const n = ctx.args.join('').replace(/\D/g, '');
    if (n.length < 8) return ctx.reply(usage(ctx.prefix, 'add 923001234567', 'Country code ke saath, bina + ke.'));
    const [res] = await sock.groupParticipantsUpdate(ctx.from, [`${n}@s.whatsapp.net`], 'add');
    if (res?.status === '200') return ctx.reply(ok(`➕ +${n} add ho gaya.`));
    if (res?.status === '403') return ctx.reply(warn('Is user ki privacy settings ki wajah se add nahi ho saka. Invite link bhej dein.'));
    await ctx.reply(err(`Add nahi hua (status ${res?.status || 'unknown'}).`));
  });

cmd({ pattern: 'promote', alias: ['p', 'makeadmin'], desc: 'Member ko admin banayein', category: 'group', admin: true, botAdmin: true, react: '⬆️' },
  async (sock, mek, m, ctx) => {
    const jid = target(ctx);
    if (!jid) return ctx.reply(usage(ctx.prefix, 'promote @user'));
    await sock.groupParticipantsUpdate(ctx.from, [jid], 'promote');
    await ctx.reply(ok(`⬆️ @${num(jid)} ab admin hai.`), { mentions: [jid] });
  });

cmd({ pattern: 'demote', alias: ['d', 'dismiss'], desc: 'Admin ko member banayein', category: 'group', admin: true, botAdmin: true, react: '⬇️' },
  async (sock, mek, m, ctx) => {
    const jid = target(ctx);
    if (!jid) return ctx.reply(usage(ctx.prefix, 'demote @user'));
    await sock.groupParticipantsUpdate(ctx.from, [jid], 'demote');
    await ctx.reply(ok(`⬇️ @${num(jid)} ko admin se hata diya.`), { mentions: [jid] });
  });

cmd({ pattern: 'mute', alias: ['close'], desc: 'Group band (sirf admins msg karein)', category: 'group', admin: true, botAdmin: true, react: '🔇' },
  async (sock, mek, m, ctx) => {
    await sock.groupSettingUpdate(ctx.from, 'announcement');
    await ctx.reply(ok('🔇 Group band — ab sirf admins message kar sakte hain.'));
  });

cmd({ pattern: 'unmute', alias: ['open'], desc: 'Group khol dein', category: 'group', admin: true, botAdmin: true, react: '🔊' },
  async (sock, mek, m, ctx) => {
    await sock.groupSettingUpdate(ctx.from, 'not_announcement');
    await ctx.reply(ok('🔊 Group khul gaya — sab message kar sakte hain.'));
  });

cmd({ pattern: 'requestlist', alias: ['joinrequests'], desc: 'Join requests ki list', category: 'group', admin: true, botAdmin: true, react: '📥' },
  async (sock, mek, m, ctx) => {
    const list = await sock.groupRequestParticipantsList(ctx.from);
    if (!list.length) return ctx.reply(mini('📥 ʀᴇǫᴜᴇꜱᴛꜱ', 'Koi pending request nahi hai.'));
    await ctx.reply(box('ᴊᴏɪɴ ʀᴇǫᴜᴇꜱᴛꜱ', [...list.slice(0, 40).map((r, i) => `${i + 1}. +${num(r.jid)}`), '', `Total: ${list.length}`]));
  });

for (const [pattern, action, label] of [['acceptall', 'approve', 'accept'], ['rejectall', 'reject', 'reject']]) {
  cmd({ pattern, desc: `Saari join requests ${label} karein`, category: 'group', admin: true, botAdmin: true, react: action === 'approve' ? '✅' : '🚫' },
    async (sock, mek, m, ctx) => {
      const list = await sock.groupRequestParticipantsList(ctx.from);
      if (!list.length) return ctx.reply(mini('📥 ʀᴇǫᴜᴇꜱᴛꜱ', 'Koi pending request nahi hai.'));
      await sock.groupRequestParticipantsUpdate(ctx.from, list.map((r) => r.jid), action);
      await ctx.reply(ok(`${list.length} requests ${label} ho gayin.`));
    });
}

cmd({ pattern: 'kickall', desc: 'Saare non-admin members nikalein (owner)', category: 'group', owner: true, botAdmin: true, react: '⚠️' },
  async (sock, mek, m, ctx) => {
    if (ctx.args[0] !== 'confirm') return ctx.reply(warn(`Ye saare non-admin members ko nikal dega!\nPakka karna ho to likhein:\n${ctx.prefix}kickall confirm`));
    const meta = await ctx.getGroupMetadata();
    const jids = meta.participants.filter((p) => !p.admin).map((p) => p.id);
    if (!jids.length) return ctx.reply(ok('Koi member nahi bacha.'));
    await sock.groupParticipantsUpdate(ctx.from, jids, 'remove');
    await ctx.reply(ok(`${jids.length} members nikal diye.`));
  });

cmd({ pattern: 'removeadmins', alias: ['deladmins'], desc: 'Baqi saare admins ko demote karein (owner)', category: 'group', owner: true, botAdmin: true, react: '⚠️' },
  async (sock, mek, m, ctx) => {
    const meta = await ctx.getGroupMetadata();
    const me = num(sock.user.id);
    const jids = meta.participants.filter((p) => p.admin && p.admin !== 'superadmin' && num(p.id) !== me && num(p.id) !== config.OWNER_NUMBER).map((p) => p.id);
    if (!jids.length) return ctx.reply(ok('Demote karne ke liye koi admin nahi mila.'));
    await sock.groupParticipantsUpdate(ctx.from, jids, 'demote');
    await ctx.reply(ok(`${jids.length} admins demote kar diye.`));
  });

cmd({ pattern: 'end', alias: ['endgc'], desc: 'Group khatam: sab ko nikalein (owner, confirm chahiye)', category: 'group', owner: true, botAdmin: true, react: '☠️' },
  async (sock, mek, m, ctx) => {
    if (ctx.args[0] !== 'confirm') return ctx.reply(warn(`Ye *sab* members (admins samet) ko nikal dega!\nPakka karna ho to likhein:\n${ctx.prefix}end confirm`));
    const meta = await ctx.getGroupMetadata();
    const me = num(sock.user.id);
    const jids = meta.participants.filter((p) => num(p.id) !== me && num(p.id) !== config.OWNER_NUMBER).map((p) => p.id);
    if (!jids.length) return ctx.reply(ok('Koi member nahi bacha.'));
    await sock.groupParticipantsUpdate(ctx.from, jids, 'remove');
    await ctx.reply(ok(`☠️ ${jids.length} members nikal diye.`));
  });

cmd({ pattern: 'leave', alias: ['leavegc'], desc: 'Bot group chhod de (owner)', category: 'group', owner: true, group: true, react: '👋' },
  async (sock, mek, m, ctx) => {
    await ctx.reply(ok('👋 Allah hafiz! 🕷️'));
    await sock.groupLeave(ctx.from);
  });
