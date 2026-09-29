require("dotenv").config();

process.env.TZ = "Europe/Berlin";

const db = require("./database/database");

const {
    addHostedEvent,
    addAttendedEvent,
    addEventLog
} = require("./utils/databaseManager");



const { processEvent } = require("./utils/eventProcessor");
const { getSection, getUserIds } = require("./utils/eventParser");
const { OFFICER_ROLES, GUILD_ID } = require("./config/config");
const { loginRoblox } = require("./utils/roblox");
const newcomerHandler = require("./handlers/newcomer");
const { syncUsers } = require("./utils/userSync");
const { startPresenceTracker } = require("./utils/robloxPresence");

const {
    handleFactionMessage,
    handleFactionMessageUpdate,
    finalizeFactionSync
} = require("./utils/factionSync");

const {
    Client,
    GatewayIntentBits,
    Collection,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const mutteCooldown = new Map();


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});


client.commands = new Collection();


const commandFiles = fs.readdirSync("./commands")
    .filter(file => file.endsWith(".js"));


for (const file of commandFiles) {

    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);

}


client.once("ready", async () => {

    await loginRoblox();

    const guild = client.guilds.cache.get(process.env.GUILD_ID);

    if (!guild) {
        console.log("❌ Server nicht gefunden!");
        return;
    }

    await syncUsers(guild);

    startPresenceTracker(client);
    await checkOfficerPingPreferences(client);

    console.log(`✅ ${client.user.tag} ist online!`);
    scheduleDailyCleanup(client);
});



// Slash Commands + Buttons

client.on("interactionCreate", async interaction => {


    // BUTTON HANDLER
    if (interaction.isButton()) {
if (
    interaction.customId.startsWith("officer_ping_yes_") ||
    interaction.customId.startsWith("officer_ping_no_")
) {
    const parts = interaction.customId.split("_");
    const choice = parts[2];
    const userId = parts[3];

    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: "❌ These buttons are not for you.",
            ephemeral: true
        });
    }

    const preference = choice === "yes" ? "yes" : "no";

    db.prepare(`
        UPDATE officer_ping_preferences
        SET preference = ?
        WHERE discordId = ?
    `).run(preference, userId);

    const embed = new EmbedBuilder()
        .setTitle("Death Trooper Company Ping")
        .setDescription(
            "Do you want to ping the Death Trooper Company the next times you join the game?\n\n" +
            `**Current:** ${preference === "yes" ? "Yes" : "No"}`
        )
        .setColor(preference === "yes" ? "Green" : "Red");

    return interaction.update({
        embeds: [embed]
    });
}
        if (interaction.customId.startsWith("faction_sync_done_")) {
    return finalizeFactionSync(interaction);
}


        if (interaction.customId.startsWith("confirm_quota_reset_")) {


            const userId = interaction.customId.split("_")[3];


            const canResetQuota =
                interaction.user.id === "1221391460860035093" ||
                interaction.member.roles.cache.has("1430405883849867294");

            if (interaction.user.id !== userId || !canResetQuota) {

                return interaction.reply({
                    content: "❌ Only the person who started the reset can confirm it.",
                    ephemeral: true
                });

            }


            db.prepare(`
                UPDATE users
                SET
                    hostedEvents = 0,
                    attendedEvents = 0
            `).run();


            db.prepare(`
                DELETE FROM eventLogs
            `).run();



            return interaction.update({
                content:
                    "✅ Successfully reset all hosted events, attended events and event history.",
                components: []
            });

        }

    }



    // SLASH COMMAND HANDLER

    if (!interaction.isChatInputCommand()) return;


    const command = client.commands.get(interaction.commandName);


    if (!command) return;


  try {

    await command.execute(interaction);

} catch (error) {

    console.error(error);


    if (interaction.deferred || interaction.replied) {

        await interaction.editReply({
            content: "❌ There was a error with executing this command."
        });

    } else {

        await interaction.reply({
            content: "❌ There was a error with executing this command.",
            ephemeral: true
        });

    }

}

});





