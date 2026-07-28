// -- Certified Yuna Index.js -- //

// Required
const ENV = require("dotenv").config().parsed;
const { GetRate, AddRate } = require("./Utilities/Functional/Ratelimit");
const LoadModules = require("./Utilities/Functional/LoadModules");
const { ActivityType, Client, GatewayIntentBits, Options, ReactionCollector, AuthorizingIntegrationOwners, Guild } = require("discord.js");
const Config = require("./Core/Config");
const { initDB, GetAsync, SetAsync, AddToAsync } = require("./Datastore/Datastore");
const { CheckMissingValues } = require("./Utilities/Functional/CommandHelper");

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
async function YunaPrint() {
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
}

Bot.once("clientReady", async() => {
    const version = require('../package.json').version;
    const tag = Bot?.user?.tag || 'Starting...';

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

// Helper
async function ReplyMessage(recieved, string) {
    try {
        await recieved.reply(string);
    } catch (error) {
        console.log(Colors.RED + `Failed to send level up message with error:\n${error}`);
    };
};

async function PraseLevelUpMessage({ UserName, UserNick, UserId, Level, Message }) {
    const Context = {
        user_nick: UserNick,
        user_name: UserName,
        user_ping: `<@${UserId}>`,
        level_new: Level,
        level_old: Level - 1,
    };

    let Result = Message;
    let Previous;

    do {
        Previous = Result;
        Result = Result.replace(/{(\w+)}/g, (match, key) => {
            return Context[key] !== undefined ? Context[key] : match;
        });
    } while (Result !== Previous);

    return Result;
}

const CommandFunctions = {
    "test": async ({ Data, GuildSettings }) => {
        const RandomLevel = Math.round(Math.random() * 50);
        const Message = await PraseLevelUpMessage({
            UserName: Data.AuthorName,
            UserNick: Data.AuthorNick,
            UserId: Data.AuthorID,
            Level: RandomLevel,
            Message: GuildSettings.LEVEL_UP_MESSAGE
        });

        if (GuildSettings.LEVEL_UP_CHANNEL === "NULL") {
            ReplyMessage(Data.Recieved, Message)
        } else {
            Bot.channels.get(GuildSettings.LEVEL_UP_CHANNEL);
        };
    },

    "level-up-message": async ({ Data, GuildSettings, Arguments }) => {
        const Message = Arguments.join(" ");

        GuildSettings = {
            LEVEL_UP_MESSAGE: Message,
            LEVEL_UP_CHANNEL: GuildSettings.LEVEL_UP_CHANNEL
        };
        console.log(GuildSettings);
        await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings })

        Data.Recieved.reply(`New message set to:\n'${Message}'\n Use !settings test to test the message out.`)
    },
};

