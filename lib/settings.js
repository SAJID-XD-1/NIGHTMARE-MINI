// Settings + chhota key-value store. HAR NUMBER (session) ka apna alag store hota hai.
// MongoDB mein "settings:<number>"; DB na ho to data/settings-<number>.json
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config');
const { current } = require('./context');

const DATA_DIR = path.join(__dirname, '..', 'data');
const slots = new Map();   // sid -> { sid, store, timer }

const Model = () =>
  mongoose.models.Setting ||
  mongoose.model('Setting', new mongoose.Schema({ _id: String, json: String, data: Object }, { versionKey: false, minimize: false }));

const useDB = () => mongoose.connection.readyState === 1;
const sidNow = () => current()?.id || 'default';
const docId = (sid) => (sid === 'default' ? 'main' : `settings:${sid}`);
const fileOf = (sid) => path.join(DATA_DIR, sid === 'default' ? 'settings.json' : `settings-${sid}.json`);

function slot(sid = sidNow()) {
  let s = slots.get(sid);
  if (!s) { s = { sid, store: { global: {}, groups: {}, data: {} }, timer: null }; slots.set(sid, s); }
  return s;
}

async function load(sid = sidNow()) {
  const s = slot(sid);
  try {
    if (useDB()) {
      const d = await Model().findById(docId(sid)).lean();
      if (d?.json) s.store = JSON.parse(d.json);
      else if (d?.data) s.store = d.data;      // purana format
    } else if (fs.existsSync(fileOf(sid))) {
      s.store = JSON.parse(fs.readFileSync(fileOf(sid), 'utf8'));
    }
  } catch (e) {
    console.error(`⚠️ Settings load error (${sid}):`, e.message);
  }
  s.store.global ||= {};
  s.store.groups ||= {};
  s.store.data ||= {};
  Object.assign(config, s.store.global);   // session ke andar ho to sirf is number ke config mein jata hai
}

async function save(sid = sidNow()) {
  const s = slot(sid);
  clearTimeout(s.timer);
  try {
    const json = JSON.stringify(s.store);
    if (useDB()) await Model().updateOne({ _id: docId(sid) }, { json, $unset: { data: 1 } }, { upsert: true });
    else {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(fileOf(sid), json);
    }
  } catch (e) {
    console.error(`⚠️ Settings save error (${sid}):`, e.message);
  }
}
const saveSoon = (sid = sidNow()) => { const s = slot(sid); clearTimeout(s.timer); s.timer = setTimeout(() => save(sid), 2500); };

async function set(key, value) {
  slot().store.global[key] = value;
  config[key] = value;
  await save();
}

const group = (jid) => slot().store.groups[jid] || {};
async function setGroup(jid, patch) {
  const s = slot();
  s.store.groups[jid] = { ...group(jid), ...patch };
  await save();
}

// Generic data (filters, warns, tasks, afk ...). Value kuch bhi JSON ho sakti hai
const getData = (key, def) => { const d = slot().store.data; return d[key] !== undefined ? d[key] : def; };
function setData(key, value) { slot().store.data[key] = value; saveSoon(); }
function delData(key) { delete slot().store.data[key]; saveSoon(); }

// Session hatate waqt: us number ka saara settings data mita do
async function wipe(sid) {
  const s = slot(sid);
  clearTimeout(s.timer);
  slots.delete(sid);
  try {
    if (useDB()) await Model().deleteOne({ _id: docId(sid) });
    else fs.rmSync(fileOf(sid), { force: true });
  } catch {}
}

// Purani (single-number) settings ko is number ke naam kar do. defaults = jo keys khaali hon wahi bharti hain
async function migrateLegacy(sid, defaults = {}) {
  let legacy = null;
  try {
    if (useDB()) {
      if (await Model().exists({ _id: docId(sid) })) { await Model().deleteOne({ _id: 'main' }); return; }
      const d = await Model().findById('main').lean();
      if (d) legacy = d.json ? JSON.parse(d.json) : d.data;
    } else if (fs.existsSync(fileOf('default')) && !fs.existsSync(fileOf(sid))) {
      legacy = JSON.parse(fs.readFileSync(fileOf('default'), 'utf8'));
    }
  } catch (e) { console.error('⚠️ Settings migrate error:', e.message); }

  const store = legacy || { global: {}, groups: {}, data: {} };
  store.global ||= {}; store.groups ||= {}; store.data ||= {};
  for (const [k, v] of Object.entries(defaults)) {
    if (store.global[k] === undefined && v !== undefined && !(Array.isArray(v) && !v.length)) store.global[k] = v;
  }
  slots.set(sid, { sid, store, timer: null });
  await save(sid);
  try { if (useDB()) await Model().deleteOne({ _id: 'main' }); else fs.rmSync(fileOf('default'), { force: true }); } catch {}
}

module.exports = { load, save, set, group, setGroup, getData, setData, delData, wipe, migrateLegacy, _slots: slots };
