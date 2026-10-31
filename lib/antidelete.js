// Delete / Edit hue messages ko forward karta hai (owner inbox ya same chat ya kisi jid par)
const config = require('../config');
const { box } = require('./style');
const { downloadFromMessage } = require('./media');

const cache = new Map(); // id -> { msg, message, time }
const MAX = 500;

const isOn = (kind) => (kind === 'edit' ? config.ANTI_EDIT : config.ANTIDELETE) === 'true';

function remember(msg, message) {
  if ((!isOn('delete') && !isOn('edit')) || !msg.key?.id) return;
  cache.set(msg.key.id, { msg, message, time: Date.now() });
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
}

function destination(kind, chat) {
  const dest = (kind === 'edit' ? config.ANTI_EDIT_DEST : config.ANTIDELETE_DEST) || 'owner';
  const scope = (kind === 'edit' ? config.ANTI_EDIT_SCOPE : config.ANTIDELETE_SCOPE) || '';
  const group = chat.endsWith('@g.us');
  if (scope === 'pm' && group) return null;
  if (scope === 'gm' && !group) return null;
  if (scope === 'no-pm' && !group) return null;
  if (scope === 'no-gm' && group) return null;
  if (dest === 'chat') return chat;
  if (dest.includes('@')) return dest;
  return `${config.OWNER_NUMBER}@s.whatsapp.net`;
}

async function sendContent(sock, to, message) {
  const text = message.conversation || message.extendedTextMessage?.text;
  if (text) return sock.sendMessage(to, { text: `💬 ${text}`, noFont: true });
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
    if (payload) await sock.sendMessage(to, { ...payload, noFont: true });
  } catch {
    await sock.sendMessage(to, { text: '⚠️ Media download nahi ho saka.' });
  }
}

async function onRevoke(sock, revokeKey) {
  if (!isOn('delete')) return;
  const item = cache.get(revokeKey?.id);
  if (!item) return;
  const chat = item.msg.key.remoteJid;
  const to = destination('delete', chat);
  if (!to) return;
  const who = (item.msg.key.participant || chat).split('@')[0].split(':')[0];

  await sock.sendMessage(to, {
      noFont: true,
    text: box('ᴀɴᴛɪ ᴅᴇʟᴇᴛᴇ', [['👤', 'From', `@${who}`], ['💬', 'Chat', chat.endsWith('@g.us') ? 'Group' : 'Private'], ['🕒', 'Time', new Date(item.time).toLocaleString()]]),
    mentions: [`${who}@s.whatsapp.net`]
  });
  await sendContent(sock, to, item.message);
}

async function onEdit(sock, key, editedMessage) {
  if (!isOn('edit') || !key?.id || !editedMessage) return;
  const item = cache.get(key.id);
  const chat = key.remoteJid || item?.msg.key.remoteJid;
  if (!chat) return;
  const to = destination('edit', chat);
  if (!to) return;
  const who = (key.participant || item?.msg.key.participant || chat).split('@')[0].split(':')[0];
  const before = item?.message?.conversation || item?.message?.extendedTextMessage?.text || '(pehla message cache mein nahi tha)';
  const after = editedMessage.conversation || editedMessage.extendedTextMessage?.text || '(media / unknown)';
  await sock.sendMessage(to, {
      noFont: true,
    text: box('ᴀɴᴛɪ ᴇᴅɪᴛ', [['👤', 'From', `@${who}`], ['💬', 'Chat', chat.endsWith('@g.us') ? 'Group' : 'Private'], '', `🔴 *Pehle:*\n${before}`, '', `🟢 *Ab:*\n${after}`]),
    mentions: [`${who}@s.whatsapp.net`]
  });
  if (item) item.message = editedMessage;
}

module.exports = { remember, onRevoke, onEdit };
