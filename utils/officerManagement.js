const fs = require("fs");
const path = require("path");

const db = require("../database/database");
const {
    OFFICER_ROLES,
    LEGACY_HICOM_ROLE
} = require("../config/config");

const LEGACY_RANK_DATA = {
    "1482858985559298058": {
        rank: "Major",
        killzone: 3.5,
        quota: 2
    },
    "1437914178479325225": {
        rank: "Captain",
        killzone: 3,
        quota: 2
    },
    "1482858660609921277": {
        rank: "Lieutenant",
        killzone: 2.5,
        quota: 3
    },
    "1488416355626520576": {
        rank: null,
        killzone: null,
        quota: 3
    },
    "1430411433476100146": {
        rank: "Death Trooper Company Officer",
        killzone: 2.5,
        quota: null
    },
    "1482996597288603739": {
        rank: "Death Trooper Company Commander",
        killzone: 3,
        quota: null
    }
};

const OFFICER_ROLE_BY_RANK = new Map(
    Object.entries(LEGACY_RANK_DATA)
        .filter(([, data]) => data.rank)
        .map(([roleId, data]) => [data.rank.toLowerCase(), roleId])
);

function getOfficerManagementEntry(discordId) {
    return db.prepare(`
        SELECT *
        FROM officer_management
        WHERE discordId = ?
    `).get(discordId);
}

function getOfficer(discordId) {
    const entry = getOfficerManagementEntry(discordId);

    return entry?.type === "Officer" ? entry : null;
}

function getHiCOM(discordId) {
    const entry = getOfficerManagementEntry(discordId);

    return entry?.type === "HiCOM" ? entry : null;
}

function getAllOfficers() {
    return db.prepare(`
        SELECT *
        FROM officer_management
        WHERE type = 'Officer'
        ORDER BY discordName COLLATE NOCASE
    `).all();
}

function getAllHiCOMs() {
    return db.prepare(`
        SELECT *
        FROM officer_management
        WHERE type = 'HiCOM'
        ORDER BY discordName COLLATE NOCASE
    `).all();
}

function getAllManagedMembers() {
    return db.prepare(`
        SELECT *
        FROM officer_management
        ORDER BY discordName COLLATE NOCASE
    `).all();
}

function isOfficer(discordId) {
    return getOfficer(discordId) !== null;
}

function isHiCOM(discordId) {
    return getHiCOM(discordId) !== null;
}

function validateRobloxId(robloxId) {
    if (!Number.isSafeInteger(robloxId) || robloxId <= 0) {
        throw new Error("Roblox ID must be a positive whole number.");
    }
}

function validateOfficerData({ robloxId, killzone, quota, rank }) {
    validateRobloxId(robloxId);

    if (!Number.isFinite(killzone) || killzone <= 0 || killzone > 100) {
        throw new Error("Killzone must be a number between 0 and 100 studs.");
    }

    if (!Number.isSafeInteger(quota) || quota < 0 || quota > 1000) {
        throw new Error("Quota must be a whole number between 0 and 1000.");
    }

    if (typeof rank !== "string" || !rank.trim() || rank.trim().length > 100) {
        throw new Error("Rank must contain between 1 and 100 characters.");
    }
}

function upsertManagementEntry({
    discordId,
    discordName,
    robloxId,
    rank,
    killzone,
    quota,
    type
}) {
    const now = Date.now();

    db.prepare(`
        INSERT INTO officer_management (
            discordId,
            discordName,
            robloxId,
            rank,
            killzone,
            quota,
            type,
            createdAt,
            updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(discordId) DO UPDATE SET
            discordName = excluded.discordName,
            robloxId = excluded.robloxId,
            rank = excluded.rank,
            killzone = excluded.killzone,
            quota = excluded.quota,
            type = excluded.type,
            updatedAt = excluded.updatedAt
    `).run(
        discordId,
        discordName,
        robloxId,
        rank,
        killzone,
        quota,
        type,
        now,
        now
    );

    return getOfficerManagementEntry(discordId);
}

function addOfficer(data) {
    validateOfficerData(data);

    return upsertManagementEntry({
        ...data,
        rank: data.rank.trim(),
        type: "Officer"
    });
}

function updateOfficer(data) {
    return addOfficer(data);
}

