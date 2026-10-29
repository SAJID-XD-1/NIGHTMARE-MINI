const { cmd } = require('../nightmare');
const { fetchGif, gifToSticker } = require('../lib/sticker-utils');
const { err, usage, wait } = require('../lib/style');

cmd({ pattern: 'attp', alias: ['attptext', 'textsticker', 'namesticker', 'stickername'], desc: 'Text ka animated sticker', category: 'sticker', react: '✨' },
  async (sock, mek, m, { from, q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'attp Nightmare', 'Jo likhenge uska animated sticker banega.'));
    await reply(wait('Aapka sticker ban raha hai...'));
    try {
      const gif = await fetchGif(`https://api-fix.onrender.com/api/maker/attp?text=${encodeURIComponent(q)}`);
      const sticker = await gifToSticker(gif);
      await sock.sendMessage(from, { sticker }, { quoted: mek });
    } catch (e) {
      console.error('ATTP:', e.message);
      await reply(err('Sticker nahi ban saka (API ya ffmpeg ka masla).\nThori der baad dobara try karein.'));
    }
  });
