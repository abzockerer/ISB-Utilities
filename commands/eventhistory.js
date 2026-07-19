const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/database");
const { OFFICER_ROLES } = require("../config/config");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("eventhistory")
        .setDescription("Shows a user's event history.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to check")
                .setRequired(true)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("user");
        const member = await interaction.guild.members.fetch(user.id);

        const isOfficer = member.roles.cache.some(role =>
            OFFICER_ROLES.includes(role.id)
        );

        const role = isOfficer ? "hosted" : "attended";

        const events = db.prepare(`
            SELECT eventType, messageLink
            FROM eventLogs
            WHERE userId = ?
            AND role = ?
            ORDER BY id DESC
            LIMIT 50
        `).all(user.id, role);

        let response =
            `**${member.displayName}'s ${role} events:**\n\n` +
            "==========================================\n\n";

        if (events.length === 0) {

            response += "No events found.";

        } else {

            for (const event of events) {

                response +=
                    `• ${event.eventType} — [Jump to log](${event.messageLink})\n`;

            }

        }

        await interaction.reply(response);

    }

};