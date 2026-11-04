// Ek session ek waqt mein sirf EK process chalaye. Do process ek hi session (same MongoDB) par chalein to
// Signal keys aapas mein ulajh jati hain -> "Bad MAC" ka toofan aur session toot jata hai.
// Heroku deploy ke dauran naya aur purana dyno kuch second saath chalte hain, ye lock unhe sambhalta hai.
const crypto = require('crypto');
const mongoose = require('mongoose');

const INSTANCE = crypto.randomBytes(6).toString('hex');
const TTL = 45 * 1000;          // itni der heartbeat na aaye to lock khaali maana jata hai
const BEAT = 15 * 1000;

const Lock = () =>
  mongoose.models.Lock || mongoose.model('Lock', new mongoose.Schema({ _id: String, owner: String, at: Number }, { versionKey: false }));

// Mongo backend. DB na ho (local file mode) to lock ki zaroorat nahi
const mongoBackend = {
  enabled: () => mongoose.connection.readyState === 1,
  async acquire(id, owner) {
    try {
      await Lock().findOneAndUpdate(
        { _id: id, $or: [{ owner }, { at: { $lt: Date.now() - TTL } }] },
        { $set: { owner, at: Date.now() } },
        { upsert: true }
      );
      return true;
    } catch (e) {
      if (e.code === 11000) return false;   // kisi aur ke paas hai
      throw e;
    }
  },
  async release(id, owner) { await Lock().deleteOne({ _id: id, owner }); }
};

let backend = mongoBackend;
const held = new Map();    // id -> heartbeat timer

async function acquire(id, { waitMs = 60000 } = {}) {
  if (!backend.enabled()) return true;
  const end = Date.now() + waitMs;
  for (;;) {
    if (await backend.acquire(id, INSTANCE)) return true;
    if (Date.now() >= end) return false;
    await new Promise((r) => setTimeout(r, Math.min(5000, Math.max(200, end - Date.now()))));
  }
}

// Heartbeat: lock apna rakhta hai. Kho jaye to onLost() chalta hai (session band kar do)
function hold(id, onLost, beat = BEAT) {
  stop(id);
  if (!backend.enabled()) return;
  const t = setInterval(async () => {
    try { if (!(await backend.acquire(id, INSTANCE))) { stop(id); onLost(); } }
    catch { /* DB ka waqti masla - agli beat par dobara */ }
  }, beat);
  t.unref?.();
  held.set(id, t);
}

function stop(id) {
  if (held.has(id)) clearInterval(held.get(id));
  held.delete(id);
}

async function release(id) {
  stop(id);
  if (backend.enabled()) await backend.release(id, INSTANCE).catch(() => {});
}

async function releaseAll() {
  await Promise.all([...held.keys()].map((id) => release(id)));
}

module.exports = { acquire, hold, release, releaseAll, INSTANCE, TTL, _setBackend: (b) => { backend = b; } };
