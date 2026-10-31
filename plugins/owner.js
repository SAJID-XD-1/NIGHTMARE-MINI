const { cmd } = require('../nightmare');
const config = require('../config');
const { nightmareFont } = require('../lib/font');
const settings = require('../lib/settings');
const autobio = require('../lib/autobio');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, usage, onOff } = require('../lib/style');

cmd({ pattern: 'owner', alias: ['creator'], desc: 'Show bot owner', category: 'general' },
  async (sock, mek, ctx) => {
    const number = String(config.OWNER_NUMBER || '').replace(/\D/g, '');

    await ctx.reply(
      nightmareFont(`🇦🇱 NIGHTMARE 🕸️\nOwner : ${number ? '@' + number : 'Not Set'}`),
      number ? { mentions: [`${number}@s.whatsapp.net`] } : {}
    );

    if (number) {   // WhatsApp contact card bhi
      const vcard = 'BEGIN:VCARD\nVERSION:3.0\n' + `FN:${config.OWNER_NAME}\n` +
        `TEL;type=CELL;waid=${number}:+${number}\n` + 'END:VCARD';
      await sock.sendMessage(ctx.from, { contacts: { displayName: config.OWNER_NAME, contacts: [{ vcard }] } }, { quoted: mek });
    }
  });

cmd({ pattern: 'restart', desc: 'Bot restart karein', category: 'owner', owner: true, react: '♻️' },
  async (sock, mek, m, { reply }) => {
    await reply(ok('♻️ Restarting... (Heroku khud dobara start kar dega)'));
    setTimeout(() => process.exit(0), 1000);
  });

cmd({ pattern: 'vv', alias: ['viewonce'], desc: 'View-once media dobara dekhein (reply karein)', category: 'owner', owner: true, react: '🥀' },
  async (sock, mek, m, { from, quoted, reply, prefix }) => {
    if (!quoted) return reply(usage(prefix, 'vv', 'Kisi view-once photo/video/audio ko reply karein.'));
    const media = await downloadFromMessage(quoted.message);
    if (!media) return reply(err('Ye media support nahi hota.'));
    const content = {
      imageMessage: { image: media.buffer, caption: media.content.caption || '' },
      videoMessage: { video: media.buffer, caption: media.content.caption || '' },
      audioMessage: { audio: media.buffer, mimetype: 'audio/mp4', ptt: false }
    }[media.type];
    if (!content) return reply(err('Sirf image / video / audio support hai.'));
    await sock.sendMessage(from, content, { quoted: mek, noFont: true });
  });

cmd({ pattern: 'save', alias: ['send', 'sendme'], desc: 'Status / media apne inbox mein save karein (reply karein)', category: 'owner', owner: true, react: '📤' },
  async (sock, mek, m, { quoted, reply, prefix }) => {
    if (!quoted) return reply(usage(prefix, 'save', 'Kisi status ya media ko reply karke likhein.'));
    const media = await downloadFromMessage(quoted.message);
    if (!media) return reply(err('Is message mein koi media nahi mila.'));
    const me = `${config.OWNER_NUMBER}@s.whatsapp.net`;
    const caption = media.content.caption || '🕷️ Saved by NIGHTMARE-MINI';
    const content = {
      imageMessage: { image: media.buffer, caption },
      videoMessage: { video: media.buffer, caption },
      audioMessage: { audio: media.buffer, mimetype: 'audio/mp4' },
      stickerMessage: { sticker: media.buffer },
      documentMessage: { document: media.buffer, mimetype: media.content.mimetype, fileName: media.content.fileName || 'file' }
    }[media.type];
    await sock.sendMessage(me, { ...content, noFont: true });
    await reply(ok('📤 Aapke inbox mein bhej diya.'));
  });

cmd({ pattern: 'unblock', alias: ['unb'], desc: 'User ko unblock karein (reply ya inbox)', category: 'owner', owner: true, react: '🥰' },
  async (sock, mek, m, { from, quotedParticipant, reply }) => {
    const jid = quotedParticipant || (from.endsWith('@s.whatsapp.net') ? from : null);
    if (!jid) return reply(err('Kisi message ko reply karein ya inbox mein likhein.'));
    await sock.updateBlockStatus(jid, 'unblock');
    await sock.sendMessage(from, { text: ok(`@${jid.split('@')[0]} ko unblock kar diya.`), mentions: [jid] }, { quoted: mek });
  });

cmd({ pattern: 'autobio', alias: ['bioauto'], desc: 'Auto bio on/off', category: 'owner', owner: true, react: '😎' },
  async (sock, mek, m, { q, reply, prefix }) => {
    const v = q.toLowerCase();
    if (!['on', 'off'].includes(v)) return reply(usage(prefix, 'autobio on | off', `Abhi: ${onOff(config.AUTO_BIO)}`));
    await settings.set('AUTO_BIO', v === 'on' ? 'true' : 'false');
    if (v === 'on') autobio.start(sock); else autobio.stop();
    await reply(ok(`Auto bio ab ${onOff(config.AUTO_BIO)} hai.`));
  });

cmd({ pattern: 'gstatus', alias: ['groupstatus', 'poststatus'], desc: 'Status post karein (text ya reply se media)', category: 'owner', owner: true, react: '📡' },
  async (sock, mek, m, { q, quoted, pushname, reply, isGroup, getGroupMetadata, prefix }) => {
    const me = (sock.user.id || '').split(':')[0] + '@s.whatsapp.net';
    let audience = [me, `${config.OWNER_NUMBER}@s.whatsapp.net`];
    if (isGroup) audience = [...new Set([...audience, ...(await getGroupMetadata()).participants.map((p) => p.id)])];
    const opts = { statusJidList: audience };

    if (!quoted) {
      if (!q) return reply(usage(prefix, 'gstatus Hello world', 'Ya kisi image/video ko reply karein.'));
      await sock.sendMessage('status@broadcast', { text: q, backgroundColor: '#000000', font: 2 }, opts);
      return reply(ok('📡 Text status post ho gaya.'));
    }
    const media = await downloadFromMessage(quoted.message);
    if (!media) return reply(err('Sirf image / video / audio reply karein.'));
    const caption = q || media.content.caption || `🕷️ ${pushname}`;
    const content = {
      imageMessage: { image: media.buffer, caption },
      videoMessage: { video: media.buffer, caption },
      audioMessage: { audio: media.buffer, mimetype: 'audio/mp4', ptt: false }
    }[media.type];
    if (!content) return reply(err('Ye media status ke liye support nahi hota.'));
    await sock.sendMessage('status@broadcast', content, opts);
    await reply(ok('📡 Status post ho gaya.'));
  });
