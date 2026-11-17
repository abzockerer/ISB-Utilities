const { SlashCommandBuilder } = require("discord.js");
const { addEvents } = require("../utils/databaseManager");
const {
    hasOfficerPermission,
    isOfficer,
    isHiCOM
} = require("../utils/permissions");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("ep")
        .setDescription("Adds or removes event points from a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of events to add or remove")
                .setRequired(true)
        ),

    async execute(interaction) {

        if (!hasOfficerPermission(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You do not have permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        const member = await interaction.guild.members.fetch(user.id);

        const isManagedOfficer =
            isOfficer(user.id) || isHiCOM(user.id);

        if (isManagedOfficer) {

            addEvents(user.id, amount, "hosted");

            if (amount >= 0) {

                await interaction.reply(
                    `✅ Added ${amount} hosted events to ${member.displayName}.`
                );

            } else {

                await interaction.reply(
                    `✅ Removed ${Math.abs(amount)} hosted events from ${member.displayName}.`
                );

            }

        } else {

            addEvents(user.id, amount, "attended");

            if (amount >= 0) {

                await interaction.reply(
                    `✅ Added ${amount} attended events to ${member.displayName}.`
                );

            } else {

                await interaction.reply(
                    `✅ Removed ${Math.abs(amount)} attended events from ${member.displayName}.`
                );

            }

        }

    }

};
