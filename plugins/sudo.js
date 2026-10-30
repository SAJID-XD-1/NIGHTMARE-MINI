const { cmd } = require('../nightmare');
const { set } = require('../lib/settings');
const { nightmareFont } = require('../lib/font');
const config = require('../config');

const getSudo = () =>
    (config.SUDO_USERS || []).map(n => String(n).replace(/\D/g, ''));

const ownerOnly = (ctx) => {
    if (!ctx.isOwner) {
        ctx.reply(
            nightmareFont('Only Owner Can Manage SUDO Users')
        );
        return false;
    }

    return true;
};

// ADD SUDO
cmd({
    pattern: 'addsudo',
    desc: 'Add sudo user',
    category: 'owner'
}, async (sock, mek, ctx) => {

    if (!ownerOnly(ctx)) return;

    const number = ctx.q.replace(/\D/g, '');

    if (!number || number.length < 8 || number.length > 15) {
        return ctx.reply(
            nightmareFont('Use: .addsudo 923XXXXXXXXX')
        );
    }

    if (number === String(config.OWNER_NUMBER).replace(/\D/g, '')) {
        return ctx.reply(
            nightmareFont('Owner Already Has Full Access')
        );
    }

    const users = getSudo();

    if (users.includes(number)) {
        return ctx.reply(
            nightmareFont('User Already Exists In SUDO')
        );
    }

    users.push(number);

    await set('SUDO_USERS', users);

    return ctx.reply(
        nightmareFont(
            `SUDO Added Successfully\nNumber: ${number}`
        )
    );
});

// DELETE SUDO
cmd({
    pattern: 'delsudo',
    desc: 'Remove sudo user',
    category: 'owner'
}, async (sock, mek, ctx) => {

    if (!ownerOnly(ctx)) return;

    const number = ctx.q.replace(/\D/g, '');

    if (!number) {
        return ctx.reply(
            nightmareFont('Use: .delsudo 923XXXXXXXXX')
        );
    }

    const users = getSudo();

    if (!users.includes(number)) {
        return ctx.reply(
            nightmareFont('SUDO User Not Found')
        );
    }

    await set(
        'SUDO_USERS',
        users.filter(user => user !== number)
    );

    return ctx.reply(
        nightmareFont(
            `SUDO Removed Successfully\nNumber: ${number}`
        )
    );
});

// LIST SUDO
cmd({
    pattern: 'listsudo',
    desc: 'Show sudo users',
    category: 'owner'
}, async (sock, mek, ctx) => {

    if (!ownerOnly(ctx)) return;

    const users = getSudo();

    if (!users.length) {
        return ctx.reply(
            nightmareFont('No SUDO Users Found')
        );
    }

    const list = users
        .map((number, index) => `${index + 1}. ${number}`)
        .join('\n');

    return ctx.reply(
        nightmareFont(
            `🇦🇱 NIGHTMARE 🕸️

SUDO USERS

${list}`
        )
    );
});
