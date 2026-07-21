const db = require("../database/database");
const noblox = require("noblox.js");


async function syncUsers(guild) {

    console.log("🔄 Synchronisiere Server-Nutzer...");


    const members = await guild.members.fetch();

    console.log(
        `👥 Discord hat ${members.size} Mitglieder geliefert`
    );


    const insert = db.prepare(`
        INSERT OR IGNORE INTO users (id)
        VALUES (?)
    `);


    const updateRoblox = db.prepare(`
        UPDATE users
SET
    robloxName = ?,
    robloxId = ?
WHERE id = ?
    `);



    let count = 0;


    for (const member of members.values()) {


        if (member.user.bot)
            continue;



        insert.run(member.id);

        count++;



        // Versuche Roblox-Namen automatisch zu finden

        try {


            const existing = db.prepare(`
    SELECT robloxId
    FROM users
    WHERE id = ?
`).get(member.id);


if (existing && existing.robloxId) {
    continue;
}


const robloxId =
    await noblox.getIdFromUsername(
        member.user.username
    );



            if (robloxId) {


                updateRoblox.run(
    member.user.username,
    robloxId,
    member.id
);


                console.log(
                    `🎮 ${member.user.username} → Roblox gefunden (${robloxId})`
                );
                db.prepare(`
    UPDATE users
    SET
        robloxName = ?,
        robloxId = ?
    WHERE id = ?
`).run(
    member.user.username,
    robloxId,
    member.id
);


            }



        } catch {

            // kein Roblox Account mit diesem Namen

        }



    }



    console.log(
        `✅ ${count} Nutzer synchronisiert`
    );

}



module.exports = {
    syncUsers
};