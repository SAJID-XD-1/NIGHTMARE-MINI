// NIGHTMARE style helpers - saare plugins isi ka use karte hain
const TOP = '╭━━━〔 🇦🇱 𖤐 〕━━━╮';
const BOTTOM = '╰━━━〔 𖤐 🇦🇱 〕━━━╯';

const SMALL = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
const sc = (s) => String(s).toLowerCase().replace(/[a-z]/g, (c) => SMALL[c]);
const spaced = (s) => String(s).split(' ').map((w) => w.split('').join(' ')).join('   ');

/**
 * box('DOWNLOADER', [['📌','Title','abc'], ['⏱️','Time','3:20'], '', 'free text'])
 */
function box(title, rows = [], footer = '') {
  const out = [TOP, '┃', `┃   🕷️  *${spaced(title)}*`, '┃'];
  for (const r of rows) {
    if (Array.isArray(r)) out.push(`┃   ${r[0]}  ${r[1]}${r[2] !== undefined ? ' : ' + r[2] : ''}`);
    else if (r === '') out.push('┃');
    else out.push(...String(r).split('\n').map((l) => `┃   ${l}`));
  }
  out.push('┃');
  if (footer) out.push(`┃   🖤 ${footer}`, '┃');
  out.push(BOTTOM);
  return out.join('\n');
}

// Chhota frame: mini('✅ DONE', 'text')
function mini(title, text) {
  const lines = String(text).split('\n').map((l) => `┃ ${l}`);
  return [`╭━━〔 🕷️ *${title}* 〕━━╮`, ...lines, '╰━━〔 𖤐 🇦🇱 〕━━╯'].join('\n');
}

const ok = (text) => mini('✅ ᴅᴏɴᴇ', text);
const err = (text) => mini('❌ ᴇʀʀᴏʀ', text);
const warn = (text) => mini('⚠️ ᴡᴀʀɴɪɴɢ', text);
const usage = (prefix, example, extra = '') => mini('📌 ᴜꜱᴀɢᴇ', `${prefix}${example}${extra ? '\n' + extra : ''}`);
const wait = (text = 'Thora sa intezar karein...') => mini('⏳ ᴡᴀɪᴛ', `🕸️ ${text}`);
const onOff = (v) => (String(v) === 'true' ? '✅ ON' : '❌ OFF');

const POWERED = '🇦🇱 *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪɢʜᴛᴍᴀʀᴇ* 🕸️';

module.exports = { TOP, BOTTOM, sc, spaced, box, mini, ok, err, warn, usage, wait, onOff, POWERED };
