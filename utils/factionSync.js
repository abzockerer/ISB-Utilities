const db = require("../database/database");
const { OFFICER_ROLES } = require("../config/config");

const FACTION_BOT_ID = "1099382225516118076";
const FACTION_ROLE_ID = "1485381482699816970";
const HICOM_ROLE_ID = "1430405883849867294";

const FACTION_TITLE =
    "Imperial Security Bureau | Members (sorted by rank)";

let activeSession = null;

function hasPermission(member) {
    return (
        member.roles.cache.some(role =>
            OFFICER_ROLES.includes(role.id)
        ) ||
        member.roles.cache.has(HICOM_ROLE_ID)
    );
}

function parseFactionMessage(message) {
    if (!message) return null;

    if (message.author?.id !== FACTION_BOT_ID) {
        return null;
    }

    if (!message.embeds || message.embeds.length === 0) {
        return null;
    }

    const embed = message.embeds[0];

    const text = [
        embed.title,
        embed.description,
        embed.footer?.text
    ]
        .filter(Boolean)
        .join("\n");

    if (!text.includes(FACTION_TITLE)) {
        return null;
    }

    const pageMatch =
        text.match(/Page\s+(\d+)\s+of\s+(\d+)/i);

    if (!pageMatch) {
        return null;
    }

    const page = Number(pageMatch[1]);
    const totalPages = Number(pageMatch[2]);

    const robloxIds = new Set();

    const members = [];

const regex =
    /\[([^\]]+)\s+\((\d+)\)\]\(https:\/\/www\.roblox\.com\/users\/(\d+)\/profile\)/gi;

let match;

while ((match = regex.exec(text)) !== null) {
    const robloxName = match[1].trim();
    const robloxId = match[3];

    members.push({
        robloxName,
        robloxId
    });
}

    return {
    page,
    totalPages,
    members
};
}

async function updateStatusMessage() {
    if (!activeSession) return;

    const content =
        `Please run the command \`/faction members\` in any channel and click **Next** until you reach the last page.\n\n` +
        `**Pages recognized: ${activeSession.pages.size}**`;

    try {
        await activeSession.controlMessage.edit({
            content,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: "All pages done",
                            custom_id:
                                `faction_sync_done_${activeSession.userId}`
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error(
            "❌ Could not update faction sync message:",
            error.message
        );
    }
}

async function processFactionMessage(message) {
    if (!activeSession) return;

    const parsed = parseFactionMessage(message);

    if (!parsed) return;

    if (!activeSession.sourceMessageId) {
        activeSession.sourceMessageId = message.id;

        console.log(
            `🎮 Faction sync connected to GAR Bot message ${message.id}`
        );
    }

    if (message.id !== activeSession.sourceMessageId) {
        return;
    }

    for (const member of parsed.members) {
    activeSession.members.set(
        String(member.robloxId),
        member
    );
}

    const wasAlreadyRecognized =
        activeSession.pages.has(parsed.page);

    activeSession.totalPages = parsed.totalPages;

    activeSession.pages.add(parsed.page);

    if (!wasAlreadyRecognized) {
        console.log(
            `📄 Faction page recognized: ${parsed.page}/${parsed.totalPages}`
        );

        await updateStatusMessage();
    }
}

async function handleFactionMessage(message) {
    await processFactionMessage(message);
}

async function handleFactionMessageUpdate(message) {
    if (!activeSession) return;

    try {
        if (message.partial) {
            message = await message.fetch();
        }

        await processFactionMessage(message);
    } catch (error) {
        console.error(
            "❌ Faction message update error:",
            error.message
        );
    }
}

async function startFactionSync(interaction) {
    if (activeSession) {
        return interaction.reply({
            content:
                "❌ There is already an active game-role synchronization.",
            ephemeral: true
        });
    }

    if (!hasPermission(interaction.member)) {
        return interaction.reply({
            content:
                "❌ You do not have permission to use this command.",
            ephemeral: true
        });
    }

    await interaction.reply({
        content:
            "Please run the command `/faction members` in any channel and click **Next** until you reach the last page.\n\n" +
            "**Pages recognized: 0**",
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3,
                        label: "All pages done",
                        custom_id:
                            `faction_sync_done_${interaction.user.id}`
                    }
                ]
            }
        ]
    });

    const controlMessage = await interaction.fetchReply();

    activeSession = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        controlMessage,
        sourceMessageId: null,
        pages: new Set(),
        totalPages: null,
        members: new Map(),
        processing: false
    };

    console.log(
        `🎮 Faction role sync started by ${interaction.user.tag}`
    );
}

