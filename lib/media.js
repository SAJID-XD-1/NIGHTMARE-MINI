const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const TYPES = {
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  stickerMessage: 'sticker',
  documentMessage: 'document'
};

async function download(content, kind) {
  const stream = await downloadContentFromMessage(content, kind);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

// message object (unwrap ho chuka) se media buffer nikalo
async function downloadFromMessage(message) {
  const type = Object.keys(message || {}).find((k) => TYPES[k]);
  if (!type) return null;
  return { type, kind: TYPES[type], buffer: await download(message[type], TYPES[type]), content: message[type] };
}

module.exports = { download, downloadFromMessage, TYPES };
