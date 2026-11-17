const { SlashCommandBuilder } = require("discord.js");
const {
    addHiCOM
} = require("../utils/officerManagement");
const {
    hasManagementPermission
} = require("../utils/permissions");
const {
    syncHiCOMDiscordRoles
} = require("../utils/officerRoleSync");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addhicom")
        .setDescription("Adds or updates a HiCOM in officer management.")
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
        ),

    async execute(interaction) {
        if (!hasManagementPermission(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You do not have HiCOM permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const robloxId = interaction.options.getInteger("roblox_id");
        const member = await interaction.guild.members.fetch(user.id);

        addHiCOM({
            discordId: user.id,
            discordName: user.username,
            robloxId
        });

        try {
            await syncHiCOMDiscordRoles(member);
        } catch (error) {
            console.error("HiCOM role synchronization error:", error);

            return interaction.reply({
                content:
                    `✅ ${member.displayName} was saved as HiCOM, but Discord role synchronization failed.`,
                ephemeral: true
            });
        }

        return interaction.reply(
            `✅ ${member.displayName} is now managed as HiCOM with a fixed 7 Studs killzone.`
        );
    }
};
