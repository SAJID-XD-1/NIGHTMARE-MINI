// Welcome / Goodbye messages
const settings = require('./settings');
const { box } = require('./style');
const config = require('../config');

async function groupEvents(sock, update) {
  const { id, participants, action } = update;
  if (!id || !participants?.length) return;
  const g = settings.group(id);
  if (action !== 'add' && action !== 'remove') return;
  if (action === 'add' && g.welcome !== true) return;
  if (action === 'remove' && g.goodbye !== true) return;

  let meta;
  try { meta = await sock.groupMetadata(id); } catch { return; }

  for (const p of participants) {
    const jid = typeof p === 'string' ? p : p.id;
    const tag = `@${jid.split('@')[0]}`;
    const text =
      action === 'add'
        ? box('ᴡᴇʟᴄᴏᴍᴇ', [['🥀', 'User', tag], ['🕸️', 'Group', meta.subject], ['👥', 'Members', meta.participants.length], '', 'Group ke rules follow karein 🖤'], config.BOT_NAME)
        : box('ɢᴏᴏᴅʙʏᴇ', [['🥀', 'User', tag], ['🕸️', 'Group', meta.subject], '', 'Alvida... phir milenge 🖤'], config.BOT_NAME);
    await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {});
  }
}

module.exports = { groupEvents };
