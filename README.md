# NIGHTMARE-MINI 🇦🇱🕷️ v3.2
Developer: **SAJID ALI** • WhatsApp bot (Baileys) • MongoDB session • pairing website

## Multi-number
Ek hi app mein kai WhatsApp numbers pair ho sakte hain (pairing website par har number apna code leta hai).
- Har number ka **alag data**: settings, prefix, SUDO, AFK, filters, warns, groups ki settings sab alag.
- Har number ka owner wo number khud hai (purane bot ka owner wahi rehta hai jo pehle tha).
- `MAX_SESSIONS` (default 5) limit rakhta hai. Har number ~50-80MB RAM leta hai, Basic dyno (512MB) par 5 theek hain.
- `.logout confirm` us number ko unlink karke uska saara data delete kar deta hai.
- `/api/sessions` connected numbers (masked) dikhata hai.

## Access
Sirf **Owner** aur **SUDO** commands chala sakte hain (public/private mode nahi hai).
- Owner = `OWNER_NUMBER` ya bot ka paired account
- `.addsudo 923XXXXXXXXX` • `.delsudo 923XXXXXXXXX` • `.listsudo` (sirf Owner)
- Group commands par group-admin check pehle ki tarah rehta hai
- Anti-link, anti-word, AFK jaise watchers normal members par bhi chalte hain

## Font
Har response par global NIGHTMARE font (`lib/font.js`, `lib/fontwrap.js`). User ka apna text, AI jawab, forward aur status exempt hain:
`reply(text, { noFont: true })` ya `sock.sendMessage(jid, content, { noFont: true })`.

## Chalane ka tareeqa
1. `npm install`  2. `.env.example` → `.env` (`MONGODB_URI`, `OWNER_NUMBER`)  3. `npm start` → `http://localhost:8000` → pairing code

## Heroku
Config Vars: `MONGODB_URI`, `OWNER_NUMBER` (+ optional `OWNER_NAME`, `PREFIX`, `TIMEZONE`, `SUDO`, `MENU_IMAGE`, AI keys). Dyno **Basic**.
Session / settings / SUDO MongoDB mein save hote hain. Update: naye files GitHub par push → Deploy Branch.

## Naya plugin
`plugins/_template.js` copy karein. Sirf `cmd()` / `onMessage()` (`../nightmare`) use karein.

## Commands
- **ai** (7): `ai` `dall` `gemini` `gpt` `groq` `lydia` `or`
- **download** (6): `apk` `fb` `igdl` `play` `tiktok` `video`
- **fun** (4): `dice` `flip` `joke` `say`
- **game** (1): `tictactoe`
- **general** (9): `afk` `alive` `font` `help` `list` `menu` `owner` `ping` `runtime`
- **group** (31): `acceptall` `add` `admincheck` `common` `demote` `end` `ginfo` `goodbye` `gpp` `groupinfo` `hidetag` `inactive` `invite` `join` `kick` `kickall` `leave` `msgs` `mute` `poll` `promote` `rejectall` `removeadmins` `requestlist` `reset` `revoke` `tag` `tagall` `timemute` `unmute` `welcome`
- **media** (19): `avec` `avm` `bass` `black` `compress` `crop` `cut` `histo` `low` `merge` `mp3` `photo` `pitch` `reverse` `rotate` `treble` `trim` `vector` `voice`
- **owner** (14): `addsudo` `autobio` `delschedule` `delsudo` `gcss` `getschedule` `gstatus` `listsudo` `restart` `save` `setschedule` `setstatus` `unblock` `vv`
- **personal** (14): `delcmd` `delgreet` `filter` `getcmd` `getgreet` `gfilter` `gstop` `mention` `pfilter` `pstop` `setcmd` `setgreet` `stop` `tog`
- **search** (2): `ison` `yts`
- **security** (13): `amute` `antibad` `antifake` `antigm` `antigstatus` `antilink` `antimod` `antispam` `antiword` `aunmute` `pdm` `slink` `warn`
- **settings** (9): `anticall` `antidelete` `autoread` `autorecording` `autostatuslike` `autostatusseen` `autotyping` `setprefix` `settings`
- **sticker** (2): `attp` `sticker`
- **tools** (14): `calc` `delbudget` `expense` `income` `online` `qr` `reminder` `screenshot` `summary` `task` `time` `trt` `tts` `weather`
- **user** (7): `block` `fullpp` `gjid` `jid` `left` `pp` `whois`
- **whatsapp** (9): `antiedit` `call` `clear` `delete` `dlt` `forward` `react` `read` `status`
