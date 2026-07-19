function getSection(text, start, end) {

    const startIndex = text.indexOf(start);

    if (startIndex === -1) return "";

    const contentStart = startIndex + start.length;

    let endIndex = text.length;

    if (end) {
        const temp = text.indexOf(end, contentStart);

        if (temp !== -1) {
            endIndex = temp;
        }
    }

    return text.substring(contentStart, endIndex).trim();
}


function getUserIds(text) {

    const users = text.match(/<@!?(\d+)>/g);

    if (!users) return [];

    const ids = users.map(user =>
        user.replace(/[<@!>]/g, "")
    );

    // Doppelte IDs entfernen
    return [...new Set(ids)];
}


module.exports = {
    getSection,
    getUserIds
};