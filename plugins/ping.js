const { cmd } = require('../nightmare');

cmd({
    pattern: 'ping',
    alias: ['speed'],
    desc: 'Check bot speed',
    category: 'general',
    react: '🕸️'
}, async (sock, mek, m, { reply }) => {

    const start = Date.now();

    await reply('🇦🇱 NIGHTMARE 🕸️\n\nPong...');

    const speed = Date.now() - start;

    await reply(`🇦🇱 NIGHTMARE 🕸️\n\nPong ${speed} ms`);
});
