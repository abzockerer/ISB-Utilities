const { SlashCommandBuilder } = require("discord.js");
const {
    getOfficer,
    removeOfficer
} = require("../utils/officerManagement");
const {
    hasManagementPermission
} = require("../utils/permissions");
const {
    removeOfficerDiscordRole
} = require("../utils/officerRoleSync");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removeofficer")
        .setDescription("Removes an Officer from officer management.")
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
        const officer = getOfficer(user.id);

        if (!officer) {
            return interaction.reply({
                content: "❌ This user is not managed as Officer.",
                ephemeral: true
            });
        }

        const member = await interaction.guild.members.fetch(user.id);

        try {
            await removeOfficerDiscordRole(member, officer.rank);
        } catch (error) {
            console.error("Officer role removal error:", error);

            return interaction.reply({
                content:
                    "❌ Officer role synchronization failed, so the management entry was not removed.",
                ephemeral: true
            });
        }

        removeOfficer(user.id);

        return interaction.reply(
            `✅ ${member.displayName} was removed from Officer management.`
        );
    }
};
