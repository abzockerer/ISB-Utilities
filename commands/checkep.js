const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/database");
const { OFFICER_ROLES } = require("../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("checkep")
        .setDescription("Check hosted or attended events of a user.")
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

        const data = db.prepare(
            "SELECT * FROM users WHERE id = ?"
        ).get(user.id);

        let events = 0;
        let lifetimeEvents = 0;
        let type = "";

        if (isOfficer) {
            events = data ? data.hostedEvents : 0;
            type = "hosted";
        } else {
            events = data ? data.attendedEvents : 0;
            type = "attended";
        }

        lifetimeEvents = data ? data.lifetimeEvents : 0;

        await interaction.reply(
            `${member.displayName} has ${events} ${type} events and ${lifetimeEvents} lifetime events.`
        );
    }
};