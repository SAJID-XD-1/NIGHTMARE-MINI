// Naya plugin banane ke liye is file ko copy karein (underscore wali files load nahi hoti).
// Apni file ka naam kuch aur rakhein, jaise: hello.js
const { cmd } = require('../nightmare');
const { box, ok, err, usage } = require('../lib/style');

cmd(
  {
    pattern: 'hello',          // command ka naam  -> .hello
    alias: ['hi'],             // dusre naam       -> .hi
    desc: 'Salam karta hai',   // menu mein dikhega
    category: 'fun',           // menu category
    react: '👋'                // optional reaction
    // owner: true,            // sirf owner
    // group: true,            // sirf group
    // admin: true,            // sirf group admin
    // botAdmin: true,         // bot admin ho to hi chale
    // hidden: true            // menu mein na dikhe
  },
  async (sock, mek, m, { from, sender, number, pushname, args, q, quoted, reply, react, isGroup, isOwner, prefix }) => {
    if (!q) return reply(usage(prefix, 'hello apna naam'));
    await reply(box('ʜᴇʟʟᴏ', [['👋', 'Salam', pushname], ['🖤', 'Aapne likha', q]]));
  }
);
