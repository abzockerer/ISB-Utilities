const { SlashCommandBuilder } = require("discord.js");
const {
    addOfficer
} = require("../utils/officerManagement");
const {
    hasManagementPermission
} = require("../utils/permissions");
const {
    syncOfficerDiscordRoles
} = require("../utils/officerRoleSync");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addofficer")
        .setDescription("Adds or updates an Officer in officer management.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Discord member")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("roblox_id")
                .setDescription("Roblox user ID")
                .setMinValue(1)
                .setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName("killzone")
                .setDescription("Killzone in studs")
                .setMinValue(0.1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("quota")
                .setDescription("Required hosted events")
                .setMinValue(0)
                .setMaxValue(1000)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("rank")
                .setDescription("Officer rank")
                .setMaxLength(100)
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
        const member = await interaction.guild.members.fetch(user.id);
        const robloxId = interaction.options.getInteger("roblox_id");
        const killzone = interaction.options.getNumber("killzone");
        const quota = interaction.options.getInteger("quota");
        const rank = interaction.options.getString("rank");

        try {
            addOfficer({
                discordId: user.id,
                discordName: user.username,
                robloxId,
                killzone,
                quota,
                rank
            });
        } catch (error) {
            return interaction.reply({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
        }

        try {
            const roleId = await syncOfficerDiscordRoles(member, rank);
            const roleNote = roleId
                ? " Discord role synchronized."
                : " No uniquely mapped Discord officer role exists for this rank; management data was saved.";

            return interaction.reply(
                `✅ ${member.displayName} is now managed as Officer.${roleNote}`
            );
        } catch (error) {
            console.error("Officer role synchronization error:", error);

            return interaction.reply({
                content:
                    `✅ ${member.displayName} was saved as Officer, but Discord role synchronization failed.`,
                ephemeral: true
            });
        }
    }
};
