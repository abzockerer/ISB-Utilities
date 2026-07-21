const {
    EmbedBuilder
} = require("discord.js");

const axios = require("axios");

const db = require("../database/database");

const {
    OFFICER_ROLES
} = require("../config/config");


const GAME_ID = 4238077359;
const LOG_CHANNEL = "1476780414059151362";


const RANKS = {

    "1430405883849867294": "HiCOM",
    "1482858985559298058": "Major",
    "1437914178479325225": "Captain",
    "1482858660609921277": "Lieutenant",
    "1521010747155550328": "CET Overseer",
    "1519575872250843246": "CET Officer"

};



function getRank(member) {

    for (const role of member.roles.cache.values()) {

        if (RANKS[role.id]) {
            return `<@&${role.id}>`;
        }

    }

    return "Unknown";

}





async function startPresenceTracker(client) {


setInterval(async () => {


    try {


        const guild =
            client.guilds.cache.get(process.env.GUILD_ID);


        if (!guild) return;


        const channel =
            guild.channels.cache.get(LOG_CHANNEL);


        if (!channel) return;




        const officers =
            guild.members.cache.filter(member =>
                member.roles.cache.some(role =>
                    OFFICER_ROLES.includes(role.id)
                )
            );



        const robloxIds = [];
        const officerData = [];
        console.log(
    "Officers erkannt:",
    officers.map(o => o.user.username)
);



        for (const member of officers.values()) {


            const userData = db.prepare(`
                SELECT robloxId, robloxName
                FROM users
                WHERE id = ?
            `).get(member.id);

            console.log(
    "DB USER:",
    member.user.username,
    userData
);



            if (!userData || !userData.robloxId) {

                continue;

            }



            robloxIds.push(userData.robloxId);


            officerData.push({
                member,
                robloxId: userData.robloxId
            });


        }



        if (robloxIds.length === 0) return;



        const presence =
            await axios.post(
                "https://presence.roblox.com/v1/presence/users",
                {
                    userIds: robloxIds
                }
            );



        for (const data of officerData) {


            const member = data.member;
            const robloxId = data.robloxId;



            const userPresence =
                presence.data.userPresences.find(
                    p => p.userId == robloxId
                );
                console.log(
    "ROBLOX PRESENCE:",
    member.user.username,
    userPresence
);



            const inGame =
                userPresence &&
                userPresence.placeId == GAME_ID;



            const old =
                db.prepare(`
                    SELECT *
                    FROM presence_logs
                    WHERE discordId = ?
                `).get(member.id);






            // JOIN

            if (inGame && (!old || old.status === "offline")) {


                const now = Date.now();



                const embed =
                    new EmbedBuilder()

                    .setTitle(
                        `${member.displayName} has joined the game!`
                    )

                    .setDescription(

`
**Rank:** ${getRank(member)}

[View Profile](https://www.roblox.com/users/${robloxId}/profile)

**Status:** 🟢 In-game since <t:${Math.floor(now/1000)}:R>
`

                    )

                    .setColor("Green");



                const msg =
                    await channel.send({
                        embeds:[embed]
                    });



                db.prepare(`
                    INSERT OR REPLACE INTO presence_logs
                    (
                        discordId,
                        robloxId,
                        status,
                        joinMessageId,
                        lastChange
                    )
                    VALUES (?, ?, ?, ?, ?)
                `)
                .run(
                    member.id,
                    robloxId,
                    "online",
                    msg.id,
                    now
                );


            }





            // LEAVE

            if (!inGame && old && old.status === "online") {


                const now = Date.now();



                const leaveEmbed =
                    new EmbedBuilder()

                    .setTitle(
                        `${member.displayName} has left the game.`
                    )

                    .setDescription(

`
**Rank:** ${getRank(member)}

[View Profile](https://www.roblox.com/users/${old.robloxId}/profile)

**Status:** 🔴 Offline since <t:${Math.floor(now/1000)}:R>
`

                    )

                    .setColor("Red");



                await channel.send({
                    embeds:[leaveEmbed]
                });



                try {


                    const oldMessage =
                        await channel.messages.fetch(
                            old.joinMessageId
                        );



                    const oldEmbed =
                        EmbedBuilder.from(
                            oldMessage.embeds[0]
                        );



                    oldEmbed.setDescription(

`
**Rank:** ${getRank(member)}

[View Profile](https://www.roblox.com/users/${old.robloxId}/profile)

**Status:** 🔴 Offline since <t:${Math.floor(now/1000)}:R>
`

                    );



                    await oldMessage.edit({
                        embeds:[
                            oldEmbed
                        ]
                    });



                } catch {}



                db.prepare(`
                    UPDATE presence_logs
                    SET status='offline',
                    lastChange=?
                    WHERE discordId=?
                `)
                .run(
                    now,
                    member.id
                );


            }


        }




    } catch(error) {


        console.error(
            "Presence Tracker Fehler:",
            error
        );


    }


},15000);


}



module.exports = {
    startPresenceTracker
};