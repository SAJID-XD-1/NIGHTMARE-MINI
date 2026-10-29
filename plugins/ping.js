const { cmd } = require('../nightmare');
const { box } = require('../lib/style');

cmd({ pattern: 'ping', alias: ['speed'], desc: 'Bot ki speed check karein', category: 'general', react: '🕷️' },
  async (sock, mek, m, { from, reply }) => {
    const start = Date.now();
    const sent = await sock.sendMessage(from, { text: '🕷️ *Pinging...*' }, { quoted: mek });
    const ms = Date.now() - start;
    const text = box('ꜱʏꜱᴛᴇᴍ ᴏɴʟɪɴᴇ', [['⛧', 'Status', 'ᴏɴʟɪɴᴇ'], ['🥀', 'Speed', `${ms} ms`]]);
    await sock.sendMessage(from, { text, edit: sent.key }).catch(() => reply(text));
  });
