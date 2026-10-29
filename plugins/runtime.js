const { cmd } = require('../nightmare');
const { box } = require('../lib/style');
const { runtime } = require('../lib/functions');
const os = require('os');

cmd({ pattern: 'runtime', alias: ['uptime'], desc: 'Bot kitni der se chal raha hai', category: 'general', react: '⏱️' },
  async (sock, mek, m, { reply }) => {
    const used = Math.round(process.memoryUsage().rss / 1048576);
    await reply(box('ʀᴜɴᴛɪᴍᴇ', [
      ['⏱️', 'Uptime', runtime(process.uptime())],
      ['🧠', 'RAM', `${used} MB / ${Math.round(os.totalmem() / 1048576)} MB`],
      ['🖥️', 'Platform', os.platform()]
    ]));
  });
