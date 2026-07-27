// -- Certified Yuna Index.js -- //

// Required
const ENV = require("dotenv").config().parsed;
const { GetRate, AddRate } = require("./Utilities/Functional/Ratelimit");
const LoadModules = require("./Utilities/Functional/LoadModules");
const { ActivityType, Client, GatewayIntentBits, Options } = require("discord.js");
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
Bot.on("messageCreate", async(Data) => {
    if (!Data || !Data.client) return;

    const User = {
        Client = Data.client,
    }

    console.log(User);
    console.log(User.Client);
});

// Handling Interactions
Bot.on("interactionCreate", async(interaction) => {

})

// Login
if (ENV.TOKEN) {
    Bot.login(ENV.TOKEN);
} else {
    console.log(Colors.RED + "[ERROR]: " + Colors.RESET + "NO TOKEN SET IN ENV.")
}