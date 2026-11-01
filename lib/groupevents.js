// Group join/leave/promote/demote events: welcome, goodbye, antifake, pdm, antimod
const settings = require('./settings');
const { box } = require('./style');
const config = require('../config');
const { botIds, adminIdSet, participantIds, anyIn, digits } = require('./jid');

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
  let meta;
  try { meta = await sock.groupMetadata(id); } catch { return; }

  const bot = botIds(sock);
  const botIsAdmin = anyIn(bot, adminIdSet(meta.participants));
  const sudo = (Array.isArray(config.SUDO) ? config.SUDO : []).map(String);

  // Kisi bhi jid (phone ya @lid) ki saari pehchaanein, group ki participants list se
  const idsOf = (jid) => {
    const d = digits(jid);
    const p = meta.participants.find((x) => participantIds(x).has(d));
    return p ? participantIds(p) : new Set([d]);
  };
  // Asli phone number (country code check ke liye). @lid ho aur phone na mile to null
  const phoneOf = (jid) => {
    const d = digits(jid);
    const p = meta.participants.find((x) => participantIds(x).has(d));
    const cands = p ? [p.phoneNumber, p.pn, p.jid, p.id, jid] : [jid];
    const pn = cands.filter(Boolean).find((c) => !String(c).endsWith('@lid'));
    return pn ? digits(pn) : null;
  };

  for (const p of participants) {
    const jid = jidOf(p);

    if (action === 'add' || action === 'remove') await greet(sock, id, jid, action, meta);

    // Anti-fake: country code filter
    if (action === 'add' && g.antifake?.on && botIsAdmin && !anyIn(idsOf(jid), bot)) {
      const codes = g.antifake.codes || [];
      const n = phoneOf(jid);
      if (n) {   // phone number maloom na ho to kisi ko nahi nikalte
        const allowMode = g.antifake.mode === 'allow';
        const match = codes.some((c) => n.startsWith(c));
        if ((allowMode && !match) || (!allowMode && match)) {
          await sock.groupParticipantsUpdate(id, [jid], 'remove').catch(() => {});
          await sock.sendMessage(id, { text: `🚫 @${n} ko nikal diya (anti-fake: country code allowed nahi).`, mentions: [jid] }).catch(() => {});
          continue;
        }
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
      const authorIds = idsOf(author);
      // Bot khud, owner aur SUDO ko ijazat hai (LID ho ya phone number)
      const allowed = anyIn(authorIds, bot) || authorIds.has(config.OWNER_NUMBER) || sudo.some((n) => authorIds.has(n));
      if (!allowed) {
        const undo = action === 'promote' ? 'demote' : 'promote';
        await sock.groupParticipantsUpdate(id, [jid], undo).catch(() => {});
        await sock.groupParticipantsUpdate(id, [author], 'demote').catch(() => {});
        await sock.sendMessage(id, {
          text: `🛡️ *Anti-Mod*\n@${num(author)} ne unauthorized ${action} kiya tha — wapas kar diya aur use demote kar diya.`,
          mentions: [author, jid]
        }).catch(() => {});
      }
    }
  }
}

module.exports = { groupEvents };
