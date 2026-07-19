const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/database");
const { OFFICER_ROLES } = require("../config/config");

const QUOTAS = {

    "1488416355626520576": 3,
    "1482858660609921277": 3,
    "1437914178479325225": 2,
    "1482858985559298058": 2,
    "1519575872250843246": 2

};

module.exports = {

    data: new SlashCommandBuilder()
        .setName("quotacheck")
        .setDescription("Checks officer event quotas."),

    async execute(interaction) {

        const hasPermission =
            interaction.member.roles.cache.some(role =>
                OFFICER_ROLES.includes(role.id)
            ) ||
            interaction.member.roles.cache.has("1430405883849867294");

        if (!hasPermission) {
            return interaction.reply({
                content: "❌ You do not have permission to use this command.",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // Alle Mitglieder laden (wichtig bei größeren Servern)
        await interaction.guild.members.fetch();

        const officers = [];

        for (const [, member] of interaction.guild.members.cache) {

            let quota = null;

            for (const roleId in QUOTAS) {

                if (member.roles.cache.has(roleId)) {
                    quota = QUOTAS[roleId];
                    break;
                }

            }

            if (quota !== null) {

                officers.push({
                    member,
                    quota
                });

            }

        }

        let output = "📊 **Officer Quota Check**\n\n";

        for (const officer of officers) {

            let userData = db.prepare(
                "SELECT * FROM users WHERE id = ?"
            ).get(officer.member.id);

            if (!userData) {

                db.prepare(`
                    INSERT INTO users (id, hostedEvents, attendedEvents, lifetimeEvents)
                    VALUES (?, 0, 0, 0)
                `).run(officer.member.id);

                userData = {
                    hostedEvents: 0
                };

            }

            const hostedEvents = userData.hostedEvents;
            const requiredEvents = officer.quota;

            const icon = hostedEvents >= requiredEvents
                ? "✅"
                : "❌";

            output +=
                `${officer.member.user.username} ${icon}  //  Hosted events: ${hostedEvents}  //  Required events: ${requiredEvents}\n`;

        }

        await interaction.editReply(output);

    }

};