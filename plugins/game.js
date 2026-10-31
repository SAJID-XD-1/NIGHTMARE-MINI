// 🎮 Tic Tac Toe
const { cmd, onMessage } = require('../nightmare');
const { box, ok, err, usage, mini } = require('../lib/style');

const games = new Map(); // chat -> { p: [digitsX, digitsO], jid: [jidX, jidO], b: [], turn, at }
const digits = (j = '') => String(j).split('@')[0].split(':')[0].replace(/\D/g, '');
const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const draw = (b) => [0, 3, 6].map((r) => b.slice(r, r + 3).map((c, i) => c || NUM[r + i]).join('')).join('\n');
const winner = (b) => LINES.some(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]);

cmd({ pattern: 'tictactoe', alias: ['ttt', 'xo'], desc: 'Tic Tac Toe khelein (mention / reply)', category: 'game', group: true, react: '🎮' },
  async (sock, mek, m, ctx) => {
    const { from, number, sender, reply, prefix } = ctx;
    if ((ctx.args[0] || '').toLowerCase() === 'end') {
      const g = games.get(from);
      if (!g) return reply(err('Koi game nahi chal raha.'));
      if (!g.p.includes(number) && !ctx.isOwner && !(await ctx.getAdminInfo()).isAdmin) return reply(err('Sirf khilari ya admin game khatam kar sakte hain.'));
      games.delete(from);
      return reply(ok('Game khatam.'));
    }
    const opp = ctx.mentioned[0] || ctx.quotedParticipant;
    if (!opp || digits(opp) === number) return reply(usage(prefix, 'tictactoe @dost', 'Kisi dost ko mention ya reply karein.\nChaal ke liye 1-9 likhein.'));
    if (games.has(from) && Date.now() - games.get(from).at < 10 * 60 * 1000) return reply(err(`Pehle se game chal raha hai. Khatam karne ke liye ${prefix}tictactoe end`));
    const g = { p: [number, digits(opp)], jid: [sender, opp], b: Array(9).fill(null), turn: 0, at: Date.now() };
    games.set(from, g);
    await sock.sendMessage(from, { text: box('ᴛɪᴄ ᴛᴀᴄ ᴛᴏᴇ', [['❌', 'X', `@${g.p[0]}`], ['⭕', 'O', `@${g.p[1]}`], '', draw(g.b), '', `Pehli chaal: @${g.p[0]} (1-9 likhein)`]), mentions: g.jid }, { quoted: mek });
  });

onMessage(async (sock, msg, ctx) => {
  if (!ctx.isGroup || !/^[1-9]$/.test(ctx.body.trim())) return;
  const g = games.get(ctx.from);
  if (!g) return;
  if (Date.now() - g.at > 10 * 60 * 1000) { games.delete(ctx.from); return; }
  if (ctx.number !== g.p[g.turn]) return;
  const i = parseInt(ctx.body, 10) - 1;
  if (g.b[i]) { await ctx.reply(err('Ye khana bhara hua hai.')); return true; }

  g.b[i] = g.turn === 0 ? '❌' : '⭕';
  g.at = Date.now();
  if (winner(g.b)) {
    games.delete(ctx.from);
    await sock.sendMessage(ctx.from, { text: box('ᴡɪɴɴᴇʀ 🏆', [draw(g.b), '', `Mubarak @${g.p[g.turn]}! 🎉`]), mentions: [g.jid[g.turn]] });
  } else if (g.b.every(Boolean)) {
    games.delete(ctx.from);
    await sock.sendMessage(ctx.from, { text: box('ᴅʀᴀᴡ', [draw(g.b), '', 'Barabar! 🤝']) });
  } else {
    g.turn = 1 - g.turn;
    await sock.sendMessage(ctx.from, { text: `${draw(g.b)}\n\n${mini('🎮 ᴛᴜʀɴ', `@${g.p[g.turn]} ki baari ${g.turn === 0 ? '❌' : '⭕'}`)}`, mentions: [g.jid[g.turn]] });
  }
  return true;
});
