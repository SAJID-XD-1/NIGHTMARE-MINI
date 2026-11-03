// 🔧 .diag - testing ke liye: Baileys 7.x ya naye server par kya chal raha hai, kya nahi
const os = require('os');
const { cmd } = require('../nightmare');
const config = require('../config');
const sessions = require('../lib/sessions');
const { runtime } = require('../lib/functions');
const { digits, adminIdSet, botIds, anyIn, participantIds } = require('../lib/jid');
const { box } = require('../lib/style');

const yn = (v) => (v ? '✅' : '❌');

cmd({ pattern: 'diag', alias: ['debug', 'selftest'], desc: 'Bot ki jaanch (Baileys version, LID, admin check) - testing ke liye', category: 'owner', react: '🔧' },
  async (sock, mek, ctx) => {
    let bver = '?';
    try { bver = require('@whiskeysockets/baileys/package.json').version; } catch {}
    let B = {};
    try { B = require('@whiskeysockets/baileys'); } catch {}
    let ffmpeg = false;
    try { ffmpeg = !!require('@ffmpeg-installer/ffmpeg').path; } catch {}

    const me = sock.user || {};
    const rows = [
      ['🟢', 'Node', process.version],
      ['📦', 'Baileys', bver],
      ['📡', 'Group status support', yn(B.proto && 'groupStatusMessageV2' in B.proto.Message.prototype)],
      ['🎞️', 'ffmpeg', yn(ffmpeg)],
      ['🧠', 'RAM (is process)', `${Math.round(process.memoryUsage().rss / 1048576)} MB / ${Math.round(os.totalmem() / 1048576)} MB`],
      ['⏱️', 'Uptime', runtime(process.uptime())],
      ['📱', 'Connected numbers', `${sessions.list().length} / ${config.base.MAX_SESSIONS}`],
      '',
      '*Is number ki pehchaan*',
      ['🤖', 'Bot id', me.id || '-'],
      ['🆔', 'Bot lid', me.lid || 'nahi mila'],
      ['👑', 'Owner number', config.OWNER_NUMBER],
      ['🔰', 'Prefix', config.PREFIX],
      '',
      '*Is message ka sender*',
      ['👤', 'participant', mek.key.participant || '-'],
      ['🔁', 'participantAlt', mek.key.participantAlt || '-'],
      ['📞', 'remoteJidAlt', mek.key.remoteJidAlt || '-'],
      ['#️⃣', 'Number (bot ne samjha)', ctx.number],
      ['👑', 'isOwner', yn(ctx.isOwner)],
      ['🛡️', 'isSudo', yn(ctx.isSudo)]
    ];

    if (ctx.isGroup) {
      try {
        const meta = await ctx.getGroupMetadata();
        const admins = adminIdSet(meta.participants);
        const info = await ctx.getAdminInfo();
        const p0 = meta.participants[0] || {};
        rows.push('', '*Is group ki jaanch*',
          ['👥', 'Members', meta.participants.length],
          ['🧩', 'Participant fields', Object.keys(p0).join(', ') || '-'],
          ['🛡️', 'Admins', [...new Set(meta.participants.filter((p) => p.admin).map((p) => p.admin))].length ? meta.participants.filter((p) => p.admin).length : 0],
          ['🤖', 'Bot admin hai?', yn(info.isBotAdmin)],
          ['👤', 'Aap admin hain?', yn(info.isAdmin)],
          ['🔍', 'Bot ids mila', yn(anyIn(botIds(sock), new Set(meta.participants.flatMap((p) => [...participantIds(p)]))))]
        );
      } catch (e) { rows.push('', ['⚠️', 'Group metadata', e.message]); }
    } else {
      rows.push('', 'Group ki jaanch ke liye ye command kisi group mein chalayein.');
    }
    await ctx.reply(box('ᴅɪᴀɢ', rows), { noFont: true });
  });
