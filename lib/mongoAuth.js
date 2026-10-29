// WhatsApp session ko MongoDB mein rakhta hai taake Heroku restart par session ud na jaye
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { initAuthCreds, BufferJSON, proto, useMultiFileAuthState } = require('@whiskeysockets/baileys');

const SESSION_DIR = path.join(__dirname, '..', 'session');
const Auth = () =>
  mongoose.models.Auth || mongoose.model('Auth', new mongoose.Schema({ _id: String, data: String }, { versionKey: false }));

const mongoStore = {
  get: async (id) => (await Auth().findById(id).lean())?.data,
  set: async (id, data) => Auth().updateOne({ _id: id }, { data }, { upsert: true }),
  del: async (id) => Auth().deleteOne({ _id: id }),
  clear: async () => Auth().deleteMany({})
};

// store = { get(id), set(id, str), del(id) }
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

async function getAuthState() {
  if (mongoose.connection.readyState === 1) {
    console.log('💾 Session MongoDB mein save hogi (Heroku-safe).');
    return useStoreAuthState(mongoStore);
  }
  console.log('💾 Session local "session" folder mein save hogi (MongoDB connected nahi).');
  return useMultiFileAuthState(SESSION_DIR);
}

async function clearAuth() {
  try { if (mongoose.connection.readyState === 1) await mongoStore.clear(); } catch {}
  try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
}

module.exports = { getAuthState, clearAuth, useStoreAuthState };
