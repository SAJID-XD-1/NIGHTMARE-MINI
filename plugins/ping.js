const { cmd } = require('../nightmare');

cmd({ pattern: 'ping', alias: ['pong'], desc: 'Show bot speed', category: 'general' },
  async (sock, mek, ctx) => {
    // Asli speed: message bhejne mein jitna waqt laga
    const start = Date.now();
    const sent = await ctx.reply('NIGHTMARE 🇦🇱 🕸️\n\nPinging...');
    const ms = Date.now() - start;
    const text = `NIGHTMARE 🇦🇱 🕸️\n\nPong ${ms} ms 🫯`;
    // Pehla message edit ho jata hai (font wrapper khud lag jata hai)
    await sock.sendMessage(ctx.from, { text, edit: sent.key }).catch(() => ctx.reply(text));
  });
