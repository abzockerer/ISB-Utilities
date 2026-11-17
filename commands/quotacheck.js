const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/database");
const {
    getOfficer,
    getAllOfficers
} = require("../utils/officerManagement");
const { hasOfficerPermission } = require("../utils/permissions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("quotacheck")
        .setDescription("Checks officer event quotas.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Check only one user")
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        if (!hasOfficerPermission(interaction.user.id)) {
            return interaction.editReply(
                "❌ You do not have permission to use this command."
            );
        }

        const targetUser = interaction.options.getUser("user");
        let officers;

        if (targetUser) {
            const officer = getOfficer(targetUser.id);

            if (!officer) {
                return interaction.editReply(
                    "❌ This user is not managed as an Officer."
                );
            }

            officers = [officer];
        } else {
            officers = getAllOfficers();
        }

        let output = "📊 **Officer Quota Check**\n\n";

        if (officers.length === 0) {
            return interaction.editReply(
                `${output}No managed Officers found.`
            );
        }

        for (const officer of officers) {
            const member = await interaction.guild.members
                .fetch(officer.discordId)
                .catch(() => null);

            const userData = db.prepare(`
                SELECT hostedEvents
                FROM users
                WHERE id = ?
            `).get(officer.discordId);

            const hostedEvents = userData?.hostedEvents || 0;
            const hasQuota = Number.isInteger(officer.quota);
            const requiredEvents = hasQuota
                ? officer.quota
                : "Not set";
            const icon = hasQuota && hostedEvents >= officer.quota
                ? "✅"
                : "❌";
            const name = member?.user.username || officer.discordName;

            output +=
                `${name} ${icon}  //  Hosted events: ${hostedEvents}  //  Required events: ${requiredEvents}\n`;
        }

        await interaction.editReply(output.slice(0, 1900));
    }
};
