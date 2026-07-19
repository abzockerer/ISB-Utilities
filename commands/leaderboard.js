const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/database");
const { OFFICER_ROLES } = require("../config/config");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Shows the event leaderboard."),

    async execute(interaction) {

        // Alle Mitglieder laden
        await interaction.guild.members.fetch();

        const users = db.prepare(
            "SELECT * FROM users"
        ).all();

        let hosted = [];
        let attended = [];

        for (const user of users) {

            try {

                const member = await interaction.guild.members.fetch(user.id);

                const isOfficer = member.roles.cache.some(role =>
                    OFFICER_ROLES.includes(role.id)
                );

                if (isOfficer) {

                    hosted.push({
                        name: member.displayName,
                        amount: user.hostedEvents || 0
                    });

                } else {

                    attended.push({
                        name: member.displayName,
                        amount: user.attendedEvents || 0
                    });

                }

            } catch {
                // Benutzer nicht mehr auf dem Server ignorieren
            }

        }

        hosted.sort((a, b) => b.amount - a.amount);
        attended.sort((a, b) => b.amount - a.amount);

        let response = "🏆 **Leaderboard**\n\n";

        response += "**Hosted Events:**\n";

        if (hosted.length === 0) {

            response += "No Data\n";

        } else {

            hosted.slice(0, 5).forEach((user, index) => {

                response +=
                    `${index + 1}. ${user.name} - ${user.amount} Events hosted\n`;

            });

        }

        response += "\n**Attended Events:**\n";

        if (attended.length === 0) {

            response += "No Data\n";

        } else {

            attended.slice(0, 5).forEach((user, index) => {

                response +=
                    `${index + 1}. ${user.name} - ${user.amount} Events attended\n`;

            });

        }

        await interaction.reply(response);

    }

};