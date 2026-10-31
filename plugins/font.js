const { cmd } = require('../nightmare');
const { nightmareFont } = require('../lib/font');

cmd({ pattern: 'font', alias: ['fancy'], desc: 'Convert text to NIGHTMARE font', category: 'general' },
  async (sock, mek, ctx) => {
    const text = ctx.q || ctx.quoted?.text;
    if (!text) return ctx.reply(`Usage: ${ctx.prefix}font your text\nYa kisi text message ko reply karein.`);
    // Result hi asli output hai, isliye wrapper dobara na lagay
    return ctx.reply(nightmareFont(text, ctx.prefix), { noFont: true });
  });
