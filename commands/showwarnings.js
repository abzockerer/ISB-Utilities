const {
    SlashCommandBuilder
} = require("discord.js");

const {
    OFFICER_ROLES
} = require("../config/config");

const {
    getWarnings
} = require("../utils/warnings");

const HICOM_ROLE = "1430405883849867294";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("showwarnings")
        .setDescription("Shows the warnings of a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user whose warnings should be shown.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const hasPermission =
            interaction.member.roles.cache.some(role =>
                OFFICER_ROLES.includes(role.id)
            ) ||
            interaction.member.roles.cache.has(HICOM_ROLE);

        if (!hasPermission) {
            return interaction.reply({
                content: "❌ You do not have permission to use this command.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const warnings =
            getWarnings(user.id);

        if (warnings.length === 0) {
            return interaction.reply(
                `${user} has no warnings.`
            );
        }

        let output =
            `⚠️ **Warnings for ${user}**\n\n`;

        for (let i = 0; i < warnings.length; i++) {
            const warning = warnings[i];

            const moderator =
                await interaction.client.users
                    .fetch(warning.moderatorId)
                    .catch(() => null);

            const moderatorName =
                moderator
                    ? moderator.username
                    : "Unknown User";

            const date =
                `<t:${Math.floor(warning.createdAt / 1000)}:f>`;

            output +=
                `**Warning ${i + 1}**\n` +
                `Reason: ${warning.reason}\n` +
                `Moderator: ${moderatorName}\n` +
                `Date: ${date}\n\n`;
        }

        await interaction.reply(output);
    }
};