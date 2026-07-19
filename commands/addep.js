const { SlashCommandBuilder } = require("discord.js");
const { addEvents } = require("../utils/databaseManager");
const { OFFICER_ROLES } = require("../config/config");

const ALLOWED_ROLE = "1430405883849867294";
const ALLOWED_USER = "1221391460860035093";

module.exports = {

    data: new SlashCommandBuilder()
        .setName("addep")
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

        const hasPermission =
            interaction.user.id === ALLOWED_USER ||
            interaction.member.roles.cache.has(ALLOWED_ROLE) ||
            interaction.member.roles.cache.some(role =>
                OFFICER_ROLES.includes(role.id)
            );

        if (!hasPermission) {
            return interaction.reply({
                content: "❌ You do not have permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        const member = await interaction.guild.members.fetch(user.id);

        const isOfficer = member.roles.cache.some(role =>
            OFFICER_ROLES.includes(role.id)
        );

        if (isOfficer) {

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