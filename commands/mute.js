const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const { OFFICER_ROLES } = require("../config/config");


module.exports = {

    data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Mute a user for a specific amount of time.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to mute")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("days")
                .setDescription("Days")
                .setRequired(true)
                .setMinValue(0)
        )
        .addIntegerOption(option =>
            option
                .setName("hours")
                .setDescription("Hours")
                .setRequired(true)
                .setMinValue(0)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Minutes")
                .setRequired(true)
                .setMinValue(0)
        )
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Seconds")
                .setRequired(true)
                .setMinValue(0)
        )
        .addStringOption(option =>
    option
        .setName("reason")
        .setDescription("Reason for the mute")
        .setRequired(true)
),


    async execute(interaction) {


        const hasPermission =
            interaction.member.roles.cache.some(role =>
                OFFICER_ROLES.includes(role.id)
            );


        if (!hasPermission) {

            return interaction.reply({
                content: "❌ You do not have permission to use this command.",
                ephemeral: true
            });

        }



        const user = interaction.options.getUser("user");

        const days = interaction.options.getInteger("days");
        const hours = interaction.options.getInteger("hours");
        const minutes = interaction.options.getInteger("minutes");
        const seconds = interaction.options.getInteger("seconds");
        const reason = interaction.options.getString("reason");



        const duration =
            (days * 24 * 60 * 60 * 1000) +
            (hours * 60 * 60 * 1000) +
            (minutes * 60 * 1000) +
            (seconds * 1000);



        if (duration <= 0) {

            return interaction.reply({
                content: "❌ The mute duration must be longer than 0 seconds.",
                ephemeral: true
            });

        }



        const member = await interaction.guild.members.fetch(user.id);



        await member.timeout(
    duration,
    `${reason} | Muted by ${interaction.user.tag}`
);



        await interaction.reply({
            content:
    ` ${user} has been muted for ${days}d ${hours}h ${minutes}m ${seconds}s.\nReason: ${reason}`
        });

    }

};