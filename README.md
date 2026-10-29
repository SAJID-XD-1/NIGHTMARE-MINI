# NIGHTMARE-MINI 🕷️ v2.0

## 1) Local PC par chalana
1. `npm install`
2. `.env.example` ko copy karke `.env` banayein, `MONGODB_URI` aur `OWNER_NUMBER` bharein
3. `npm start` → browser mein `http://localhost:8000` kholein → number likhein → pairing code lein
4. WhatsApp > Linked Devices > Link with phone number > code daalein

## 2) Heroku par deploy (GitHub se)
1. **MongoDB Atlas**: free cluster banayein → Database Access mein user+password → Network Access mein `0.0.0.0/0` allow → "Connect > Drivers" se connection string copy karein.
2. Code GitHub par daalein (private repo). `.env`, `session/` aur `node_modules/` upload NA karein (`.gitignore` mein pehle se hain).
3. Heroku Dashboard → New → Create new app → Deploy tab → GitHub connect → repo select → **Deploy Branch**.
4. Settings → **Config Vars** mein ye daalein:
   - `MONGODB_URI` = Atlas wali string
   - `OWNER_NUMBER` = 923xxxxxxxxx
   - (optional) `OWNER_NAME`, `BOT_NAME`, `PREFIX`, `MODE`
5. Resources tab → dyno type **Basic** (Eco 30 min baad so jata hai aur bot offline ho jata hai).
6. "Open app" dabayein → pairing website khulegi → number daalein → code WhatsApp mein daalein.
7. Logs: Dashboard → More → View logs (ya `heroku logs --tail`).

Session aur settings MongoDB mein save hoti hain, isliye Heroku restart par bot logout nahi hota.

## Naya plugin
`plugins/_template.js` copy karein, naya naam dein. Style helpers: `lib/style.js` (`box`, `mini`, `ok`, `err`, `usage`).
Flags: `owner`, `group`, `admin`, `botAdmin`, `hidden`.
Har message par chalne wala hook: `onMessage(async (sock, msg, ctx) => { ... return true /* rok do */ })`.
