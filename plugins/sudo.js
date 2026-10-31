// 👑 SUDO management (sirf Owner). SUDO list MongoDB / JSON settings mein save hoti hai.
const { cmd } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');

const digits = (v = '') => String(v).replace(/\D/g, '');
const jidNum = (j = '') => String(j).split('@')[0].split(':')[0].replace(/\D/g, '');
const list = () => (Array.isArray(config.SUDO) ? config.SUDO.map(String) : []);

// number likh kar, @mention karke ya kisi ke message ko reply karke - teeno chalte hain
function pickNumber(ctx) {
  return digits(ctx.q) || jidNum(ctx.mentioned[0]) || jidNum(ctx.quotedParticipant);
}

cmd({ pattern: 'addsudo', alias: ['setsudo'], desc: 'Add SUDO user', category: 'owner' },
  async (sock, mek, ctx) => {
    if (!ctx.isOwner) return ctx.reply('Only the Owner can manage SUDO users.');
    const number = pickNumber(ctx);
    if (!number) return ctx.reply(`Usage: ${ctx.prefix}addsudo 923XXXXXXXXX`);
    if (number === config.OWNER_NUMBER) return ctx.reply('Owner already has full access.');

    const sudo = list();
    if (sudo.includes(number)) return ctx.reply('User already SUDO.');
    sudo.push(number);
    await settings.set('SUDO', sudo);
    return ctx.reply(`SUDO added: ${number}`);
  });

cmd({ pattern: 'delsudo', alias: ['removesudo'], desc: 'Remove SUDO user', category: 'owner' },
  async (sock, mek, ctx) => {
    if (!ctx.isOwner) return ctx.reply('Only the Owner can manage SUDO users.');
    const number = pickNumber(ctx);
    if (!number) return ctx.reply(`Usage: ${ctx.prefix}delsudo 923XXXXXXXXX`);

    const sudo = list();
    if (!sudo.includes(number)) return ctx.reply('User is not SUDO.');
    await settings.set('SUDO', sudo.filter((u) => u !== number));
    return ctx.reply(`SUDO removed: ${number}`);
  });

cmd({ pattern: 'listsudo', alias: ['sudolist', 'getsudo'], desc: 'Show SUDO users', category: 'owner' },
  async (sock, mek, ctx) => {
    if (!ctx.isOwner) return ctx.reply('Only the Owner can manage SUDO users.');
    const sudo = list();
    return ctx.reply(sudo.length ? `SUDO USERS\n\n${sudo.map((n, i) => `${i + 1}. ${n}`).join('\n')}` : 'No SUDO users.');
  });
