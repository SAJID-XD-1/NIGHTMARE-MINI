const { cmd } = require('../nightmare');
const config = require('../config');
const { runtime } = require('../lib/functions');
const { smallCaps } = require('../lib/font');

cmd({
    pattern: 'alive',
    alias: ['status'],
    desc: 'Check bot status',
    category: 'general',
    react: '🕸️'
}, async (sock, mek, m, { reply, pushname }) => {

    const text = `🇦🇱 NIGHTMARE 🕸️

${smallCaps(`Hello ${pushname}`)}

${smallCaps('Status : Online')}
${smallCaps(`Mode : ${config.MODE}`)}
${smallCaps(`Prefix : ${config.PREFIX}`)}
${smallCaps(`Uptime : ${runtime(process.uptime())}`)}

🇦🇱 NIGHTMARE 🕸️`;

    await reply(text);
});
