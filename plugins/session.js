// 📱 Is number ki session control: .logout confirm
const { cmd } = require('../nightmare');
const sessions = require('../lib/sessions');
const { digits } = require('../lib/jid');

cmd({ pattern: 'logout', alias: ['unlink'], desc: 'Is number ko bot se unlink karein aur saara data delete', category: 'owner' },
  async (sock, mek, ctx) => {
    if (!ctx.isOwner) return ctx.reply('Only the Owner can do this.');
    if ((ctx.args[0] || '').toLowerCase() !== 'confirm')
      return ctx.reply(`Ye is number ko bot se unlink kar dega aur is number ka saara data (settings, SUDO, filters...) delete ho jayega.\nPakka karna ho to likhein:\n${ctx.prefix}logout confirm`);
    await ctx.reply('Logged out. Allah hafiz! 🇦🇱');
    setTimeout(() => sessions.logout(digits(sock.user?.id)), 1500);
  });
