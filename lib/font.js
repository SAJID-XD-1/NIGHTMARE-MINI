// 🕷️ NIGHTMARE global font
// Fancy alphabet QWERTY tarteeb mein hai (q w e r t y u i o p a s d f g h j k l z x c v b n m),
// isliye "normal" bhi usi tarteeb mein hona zaroori hai.
// (Purane code mein normal alphabetical tha aur 'c' ki jagah 'ᴠ' do baar tha - dono theek kiye.)
const NORMAL = 'qwertyuiopasdfghjklzxcvbnm';
const FANCY = [...'qᴡᴇʀᴛʏᴜɪᴏᴩᴀꜱᴅꜰɢʜᴊᴋʟᴢxᴄᴠʙɴᴍ'];

const WRAPPERS = '*_~`([{<"\'';   // WhatsApp formatting / brackets jo lafz se pehle aa sakte hain

// Ye tokens kabhi nahi badalte: links, @mentions, emails, paths, code, aur commands (.kick, !menu ...)
function isProtected(word, prefix) {
  if (/https?:|www\.|\/|\\|@|`/i.test(word)) return true;
  if (/\w\.(com|net|org|io|me|gg|app|link|xyz|pk|co|in)\b/i.test(word)) return true;
  if (prefix && word.startsWith(prefix) && /[a-z]/i.test(word[prefix.length] || '')) return true;
  return false;
}

function convertWord(word) {
  const chars = [...word];
  let first = 0;
  while (first < chars.length && WRAPPERS.includes(chars[first])) first++;   // *Hello* ka H pehla hai
  return chars.map((ch, i) => {
    const pos = NORMAL.indexOf(ch.toLowerCase());
    if (pos === -1) return ch;                 // numbers, emoji, symbols
    if (i === first) return ch.toUpperCase();  // har lafz ka pehla harf normal capital
    return FANCY[pos];
  }).join('');
}

function nightmareFont(text, prefix = '') {
  return String(text).replace(/\S+/g, (word) => (isProtected(word, prefix) ? word : convertWord(word)));
}

module.exports = { nightmareFont, NORMAL, FANCY };
