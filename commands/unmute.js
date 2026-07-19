const {
    SlashCommandBuilder
} = require("discord.js");

const { OFFICER_ROLES } = require("../config/config");


module.exports = {

    data: new SlashCommandBuilder()
        .setName("unmute")
        .setDescription("Remove a timeout from a user.")

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to unmute")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the unmute")
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

        const reason = interaction.options.getString("reason");



        const member = await interaction.guild.members.fetch(user.id);



        if (!member.communicationDisabledUntil) {

            return interaction.reply({
                content: "❌ This user is not muted.",
                ephemeral: true
            });

        }



        await member.timeout(
            null,
            `${reason} | Unmuted by ${interaction.user.tag}`
        );



        await interaction.reply({
            content:
                ` ${user} has been unmuted.\nReason: ${reason}`
        });


    }

};