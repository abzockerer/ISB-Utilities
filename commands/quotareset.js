const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../database/database");

const ALLOWED_ROLE = "1430405883849867294";
const ALLOWED_USER = "1221391460860035093";

module.exports = {

    data: new SlashCommandBuilder()
        .setName("quotareset")
        .setDescription("Resets all hosted/attended events and clears the event history."),

    async execute(interaction) {

        const hasPermission =
            interaction.user.id === ALLOWED_USER ||
            interaction.member.roles.cache.has(ALLOWED_ROLE);

        if (!hasPermission) {
            return interaction.reply({
                content: "❌ You do not have permission.",
                ephemeral: true
            });
        }

        const button = new ButtonBuilder()
            .setCustomId(`confirm_quota_reset_${interaction.user.id}`)
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({
            content: "⚠️ **Are you sure you want to reset the quota?**",
            components: [row],
            ephemeral: true
        });

    }

};