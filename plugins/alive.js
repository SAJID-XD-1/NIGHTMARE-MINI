const { cmd, commands } = require('../nightmare');
const config = require('../config');
const { box, onOff } = require('../lib/style');
const { runtime } = require('../lib/functions');

cmd({ pattern: 'alive', alias: ['live'], desc: 'Bot online hai ya nahi', category: 'general', react: '🇦🇱' },
  async (sock, mek, m, { reply }) => {
    await reply(box('ᴍɪɴɪ ʙᴏᴛ', [
      ['⛧', 'Status', 'ᴏɴʟɪɴᴇ'],
      ['🥀', 'Owner', config.OWNER_NAME],
      ['🖤', 'Uptime', runtime(process.uptime())],
      ['🔰', 'Prefix', config.PREFIX],
      ['📦', 'Commands', commands.length],
      ['𖤐', 'Version', config.VERSION],
      ['🛡️', 'Antidelete', onOff(config.ANTIDELETE)]
    ], 'NIGHTMARE-MINI'));
  });
