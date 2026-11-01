// 🕷️ Multi-number manager: ek server par kai WhatsApp numbers, har ka alag data.
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const config = require('../config');
const { als } = require('./context');
const connectDB = require('./database');
const settings = require('./settings');
const autobio = require('./autobio');
const cron = require('./cron');
const antidelete = require('./antidelete');
const { groupEvents } = require('./groupevents');
const { installFont } = require('./fontwrap');
const { handleMessage } = require('./handler');
const { getAuthState, clearAuth, listSessionIds, migrateLegacy } = require('./mongoAuth');
const { commands } = require('../nightmare');

const sessions = new Map();   // number -> session
const digits = (v = '') => String(v).replace(/\D/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mask = (n) => (n.length > 6 ? `${n.slice(0, 4)}****${n.slice(-2)}` : '****');

let cachedVersion = null;
let versionAt = 0;
async function waVersion() {
  if (cachedVersion && Date.now() - versionAt < 30 * 60 * 1000) return cachedVersion;
  try {
    ({ version: cachedVersion } = await fetchLatestBaileysVersion());
    versionAt = Date.now();
  } catch {
    console.log('⚠️ Latest WA version fetch fail hua, default version use ho raha hai.');
  }
  return cachedVersion;
}

function newSession(id) {
  return {
    id, sock: null, status: 'starting', ready: false, starting: false, stopped: false, wantPair: false, retries: 0,
    pairTimer: null,
    // Is number ka apna config: owner = ye number khud. (.settings / .setprefix / .addsudo sab yahin save hote hain)
    config: { OWNER_NUMBER: id, OWNER_NAME: id, SUDO: [] }
  };
}

const inCtx = (session, fn) => (...args) => als.run(session, () => fn(...args));

/* ---------------- Ek session start karna ---------------- */
async function start(session) {
  if (session.starting || session.stopped) return;
  session.starting = true;
  session.ready = false;

  await als.run(session, async () => {
    try {
      await connectDB();
      await settings.load();

      const { state, saveCreds } = await getAuthState(session.id);
      if (!state.creds.registered && !session.wantPair) {
        console.log(`🧹 [${mask(session.id)}] adhoori session thi, hata di.`);
        return await remove(session.id);
      }

      const version = await waVersion();
      const s = makeWASocket({
        ...(version ? { version } : {}),
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.macOS('Chrome')
      });
      installFont(s);   // har response par NIGHTMARE font
      session.sock = s;
      session.status = 'connecting';

      s.ev.on('creds.update', saveCreds);

      // Naye (unregistered) number ke liye 4 sec baad pairing ready maan lo
      if (!state.creds.registered) setTimeout(() => { if (session.sock === s) session.ready = true; }, 4000);

      s.ev.on('connection.update', inCtx(session, async ({ connection, lastDisconnect, qr }) => {
        if (qr) session.ready = true;

        if (connection === 'close') {
          session.status = 'closed';
          session.ready = false;
          cron.detach(session);
          autobio.stop();
          if (session.stopped) return;

          const code = lastDisconnect?.error?.output?.statusCode;
          console.log(`🔌 [${mask(session.id)}] connection closed (code: ${code})`);

          if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
            console.log(`🗑️ [${mask(session.id)}] session invalid / logout — hata raha hoon.`);
            return await remove(session.id, { wipeSettings: false });
          }
          session.retries += 1;
          setTimeout(() => start(session), Math.min(3000 * session.retries, 30000));
        } else if (connection === 'open') {
          session.status = 'open';
          session.retries = 0;
          clearTimeout(session.pairTimer);
          console.log(`\n✅ [${mask(session.id)}] WhatsApp Bot Successfully Connected! 🇦🇱🕷️\n`);

          // Owner ka naam: agar settings mein set nahi to WhatsApp profile ka naam
          if (config.OWNER_NAME === session.id && s.user?.name) session.config.OWNER_NAME = s.user.name;
          if (config.AUTO_BIO === 'true') autobio.start(s);
          cron.attach(session);

          const botNumber = (s.user?.id || '').split(':')[0];
          const botJid = `${botNumber}@s.whatsapp.net`;

          s.sendMessage(botJid, {
            text: `×̥°〔 Bᴏᴛ Cᴏɴɴᴇᴄᴛᴇᴅ〕°×̥*
                    
   *᭝⌯* ָ࣪ —  Bᴏᴛ Nᴀᴍᴇ  *:* *NIGHTMARE MINI 🇦🇱🕷️*
   *᭝⌯* ָ࣪ —   Pʀᴇꜰɪx        *:* ${config.PREFIX}
   *᭝⌯* ָ࣪ —  Cᴏᴍᴍᴀɴᴅꜱ *:* ${commands.length}
   
  ᭝⌯ ָ࣪Pᴏᴡᴇʀᴅ ʙʏ *:* *SAJID ALI*
                    *¯͞⎻⼼͞⎽᚛💀᚜⎽͞⼼͞*`
          }, { noFont: true }).catch(() => {});
        }
      }));

      s.ev.on('call', inCtx(session, async (calls) => {
        if (config.ANTI_CALL !== 'true') return;
        for (const call of calls) {
          if (call.status !== 'offer') continue;
          await s.rejectCall(call.id, call.from).catch(() => {});
          await s.sendMessage(call.from, { text: '🕷️ Calls allowed nahi hain. Message kar dein. 🖤' }).catch(() => {});
        }
      }));

      s.ev.on('messages.update', inCtx(session, (updates) => {
        for (const { key, update } of updates || []) {
          const edited = update?.message?.editedMessage?.message;
          if (edited) antidelete.onEdit(s, key, edited).catch(() => {});
        }
      }));

      s.ev.on('group-participants.update', inCtx(session, (u) =>
        groupEvents(s, u).catch((e) => console.error('groupEvents:', e.message))));

      s.ev.on('messages.upsert', inCtx(session, async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
          try { await handleMessage(s, msg); }
          catch (e) { console.error('❌ Handler error:', e); }
        }
      }));
    } catch (e) {
      console.error(`❌ [${mask(session.id)}] start error:`, e.message);
      if (!session.stopped) setTimeout(() => start(session), 5000);
    } finally {
      session.starting = false;
    }
  });
}

