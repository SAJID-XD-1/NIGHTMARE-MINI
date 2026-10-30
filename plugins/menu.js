const { cmd, commands } = require('../nightmare');
const config = require('../config');
const { runtime } = require('../lib/functions');

const ICONS = {
GENERAL: '🕸️',
GROUP: '👥',
DOWNLOAD: '📥',
TOOLS: '🛠️',
FUN: '🎭',
OWNER: '👑',
SETTINGS: '⚙️',
STICKER: '✨',
SEARCH: '🔍',
SECURITY: '🛡️'
};

cmd({
pattern: 'menu',
alias: ['help', 'commands', 'allmenu'],
desc: 'Show all commands',
category: 'general',
react: '🕸️'
}, async (sock, mek, m, { reply, pushname }) => {

const list = commands.filter(c => !c.hidden);
const groups = {};

for (const c of list) {
    (groups[c.category] ||= []).push(c);
}

let text = `🇦🇱 NIGHTMARE 🕸️

User : ${pushname}
Prefix : ${config.PREFIX}
Mode : ${config.MODE}
Uptime : ${runtime(process.uptime())}
Commands : ${list.length}

`;

for (const [category, items] of Object.entries(groups).sort()) {

    text += `${ICONS[category.toUpperCase()] || '🕸️'} ${category.toUpperCase()}

`;

    for (const c of items.sort((a, b) =>
        a.pattern.localeCompare(b.pattern)
    )) {
        text += `${config.PREFIX}${c.pattern}\n`;
    }

    text += '\n';
}

text += `🇦🇱 NIGHTMARE 🕸️`;

await reply(text);

});