function addHiCOM({ discordId, discordName, robloxId }) {
    validateRobloxId(robloxId);

    return upsertManagementEntry({
        discordId,
        discordName,
        robloxId,
        rank: "HiCOM",
        killzone: 7,
        quota: null,
        type: "HiCOM"
    });
}

function removeManagedMember(discordId, type) {
    return db.prepare(`
        DELETE FROM officer_management
        WHERE discordId = ?
        AND type = ?
    `).run(discordId, type).changes > 0;
}

function removeOfficer(discordId) {
    return removeManagedMember(discordId, "Officer");
}

function removeHiCOM(discordId) {
    return removeManagedMember(discordId, "HiCOM");
}

function getOfficerRoleIdForRank(rank) {
    if (typeof rank !== "string") return null;

    return OFFICER_ROLE_BY_RANK.get(rank.trim().toLowerCase()) || null;
}

function getLegacyOfficerData(member) {
    if (member.roles.cache.has(LEGACY_HICOM_ROLE)) {
        return {
            type: "HiCOM",
            rank: "HiCOM",
            killzone: 7,
            quota: null
        };
    }

    const legacyRoleId = OFFICER_ROLES.find(roleId =>
        member.roles.cache.has(roleId)
    );

    if (!legacyRoleId) return null;

    const legacyData = LEGACY_RANK_DATA[legacyRoleId] || {};

    return {
        type: "Officer",
        rank: legacyData.rank || null,
        killzone: legacyData.killzone ?? null,
        quota: legacyData.quota ?? null
    };
}

function createMigrationBackup() {
    const databasePath = path.resolve(
        process.cwd(),
        "database/events.db"
    );
    const backupPath = `${databasePath}.backup`;

    if (!fs.existsSync(databasePath) || fs.existsSync(backupPath)) {
        return backupPath;
    }

    fs.copyFileSync(databasePath, backupPath);

    return backupPath;
}

async function migrateLegacyOfficerManagement(guild) {
    const migrationName = "legacy_officer_and_hicom_roles_v1";

    const alreadyMigrated = db.prepare(`
        SELECT 1
        FROM officer_management_migrations
        WHERE name = ?
    `).get(migrationName);

    if (alreadyMigrated) {
        return { migrated: false, added: 0, backupPath: null };
    }

    const members = await guild.members.fetch();
    const candidates = [];

    for (const member of members.values()) {
        if (member.user.bot) continue;

        const legacyData = getLegacyOfficerData(member);

        if (!legacyData) continue;

        const existing = getOfficerManagementEntry(member.id);

        if (existing) continue;

        const userData = db.prepare(`
            SELECT robloxId
            FROM users
            WHERE id = ?
        `).get(member.id);

        candidates.push({
            discordId: member.id,
            discordName: member.user.username,
            robloxId: userData?.robloxId || null,
            ...legacyData
        });
    }

    const backupPath = createMigrationBackup();

    const saveMigration = db.transaction(() => {
        const insert = db.prepare(`
            INSERT OR IGNORE INTO officer_management (
                discordId,
                discordName,
                robloxId,
                rank,
                killzone,
                quota,
                type,
                createdAt,
                updatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = Date.now();

        for (const candidate of candidates) {
            insert.run(
                candidate.discordId,
                candidate.discordName,
                candidate.robloxId,
                candidate.rank,
                candidate.killzone,
                candidate.quota,
                candidate.type,
                now,
                now
            );
        }

        db.prepare(`
            INSERT INTO officer_management_migrations (name, completedAt)
            VALUES (?, ?)
        `).run(migrationName, now);
    });

    saveMigration();

    return {
        migrated: true,
        added: candidates.length,
        backupPath
    };
}

module.exports = {
    LEGACY_RANK_DATA,
    addOfficer,
    updateOfficer,
    removeOfficer,
    addHiCOM,
    removeHiCOM,
    getOfficer,
    getHiCOM,
    getAllOfficers,
    getAllHiCOMs,
    getAllManagedMembers,
    getOfficerManagementEntry,
    isOfficer,
    isHiCOM,
    getOfficerRoleIdForRank,
    migrateLegacyOfficerManagement,
    validateOfficerData,
    validateRobloxId
};
