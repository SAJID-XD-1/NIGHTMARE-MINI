const { cmd, commands } = require('../nightmare');
const config = require('../config');
const { runtime } = require('../lib/functions');
const { TOP, BOTTOM, POWERED } = require('../lib/style');

const ICONS = {
  GENERAL: '🕷️', GROUP: '👥', DOWNLOAD: '📥', TOOLS: '🛠️', FUN: '🎭', OWNER: '👑',
  SETTINGS: '⚙️', STICKER: '✨', SEARCH: '🔍', SECURITY: '🛡️'
};

cmd({ pattern: 'menu', alias: ['help', 'commands', 'allmenu'], desc: 'Saari commands ki list', category: 'general', react: '📜' },
  async (sock, mek, m, { reply, pushname }) => {
    const list = commands.filter((c) => !c.hidden);
    let text = `${TOP}\n┃\n┃   🕷️  *N I G H T M A R E   M I N I*\n┃\n`;
    text += `┃   👤  User : ${pushname}\n┃   🔰  Prefix : ${config.PREFIX}\n┃   ⚙️  Mode : ${config.MODE}\n`;
    text += `┃   ⏱️  Uptime : ${runtime(process.uptime())}\n┃   📦  Commands : ${list.length}\n┃\n${BOTTOM}\n`;

    const groups = {};
    for (const c of list) (groups[c.category] ||= []).push(c);

    for (const [category, items] of Object.entries(groups).sort()) {
      text += `\n╭──〔 ${ICONS[category] || '🕸️'} *${category}* 〕──⬣\n`;
      for (const c of items.sort((a, b) => a.pattern.localeCompare(b.pattern))) {
        text += `┃ 🔹 ${config.PREFIX}${c.pattern}${c.desc ? ` ➜ ${c.desc}` : ''}\n`;
      }
      text += `╰────────────⬣\n`;
    }
    text += `\n${POWERED}`;
    await reply(text);
  });
