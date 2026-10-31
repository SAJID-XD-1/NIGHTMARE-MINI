const { cmd } = require('../nightmare');
const { runtime } = require('../lib/functions');
const { nightmareFont } = require('../lib/font');

cmd({ pattern: 'runtime', alias: ['uptime'], desc: 'Show bot uptime', category: 'general' },
  async (sock, mek, ctx) => {
    const uptime = runtime(process.uptime());
    return ctx.reply(nightmareFont(`🇦🇱 NIGHTMARE 🕸️\nUptime : ${uptime}`));
  });
