// Bot ke har response par font laga deta hai (sock.sendMessage ko wrap karke).
// Kisi message ko exempt karna ho (user ka apna text, AI/code, forward) to:
//   reply(text, { noFont: true })   ya   sock.sendMessage(jid, content, { quoted, noFont: true })
const config = require('../config');
const { nightmareFont } = require('./font');

function installFont(sock) {
  const original = sock.sendMessage.bind(sock);

  sock.sendMessage = (jid, content, options) => {
    const opts = { ...(options || {}) };
    let c = content;
    const skip = opts.noFont || c?.noFont || jid === 'status@broadcast';
    delete opts.noFont;

    if (c && typeof c === 'object') {
      c = { ...c };
      delete c.noFont;
      if (!skip) {
        if (typeof c.text === 'string') c.text = nightmareFont(c.text, config.PREFIX);
        if (typeof c.caption === 'string') c.caption = nightmareFont(c.caption, config.PREFIX);
      }
    }
    return original(jid, c, opts);
  };
  return sock;
}

module.exports = { installFont };
