// 💤 AFK: .afk [reason] | .afk off
const { cmd, onMessage, onOwnMessage } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');
const { runtime } = require('../lib/functions');

const KEY = 'afkusers';                       // { "923...": { reason, since } }
const COOLDOWN = 10 * 60 * 1000;               // ek chat mein ek AFK user ke liye 10 min mein sirf 1 notice
const notified = new Map();

const num = (j = '') => String(j).split('@')[0].split(':')[0].replace(/\D/g, '');
const all = () => settings.getData(KEY, {});
const isAfkCommand = (body = '') => new RegExp(`^${config.PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}afk(\\s|$)`, 'i').test(body.trim());
const since = (ms) => runtime(Math.max(1, Math.floor(ms / 1000)));

cmd({ pattern: 'afk', desc: 'Set AFK (with optional reason)', category: 'general' },
  async (sock, mek, ctx) => {
    const data = all();
    if (ctx.q.toLowerCase() === 'off') {
      if (!data[ctx.number]) return ctx.reply('You are not AFK.');
      delete data[ctx.number];
      settings.setData(KEY, data);
      return ctx.reply('AFK mode disabled.');
    }
    data[ctx.number] = { reason: ctx.q, since: Date.now() };
    settings.setData(KEY, data);
    return ctx.reply(`You are now AFK${ctx.q ? `\nReason : ${ctx.q}` : ''}`);
  });

async function welcomeBack(sock, chat, number, jid) {
  const data = all();
  const info = data[number];
  if (!info) return false;
  delete data[number];
  settings.setData(KEY, data);
  await sock.sendMessage(chat, { text: `Welcome back @${number}\nYou were AFK for ${since(Date.now() - info.since)}`, mentions: [jid] });
  return true;
}

// Dusre numbers (SUDO etc.) ke wapas aane ka pata
onMessage(async (sock, msg, ctx) => {
  const data = all();
  const afkNumbers = Object.keys(data);
  if (!afkNumbers.length) return;

  if (data[ctx.number] && !isAfkCommand(ctx.body)) { await welcomeBack(sock, ctx.from, ctx.number, ctx.sender); return; }

  // Kis kis ka zikar hua? (mention, reply, ya bot ke account par private message)
  const botNumber = num(sock.user?.id);
  const botLid = num(sock.user?.lid);
  const targets = new Set(ctx.mentioned.map(num));
  if (ctx.quotedParticipant) targets.add(num(ctx.quotedParticipant));
  if (!ctx.isGroup) targets.add(botNumber);

  for (const n of afkNumbers) {
    const hit = targets.has(n) || (n === botNumber && botLid && targets.has(botLid));
    if (!hit || n === ctx.number) continue;

    const key = `${ctx.from}:${n}`;
    if (Date.now() - (notified.get(key) || 0) < COOLDOWN) continue;
    notified.set(key, Date.now());

    const info = data[n];
    await sock.sendMessage(ctx.from, {
      text: `@${n} is AFK\n${info.reason ? `Reason : ${info.reason}\n` : ''}Since : ${since(Date.now() - info.since)} ago`,
      mentions: [`${n}@s.whatsapp.net`]
    }, { quoted: msg });
  }
});

// Bot ke apne account (owner) ke messages - wapas aane ka pata
onOwnMessage(async (sock, msg, { from, body }) => {
  const me = num(sock.user?.id);
  if (!all()[me] || isAfkCommand(body)) return;
  await welcomeBack(sock, from, me, `${me}@s.whatsapp.net`);
});
