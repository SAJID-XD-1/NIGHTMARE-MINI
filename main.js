const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const config = require('./config');
const connectDB = require('./lib/database');
const settings = require('./lib/settings');
const autobio = require('./lib/autobio');
const { groupEvents } = require('./lib/groupevents');
const { getAuthState, clearAuth } = require('./lib/mongoAuth');
const { handleMessage } = require('./lib/handler');
const { commands } = require('./nightmare');
const { box } = require('./lib/style');

const botEvents = new EventEmitter();

let sock = null;
let isSockReady = false;
let starting = false;

/* ---------- Plugins ---------- */
function loadPlugins() {
  const folder = path.join(__dirname, 'plugins');
  if (!fs.existsSync(folder)) return;
  for (const file of fs.readdirSync(folder)) {
    if (!file.endsWith('.js') || file.startsWith('_')) continue;
    try {
      require(path.join(folder, file));
      console.log(`🔌 Plugin loaded: ${file}`);
    } catch (e) {
      console.error(`❌ Plugin load FAILED (${file}):`, e.message);
    }
  }
  console.log(`📦 Total commands: ${commands.length}`);
}
loadPlugins();

/* ---------- Pairing (website se) ---------- */
botEvents.on('requestPairing', async (phoneNumber, callback) => {
  try {
    if (!sock) throw new Error('Bot abhi start ho raha hai, 10 second baad dobara try karein.');
    if (sock.authState.creds.registered) {
      throw new Error('Ye bot pehle se paired hai. Naya pair karna ho to "session" folder delete karke restart karein.');
    }

    for (let i = 0; i < 15 && !isSockReady; i++) await new Promise((r) => setTimeout(r, 1000));
    if (!isSockReady) throw new Error('WhatsApp connection nahi ban raha. Internet check karke server restart karein.');

    const clean = String(phoneNumber).replace(/\D/g, '');
    const raw = await sock.requestPairingCode(clean);
    const code = raw.match(/.{1,4}/g)?.join('-') || raw;
    console.log(`🔑 Pairing code generated for ${clean}`);
    callback(null, code);
  } catch (error) {
    callback(error.message || String(error));
  }
});

/* ---------- Bot ---------- */
async function startBot() {
  if (starting) return;
  starting = true;
  isSockReady = false;

  try {
    await connectDB();
    await settings.load();

    const { state, saveCreds } = await getAuthState();

    let version;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      console.log('⚠️ Latest WA version fetch fail hua, default version use ho raha hai.');
    }

    const s = makeWASocket({
      ...(version ? { version } : {}),
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.macOS('Chrome')
    });
    sock = s;

    s.ev.on('creds.update', saveCreds);

    // Naye (unregistered) session ke liye 4 sec baad pairing ready maan lo
    if (!state.creds.registered) setTimeout(() => { if (sock === s) isSockReady = true; }, 4000);

    s.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        isSockReady = true;
        console.log('📡 Socket pairing ke liye ready hai!');
      }

      if (connection === 'close') {
        isSockReady = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log(`🔌 Connection closed (code: ${code})`);

        if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
          console.log('🗑️ Session invalid hai, delete karke dobara start kar raha hoon...');
          clearAuth().finally(() => setTimeout(startBot, 3000));
          return;
        }
        setTimeout(startBot, 3000);
      } else if (connection === 'open') {
        console.log('\n✅ WhatsApp Bot Successfully Connected! 🇦🇱🕷️\n');
        if (config.AUTO_BIO === 'true') autobio.start(s);
        const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
        s.sendMessage(ownerJid, {
          text: box('ᴄᴏɴɴᴇᴄᴛᴇᴅ', [['⛧', 'Status', 'ᴏɴʟɪɴᴇ'], ['🥀', 'Bot', config.BOT_NAME], ['🖤', 'Prefix', config.PREFIX], ['📦', 'Commands', commands.length]])
        }).catch(() => {});
      }
    });

    s.ev.on('call', async (calls) => {
      if (config.ANTI_CALL !== 'true') return;
      for (const call of calls) {
        if (call.status !== 'offer') continue;
        await s.rejectCall(call.id, call.from).catch(() => {});
        await s.sendMessage(call.from, { text: '🕷️ Calls allowed nahi hain. Message kar dein. 🖤' }).catch(() => {});
      }
    });

    s.ev.on('group-participants.update', (u) => groupEvents(s, u).catch((e) => console.error('groupEvents:', e.message)));

    s.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        try { await handleMessage(s, msg); }
        catch (e) { console.error('❌ Handler error:', e); }
      }
    });
  } catch (e) {
    console.error('❌ startBot error:', e.message);
    setTimeout(startBot, 5000);
  } finally {
    starting = false;
  }
}

module.exports = { startBot, botEvents };
