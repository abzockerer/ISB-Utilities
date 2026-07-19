const db = require("../database/database");


function addHostedEvent(userId) {

    const user = db.prepare(
        "SELECT * FROM users WHERE id = ?"
    ).get(userId);


    if (!user) {

        db.prepare(`
            INSERT INTO users (id, hostedEvents, lifetimeEvents)
            VALUES (?, 1, 1)
        `).run(userId);

    } else {

        db.prepare(`
            UPDATE users
            SET
                hostedEvents = hostedEvents + 1,
                lifetimeEvents = lifetimeEvents + 1
            WHERE id = ?
        `).run(userId);

    }
}



function addAttendedEvent(userId) {

    const user = db.prepare(
        "SELECT * FROM users WHERE id = ?"
    ).get(userId);


    if (!user) {

        db.prepare(`
            INSERT INTO users (id, attendedEvents, lifetimeEvents)
            VALUES (?, 1, 1)
        `).run(userId);

    } else {

        db.prepare(`
            UPDATE users
            SET
                attendedEvents = attendedEvents + 1,
                lifetimeEvents = lifetimeEvents + 1
            WHERE id = ?
        `).run(userId);

    }
}



function addEvents(userId, amount, type) {

    const user = db.prepare(
        "SELECT * FROM users WHERE id = ?"
    ).get(userId);


    if (!user) {

        if (type === "hosted") {

            db.prepare(`
                INSERT INTO users (id, hostedEvents, lifetimeEvents)
                VALUES (?, ?, ?)
            `).run(userId, amount, amount);

        } else {

            db.prepare(`
                INSERT INTO users (id, attendedEvents, lifetimeEvents)
                VALUES (?, ?, ?)
            `).run(userId, amount, amount);

        }

    } else {

        if (type === "hosted") {

            db.prepare(`
                UPDATE users
                SET
                    hostedEvents = hostedEvents + ?,
                    lifetimeEvents = lifetimeEvents + ?
                WHERE id = ?
            `).run(amount, amount, userId);

        } else {

            db.prepare(`
                UPDATE users
                SET
                    attendedEvents = attendedEvents + ?,
                    lifetimeEvents = lifetimeEvents + ?
                WHERE id = ?
            `).run(amount, amount, userId);

        }

    }
}



function addEventLog(userId, eventType, role, messageLink) {

    db.prepare(`
        INSERT INTO eventLogs (userId, eventType, role, messageLink)
        VALUES (?, ?, ?, ?)
    `).run(
        userId,
        eventType,
        role,
        messageLink
    );

}



function updateHostedEvents(userId, amount) {

    db.prepare(`
        UPDATE users
        SET hostedEvents = hostedEvents + ?
        WHERE id = ?
    `).run(amount, userId);

}



module.exports = {
    addHostedEvent,
    addAttendedEvent,
    addEvents,
    addEventLog,
    updateHostedEvents
};