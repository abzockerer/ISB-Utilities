const { SlashCommandBuilder } = require("discord.js");

const {
    startFactionSync
} = require("../utils/factionSync");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("syncingamerole")
        .setDescription("Synchronizes the faction game role."),

    async execute(interaction) {
        await startFactionSync(interaction);
    }
};