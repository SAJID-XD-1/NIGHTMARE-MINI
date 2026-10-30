const { cmd, onMessage } = require('../nightmare');
const settings = require('../lib/settings');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/*
━━━━━━━━━━━━━━━━━━━━━━━━
 NIGHTMARE AUTO GROUP JOIN
━━━━━━━━━━━━━━━━━━━━━━━━
.autogc on
.autogc off
━━━━━━━━━━━━━━━━━━━━━━━━
*/

// AUTO JOIN SETTINGS
cmd({
    pattern: 'autogc',
    desc: 'Enable or disable automatic group joining',
    type: 'tools'
}, async (sock, mek, m, ctx) => {

    const input = (ctx.q || '').trim().toLowerCase();

    if (!['on', 'off'].includes(input)) {
        return ctx.reply(
            '*AUTO GROUP JOIN*\n\n' +
            '.autogc on\n' +
            '.autogc off'
        );
    }

    const status = input === 'on';

    await settings.set('AUTO_GC_JOIN', status);

    return ctx.reply(
        status
            ? '*Auto Group Join Enabled ✅*'
            : '*Auto Group Join Disabled ❌*'
    );
});


// AUTOMATIC INVITE DETECTION
onMessage(async (sock, mek, ctx) => {

    try {
        const data = await settings.load();

        if (!data.AUTO_GC_JOIN) return;

        const text =
            ctx.body ||
            mek.message?.conversation ||
            mek.message?.extendedTextMessage?.text ||
            '';

        if (!text) return;

        const regex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/gi;
        const matches = [...text.matchAll(regex)];

        if (!matches.length) return;

        for (let i = 0; i < matches.length; i++) {

            const inviteCode = matches[i][1];

            try {
                await sock.groupAcceptInvite(inviteCode);

                await ctx.reply(
                    '*Joined Group Successfully ✅*\n\n' +
                    `Invite Code: ${inviteCode}`
                );

            } catch (err) {

                console.log('AUTO GC ERROR:', err);

                await ctx.reply(
                    '*Failed To Join Group ❌*\n\n' +
                    'Link expired, invalid, or already joined.'
                );
            }

            if (i < matches.length - 1) {
                await sleep(4000);
            }
        }

    } catch (err) {
        console.log('NIGHTMARE AUTOJOIN ERROR:', err);
    }
});
