const { SlashCommandBuilder } = require("discord.js");
const {
    getHiCOM,
    removeHiCOM
} = require("../utils/officerManagement");
const {
    hasManagementPermission
} = require("../utils/permissions");
const {
    removeHiCOMDiscordRole
} = require("../utils/officerRoleSync");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removehicom")
        .setDescription("Removes a HiCOM from officer management.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Discord member")
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!hasManagementPermission(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You do not have HiCOM permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const hicom = getHiCOM(user.id);

        if (!hicom) {
            return interaction.reply({
                content: "❌ This user is not managed as HiCOM.",
                ephemeral: true
            });
        }

        const member = await interaction.guild.members.fetch(user.id);

        try {
            await removeHiCOMDiscordRole(member);
        } catch (error) {
            console.error("HiCOM role removal error:", error);

            return interaction.reply({
                content:
                    "❌ HiCOM role synchronization failed, so the management entry was not removed.",
                ephemeral: true
            });
        }

        removeHiCOM(user.id);

        return interaction.reply(
            `✅ ${member.displayName} was removed from HiCOM management.`
        );
    }
};
