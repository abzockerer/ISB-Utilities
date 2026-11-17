const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

const db = require("../database/database");
const {
    getAllManagedMembers
} = require("./officerManagement");

const GAME_ID = 4238077359;
const LOG_CHANNEL = "1476780414059151362";
const DTC_PING_ROLE = "1437038728903131237";

function getRank(entry) {
    return entry.rank || "Not set";
}

function getKillzone(entry) {
    if (entry.type === "HiCOM") return "7 Studs";

    return entry.killzone === null || entry.killzone === undefined
        ? "Not set"
        : `${entry.killzone} Studs`;
}

async function getGuildMember(guild, discordId) {
    return guild.members.cache.get(discordId) ||
        guild.members.fetch(discordId).catch(() => null);
}

async function startPresenceTracker(client) {

    setInterval(async () => {

        try {

            const guild =
                client.guilds.cache.get(process.env.GUILD_ID);

            if (!guild) return;

            const channel =
                guild.channels.cache.get(LOG_CHANNEL);

            if (!channel) return;

            const managedMembers = getAllManagedMembers();
            const robloxIds = [];
            const trackedMembers = [];

            for (const entry of managedMembers) {

                if (!Number.isSafeInteger(entry.robloxId) || entry.robloxId <= 0) {
                    continue;
                }

                const member = await getGuildMember(guild, entry.discordId);

                if (!member || member.user.bot) continue;

                robloxIds.push(entry.robloxId);

                trackedMembers.push({
                    member,
                    robloxId: entry.robloxId,
                    management: entry
                });

            }

            if (robloxIds.length === 0) return;

            const presence = await axios.post(
                "https://presence.roblox.com/v1/presence/users",
                { userIds: robloxIds }
            );

            for (const data of trackedMembers) {

                const { member, robloxId, management } = data;

                const userPresence =
                    presence.data.userPresences.find(
                        item => item.userId == robloxId
                    );

                const inGame =
                    userPresence && userPresence.placeId == GAME_ID;

                const old = db.prepare(`
                    SELECT *
                    FROM presence_logs
                    WHERE discordId = ?
                `).get(member.id);

                if (inGame && (!old || old.status === "offline")) {

                    const now = Date.now();

                    const embed = new EmbedBuilder()
                        .setTitle(`${member.displayName} has joined the game!`)
                        .setDescription(`
**Rank:** ${getRank(management)}
**Killzone:** ${getKillzone(management)}

[View Profile](https://www.roblox.com/users/${robloxId}/profile)

**Status:** 🟢 In-game since <t:${Math.floor(now / 1000)}:R>
`)
                        .setColor("Green");

                    const message = await channel.send({ embeds: [embed] });

                    const pingPreference = db.prepare(`
                        SELECT preference
                        FROM officer_ping_preferences
                        WHERE discordId = ?
                    `).get(member.id);

                    if (!pingPreference || pingPreference.preference === "yes") {
                        await channel.send({
                            content: `<@&${DTC_PING_ROLE}>`
                        });
                    }

                    db.prepare(`
                        INSERT OR REPLACE INTO presence_logs (
                            discordId,
                            robloxId,
                            status,
                            joinMessageId,
                            lastChange
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `).run(
                        member.id,
                        robloxId,
                        "online",
                        message.id,
                        now
                    );

                }

                if (!inGame && old && old.status === "online") {

                    const now = Date.now();
                    const onlineSeconds = Math.floor(
                        (now - old.lastChange) / 1000
                    );
                    const hours = Math.floor(onlineSeconds / 3600);
                    const minutes = Math.floor((onlineSeconds % 3600) / 60);
                    const seconds = onlineSeconds % 60;
                    const onlineTime = `${hours}h ${minutes}m ${seconds}s`;

                    const leaveEmbed = new EmbedBuilder()
                        .setTitle(`${member.displayName} has left the game.`)
                        .setDescription(`
**Rank:** ${getRank(management)}
**Killzone:** ${getKillzone(management)}

[View Profile](https://www.roblox.com/users/${old.robloxId}/profile)

**Status:** 🔴 Offline since <t:${Math.floor(now / 1000)}:R>
**Online time:** ${onlineTime}
`)
                        .setColor("Red");

                    await channel.send({ embeds: [leaveEmbed] });

                    try {

                        const oldMessage = await channel.messages.fetch(
                            old.joinMessageId
                        );
                        const oldEmbed = EmbedBuilder.from(oldMessage.embeds[0]);

                        oldEmbed.setDescription(`
**Rank:** ${getRank(management)}
**Killzone:** ${getKillzone(management)}

[View Profile](https://www.roblox.com/users/${old.robloxId}/profile)

**Status:** 🔴 Offline since <t:${Math.floor(now / 1000)}:R>
**Online time:** ${onlineTime}
`);

                        await oldMessage.edit({ embeds: [oldEmbed] });

                    } catch {}

                    db.prepare(`
                        UPDATE presence_logs
                        SET status = 'offline', lastChange = ?
                        WHERE discordId = ?
                    `).run(now, member.id);

                }

            }

        } catch (error) {

            console.error("Presence Tracker Fehler:", error);

        }

    }, 15000);

}

module.exports = {
    startPresenceTracker
};
