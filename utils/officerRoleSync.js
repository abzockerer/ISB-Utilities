const {
    OFFICER_ROLES,
    LEGACY_HICOM_ROLE
} = require("../config/config");
const {
    getOfficerRoleIdForRank
} = require("./officerManagement");

async function removeRoles(member, roleIds) {
    for (const roleId of roleIds) {
        if (!member.roles.cache.has(roleId)) continue;

        await member.roles.remove(roleId);
    }
}

async function syncOfficerDiscordRoles(member, rank) {
    await removeRoles(member, [LEGACY_HICOM_ROLE]);

    const officerRoleId = getOfficerRoleIdForRank(rank);

    if (!officerRoleId) return null;

    await removeRoles(member, OFFICER_ROLES);
    await member.roles.add(officerRoleId);

    return officerRoleId;
}

async function syncHiCOMDiscordRoles(member) {
    await removeRoles(member, OFFICER_ROLES);
    await member.roles.add(LEGACY_HICOM_ROLE);
}

async function removeOfficerDiscordRole(member, rank) {
    const officerRoleId = getOfficerRoleIdForRank(rank);

    if (officerRoleId && member.roles.cache.has(officerRoleId)) {
        await member.roles.remove(officerRoleId);
    }
}

async function removeHiCOMDiscordRole(member) {
    if (member.roles.cache.has(LEGACY_HICOM_ROLE)) {
        await member.roles.remove(LEGACY_HICOM_ROLE);
    }
}

module.exports = {
    syncOfficerDiscordRoles,
    syncHiCOMDiscordRoles,
    removeOfficerDiscordRole,
    removeHiCOMDiscordRole
};
