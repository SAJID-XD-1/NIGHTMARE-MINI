// Group join/leave/promote/demote events: welcome, goodbye, antifake, pdm, antimod
const settings = require('./settings');
const { box } = require('./style');
const config = require('../config');

const num = (j = '') => String(j).split('@')[0].split(':')[0];
const jidOf = (p) => (typeof p === 'string' ? p : p.id);

function fillTemplate(tpl, vars) {
  return tpl
    .replace(/&mention|@user/gi, vars.tag)
    .replace(/&gname|@group/gi, vars.group)
    .replace(/&count|@count/gi, vars.count)
    .replace(/&pp/gi, '');
}

async function greet(sock, id, jid, action, meta) {
  const g = settings.group(id);
  const conf = g[action === 'add' ? 'welcomeMsg' : 'goodbyeMsg'];
  const enabled = action === 'add' ? g.welcome : g.goodbye;
  if (enabled !== true) return;

  const vars = { tag: `@${num(jid)}`, group: meta.subject, count: meta.participants.length };
  let text = conf?.text
    ? fillTemplate(conf.text, vars)
    : action === 'add'
      ? box('ᴡᴇʟᴄᴏᴍᴇ', [['🥀', 'User', vars.tag], ['🕸️', 'Group', vars.group], ['👥', 'Members', vars.count], '', 'Group ke rules follow karein 🖤'], config.BOT_NAME)
      : box('ɢᴏᴏᴅʙʏᴇ', [['🥀', 'User', vars.tag], ['🕸️', 'Group', vars.group], '', 'Alvida... phir milenge 🖤'], config.BOT_NAME);

  if (conf?.text && /&pp/i.test(conf.text)) {
    const pp = await sock.profilePictureUrl(jid, 'image').catch(() => null);
    if (pp) return sock.sendMessage(id, { image: { url: pp }, caption: text, mentions: [jid], noFont: !!conf?.text }).catch(() => {});
  }
  await sock.sendMessage(id, { text, mentions: [jid], noFont: !!conf?.text }).catch(() => {});
}

async function groupEvents(sock, update) {
  const { id, participants, action, author } = update;
  if (!id || !participants?.length) return;
  const g = settings.group(id);
  const me = num(sock.user?.id);
  let meta;
  try { meta = await sock.groupMetadata(id); } catch { return; }
  const botIsAdmin = meta.participants.some((p) => p.admin && num(p.id) === me);

  for (const p of participants) {
    const jid = jidOf(p);

    if (action === 'add' || action === 'remove') await greet(sock, id, jid, action, meta);

    // Anti-fake: country code filter
    if (action === 'add' && g.antifake?.on && botIsAdmin && num(jid) !== me) {
      const codes = g.antifake.codes || [];
      const n = num(jid);
      const allowMode = g.antifake.mode === 'allow';
      const match = codes.some((c) => n.startsWith(c));
      if ((allowMode && !match) || (!allowMode && match)) {
        await sock.groupParticipantsUpdate(id, [jid], 'remove').catch(() => {});
        await sock.sendMessage(id, { text: `🚫 @${n} ko nikal diya (anti-fake: country code allowed nahi).`, mentions: [jid] }).catch(() => {});
        continue;
      }
    }

    // PDM: promote/demote notice
    if ((action === 'promote' || action === 'demote') && g.pdm) {
      const by = author ? `\n👤 By: @${num(author)}` : '';
      await sock.sendMessage(id, {
        text: `${action === 'promote' ? '⬆️ *Promoted*' : '⬇️ *Demoted*'}\n🥀 User: @${num(jid)}${by}`,
        mentions: [jid, ...(author ? [author] : [])]
      }).catch(() => {});
    }

    // Anti-mod: unauthorized promote/demote ko ulta karo
    if ((action === 'promote' || action === 'demote') && g.antimod && botIsAdmin && author) {
      const authorNum = num(author);
      const allowed = authorNum === me || authorNum === config.OWNER_NUMBER;
      if (!allowed) {
        const undo = action === 'promote' ? 'demote' : 'promote';
        await sock.groupParticipantsUpdate(id, [jid], undo).catch(() => {});
        await sock.groupParticipantsUpdate(id, [author], 'demote').catch(() => {});
        await sock.sendMessage(id, {
          text: `🛡️ *Anti-Mod*\n@${authorNum} ne unauthorized ${action} kiya tha — wapas kar diya aur use demote kar diya.`,
          mentions: [author, jid]
        }).catch(() => {});
      }
    }
  }
}

module.exports = { groupEvents };
