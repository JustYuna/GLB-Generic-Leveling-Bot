const { Routes } = require('discord-api-types/v10');
const commands = require('../onCommand');

async function refreshCommands(restClient, clientID) {
    if (!restClient || typeof restClient.put !== 'function') {
        console.error('❌ Error: The rest client passed does not have a .put() method.');
        return;
    }

    try {
        console.log('Refreshing application (/) commands...');

        // Convert:
        // {
        //   bonk: { data: {...}, settings: {...}, run: fn },
        //   randomvideo: { data: {...}, settings: {...}, run: fn }
        // }
        // into:
        // [ {...}, {...} ]
        const formatted = Object.values(commands).map(cmd => ({
            ...cmd.data,

            // Allow command usage in DMs and user installs
            dm_permission: true,
            integration_types: [0, 1], // Guild install + User install
            contexts: [0, 1, 2]       // Guilds + Bot DMs + Group DMs
        }));

        console.log("Requested payload:", formatted);
        return formatted
    } catch (err) {
        console.error('❌ Error refreshing commands:', err);
    }
}

module.exports = refreshCommands;