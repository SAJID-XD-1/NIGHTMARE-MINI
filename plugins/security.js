const { cmd, onMessage } = require('../nightmare');
const settings = require('../lib/settings');
const { box, usage, mini, warn, onOff } = require('../lib/style');

const MAX_WARNS = 3;
const warns = new Map(); // `${type}:${group}:${number}` -> count

// Chhote words (mc, bc) wala false-positive na ho isliye pure words match hote hain
const BAD_WORDS = new Set([
  'fuck', 'fucker', 'fucking', 'shit', 'bitch', 'asshole', 'bastard', 'motherfucker', 'dick', 'pussy', 'cock', 'whore', 'slut', 'nigga', 'nigger',
  'bhosdi', 'bhosri', 'bhosdike', 'bhosdiwale', 'chutiya', 'chutiyapa', 'madarchod', 'behenchod', 'bhenchod', 'bhenkelode', 'lund', 'lode', 'gaand',
  'gand', 'randi', 'rndi', 'harami', 'kutti', 'kutta', 'hijda', 'bsdk', 'mc', 'bc', 'mkc', 'bkc'
]);
const BAD_PHRASES = ['teri maa ki', 'teri behan ki', 'maa chod', 'behan chod'];

const ALLOWED_DOMAINS = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'tiktok.com', 'github.com', 'google.com', 'wa.me'];
const LINK_RE = /(https?:\/\/\S+|www\.\S+|chat\.whatsapp\.com\/\S+|\b[a-z0-9-]+\.(?:com|net|org|io|me|xyz|info|link|app|gg|tv|pk|co|in)\b(?:\/\S*)?)/gi;

function badLinks(text) {
  const found = text.match(LINK_RE) || [];
  return found.filter((l) => {
    if (/chat\.whatsapp\.com/i.test(l)) return true; // group invite hamesha block
    const host = l.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].toLowerCase().replace(/^www\./, '');
    return !ALLOWED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  });
}

function badWord(text) {
  const t = text.toLowerCase();
  if (BAD_PHRASES.some((p) => t.includes(p))) return true;
  return (t.match(/[a-z]+/g) || []).find((w) => BAD_WORDS.has(w));
}

function makeCommand(key, pattern, alias, title, icon) {
  cmd({ pattern, alias, desc: `${title} on/off`, category: 'security', admin: true, botAdmin: true, react: icon },
    async (sock, mek, m, { from, args, reply, prefix }) => {
      const v = (args[0] || '').toLowerCase();
      const action = (args[1] || 'warn').toLowerCase();
      const cur = settings.group(from)[key] || {};
      if (!['on', 'off'].includes(v) || (v === 'on' && !['warn', 'delete', 'kick'].includes(action)))
        return reply(box(title, [
          ['📌', 'Status', onOff(String(!!cur.on))],
          ['⚡', 'Action', (cur.action || 'warn').toUpperCase()],
          '',
          `${prefix}${pattern} on warn  ➜ sirf warning`,
          `${prefix}${pattern} on delete ➜ delete + warning`,
          `${prefix}${pattern} on kick  ➜ delete + ${MAX_WARNS} warn par kick`,
          `${prefix}${pattern} off`
        ]));
      await settings.setGroup(from, { [key]: { on: v === 'on', action } });
      await reply(mini(`${icon} ${title}`, v === 'on' ? `✅ ON • Action: ${action.toUpperCase()}` : '❌ OFF'));
    });
}
makeCommand('antilink', 'antilink', ['al', 'nolink'], 'ᴀɴᴛɪ ʟɪɴᴋ', '🔗');
makeCommand('antibad', 'antibad', ['badword', 'ab'], 'ᴀɴᴛɪ ʙᴀᴅ ᴡᴏʀᴅ', '🚫');

async function punish(sock, msg, ctx, type, reason, cfg) {
  const { from, number, sender } = ctx;
  const k = `${type}:${from}:${number}`;
  const count = (warns.get(k) || 0) + 1;
  warns.set(k, count);

  if (cfg.action !== 'warn') await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
  await sock.sendMessage(from, {
    text: warn(`${reason}\n👤 @${number}\n📊 Warn: ${count}/${MAX_WARNS}`),
    mentions: [sender]
  });

  if (cfg.action === 'kick' && count >= MAX_WARNS) {
    warns.delete(k);
    await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
    await sock.sendMessage(from, { text: mini('👢 ᴋɪᴄᴋᴇᴅ', `@${number} ko ${MAX_WARNS} warnings ke baad nikal diya.`), mentions: [sender] });
  }
}

onMessage(async (sock, msg, ctx) => {
  if (!ctx.isGroup || !ctx.body || ctx.isOwner) return;
  const g = settings.group(ctx.from);
  const wantsLink = g.antilink?.on;
  const wantsBad = g.antibad?.on;
  if (!wantsLink && !wantsBad) return;

  const { isAdmin, isBotAdmin } = await ctx.getAdminInfo();
  if (isAdmin || !isBotAdmin) return;

  if (wantsLink) {
    const links = badLinks(ctx.body);
    if (links.length) {
      await punish(sock, msg, ctx, 'link', `🔗 Link allowed nahi hai!\n📌 ${links.slice(0, 2).join(', ')}`, g.antilink);
      return true;
    }
  }
  if (wantsBad) {
    if (badWord(ctx.body)) {
      await punish(sock, msg, ctx, 'bad', '🚫 Gali / bad word allowed nahi hai!', g.antibad);
      return true;
    }
  }
});

module.exports = { badLinks, badWord };
