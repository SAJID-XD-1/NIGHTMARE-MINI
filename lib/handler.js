const config = require('../config');
const { findCommand, watchers } = require('../nightmare');
const antidelete = require('./antidelete');
const { err, warn } = require('./style');

const unwrap = (m) => {
  if (!m) return m;
  const inner =
    m.ephemeralMessage?.message ||
    m.viewOnceMessage?.message ||
    m.viewOnceMessageV2?.message ||
    m.viewOnceMessageV2Extension?.message ||
    m.documentWithCaptionMessage?.message;
  return inner ? unwrap(inner) : m;
};

const typeOf = (m) => Object.keys(m || {}).find((k) => k !== 'messageContextInfo' && k !== 'senderKeyDistributionMessage');

const getBody = (m) =>
  m?.conversation ||
  m?.extendedTextMessage?.text ||
  m?.imageMessage?.caption ||
  m?.videoMessage?.caption ||
  m?.documentMessage?.caption ||
  m?.buttonsResponseMessage?.selectedButtonId ||
  m?.listResponseMessage?.singleSelectReply?.selectedRowId ||
  '';

const digits = (jid = '') => String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');

async function handleStatus(sock, msg) {
  if (config.AUTO_STATUS_SEEN === 'true') await sock.readMessages([msg.key]).catch(() => {});
  if (config.AUTO_STATUS_LIKE === 'true' && !msg.key.fromMe && msg.key.participant) {
    const me = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
    await sock
      .sendMessage('status@broadcast', { react: { text: '🖤', key: msg.key } }, { statusJidList: [msg.key.participant, me] })
      .catch(() => {});
  }
}

async function handleMessage(sock, msg) {
  if (!msg || !msg.message || !msg.key) return;
  const from = msg.key.remoteJid;
  if (!from) return;

  if (from === 'status@broadcast') return handleStatus(sock, msg);

  const message = unwrap(msg.message);

  // Delete hone wale messages (antidelete)
  if (message.protocolMessage) {
    const pm = message.protocolMessage;
    if (pm.type === 0 || pm.type === 'REVOKE') await antidelete.onRevoke(sock, pm.key);
    return;
  }
  antidelete.remember(msg, message);

  const body = getBody(message).trim();
  const prefix = config.PREFIX;
  const isGroup = from.endsWith('@g.us');
  const sender = msg.key.fromMe ? sock.user?.id || from : msg.key.participant || from;
  const number = digits(sender);
  const isOwner = !!msg.key.fromMe || (!!config.OWNER_NUMBER && number === config.OWNER_NUMBER);

  // Bot apne hi bheje hue messages ignore kare (sirf prefix wali owner commands allow)
  if (msg.key.fromMe && !body.startsWith(prefix)) return;

  if (!msg.key.fromMe) {
    if (config.AUTO_READ === 'true') await sock.readMessages([msg.key]).catch(() => {});
    if (config.AUTO_TYPING === 'true') await sock.sendPresenceUpdate('composing', from).catch(() => {});
    else if (config.AUTO_RECORDING === 'true') await sock.sendPresenceUpdate('recording', from).catch(() => {});
  }

  const reply = (text, extra = {}) => sock.sendMessage(from, { text, ...extra }, { quoted: msg });
  const react = (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } });

  let metaCache;
  const getGroupMetadata = async () => (metaCache ??= await sock.groupMetadata(from));
  const getAdminInfo = async () => {
    const meta = await getGroupMetadata();
    const admins = meta.participants.filter((p) => p.admin).map((p) => digits(p.id));
    return {
      participants: meta.participants,
      isAdmin: admins.includes(number) || isOwner,
      isBotAdmin: admins.includes(digits(sock.user?.id))
    };
  };

  const inner = message[typeOf(message)];
  const contextInfo = (inner && typeof inner === 'object' && inner.contextInfo) || {};
  const qm = contextInfo.quotedMessage ? unwrap(contextInfo.quotedMessage) : null;
  const quoted = qm
    ? {
        message: qm,
        type: typeOf(qm),
        participant: contextInfo.participant,
        stanzaId: contextInfo.stanzaId,
        text: qm.conversation || qm.extendedTextMessage?.text || qm.imageMessage?.caption || qm.videoMessage?.caption || ''
      }
    : null;

  const args = body.startsWith(prefix) ? body.slice(prefix.length).trim().split(/\s+/) : [];
  const name = (args.shift() || '').toLowerCase();

  const ctx = {
    from, sender, number, isGroup, isOwner, prefix, args, reply, react, getGroupMetadata, getAdminInfo, quoted,
    command: name,
    body,
    q: args.join(' '),
    pushname: msg.pushName || 'User',
    mentioned: contextInfo.mentionedJid || [],
    quotedParticipant: contextInfo.participant || null
  };

  // Watchers (anti-link, anti-bad, ...)
  if (body && !msg.key.fromMe) {
    for (const w of watchers) {
      try { if (await w(sock, msg, ctx)) return; }
      catch (e) { console.error('❌ Watcher error:', e.message); }
    }
  }

  if (!body.startsWith(prefix)) return;
  const command = findCommand(name);
  if (!command) return;

  if (config.MODE === 'private' && !isOwner) return;

  try {
    if (command.owner && !isOwner) return await reply(err('Ye command sirf *owner* ke liye hai.'));
    if ((command.group || command.admin || command.botAdmin) && !isGroup)
      return await reply(err('Ye command sirf *group* mein chalti hai.'));

    if (isGroup && (command.admin || command.botAdmin)) {
      const info = await getAdminInfo();
      ctx.isAdmin = info.isAdmin;
      ctx.isBotAdmin = info.isBotAdmin;
      if (command.admin && !info.isAdmin) return await reply(err('Ye command sirf *group admins* ke liye hai.'));
      if (command.botAdmin && !info.isBotAdmin) return await reply(warn('Pehle bot ko *group admin* banayein.'));
    }

    if (command.react) await react(command.react).catch(() => {});
    await command.function(sock, msg, ctx, ctx);
  } catch (error) {
    console.error(`❌ [${name}] command error:`, error);
    await reply(err(`Command mein masla aaya:\n${error.message}`)).catch(() => {});
  }
}

module.exports = { handleMessage, digits };