client.on("messageCreate", async message => {
    if (message.author.id === "1099382225516118076") {
    await handleFactionMessage(message);
    return;
}

if (message.author.bot) return;
console.log("Nachricht erkannt:", message.content);
        // FUN COMMAND: !mutte

    if (message.author.bot) return;

    await newcomerHandler(message);





    if (message.content.startsWith("!mutte")) {


        const allowedRole = "1506580506748125284";
        const allowedUser = "1221391460860035093";


        const hasPermission =
            message.author.id === allowedUser ||
            message.member.roles.cache.has(allowedRole);



        if (!hasPermission) return;

        const cooldown = 180; // Sekunden

const lastUse = mutteCooldown.get(message.author.id);

if (lastUse) {

    const elapsed = (Date.now() - lastUse) / 1000;

    if (elapsed < cooldown) {

        const remaining = Math.ceil(cooldown - elapsed);

        return message.reply(
            `Command is on cooldown for ${remaining} seconds.`
        );

    }

}

mutteCooldown.set(message.author.id, Date.now());



        const user = message.mentions.users.first();



        if (!user) {

            return message.reply(
                "❌ Please mention a user."
            );

        }



        await message.reply(
            `${user} has been mutted for an undefined amount of time. I am very sorry if AsheyOfc abused this command again..`
        );


    }

    if (message.author.bot) return;


    if (message.content !== "!logevent") return;



    const hasPermission =
    message.member.roles.cache.some(role =>
        OFFICER_ROLES.includes(role.id)
    );


    if (!hasPermission) return;



    if (!message.reference) return;



    const eventMessage = await message.channel.messages.fetch(
        message.reference.messageId
    );



    const eventType = getSection(
        eventMessage.content,
        "Event type:",
        "Hosted by:"
    ).trim();



    const messageLink = eventMessage.url;



    const hosted = getSection(
        eventMessage.content,
        "Hosted by:",
        "Supervised by:"
    );


    const supervised = getSection(
        eventMessage.content,
        "Supervised by:",
        "Attendees:"
    );


    const attendees = getSection(
        eventMessage.content,
        "Attendees:",
        "Note:"
    );



    const hostedUsers = getUserIds(hosted);

    const supervisedUsers = getUserIds(supervised);

    const attendeeUsers = getUserIds(attendees);



    const result = await processEvent(
        hostedUsers,
        supervisedUsers,
        attendeeUsers,
        message.guild
    );



    const saveEvent = db.transaction(() => {

        const alreadyLogged = db.prepare(`
            SELECT 1
            FROM loggedEvents
            WHERE messageId = ?
            UNION
            SELECT 1
            FROM eventLogs
            WHERE messageLink = ?
            LIMIT 1
        `).get(eventMessage.id, messageLink);

        if (alreadyLogged) return false;

        db.prepare(`
            INSERT INTO loggedEvents (messageId, messageLink)
            VALUES (?, ?)
        `).run(eventMessage.id, messageLink);
    for (const userId of result.hostedEvents) {


        addHostedEvent(userId);


        addEventLog(
            userId,
            eventType,
            "hosted",
            messageLink
        );


    }




    for (const userId of result.attendedEvents) {


        addAttendedEvent(userId);


        addEventLog(
            userId,
            eventType,
            "attended",
            messageLink
        );


    }



        return true;

    });

    const wasSaved = saveEvent();

    if (!wasSaved) {

        return message.reply("❌ This event has already been logged.");

    }
    console.log("✅ Daten gespeichert");


    await eventMessage.react("✅");



    const reply = await message.reply("Event logged");


    setTimeout(async () => {

        await reply.delete().catch(() => {});
        await message.delete().catch(() => {});

    }, 5000);



});

client.on("messageUpdate", async (oldMessage, newMessage) => {
    if (newMessage.author?.id !== "1099382225516118076") {
        return;
    }

    await handleFactionMessageUpdate(newMessage);
});


client.on("guildMemberAdd", async member => {

    if (member.user.bot) return;

    const insert = db.prepare(`
        INSERT OR IGNORE INTO users (id)
        VALUES (?)
    `);

    insert.run(member.id);

    console.log(`➕ Neuer Nutzer synchronisiert: ${member.user.tag}`);

});

const CLEANUP_CHANNEL = "1430773368080306268";

const PROTECTED_MESSAGE = "1467334166160085195";

const PROTECTED_ROLES = [
    "1467012368704999455",
    "1430405883849867294"
];

