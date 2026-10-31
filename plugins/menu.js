// 🕷️ MENU - simple spider style (registered commands khud list hoti hain)
const { cmd, commands } = require('../nightmare');
const config = require('../config');
const { nightmareFont } = require('../lib/font');

const ORDER = ['GENERAL', 'GROUP', 'DOWNLOAD'];
const visible = () => commands.filter((c) => !c.hidden && !c.pattern.startsWith('_'));

function grouped() {
  const g = {};
  for (const c of visible()) (g[c.category] ||= []).push(c.pattern);
  for (const k of Object.keys(g)) g[k].sort();
  const rank = (k) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);
  return Object.entries(g).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

// Label font mein, command ke naam bilkul normal (taake type karne mein confusion na ho)
const F = (t) => nightmareFont(t);
const row = (label, value) => `${F(label)}${' '.repeat(8 - label.length)} : ${value}`;

cmd({ pattern: 'menu', alias: ['allmenu', 'commands'], desc: 'Show all commands', category: 'general' },
  async (sock, mek, ctx) => {
    const want = (ctx.args[0] || '').toUpperCase();
    let cats = grouped();
    if (want) {
      cats = cats.filter(([k]) => k === want);
      if (!cats.length) return ctx.reply(`${F('Category not found.')}\n\n${grouped().map(([k]) => `- ${k.toLowerCase()}`).join('\n')}`, { noFont: true });
    }

    let text = `${F('NIGHTMARE')} 🇦🇱 🕸️\n\n`;
    if (!want) {
      text += [
        row('User', ctx.pushname),
        row('Mode', 'Owner & Sudo'),
        row('Prefix', config.PREFIX),
        row('Commands', visible().length)
      ].join('\n') + '\n\n';
    }
    for (const [k, list] of cats) text += `${F(k)}\n${list.map((n) => `- ${n}`).join('\n')}\n\n`;
    text += `🇦🇱 ${F('POWERED BY NIGHTMARE')}`;

    if (config.MENU_IMAGE) {
      try { return await sock.sendMessage(ctx.from, { image: { url: config.MENU_IMAGE }, caption: text }, { quoted: mek, noFont: true }); }
      catch { /* image na chale to text */ }
    }
    return ctx.reply(text, { noFont: true });
  });

cmd({ pattern: 'list', alias: ['categories', 'cats'], desc: 'Show command categories', category: 'general' },
  async (sock, mek, ctx) => {
    const lines = grouped().map(([k, l]) => `- ${k.toLowerCase()} (${l.length})`);
    return ctx.reply(`${F('NIGHTMARE')} 🇦🇱 🕸️\n\n${F('Categories')}\n${lines.join('\n')}\n\n${F('Use')} ${config.PREFIX}menu <category>`, { noFont: true });
  });

cmd({ pattern: 'help', alias: ['cmdinfo'], desc: 'Help for one command', category: 'general' },
  async (sock, mek, ctx) => {
    const name = (ctx.args[0] || '').toLowerCase().replace(config.PREFIX, '');
    if (!name) return ctx.reply(`${F('Usage')} : ${config.PREFIX}help <command>`, { noFont: true });
    const c = commands.find((x) => x.pattern === name || x.alias.includes(name));
    if (!c) return ctx.reply(F('Command not found.'), { noFont: true });
    const access = c.owner ? 'Owner & Sudo' : c.admin ? 'Group Admin' : c.group ? 'Group only' : 'Owner & Sudo';
    return ctx.reply([
      `${F('NIGHTMARE')} 🇦🇱 🕸️`, '',
      `${F('Command')} : ${config.PREFIX}${c.pattern}`,
      `${F('Info')}    : ${c.desc || '-'}`,
      `${F('Alias')}   : ${c.alias.length ? c.alias.map((a) => config.PREFIX + a).join(' ') : '-'}`,
      `${F('Access')}  : ${access}`
    ].join('\n'), { noFont: true });
  });
