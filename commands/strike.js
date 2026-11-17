const {
    SlashCommandBuilder
} = require("discord.js");

const { hasOfficerPermission } = require("../utils/permissions");

const STRIKE_ROLE = "1485385252460564520";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("strike")
        .setDescription("Give a user a strike.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to strike.")
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!hasOfficerPermission(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You do not have permission to use this command.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const member =
            await interaction.guild.members.fetch(user.id);

        if (member.roles.cache.has(STRIKE_ROLE)) {
            return interaction.reply(
                `${user} already has a strike.`
            );
        }

        const strikeRole =
            interaction.guild.roles.cache.get(STRIKE_ROLE);

        if (!strikeRole) {
            return interaction.reply(
                "❌ Strike role not found."
            );
        }

        await member.roles.add(strikeRole);

        await interaction.reply(
            `${user} has been striked.`
        );
    }
};