async function cleanupChannel(client) {

    try {

        const channel = await client.channels.fetch(CLEANUP_CHANNEL);

        if (!channel || !channel.isTextBased()) return;

        let lastId = null;

        while (true) {

            const messages = await channel.messages.fetch({
                limit: 100,
                before: lastId ?? undefined
            });

            if (messages.size === 0) break;

            for (const message of messages.values()) {

                if (message.id === PROTECTED_MESSAGE) continue;

                let keep = false;

try {

    const member = await channel.guild.members.fetch(message.author.id);

    keep = member.roles.cache.some(role =>
        PROTECTED_ROLES.includes(role.id)
    );

} catch {
    keep = false;
}

                if (keep) continue;

                try {

                    await message.delete();

                } catch (err) {

                    console.log(`Konnte Nachricht ${message.id} nicht löschen.`);

                }

            }

            lastId = messages.last().id;

        }

        console.log("✅ Daily channel cleanup completed.");

    } catch (err) {

        console.error("Cleanup Error:", err);

    }

}

async function assignDailyRole(client) {
    const DAILY_ROLE = "1438416966397202553";

    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);

        if (!guild) {
            console.error("❌ Guild not found for daily role assignment.");
            return;
        }

        const role = await guild.roles.fetch(DAILY_ROLE);

        if (!role) {
            console.error(`❌ Daily role ${DAILY_ROLE} not found.`);
            return;
        }

        const members = await guild.members.fetch();

        let added = 0;
        let alreadyHad = 0;
        let failed = 0;

        for (const member of members.values()) {
            if (member.user.bot) continue;

            if (member.roles.cache.has(DAILY_ROLE)) {
                alreadyHad++;
                continue;
            }

            try {
                await member.roles.add(role);
                added++;
            } catch (err) {
                failed++;
                console.error(
                    `❌ Could not give daily role to ${member.user.tag}:`,
                    err.message
                );
            }
        }

        console.log(
            `✅ Daily role assignment completed. Added: ${added}, Already had: ${alreadyHad}, Failed: ${failed}`
        );
    } catch (err) {
        console.error("Daily role assignment error:", err);
    }
}

async function checkOfficerPingPreferences(client) {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);

        if (!guild) {
            console.error("❌ Guild not found for officer ping preference check.");
            return;
        }

        const members = await guild.members.fetch();

        const officers = members.filter(member =>
            !member.user.bot &&
            member.roles.cache.some(role =>
                OFFICER_ROLES.includes(role.id)
            )
        );

        let checked = 0;
        let sent = 0;

        for (const member of officers.values()) {
            checked++;

            let preference = db.prepare(`
                SELECT discordId, preference, dmSent
                FROM officer_ping_preferences
                WHERE discordId = ?
            `).get(member.id);

            if (!preference) {
                db.prepare(`
                    INSERT INTO officer_ping_preferences
                    (discordId, preference, dmSent)
                    VALUES (?, 'yes', 0)
                `).run(member.id);

                preference = {
                    discordId: member.id,
                    preference: "yes",
                    dmSent: 0
                };
            }

            if (preference.dmSent === 1) {
                continue;
            }

            const embed = new EmbedBuilder()
                .setTitle("Death Trooper Company Ping")
                .setDescription(
                    "Do you want to ping the Death Trooper Company the next times you join the game?\n\n" +
                    `**Current:** ${preference.preference === "yes" ? "Yes" : "No"}`
                )
                .setColor("Blue");

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`officer_ping_yes_${member.id}`)
                        .setLabel("Yes")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`officer_ping_no_${member.id}`)
                        .setLabel("No")
                        .setStyle(ButtonStyle.Danger)
                );

            try {
                await member.send({
                    embeds: [embed],
                    components: [buttons]
                });

                db.prepare(`
                    UPDATE officer_ping_preferences
                    SET dmSent = 1
                    WHERE discordId = ?
                `).run(member.id);

                sent++;

                console.log(
                    `📩 Officer ping preference DM sent to ${member.user.tag}`
                );

            } catch (error) {
                console.error(
                    `❌ Could not DM ${member.user.tag}:`,
                    error.message
                );
            }
        }

        console.log(
            `✅ Officer ping preference check completed. Officers: ${checked}, DMs sent: ${sent}`
        );

    } catch (error) {
        console.error("Officer ping preference check error:", error);
    }
}

function scheduleDailyCleanup(client) {

    const now = new Date();

    const next = new Date();

    next.setHours(23, 0, 0, 0);

    if (next <= now) {

        next.setDate(next.getDate() + 1);

    }

    const delay = next.getTime() - now.getTime();

    setTimeout(async () => {

        await cleanupChannel(client);
        await assignDailyRole(client);
        await checkOfficerPingPreferences(client);
        scheduleDailyCleanup(client);

    }, delay);

}

client.login(process.env.TOKEN);