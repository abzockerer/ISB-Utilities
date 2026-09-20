const db = require("../database/database");

function addWarning(userId, reason, moderatorId) {
    db.prepare(`
        INSERT INTO warnings (
            userId,
            reason,
            moderatorId,
            createdAt
        )
        VALUES (?, ?, ?, ?)
    `).run(
        userId,
        reason,
        moderatorId,
        Date.now()
    );
}

function getWarnings(userId) {
    return db.prepare(`
        SELECT *
        FROM warnings
        WHERE userId = ?
        ORDER BY id ASC
    `).all(userId);
}

function getWarningCount(userId) {
    const result = db.prepare(`
        SELECT COUNT(*) AS count
        FROM warnings
        WHERE userId = ?
    `).get(userId);

    return result.count;
}

function removeWarnings(userId) {
    db.prepare(`
        DELETE FROM warnings
        WHERE userId = ?
    `).run(userId);
}

module.exports = {
    addWarning,
    getWarnings,
    getWarningCount,
    removeWarnings
};