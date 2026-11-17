const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { hasHiCOMPermission } = require("../utils/permissions");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("quotareset")
        .setDescription("Resets all hosted/attended events and clears the event history."),

    async execute(interaction) {

        if (!hasHiCOMPermission(interaction.user.id)) {
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
