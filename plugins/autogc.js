// 🚪 Auto group join: owner / SUDO group invite link bheje to bot khud join kar leta hai
const { cmd, onMessage, onOwnMessage } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');
const { current } = require('../lib/context');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const INVITE = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/gi;
const seen = new Map();   // `${number}:${code}` -> time (ek hi link baar baar try na ho)

const isOn = () => config.AUTO_GC_JOIN === true || config.AUTO_GC_JOIN === 'true';

cmd({ pattern: 'autogc', alias: ['autojoin'], desc: 'Auto group join on/off (owner/SUDO ke bheje links)', category: 'owner', owner: true, react: '🚪' },
  async (sock, mek, ctx) => {
    const input = (ctx.q || '').trim().toLowerCase();
    if (!['on', 'off'].includes(input))
      return ctx.reply(`*AUTO GROUP JOIN*\n\nAbhi: ${isOn() ? 'ON ✅' : 'OFF ❌'}\n\n${ctx.prefix}autogc on\n${ctx.prefix}autogc off`);
    await settings.set('AUTO_GC_JOIN', input === 'on' ? 'true' : 'false');
    return ctx.reply(input === 'on' ? '*Auto Group Join Enabled ✅*\nAb sirf Owner / SUDO ke bheje invite links par join hoga.' : '*Auto Group Join Disabled ❌*');
  });

async function joinLinks(sock, text, say) {
  const codes = [...new Set([...String(text).matchAll(INVITE)].map((m) => m[1]))];
  const sid = current()?.id || 'default';
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const key = `${sid}:${code}`;
    if (Date.now() - (seen.get(key) || 0) < 10 * 60 * 1000) continue;
    seen.set(key, Date.now());
    try {
      await sock.groupAcceptInvite(code);
      await say(`*Joined Group Successfully ✅*\n\nInvite Code: ${code}`);
    } catch (e) {
      console.log('AUTO GC:', e.message);
      await say('*Failed To Join Group ❌*\n\nLink expired, invalid, or already joined.');
    }
    if (i < codes.length - 1) await sleep(4000);
  }
}

// Doosron ke bheje messages: sirf Owner / SUDO ke links par join (ajnabi spam links par nahi)
onMessage(async (sock, msg, ctx) => {
  if (!isOn() || !ctx.body || (!ctx.isOwner && !ctx.isSudo)) return;
  await joinLinks(sock, ctx.body, (t) => ctx.reply(t));
});

// Bot ke apne account (owner) ke khud ke bheje messages
onOwnMessage(async (sock, msg, { from, body }) => {
  if (!isOn() || !body) return;
  await joinLinks(sock, body, (t) => sock.sendMessage(from, { text: t }));
});
