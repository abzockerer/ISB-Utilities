const {
    SlashCommandBuilder
} = require("discord.js");

const {
    OFFICER_ROLES
} = require("../config/config");

const {
    addWarning,
    getWarningCount
} = require("../utils/warnings");

const HICOM_ROLE = "1430405883849867294";
const STRIKE_ROLE = "1485385252460564520";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to warn.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the warning.")
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

        const reason =
            interaction.options.getString("reason");

        const member =
            await interaction.guild.members.fetch(user.id);

        const previousWarnings =
            getWarningCount(user.id);

        addWarning(
            user.id,
            reason,
            interaction.user.id
        );

        const warningCount =
            previousWarnings + 1;

        // Third warning = automatic strike
        if (warningCount >= 3) {
            const strikeRole =
                interaction.guild.roles.cache.get(STRIKE_ROLE);

            if (strikeRole && !member.roles.cache.has(STRIKE_ROLE)) {
                await member.roles.add(strikeRole);
            }

            return interaction.reply(
                `${user} has been striked for having 3 warnings.`
            );
        }

        await interaction.reply(
            `${user} has been warned.`
        );
    }
};