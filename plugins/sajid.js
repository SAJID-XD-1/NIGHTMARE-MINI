// ⛧ Sajid ka custom plugin: gcss (group status update).  slink & antimod guard.js mein hain.
const crypto = require('crypto');
const { cmd } = require('../nightmare');
const { downloadFromMessage } = require('../lib/media');
const { ok, err, warn, usage } = require('../lib/style');

async function sendGroupStatus(sock, jid, content) {
  const B = require('@whiskeysockets/baileys');
  if (!('groupStatusMessageV2' in B.proto.Message.prototype)) throw new Error('UNSUPPORTED');
  const { backgroundColor, ...body } = content;
  const inside = await B.generateWAMessageContent(body, { upload: sock.waUploadToServer, backgroundColor });
  const secret = crypto.randomBytes(32);
  const m = B.generateWAMessageFromContent(jid, {
    messageContextInfo: { messageSecret: secret },
    groupStatusMessageV2: { message: { ...inside, messageContextInfo: { messageSecret: secret } } }
  }, {});
  await sock.relayMessage(jid, m.message, { messageId: m.key.id });
}

cmd({ pattern: 'gcss', alias: ['gcstatus'], desc: 'Group status update (image / video / text reply karein)', category: 'owner', owner: true, group: true, react: '📡' },
  async (sock, mek, m, { from, q, quoted, reply, prefix }) => {
    if (!quoted) return reply(usage(prefix, 'gcss', 'Kisi image / video / text ko reply karein.'));
    let content;
    const media = await downloadFromMessage(quoted.message).catch(() => null);
    if (media?.kind === 'image') content = { image: media.buffer, caption: q || media.content.caption || '' };
    else if (media?.kind === 'video') content = { video: media.buffer, caption: q || media.content.caption || '' };
    else if (quoted.text) content = { text: q || quoted.text, backgroundColor: '#0d0d0d' };
    else return reply(err('Sirf image, video ya text reply karein.'));

    try {
      await sendGroupStatus(sock, from, content);
      await reply(ok('📡 Is group ka status update ho gaya.'));
    } catch (e) {
      if (e.message === 'UNSUPPORTED')
        return reply(warn('Aapke Baileys version mein *group status* support nahi hai.\n`package.json` mein @whiskeysockets/baileys ko naye version par update karein (jisme groupStatusMessageV2 ho).'));
      console.error('gcss:', e);
      await reply(err('Status update nahi ho saka.'));
    }
  });
