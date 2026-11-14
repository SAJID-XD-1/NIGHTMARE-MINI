// 🕷️ MENU - NIGHTMARE style (registered commands khud list hoti hain)
const { cmd, commands } = require('../nightmare');
const config = require('../config');

const SEP = '≪━─━─━─━─━─━─◈─━─━─━─━─━─━≫';
const HEADER = '╀●━─━─━─❴Nɪɢ֟ؖۤ۬͡ʜᴛᴍɐʀɘ𝂿🇦🇱❵━─━─━─●╀';
const SUB = '╀●─────────⤆⤇────────────●╀';
const FOOTER = '〖𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐍𝐈𝐆𝐇𝐓𝐌𝐀𝐑𝐄〗☠️🚩';
const ITEM = '┋ 𐇧 ';

const SMALL = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' };
const small = (t) => String(t).toLowerCase().replace(/[a-z]/g, (c) => SMALL[c]);
// 𝐀𝐁𝐂 (serif bold)
const boldSerif = (t) => String(t).toUpperCase().replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1d400 + c.charCodeAt(0) - 65));

const ORDER = ['GENERAL', 'GROUP', 'DOWNLOAD'];
const visible = () => commands.filter((c) => !c.hidden && !c.pattern.startsWith('_'));

function grouped() {
  const g = {};
  for (const c of visible()) (g[c.category] ||= []).push(c);
  for (const k of Object.keys(g)) g[k].sort((a, b) => a.pattern.localeCompare(b.pattern));
  const rank = (k) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);
  return Object.entries(g).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

const title = (cat) => `${' '.repeat(Math.max(2, 30 - cat.length * 2))}〖${boldSerif(cat)}〗`;

function head(user) {
  return [
    HEADER,
    `┟✥𝐔𝐒𝐄𝐑 ⫶ *${small(user)}*`,
    '',
    `┟✥𝐏𝐑𝐄𝐅𝐈𝐗 ⫶ *${config.PREFIX}*`,
    '',
    '┟✥𝐌❍𝐃𝐄 ⫶ *ᴏᴡɴᴇʀ & ꜱᴜᴅᴏ*',
    '',
    `┟✥𝐂❍𝐌𝐌𝐀𝐍𝐃𝐒 ⫶ *${visible().length}*`,
    '',
    SUB
  ].join('\n');
}

async function send(sock, ctx, mek, text) {
  if (config.MENU_IMAGE) {
    try { return await sock.sendMessage(ctx.from, { image: { url: config.MENU_IMAGE }, caption: text }, { quoted: mek, noFont: true }); }
    catch { /* image na chale to text */ }
  }
  return ctx.reply(text, { noFont: true });
}

cmd({ pattern: 'menu', alias: ['allmenu', 'commands'], desc: 'Show all commands', category: 'general' },
  async (sock, mek, ctx) => {
    const want = (ctx.args[0] || '').toUpperCase();
    let cats = grouped();

    // .menu group  -> us category ki tafseel (description ke saath)
    if (want) {
      cats = cats.filter(([k]) => k === want);
      if (!cats.length) return ctx.reply(`${small('category not found')}\n\n${grouped().map(([k]) => `${ITEM}*${small(k)}*`).join('\n')}`, { noFont: true });
      const [k, list] = cats[0];
      const out = [HEADER, title(k), SEP, ...list.map((c) => `${ITEM}*${small(c.pattern)}* ➜ ${c.desc || '-'}`), SEP, '', FOOTER];
      return ctx.reply(out.join('\n'), { noFont: true });
    }

    let text = head(ctx.pushname) + '\n';
    for (const [k, list] of cats) {
      text += `${title(k)}\n${SEP}\n${list.map((c) => `${ITEM}*${small(c.pattern)}* `).join('\n')}\n${SEP}\n`;
    }
    text += FOOTER;
    return send(sock, ctx, mek, text);
  });

cmd({ pattern: 'list', alias: ['categories', 'cats'], desc: 'Show command categories', category: 'general' },
  async (sock, mek, ctx) => {
    const lines = grouped().map(([k, l]) => `${ITEM}*${small(k)}* ⫶ ${l.length}`);
    return ctx.reply([HEADER, title('CATEGORIES'), SEP, ...lines, SEP, `${small('use')} ${config.PREFIX}menu <category>`, '', FOOTER].join('\n'), { noFont: true });
  });

cmd({ pattern: 'help', alias: ['cmdinfo'], desc: 'Help for one command', category: 'general' },
  async (sock, mek, ctx) => {
    const name = (ctx.args[0] || '').toLowerCase().replace(config.PREFIX, '');
    if (!name) return ctx.reply(`${small('usage')} ⫶ ${config.PREFIX}help <command>`, { noFont: true });
    const c = commands.find((x) => x.pattern === name || x.alias.includes(name));
    if (!c) return ctx.reply(small('command not found'), { noFont: true });
    const access = c.owner ? 'Owner & Sudo' : c.admin ? 'Group Admin' : c.group ? 'Group only' : 'Owner & Sudo';
    return ctx.reply([
      HEADER, title(c.pattern.toUpperCase()), SEP,
      `${ITEM}${small('info')} ⫶ ${c.desc || '-'}`,
      `${ITEM}${small('alias')} ⫶ ${c.alias.length ? c.alias.map((a) => config.PREFIX + a).join(' ') : '-'}`,
      `${ITEM}${small('access')} ⫶ ${access}`,
      `${ITEM}${small('use')} ⫶ ${config.PREFIX}${c.pattern}`,
      SEP, '', FOOTER
    ].join('\n'), { noFont: true });
  });
