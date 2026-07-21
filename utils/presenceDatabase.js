const db = require("../database/database");

function getUser(discordId) {

    return db.prepare(`
        SELECT *
        FROM presence_logs
        WHERE discordId = ?
    `).get(discordId);

}

function saveUser(discordId, robloxId) {

    db.prepare(`
        INSERT OR IGNORE INTO presence_logs
        (
            discordId,
            robloxId
        )
        VALUES (?, ?)
    `).run(
        discordId,
        robloxId
    );

}

function setStatus(
    discordId,
    status,
    joinMessageId = null
) {

    db.prepare(`
        UPDATE presence_logs
        SET
            status = ?,
            joinMessageId = ?,
            lastChange = ?
        WHERE discordId = ?
    `).run(
        status,
        joinMessageId,
        Date.now(),
        discordId
    );

}

module.exports = {

    getUser,
    saveUser,
    setStatus

};