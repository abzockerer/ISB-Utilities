const Database = require("better-sqlite3");

const db = new Database("database/events.db");

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        hostedEvents INTEGER DEFAULT 0,
        attendedEvents INTEGER DEFAULT 0,
        lifetimeEvents INTEGER DEFAULT 0
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS eventLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        eventType TEXT NOT NULL,
        role TEXT NOT NULL,
        messageLink TEXT NOT NULL
    )
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS presence_logs (
    discordId TEXT PRIMARY KEY,
    robloxId INTEGER NOT NULL,
    status TEXT DEFAULT 'offline',
    joinMessageId TEXT,
    lastChange INTEGER DEFAULT 0
)
`).run();

try {
    db.prepare(`
        ALTER TABLE users
        ADD COLUMN discordName TEXT
    `).run();
} catch (error) {}

try {
    db.prepare(`
        ALTER TABLE users
        ADD COLUMN robloxName TEXT
    `).run();
} catch (error) {}

try {
    db.prepare(`
        ALTER TABLE users
        ADD COLUMN robloxId INTEGER
    `).run();
} catch (error) {}

try {
    db.prepare(`
        ALTER TABLE users
        ADD COLUMN robloxId INTEGER
    `).run();
} catch (error) {
    // Spalte existiert bereits
}

try {
    db.prepare(`
        ALTER TABLE users
        ADD COLUMN lifetimeEvents INTEGER DEFAULT 0
    `).run();
} catch (error) {
    // Spalte existiert bereits
}

console.log("✅ Datenbank bereit!");

module.exports = db;