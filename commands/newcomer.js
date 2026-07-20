const {
    OFFICER_ROLES,
    NEWCOMER_ROLES
} = require("../config/config");


const {
    getRobloxUserId,
    getJoinRequest,
    acceptJoinRequest,
    getAccountAge
} = require("../utils/roblox");


const { SlashCommandBuilder } = require("discord.js");


const NEWCOMER_LOG_CHANNEL =
    "1506223917596151828";



async function sendNewcomerLog(
    guild,
    content
) {

    const channel =
        guild.channels.cache.get(
            NEWCOMER_LOG_CHANNEL
        );


    if (!channel) {

        console.error(
            "❌ Newcomer log channel not found."
        );

        return;

    }


    await channel.send(content);

}



module.exports = {

    data: new SlashCommandBuilder()
        .setName("newcomer")
        .setDescription("Accept a user into the Roblox group."),



    async execute(message) {


        const hasPermission =
            message.member.roles.cache.some(role =>
                OFFICER_ROLES.includes(role.id)
            );


        if (!hasPermission) return;



        const user =
            message.mentions.users.first();



        if (!user) {

            return message.reply(
                "❌ Please mention a user."
            );

        }



        const member =
            await message.guild.members.fetch(user.id);



        const robloxName =
            member.displayName;



        const robloxUserId =
            await getRobloxUserId(robloxName);



        if (!robloxUserId) {

            return message.reply(
                "❌ Roblox user not found."
            );

        }



        const accountAge =
            await getAccountAge(robloxUserId);



        if (accountAge === null) {

            return message.reply(
                "❌ Could not get Roblox account age."
            );

        }



        const accountAgePassed =
            accountAge >= 100;



        const request =
            await getJoinRequest(robloxUserId);



        const groupRequestPassed =
            request !== null;



        if (!accountAgePassed || !groupRequestPassed) {


            await sendNewcomerLog(
                message.guild,
`**❌ Newcomer Failed**

Target: ${user}
Roblox User: ${robloxName}
Roblox Account Age: ${accountAge} days
Ran by: ${message.author}

Requirements:
Account Age: ${accountAgePassed ? "✅" : "❌"}
Group Request: ${groupRequestPassed ? "✅" : "❌"}

Result: **FAILED**`
            );



            const reply =
                await message.reply(
                    "❌ Newcomer requirements not met."
                );


            setTimeout(async () => {

                await reply.delete().catch(() => {});
                await message.delete().catch(() => {});


            }, 5000);



            return;

        }



        await acceptJoinRequest(request);



        for (const roleId of NEWCOMER_ROLES) {


            const role =
                message.guild.roles.cache.get(roleId);



            if (role) {

                await member.roles.add(role);

            }

        }



        await sendNewcomerLog(
            message.guild,
`**✅ Newcomer Accepted**

Target: ${user}
Roblox User: ${robloxName}
Roblox Account Age: ${accountAge} days
Ran by: ${message.author}

Requirements:
Account Age: ✅
Group Request: ✅

Result: **PASSED**`
        );



        const reply =
            await message.reply(
                `${user} got accepted into the group.`
            );



        setTimeout(async () => {


            await reply.delete().catch(() => {});

            await message.delete().catch(() => {});


            if (message.reference) {


                const original =
                    await message.channel.messages.fetch(
                        message.reference.messageId
                    )
                    .catch(() => null);



                if (original) {

                    await original.delete()
                        .catch(() => {});

                }

            }


        }, 5000);



    }

};