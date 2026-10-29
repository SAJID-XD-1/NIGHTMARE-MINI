const axios = require('axios');
const { cmd } = require('../nightmare');
const { box, usage, mini } = require('../lib/style');

cmd({ pattern: 'joke', desc: 'Random joke', category: 'fun', react: '😂' },
  async (sock, mek, m, { reply }) => {
    const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 10000 });
    await reply(box('ᴊᴏᴋᴇ', [`😂 ${data.setup}`, '', `👉 ${data.punchline}`]));
  });

cmd({ pattern: 'flip', alias: ['coin'], desc: 'Sikka uchhalein', category: 'fun', react: '🪙' },
  async (sock, mek, m, { reply }) => reply(mini('🪙 ᴄᴏɪɴ', Math.random() < 0.5 ? '🕷️ *HEADS*' : '🕸️ *TAILS*')));

cmd({ pattern: 'dice', alias: ['roll'], desc: 'Dice roll karein', category: 'fun', react: '🎲' },
  async (sock, mek, m, { reply }) => reply(mini('🎲 ᴅɪᴄᴇ', `Aapka number: *${1 + Math.floor(Math.random() * 6)}*`)));

cmd({ pattern: 'say', alias: ['echo'], desc: 'Bot aapki baat repeat karega', category: 'fun', react: '🗣️' },
  async (sock, mek, m, { q, reply, prefix }) => reply(q ? `🕷️ ${q}` : usage(prefix, 'say hello')));
