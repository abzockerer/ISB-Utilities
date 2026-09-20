const {
    SlashCommandBuilder
} = require("discord.js");

const {
    OFFICER_ROLES
} = require("../config/config");

const {
    getWarningCount,
    removeWarnings
} = require("../utils/warnings");

const HICOM_ROLE = "1430405883849867294";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removewarnings")
        .setDescription("Remove all warnings from a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user whose warnings should be removed.")
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

        const count =
            getWarningCount(user.id);

        if (count === 0) {
            return interaction.reply(
                `${user} has no warnings.`
            );
        }

        removeWarnings(user.id);

        await interaction.reply(
            `✅ Removed all warnings from ${user}.`
        );
    }
};