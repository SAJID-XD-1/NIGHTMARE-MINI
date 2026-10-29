// Delete kiye hue messages owner ke inbox mein bhejta hai (sirf jab ANTIDELETE = true)
const config = require('../config');
const { box } = require('./style');
const { downloadFromMessage } = require('./media');

const cache = new Map(); // id -> { msg, message, time }
const MAX = 400;

function remember(msg, message) {
  if (config.ANTIDELETE !== 'true' || !msg.key?.id) return;
  cache.set(msg.key.id, { msg, message, time: Date.now() });
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
}

async function onRevoke(sock, revokeKey) {
  if (config.ANTIDELETE !== 'true') return;
  const item = cache.get(revokeKey?.id);
  if (!item) return;

  const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
  const { msg, message } = item;
  const chat = msg.key.remoteJid;
  const who = (msg.key.participant || chat).split('@')[0].split(':')[0];

  const header = box('ᴀɴᴛɪ ᴅᴇʟᴇᴛᴇ', [
    ['👤', 'From', `@${who}`],
    ['💬', 'Chat', chat.endsWith('@g.us') ? 'Group' : 'Private'],
    ['🕒', 'Time', new Date(item.time).toLocaleString()]
  ]);
  await sock.sendMessage(ownerJid, { text: header, mentions: [`${who}@s.whatsapp.net`] });

  const text = message.conversation || message.extendedTextMessage?.text;
  if (text) return sock.sendMessage(ownerJid, { text: `🗑️ ${text}` });

  try {
    const media = await downloadFromMessage(message);
    if (!media) return;
    const caption = media.content.caption || '';
    const payload = {
      imageMessage: { image: media.buffer, caption },
      videoMessage: { video: media.buffer, caption },
      audioMessage: { audio: media.buffer, mimetype: 'audio/mp4' },
      stickerMessage: { sticker: media.buffer },
      documentMessage: { document: media.buffer, mimetype: media.content.mimetype, fileName: media.content.fileName || 'file' }
    }[media.type];
    if (payload) await sock.sendMessage(ownerJid, payload);
  } catch (e) {
    await sock.sendMessage(ownerJid, { text: '⚠️ Media download nahi ho saka.' });
  }
}

module.exports = { remember, onRevoke };
