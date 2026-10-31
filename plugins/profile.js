const { cmd } = require('../nightmare');
const settings = require('../lib/settings');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, usage, mini } = require('../lib/style');

const num = (j = '') => String(j).split('@')[0].split(':')[0];
const toJid = (s) => (s.includes('@') ? s : `${s.replace(/\D/g, '')}@s.whatsapp.net`);

cmd({ pattern: 'jid', desc: 'Chat / user ki JID', category: 'user', react: '🆔' },
  async (sock, mek, m, { from, mentioned, quotedParticipant, reply }) => reply(box('ᴊɪᴅ', [mentioned[0] || quotedParticipant || from])));

cmd({ pattern: 'gjid', desc: 'Jin groups mein bot hai unki JID list', category: 'user', owner: true, react: '📋' },
  async (sock, mek, m, { reply }) => {
    const groups = Object.values(await sock.groupFetchAllParticipating());
    if (!groups.length) return reply(err('Koi group nahi mila.'));
    await reply(box('ɢʀᴏᴜᴘꜱ', groups.map((g, i) => `*${i + 1}. ${g.subject}*\n${g.id}`)));
  });

cmd({ pattern: 'left', alias: ['leaveme'], desc: 'Bot group chhod de (optional goodbye text)', category: 'user', owner: true, group: true, react: '👋' },
  async (sock, mek, m, { from, q }) => { if (q) await sock.sendMessage(from, { text: q }); await sock.groupLeave(from); });

cmd({ pattern: 'block', desc: 'User ko block (reply/mention/inbox)', category: 'user', owner: true, react: '⛔' },
  async (sock, mek, m, { from, mentioned, quotedParticipant, isGroup, reply }) => {
    const jid = mentioned[0] || quotedParticipant || (!isGroup && from);
    if (!jid) return reply(err('Kisi ko mention/reply karein ya inbox mein likhein.'));
    await reply(ok('Block kar raha hoon...')); await sock.updateBlockStatus(jid, 'block');
  });

cmd({ pattern: 'pp', alias: ['setpp'], desc: 'Bot ki profile photo (image reply)', category: 'user', owner: true, react: '🖼️' },
  async (sock, mek, m, { quoted, reply, prefix }) => {
    if (quoted?.type !== 'imageMessage') return reply(usage(prefix, 'pp', 'Kisi image ko reply karein.'));
    const media = await downloadFromMessage(quoted.message);
    await sock.updateProfilePicture(sock.user.id, media.buffer);
    await reply(ok('Profile photo update ho gayi.'));
  });

cmd({ pattern: 'fullpp', desc: 'Poori (bina crop) profile photo lagayein', category: 'user', owner: true, react: '🖼️' },
  async (sock, mek, m, { quoted, reply, prefix }) => {
    if (quoted?.type !== 'imageMessage') return reply(usage(prefix, 'fullpp', 'Kisi image ko reply karein.'));
    const sharp = require('sharp');
    const media = await downloadFromMessage(quoted.message);
    const buf = await sharp(media.buffer).resize(640, 640, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } }).jpeg({ quality: 90 }).toBuffer();
    await sock.updateProfilePicture(sock.user.id, buf);
    await reply(ok('Full profile photo update ho gayi.'));
  });

cmd({ pattern: 'whois', alias: ['info'], desc: 'User / group ki info (mention, reply, number ya jid)', category: 'user', react: '🔎' },
  async (sock, mek, m, { from, q, mentioned, quotedParticipant, isGroup, getGroupMetadata, reply }) => {
    let target = mentioned[0] || quotedParticipant || (q ? toJid(q) : null);
    if (!target) target = isGroup ? from : from;
    let pp = null;
    try { pp = await sock.profilePictureUrl(target, 'image'); } catch {}
    let caption;
    if (target.endsWith('@g.us')) {
      const g = target === from && isGroup ? await getGroupMetadata() : await sock.groupMetadata(target);
      caption = box('ɢʀᴏᴜᴘ', [['🕸️', 'Name', g.subject], ['👑', 'Owner', g.owner ? `+${num(g.owner)}` : '-'], ['👥', 'Members', g.participants.length], ['📅', 'Created', new Date(g.creation * 1000).toLocaleDateString()], '', `📝 ${g.desc || '-'}`]);
    } else {
      const rows = [['📞', 'Number', `+${num(target)}`]];
      try {
        const [res] = await sock.fetchStatus(target);
        const text = res?.status?.status ?? res?.status;
        if (text) rows.push(['💬', 'About', text], ['📅', 'Set', res?.status?.setAt ? new Date(res.status.setAt).toLocaleDateString() : (res?.setAt ? new Date(res.setAt).toLocaleDateString() : '-')]);
      } catch {}
      caption = box('ᴡʜᴏɪꜱ', rows);
    }
    if (pp) return sock.sendMessage(from, { image: { url: pp }, caption }, { quoted: mek });
    await reply(caption);
  });

cmd({ pattern: 'ison', desc: 'Number WhatsApp par hai? ison 9230.., 9231..', category: 'search', react: '📱' },
  async (sock, mek, m, { q, reply, prefix }) => {
    const nums = (q.match(/\d{8,15}/g) || []).slice(0, 20);
    if (!nums.length) return reply(usage(prefix, 'ison 923001234567 923331234567'));
    const res = await sock.onWhatsApp(...nums.map((n) => `${n}@s.whatsapp.net`));
    const have = new Map(res.filter((r) => r.exists).map((r) => [num(r.jid), r.jid]));
    const rows = [];
    for (const n of nums) {
      if (!have.has(n)) { rows.push(`❌ +${n} — WhatsApp par nahi`); continue; }
      let about = '';
      try { const [s] = await sock.fetchStatus(have.get(n)); const t = s?.status?.status ?? s?.status; about = t ? ` — ${t}` : ''; } catch {}
      rows.push(`✅ +${n}${about}`);
    }
    await reply(box('ɪꜱ ᴏɴ ᴡʜᴀᴛꜱᴀᴘᴘ', rows));
  });
