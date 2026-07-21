require("dotenv").config();

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
    Client,
    GatewayIntentBits,
    Collection
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

    console.log(`✅ ${client.user.tag} ist online!`);

});



// Slash Commands + Buttons

client.on("interactionCreate", async interaction => {


    // BUTTON HANDLER
    if (interaction.isButton()) {


        if (interaction.customId.startsWith("confirm_quota_reset_")) {


            const userId = interaction.customId.split("_")[3];


            if (interaction.user.id !== userId) {

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



client.on("guildMemberAdd", async member => {

    if(member.user.bot) return;


    db.prepare(`
        INSERT OR IGNORE INTO users (id)
        VALUES (?)
    `).run(member.id);


    console.log(
        `✅ Neuer Nutzer gespeichert: ${member.user.tag}`
    );

});

client.on("messageCreate", async message => {
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



    console.log("✅ Daten gespeichert");


    await eventMessage.react("✅");



    const reply = await message.reply("Event logged");


    setTimeout(async () => {

        await reply.delete().catch(() => {});
        await message.delete().catch(() => {});

    }, 5000);



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

client.login(process.env.TOKEN);