Bot.on("messageCreate", async(recieved) => {
    // Ignore null and bot recievers
    if (!recieved || recieved.author.bot) return;

    const Data = {
        AuthorName: recieved.author.username,
        AuthorNick: recieved.author.globalName,
        AuthorID: recieved.author.id,
        GuildID: recieved.guild.id,
        GuildDataID: `Guild-${recieved.guild.id}`,
        GuildOwnerID: recieved.guild.ownerId,
        Content: recieved.content,
        Recieved: recieved,
    };

    let GuildSettings = await GetAsync(Data.GuildDataID, "SETTINGS");
    const SettingValidateError = await CheckMissingValues(GuildSettings, {
        requiredProps: ["LEVEL_UP_MESSAGE", "LEVEL_UP_CHANNEL"],
        typeChecks: {
            LEVEL_UP_MESSAGE: "string",
            LEVEL_UP_CHANNEL: "string"
        },
        minValues: []
    });

    if (SettingValidateError.needsReset) {
        GuildSettings = {
            LEVEL_UP_MESSAGE: Config.FALLBACK.LEVEL_UP_MESSAGE,
            LEVEL_UP_CHANNEL: "NULL"
        };
        await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings })
    };

    // Handle settings
    if (Data.Content.startsWith(Config.PREFIX.SETTINGS)) {
        if (Data.AuthorID !== Data.GuildOwnerID) {
            ReplyMessage("You must be the owner to change settings.");
            return;
        };

        const Arguments = Data.Content.slice(`${Config.PREFIX.SETTINGS}`.lenght).trim().split(/ +/);
        const CommandName = Arguments[1];
        Arguments.shift();  Arguments.shift();
    
        if (Config.DEBUG.IS_CHANGING_SETTINGS) console.log(Colors.BLUE + "User is changing server settings:" + Colors.RESET + `
User ID: ${Data.AuthorID}
Guild ID: ${Data.GuildID}
Setting: ${CommandName}`);

        if (CommandFunctions[CommandName]) {
            CommandFunctions[CommandName]({ Data: Data, GuildSettings: GuildSettings, Arguments: Arguments });
        };

        return;
    };

    // Ignore a set list of Prefix's
    const Prefix = Data.Content.slice(0, 1);
    let Ignored = false;

    for (const Ignore of Config.PREFIX.IGNORE) {
        if (Prefix === Ignore) {
            Ignored = true;
            break;
        };
    };

    if (Ignored) {
        if (Config.DEBUG.MESSAGE_IGNORED) console.log(Colors.RED + ` Message rejected with prefix: ${Prefix}` + Colors.RESET);
        return;
    };

    if (Config.DEBUG.MESSAGES) console.log(Colors.BLUE + "Message Recieved:" + Colors.RESET + `\nAuthor ID: ${recieved.author.id}\nGuild ID: ${recieved.guild.id}\nGuild Owner ID: ${recieved.guild.ownerId}`);

    const DateJoined = await GetAsync(Data.AuthorID, "DATE_JOINED");

    if (DateJoined === "NULL") {
        if (Config.DEBUG.NEW_USER) console.log(Colors.GREEN + "New user successfully indexed" + Colors.RESET);

        await SetAsync(Data.AuthorID, { "DATE_JOINED": `${Date.now()}` });
    };

    const ServerData = await GetAsync(Data.AuthorID, "DATA_FROM_SERVERS") || {};
    let LevelData = ServerData[Data.GuildID];

    if (!LevelData) {
        if (Config.DEBUG.NEW_GUILD_FOR_USER) console.log(Colors.GREEN + "Indexing new guild for user with id:" + Colors.BLUE + ` ${Data.AuthorID} ` + Colors.RESET);

        ServerData[Data.GuildID] = { XP: 0, LEVEL: 0, MESSAGES: 0 };
        LevelData = ServerData[Data.GuildID];
        await SetAsync(Data.AuthorID, { "DATA_FROM_SERVERS": ServerData });
    };

    LevelData.XP += 15;
    LevelData.MESSAGES++;
    const ExperienceNeeded = 100 * (1 + LevelData.LEVEL);

    if (LevelData.XP >= ExperienceNeeded) {
        LevelData.XP = 0;
        LevelData.LEVEL++;

        if (Config.DEBUG.LEVEL_UP) console.log(Colors.GREEN + `Level up!${Colors.RESET}\nUser ID: ${Data.AuthorID}\nLevel: ${LevelData.LEVEL}`);

        const Message = await PraseLevelUpMessage({
            UserName: Data.AuthorName,
            UserNick: Data.AuthorNick,
            UserId: Data.AuthorID,
            Level: LevelData.LEVEL,
            Message: GuildSettings.LEVEL_UP_MESSAGE
        });

        if (GuildSettings.LEVEL_UP_CHANNEL === "NULL") {
            ReplyMessage(Data.Recieved, Message)
        } else {
            Bot.channels.get(GuildSettings.LEVEL_UP_CHANNEL);
        };
    };

    LevelData = ServerData[Data.GuildID];
    await SetAsync(Data.AuthorID, { "DATA_FROM_SERVERS": ServerData });
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