/* ---------------- Session hatana ---------------- */
async function remove(id, { wipeSettings = true } = {}) {
  const session = sessions.get(id);
  if (session) {
    session.stopped = true;
    clearTimeout(session.pairTimer);
    cron.detach(session);
    try { await als.run(session, () => autobio.stop()); } catch {}
    try { session.sock?.ev.removeAllListeners(); session.sock?.ws?.close(); } catch {}
    sessions.delete(id);
  }
  await clearAuth(id).catch(() => {});
  if (wipeSettings) await settings.wipe(id);
}

// .logout: WhatsApp se unlink + is number ka saara data delete
async function logout(id) {
  const session = sessions.get(id);
  try { await session?.sock?.logout(); } catch {}
  await remove(id, { wipeSettings: true });
}

/* ---------------- Pairing (website se) ---------------- */
async function requestPairing(phone) {
  const id = digits(phone);
  if (id.length < 8 || id.length > 15) throw new Error('Number galat hai. Country code ke saath likhein (jaise 923001234567).');

  const existing = sessions.get(id);
  if (existing?.sock?.authState?.creds?.registered) throw new Error('Ye number pehle se connected hai. Dobara link karna ho to bot par .logout confirm likhein.');
  if (!existing && sessions.size >= config.base.MAX_SESSIONS)
    throw new Error(`Server full hai (max ${config.base.MAX_SESSIONS} numbers). Baad mein try karein.`);
  if (existing) await remove(id, { wipeSettings: false });   // pichli adhoori koshish saaf

  const session = newSession(id);
  session.wantPair = true;
  sessions.set(id, session);
  start(session);

  for (let i = 0; i < 20 && !session.ready && !session.stopped; i++) await sleep(1000);
  if (!session.ready || !session.sock) {
    await remove(id, { wipeSettings: false });
    throw new Error('WhatsApp connection nahi ban raha. Thori der baad dobara try karein.');
  }

  let raw;
  try { raw = await session.sock.requestPairingCode(id); }
  catch (e) { await remove(id, { wipeSettings: false }); throw new Error(`Code nahi ban saka: ${e.message}`); }

  // 4 minute mein link na hua to adhoori session hata do
  session.pairTimer = setTimeout(() => {
    if (!session.sock?.authState?.creds?.registered) remove(id, { wipeSettings: false });
  }, 4 * 60 * 1000);

  console.log(`🔑 [${mask(id)}] pairing code generated`);
  return raw.match(/.{1,4}/g)?.join('-') || raw;
}

/* ---------------- Server start par saare saved numbers chalana ---------------- */
async function bootAll() {
  await connectDB();

  await migrateLegacy(async (sid) => {
    await settings.migrateLegacy(sid, {
      OWNER_NUMBER: config.base.OWNER_NUMBER,    // purane bot ka owner wahi rahe jo pehle tha
      OWNER_NAME: config.base.OWNER_NAME,
      SUDO: config.base.SUDO
    });
  });

  const ids = await listSessionIds();
  console.log(`📱 Saved numbers: ${ids.length}`);
  for (const id of ids) {
    if (sessions.has(id)) continue;
    const session = newSession(id);
    sessions.set(id, session);
    start(session);
    await sleep(1500);    // ek ek karke (RAM spike na ho)
  }
}

const list = () => [...sessions.values()].map((s) => ({ number: mask(s.id), status: s.status }));
const get = (id) => sessions.get(id);

module.exports = { bootAll, requestPairing, remove, logout, list, get, sessions, mask };
