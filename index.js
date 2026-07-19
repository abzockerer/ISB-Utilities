require("dotenv").config();

const db = require("./database/database");

const {
    addHostedEvent,
    addAttendedEvent,
    addEventLog
} = require("./utils/databaseManager");

const { processEvent } = require("./utils/eventProcessor");
const { getSection, getUserIds } = require("./utils/eventParser");
const { OFFICER_ROLES } = require("./config/config");

const {
    Client,
    GatewayIntentBits,
    Collection
} = require("discord.js");

const fs = require("fs");


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


client.once("ready", () => {

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





client.on("messageCreate", async message => {


    if (message.author.bot) return;


    if (message.content !== "!logevent") return;



    const hasPermission =
        message.member.roles.cache.some(role =>
            OFFICER_ROLES.includes(role.id)
        ) ||
        message.member.roles.cache.has("1430405883849867294");


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



client.login(process.env.TOKEN);