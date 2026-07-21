const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/database");
const { OFFICER_ROLES } = require("../config/config");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Shows the event leaderboard."),


    async execute(interaction) {

        try {

            // SOFORT antworten, bevor irgendetwas lange dauert
            await interaction.deferReply();


            const users = db.prepare(
                "SELECT * FROM users"
            ).all();


            let hosted = [];
            let attended = [];


            // bereits geladene Mitglieder benutzen
            const members = interaction.guild.members.cache;



            for (const user of users) {


                const member = members.get(user.id);


                if (!member)
                    continue;



                const isOfficer =
                    member.roles.cache.some(role =>
                        OFFICER_ROLES.includes(role.id)
                    );



                if (isOfficer) {


                    hosted.push({

                        name: member.displayName,

                        amount:
                            user.hostedEvents || 0

                    });


                } else {


                    attended.push({

                        name: member.displayName,

                        amount:
                            user.attendedEvents || 0

                    });


                }


            }



            hosted.sort(
                (a,b)=>b.amount-a.amount
            );


            attended.sort(
                (a,b)=>b.amount-a.amount
            );



            let response =
                "🏆 **Leaderboard**\n\n";



            response +=
                "**Hosted Events:**\n";



            hosted
            .slice(0,5)
            .forEach((user,index)=>{


                response +=
                `${index+1}. ${user.name} - ${user.amount} Events hosted\n`;


            });



            response +=
                "\n**Attended Events:**\n";



            attended
            .slice(0,5)
            .forEach((user,index)=>{


                response +=
                `${index+1}. ${user.name} - ${user.amount} Events attended\n`;


            });



            await interaction.editReply(response);



        } catch(error) {


            console.error(
                "Leaderboard Fehler:",
                error
            );


            if (interaction.deferred) {

                await interaction.editReply(
                    "❌ Fehler beim Laden des Leaderboards."
                );

            }


        }


    }

};