// ⛧ Sajid ka custom plugin: gcss (group status update) - group mein bhi aur inbox se bhi.
const crypto = require('crypto');
const { cmd } = require('../nightmare');
const { downloadFromMessage } = require('../lib/media');
const { current } = require('../lib/context');
const { box, ok, err, warn, usage } = require('../lib/style');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const impl = {};   // test ke liye badla ja sakta hai

impl.send = async function sendGroupStatus(sock, jid, content) {
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
};

// Groups ki list (5 minute cache, har number ki apni)
const cache = new Map();
async function fetchGroups(sock, force = false) {
  const sid = current()?.id || 'default';
  const c = cache.get(sid);
  if (c && !force && Date.now() - c.at < 5 * 60 * 1000) return c.list;
  const all = await sock.groupFetchAllParticipating();
  const list = Object.values(all)
    .map((g) => ({ id: g.id, name: g.subject || g.id, size: g.participants?.length || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  cache.set(sid, { at: Date.now(), list });
  return list;
}

cmd({ pattern: 'gcss', alias: ['gcstatus'], desc: 'Group status update (group ya inbox se; list / 1,3 / all)', category: 'owner', react: '📡' },
  async (sock, mek, m, { from, isGroup, args, quoted, reply, prefix }) => {
    const first = (args[0] || '').toLowerCase();

    // ---- .gcss list ----
    if (first === 'list') {
      const list = await fetchGroups(sock, true);
      if (!list.length) return reply(err('Bot kisi group mein nahi hai.'));
      return reply(box('ɢʀᴏᴜᴘꜱ', [...list.slice(0, 60).map((g, i) => `${i + 1}. ${g.name} (${g.size})`), '', list.length > 60 ? `...aur ${list.length - 60} groups` : `Total: ${list.length}`, `Use: ${prefix}gcss 3  |  ${prefix}gcss 1,4  |  ${prefix}gcss all`]), { noFont: true });
    }

    // ---- target pehchanna ----
    let targets = null;
    let captionArgs = args;
    if (first === 'all' && !isGroup) {
      targets = (await fetchGroups(sock)).map((g) => g.id);
      captionArgs = args.slice(1);
    } else if (!isGroup && /^\d+(,\d+)*$/.test(first)) {
      const list = await fetchGroups(sock);
      const picked = first.split(',').map((n) => list[parseInt(n, 10) - 1]);
      if (picked.some((g) => !g)) return reply(err(`Number galat hai. Pehle \`${prefix}gcss list\` chalayein (1 se ${list.length} tak).`));
      targets = picked.map((g) => g.id);
      captionArgs = args.slice(1);
    } else if (/@g\.us/.test(first)) {
      targets = first.split(',').filter((j) => j.endsWith('@g.us'));
      captionArgs = args.slice(1);
    } else if (isGroup) {
      targets = [from];                 // group ke andar: isi group ka status
    }

    if (!targets?.length || !quoted) {
      return reply(usage(prefix, 'gcss', `Group mein: image/video/text ko reply karke ${prefix}gcss\nInbox se:\n${prefix}gcss list\n${prefix}gcss 3 [caption]  (reply ke saath)\n${prefix}gcss 1,4 [caption]\n${prefix}gcss all [caption]`));
    }

    const caption = captionArgs.join(' ').trim();
    let content;
    const media = await downloadFromMessage(quoted.message).catch(() => null);
    if (media?.kind === 'image') content = { image: media.buffer, caption: caption || media.content.caption || '' };
    else if (media?.kind === 'video') content = { video: media.buffer, caption: caption || media.content.caption || '' };
    else if (quoted.text) content = { text: caption || quoted.text, backgroundColor: '#0d0d0d' };
    else return reply(err('Sirf image, video ya text reply karein.'));

    let done = 0, failed = 0;
    for (const jid of targets) {
      try {
        await impl.send(sock, jid, content);
        done++;
      } catch (e) {
        if (e.message === 'UNSUPPORTED')
          return reply(warn('Aapke Baileys version mein *group status* support nahi hai.\n`package.json` mein @whiskeysockets/baileys ko 7.0.0-rc14 par update karein.'));
        console.error('gcss:', e.message);
        failed++;
      }
      if (targets.length > 1) await sleep(2000);   // rate limit se bachne ke liye
    }
    await reply(failed ? warn(`📡 ${done} groups mein status laga, ${failed} mein nahi laga.`) : ok(`📡 ${done} group${done > 1 ? 's' : ''} ka status update ho gaya.`));
  });

module.exports = { impl };
