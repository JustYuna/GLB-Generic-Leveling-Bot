// -- Certified Yuna Index.js -- //

// Required
const ENV = require("dotenv").config().parsed;
const { GetRate, AddRate } = require("./Utilities/Functional/Ratelimit");
const LoadModules = require("./Utilities/Functional/LoadModules");
const { ActivityType, Client, GatewayIntentBits, Options, ReactionCollector } = require("discord.js");
const Config = require("./Core/Config");
const { initDB, GetAsync, SetAsync, AddToAsync } = require("./Datastore/Datastore");

/*
* const OnCommand = require("./Core/-")
* const OnMessage = require("./Core/-");
*/

// Variables
const Colors = Config.CONSOLE_COLORS;

// Setup DB
initDB().catch(console.error);

// Create Client
const Bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    makeCache: Options.cacheWithLimits({
        MessageManager: 50,       // keep messages small
        UserManager: 1000,        // max 1000 users in cache
        GuildMemberManager: 500,  // max 500 members per guild
        ThreadManager: 0,        // limit threads per channel
    })
});

// Yuna Print / Client Status / Memory Monitoring
Bot.once("clientReady", async() => {
    const version = require('../package.json').version;
    const tag = Bot?.user?.tag || 'Starting...';

    console.log();
    console.log(Colors.GREEN + '╔═══════════════════════════════════════════════════════════════════════════════╗' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.MAGENTA + '  ██╗   ██╗██╗   ██╗███╗   ██╗ █████╗       ██████╗ ██████╗ ██████╗ ███████╗' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.MAGENTA + '  ╚██╗ ██╔╝██║   ██║████╗  ██║██╔══██╗     ██╔════╝██╔═══██╗██╔══██╗██╔════╝' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.MAGENTA + '   ╚████╔╝ ██║   ██║██╔██╗ ██║███████║     ██║     ██║   ██║██║  ██║█████╗  ' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.MAGENTA + '    ╚██╔╝  ██║   ██║██║╚██╗██║██╔══██║     ██║     ██║   ██║██║  ██║██╔══╝  ' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.MAGENTA + '     ██║   ╚██████╔╝██║ ╚████║██║  ██║     ╚██████╗╚██████╔╝██████╔╝███████╗' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.MAGENTA + '     ╚═╝    ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝      ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.RESET);
    console.log(Colors.GREEN + '╠═══════════════════════════════════════════════════════════════════════════════╣' + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.CYAN + Colors.BOLD + `  Running Version: ${version}` + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.BLUE + `  Developed and maintained by Yuna2077` + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.GRAY + `  Mode: 🚀 Production` + Colors.RESET);
    console.log(Colors.GREEN + '║' + Colors.YELLOW + `  Logged in as: ${tag}` + Colors.RESET);
    console.log(Colors.GREEN + '╚═══════════════════════════════════════════════════════════════════════════════╝' + Colors.RESET);
    console.log();

    Bot.user.setPresence({
        activities: [{
            name: "Overseeing chat",
            type: ActivityType.Watching
        }],
        status: "Overseeing Chat"
    });

    setInterval(() => {
        const usage = process.memoryUsage();

        if (Config.DEBUG.MEMORY)
            console.log({
                rss: (usage.rss / 1024 / 1024).toFixed(2) + " MB",
                heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + " MB",

                guilds: Bot.guilds.cache.size,
                users: Bot.users.cache.size,
                channels: Bot.channels.cache.size
            });

        if (usage > Config.LIMIT.MEMORY) {
            console.log("Memory limit exceeded, shutting down.");
            process.exit(1);
        };
    }, 10000);
})

// Handling Messages
Bot.on("messageCreate", async(recieved) => {
    if (!recieved || recieved.author.bot) return;

    const Data = {
        AuthorID: recieved.author.id,
        GuildID: recieved.guild.id,
        GuildOwnerID: recieved.guild.ownerId
    };

    if (Config.DEBUG.MESSAGES) {
        console.log(Colors.BLUE + "Message Recieved:" + Colors.RESET + `\nAuthor ID: ${recieved.author.id}\nGuild ID: ${recieved.guild.id}\nGuild Owner ID: ${recieved.guild.ownerId}`);
    };

    const DateJoined = await GetAsync(Data.AuthorID, "DATE_JOINED");

    if (DateJoined === "NULL") {
        if (Config.DEBUG.NEW_USER) {
            console.log(Colors.GREEN + "New user successfully indexed" + Colors.RESET)
        };

        await SetAsync(Data.AuthorID, { "DATE_JOINED": `${Date.now()}` });
    };

    const ServerData = await GetAsync(Data.AuthorID, "DATA_FROM_SERVERS") || {};
    let LevelData = ServerData[Data.GuildID];

    if (!LevelData) {
        if (Config.DEBUG.NEW_GUILD_FOR_USER) {
            console.log(Colors.GREEN + "Indexing new guild for user with id:" + Colors.BLUE + ` ${Data.AuthorID} ` + Colors.RESET);

            ServerData[Data.GuildID] = { XP: 0, LEVEL: 0, MESSAGES: 0 };
            LevelData = ServerData[Data.GuildID];
            await SetAsync(Data.AuthorID, { "DATA_FROM_SERVERS": ServerData })
        }
    };

    console.log(ServerData);
});

// Handling Interactions
Bot.on("interactionCreate", async(interaction) => {

});

// Login
if (ENV.TOKEN) {
    Bot.login(ENV.TOKEN);
    console.log(Colors.GREEN + "Logged in successfully" + Colors.RESET);
} else {
    console.log(Colors.RED + "[ERROR]: " + Colors.RESET + "NO TOKEN SET IN ENV.");
};