async function finalizeFactionSync(interaction) {
    if (!activeSession) {
        return interaction.reply({
            content: "❌ There is no active synchronization.",
            ephemeral: true
        });
    }

    if (interaction.user.id !== activeSession.userId) {
        return interaction.reply({
            content:
                "❌ Only the person who started the synchronization can finish it.",
            ephemeral: true
        });
    }

    if (activeSession.processing) {
        return interaction.reply({
            content:
                "⏳ The synchronization is already being processed.",
            ephemeral: true
        });
    }

    if (
        activeSession.totalPages &&
        activeSession.pages.size < activeSession.totalPages
    ) {
        return interaction.reply({
            content:
                `❌ Not all pages have been recognized yet.\n\n` +
                `Pages recognized: ${activeSession.pages.size}/${activeSession.totalPages}`,
            ephemeral: true
        });
    }

    activeSession.processing = true;

    await interaction.deferUpdate();

    const session = activeSession;

    try {
        const guild =
            interaction.client.guilds.cache.get(session.guildId);

        if (!guild) {
            throw new Error("Guild not found.");
        }

        const role = guild.roles.cache.get(FACTION_ROLE_ID);

        if (!role) {
            throw new Error(
                `Role ${FACTION_ROLE_ID} was not found.`
            );
        }

        await guild.members.fetch();

        /*
         * Remove the role from everyone who currently has it.
         */
        let removed = 0;

        for (const member of role.members.values()) {
            try {
                await member.roles.remove(role);
                removed++;
            } catch (error) {
                console.error(
                    `❌ Could not remove role from ${member.user.tag}:`,
                    error.message
                );
            }
        }

        /*
         * Build Roblox ID -> Discord ID map.
         */
        let added = 0;
let notFound = 0;
let failed = 0;

const notFoundRobloxIds = [];
const alreadyAdded = new Set();

for (const factionMember of session.members.values()) {
    const robloxId = String(factionMember.robloxId);
    const robloxName = factionMember.robloxName;

    if (alreadyAdded.has(robloxId)) {
        continue;
    }

    alreadyAdded.add(robloxId);

    /*
     * Find the Discord member by Roblox username.
     *
     * The Roblox username from the GAR Bot is expected
     * to be the same as the Discord username.
     */
    const discordMember =
        guild.members.cache.find(member =>
            member.user.username.toLowerCase() ===
                robloxName.toLowerCase()
        );

    if (!discordMember) {
        notFound++;
        notFoundRobloxIds.push(
            `${robloxName} (${robloxId})`
        );

        continue;
    }

    /*
     * Automatically create/update the user in our database.
     */
    db.prepare(`
        INSERT INTO users (
            id,
            discordName,
            robloxName,
            robloxId
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            discordName = excluded.discordName,
            robloxName = excluded.robloxName,
            robloxId = excluded.robloxId
    `).run(
        discordMember.id,
        discordMember.user.username,
        robloxName,
        Number(robloxId)
    );

    console.log(
        `🔗 ${robloxName} (${robloxId}) → ${discordMember.user.tag}`
    );

    try {
        await discordMember.roles.add(role);
        added++;
    } catch (error) {
        failed++;

        console.error(
            `❌ Could not add role to ${discordMember.user.tag}:`,
            error.message
        );
    }
}

        console.log(
            `📊 Faction sync results:
Pages: ${session.pages.size}/${session.totalPages ?? session.pages.size}
Roblox members: ${session.members.size}
Roles removed: ${removed}
Roles added: ${added}
Not found: ${notFound}
Failed: ${failed}`
        );

        if (notFoundRobloxIds.length > 0) {
            console.log(
                "❌ Roblox IDs not found in database:"
            );

            for (const robloxId of notFoundRobloxIds) {
                console.log(`   - ${robloxId}`);
            }
        }

        let notFoundText = "None";

        if (notFoundRobloxIds.length > 0) {
            notFoundText =
                notFoundRobloxIds
                    .map(id => `\`${id}\``)
                    .join(", ");
        }

        await session.controlMessage.edit({
            content:
                `## ✅ Game Role Synchronization Complete\n\n` +
                `**Pages recognized:** ${session.pages.size}/${session.totalPages ?? session.pages.size}\n` +
                `**Roblox members found:** ${session.members.size}\n\n` +
                `**Roles removed:** ${removed}\n` +
                `**Roles added:** ${added}\n` +
                `**Not found in database:** ${notFound}\n` +
                `**Failed:** ${failed}\n\n` +
                `**Roblox IDs not found:**\n${notFoundText}`,
            components: []
        });

        console.log(
            `✅ Faction role sync completed. Pages: ${session.pages.size}, Roblox members: ${session.members.size}, Added: ${added}`
        );

        activeSession = null;
    } catch (error) {
        console.error(
            "❌ Faction role synchronization failed:",
            error
        );

        await session.controlMessage.edit({
            content:
                `❌ **Game Role Synchronization failed.**\n\n` +
                `Error: ${error.message}`,
            components: []
        });

        activeSession = null;
    }
}

module.exports = {
    startFactionSync,
    handleFactionMessage,
    handleFactionMessageUpdate,
    finalizeFactionSync
};