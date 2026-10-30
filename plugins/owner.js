const { cmd } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');
const autobio = require('../lib/autobio');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, usage, onOff } = require('../lib/style');
const { nightmareFont } = require('../lib/font');

const font = (text) => nightmareFont(text);

cmd({
pattern: 'owner',
alias: ['creator'],
desc: 'Bot owner ki info',
category: 'general',
react: '👑'
}, async (sock, mek, m, { from, reply }) => {

const vcard =
    'BEGIN:VCARD\nVERSION:3.0\n' +
    `FN:${config.OWNER_NAME}\n` +
    `TEL;type=CELL;waid=${config.OWNER_NUMBER}:+${config.OWNER_NUMBER}\n` +
    'END:VCARD';

await reply(font(box('ᴏᴡɴᴇʀ', [
    ['👑', 'Name', config.OWNER_NAME],
    ['📞', 'Number', `+${config.OWNER_NUMBER}`],
    ['🇦🇱', 'Bot', config.BOT_NAME]
])));

await sock.sendMessage(from, {
    contacts: {
        displayName: config.OWNER_NAME,
        contacts: [{ vcard }]
    }
}, { quoted: mek });

});

cmd({
pattern: 'restart',
desc: 'Bot restart karein',
category: 'owner',
react: '♻️'
}, async (sock, mek, m, { reply }) => {

await reply(font(ok('Restarting... Heroku khud dobara start kar dega.')));

setTimeout(() => process.exit(0), 1000);

});

cmd({
pattern: 'vv',
alias: ['viewonce'],
desc: 'View-once media dobara dekhein',
category: 'owner',
react: '🥀'
}, async (sock, mek, m, { from, quoted, reply, prefix }) => {

if (!quoted) {
    return reply(font(usage(
        prefix,
        'vv',
        'Kisi view-once photo/video/audio ko reply karein.'
    )));
}

const media = await downloadFromMessage(quoted.message);

if (!media) {
    return reply(font(err('Ye media support nahi hota.')));
}

const content = {
    image: {
        image: media.buffer,
        caption: media.content.caption || ''
    },
    video: {
        video: media.buffer,
        caption: media.content.caption || ''
    },
    audio: {
        audio: media.buffer,
        mimetype: 'audio/mp4',
        ptt: false
    }
}[media.type];

if (!content) {
    return reply(font(err('Sirf image / video / audio support hai.')));
}

await sock.sendMessage(from, content, { quoted: mek });

});

cmd({
pattern: 'save',
alias: ['send', 'sendme'],
desc: 'Status / media apne inbox mein save karein',
category: 'owner',
react: '📤'
}, async (sock, mek, m, { quoted, reply }) => {

if (!quoted) {
    return reply(font(usage(
        config.PREFIX,
        'save',
        'Kisi status ya media ko reply karein.'
    )));
}

const media = await downloadFromMessage(quoted.message);

if (!media) {
    return reply(font(err('Is message mein koi media nahi mila.')));
}

const me = `${config.OWNER_NUMBER}@s.whatsapp.net`;

const caption = media.content.caption || 'Saved by NIGHTMARE-MINI';

const content = {
    image: {
        image: media.buffer,
        caption
    },
    video: {
        video: media.buffer,
        caption
    },
    audio: {
        audio: media.buffer,
        mimetype: 'audio/mp4'
    },
    sticker: {
        sticker: media.buffer
    },
    document: {
        document: media.buffer,
        mimetype: media.content.mimetype,
        fileName: media.content.fileName || 'file'
    }
}[media.type];

if (!content) {
    return reply(font(err('Ye media type support nahi hota.')));
}

await sock.sendMessage(me, content);

await reply(font(ok('Aapke inbox mein bhej diya.')));

});

cmd({
pattern: 'unblock',
alias: ['unb'],
desc: 'User ko unblock karein',
category: 'owner',
react: '🥰'
}, async (sock, mek, m, { from, quotedParticipant, reply }) => {

const jid = quotedParticipant ||
    (from.endsWith('@s.whatsapp.net') ? from : null);

if (!jid) {
    return reply(font(err(
        'Kisi message ko reply karein ya inbox mein likhein.'
    )));
}

await sock.updateBlockStatus(jid, 'unblock');

await sock.sendMessage(from, {
    text: font(ok(`@${jid.split('@')[0]} ko unblock kar diya.`)),
    mentions: [jid]
}, { quoted: mek });

});

cmd({
pattern: 'autobio',
alias: ['bioauto'],
desc: 'Auto bio on/off',
category: 'owner',
react: '😎'
}, async (sock, mek, m, { q, reply, prefix }) => {

const v = q.toLowerCase();

if (!['on', 'off'].includes(v)) {
    return reply(font(usage(
        prefix,
        'autobio on | off',
        `Abhi: ${onOff(config.AUTO_BIO)}`
    )));
}

await settings.set('AUTO_BIO', v === 'on' ? 'true' : 'false');

if (v === 'on') {
    autobio.start(sock);
} else {
    autobio.stop();
}

await reply(font(ok(`Auto bio ab ${onOff(config.AUTO_BIO)} hai.`)));

});

cmd({
pattern: 'gstatus',
alias: ['groupstatus', 'poststatus'],
desc: 'WhatsApp status post karein',
category: 'owner',
react: '📡'
}, async (sock, mek, m, {
q,
quoted,
pushname,
reply,
isGroup,
getGroupMetadata,
prefix
}) => {

const me = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';

let audience = [
    me,
    `${config.OWNER_NUMBER}@s.whatsapp.net`
];

if (isGroup) {
    audience = [
        ...new Set([
            ...audience,
            ...(await getGroupMetadata()).participants.map(p => p.id)
        ])
    ];
}

const opts = { statusJidList: audience };

if (!quoted) {
    if (!q) {
        return reply(font(usage(
            prefix,
            'gstatus Hello world',
            'Ya kisi image/video ko reply karein.'
        )));
    }

    await sock.sendMessage('status@broadcast', {
        text: font(q),
        backgroundColor: '#000000',
        font: 2
    }, opts);

    return reply(font(ok('Text status post ho gaya.')));
}

const media = await downloadFromMessage(quoted.message);

if (!media) {
    return reply(font(err('Sirf image/video/audio reply karein.')));
}

const caption = font(q || media.content.caption || `🕷️ ${pushname}`);

const content = {
    image: {
        image: media.buffer,
        caption
    },
    video: {
        video: media.buffer,
        caption
    },
    audio: {
        audio: media.buffer,
        mimetype: 'audio/mp4',
        ptt: false
    }
}[media.type];

if (!content) {
    return reply(font(err('Ye media status ke liye support nahi hota.')));
}

await sock.sendMessage('status@broadcast', content, opts);

await reply(font(ok('Status post ho gaya.')));

});
