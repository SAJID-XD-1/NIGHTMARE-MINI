const { cmd } = require('../nightmare');
const { smallCaps } = require('../lib/font');

cmd({
    pattern: 'ping',
    alias: ['speed'],
    desc: 'Check bot speed',
    category: 'general',
    react: '🕸️'
}, async (sock, mek, m, { reply }) => {

    const start = Date.now();
    const speed = Date.now() - start;

    await reply(`🇦🇱 NIGHTMARE 🕸️\n\n${smallCaps(`Pong ${speed} ms`)}`);
});
