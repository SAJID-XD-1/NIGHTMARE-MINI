// WhatsApp sessions ka storage - HAR NUMBER ALAG. MongoDB mein "<number>:<key>", DB na ho to session/<number>/ folder.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');

const SESSION_DIR = path.join(__dirname, '..', 'session');
const digits = (v = '') => String(v).split('@')[0].split(':')[0].replace(/\D/g, '');
const useDB = () => mongoose.connection.readyState === 1;

const Auth = () =>
  mongoose.models.Auth || mongoose.model('Auth', new mongoose.Schema({ _id: String, data: String }, { versionKey: false }));

/* ---------------- Storage backends (ek number ke liye) ---------------- */
// backend = { get(key), set(key,str), del(key), clear(), has(key) }
function mongoBackend(sid) {
  const id = (k) => `${sid}:${k}`;
  return {
    get: async (k) => (await Auth().findById(id(k)).lean())?.data,
    set: async (k, data) => Auth().updateOne({ _id: id(k) }, { data }, { upsert: true }),
    del: async (k) => Auth().deleteOne({ _id: id(k) }),
    has: async (k) => !!(await Auth().exists({ _id: id(k) })),
    clear: async () => Auth().deleteMany({ _id: { $regex: `^${sid}:` } })
  };
}

function fileBackend(sid) {
  const dir = path.join(SESSION_DIR, sid);
  const file = (k) => path.join(dir, `${String(k).replace(/\//g, '__').replace(/:/g, '-')}.json`);
  return {
    get: async (k) => (fs.existsSync(file(k)) ? fs.readFileSync(file(k), 'utf8') : undefined),
    set: async (k, data) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file(k), data); },
    del: async (k) => fs.rmSync(file(k), { force: true }),
    has: async (k) => fs.existsSync(file(k)),
    clear: async () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

const backendFor = (sid) => (useDB() ? mongoBackend(sid) : fileBackend(sid));

/* ---------------- Baileys auth state ---------------- */
async function useStoreAuthState(store) {
  const read = async (id) => {
    const s = await store.get(id);
    return s ? JSON.parse(s, BufferJSON.reviver) : null;
  };
  const write = (id, value) => store.set(id, JSON.stringify(value, BufferJSON.replacer));

  const creds = (await read('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let v = await read(`${type}-${id}`);
            if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v);
            data[id] = v;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const cat in data)
            for (const id in data[cat]) {
              const v = data[cat][id];
              tasks.push(v ? write(`${cat}-${id}`, v) : store.del(`${cat}-${id}`));
            }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => write('creds', creds)
  };
}

const getAuthState = (sid) => useStoreAuthState(backendFor(sid));
const clearAuth = (sid) => backendFor(sid).clear();

/* ---------------- Sessions ki list ---------------- */
async function listSessionIds() {
  const ids = new Set();
  if (useDB()) {
    const docs = await Auth().find({ _id: { $regex: ':creds$' } }, { _id: 1 }).lean();
    docs.forEach((d) => ids.add(d._id.split(':')[0]));
  }
  if (fs.existsSync(SESSION_DIR)) {
    for (const f of fs.readdirSync(SESSION_DIR, { withFileTypes: true }))
      if (f.isDirectory() && fs.existsSync(path.join(SESSION_DIR, f.name, 'creds.json'))) ids.add(f.name);
  }
  return [...ids].filter((x) => /^\d{6,20}$/.test(x));
}

/* ---------------- Purani single-number session ko naye system mein le aana ---------------- */
// onAdopt(sid) callback settings migrate karne ke liye
async function migrateLegacy(onAdopt = async () => {}) {
  let credsJson = null;
  let moveLegacy = null;

  if (useDB()) {
    const legacy = await Auth().findById('creds').lean();            // purana format: id mein ':' nahi
    if (legacy?.data) {
      credsJson = legacy.data;
      moveLegacy = async (sid) => {
        const docs = await Auth().find({ _id: { $not: /:/ } }).lean();
        for (const d of docs) await Auth().updateOne({ _id: `${sid}:${d._id}` }, { data: d.data }, { upsert: true });
        await Auth().deleteMany({ _id: { $not: /:/ } });
      };
    }
  }
  if (!credsJson && fs.existsSync(path.join(SESSION_DIR, 'creds.json'))) {
    credsJson = fs.readFileSync(path.join(SESSION_DIR, 'creds.json'), 'utf8');
    moveLegacy = async (sid) => {
      const dest = path.join(SESSION_DIR, sid);
      fs.mkdirSync(dest, { recursive: true });
      for (const f of fs.readdirSync(SESSION_DIR, { withFileTypes: true }))
        if (f.isFile()) fs.renameSync(path.join(SESSION_DIR, f.name), path.join(dest, f.name));
    };
  }
  if (!credsJson) return null;

  let creds;
  try { creds = JSON.parse(credsJson, BufferJSON.reviver); } catch { return null; }
  const sid = digits(creds?.me?.id);
  if (!creds?.registered || !sid) {      // adhoori purani session - bekaar hai
    try { if (useDB()) await Auth().deleteMany({ _id: { $not: /:/ } }); else fs.rmSync(path.join(SESSION_DIR, 'creds.json'), { force: true }); } catch {}
    return null;
  }
  await moveLegacy(sid);
  await onAdopt(sid);
  console.log(`📦 Purani session naye system mein le aaye: ${sid}`);
  return sid;
}

module.exports = { getAuthState, clearAuth, listSessionIds, migrateLegacy, useStoreAuthState, backendFor, mongoBackend, fileBackend };
