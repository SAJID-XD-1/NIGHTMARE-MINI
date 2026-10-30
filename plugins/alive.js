const { cmd } = require('../nightmare');
const config = require('../config');
const { runtime } = require('../lib/functions');

cmd({
    pattern: 'alive',
    alias: ['status'],
    desc: 'Check bot status',
    category: 'general',
    react: '🕸️'
}, async (sock, mek, m, { reply, pushname }) => {

    const text = `🇦🇱 NIGHTMARE 🕸️

Hello ${pushname}

Status : Online
Mode : ${config.MODE}
Prefix : ${config.PREFIX}
Uptime : ${runtime(process.uptime())}

🇦🇱 NIGHTMARE 🕸️`;

    await reply(text);
});
