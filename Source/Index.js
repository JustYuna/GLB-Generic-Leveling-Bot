// -- Certified Yuna Index.js -- //

// Required
const Token = require("../env");
const { setCooldown, checkCooldown } = require("./Utilities/Functional/Cooldown");
const LoadModules = require("./Utilities/Functional/LoadModules");
const { REST } = require("@discordjs/rest");
const {
    ActivityType,
    Client,
    GatewayIntentBits,
    Options,
    ReactionCollector,
    AuthorizingIntegrationOwners,
    Guild,
    EmbedBuilder

} = require("discord.js");
const Config = require("./Core/Config");
const { initDB, GetAsync, SetAsync, AddToAsync } = require("./Datastore/Datastore");
const { CheckMissingValues } = require("./Utilities/Functional/CommandHelper");
const CacheMaid = require("./Utilities/Functional/CacheMaid");
const ParseString = require("./Utilities/Functional/ParseString");
const RefreshCommands = require("./Utilities/Functional/RefreshCommands");

// Variables
const Colors = Config.CONSOLE_COLORS;
const RestClient = new REST({ version: "10" }).setToken(Token.TOKEN);

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
        ThreadManager: 2,        // limit threads per channel
    })
});

// Yuna Print / Client Status / Memory Monitoring
async function YunaPrint() {
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
};

Bot.once("clientReady", async() => {
    YunaPrint();

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

// #region Handling Messages

// Helper
async function ReplyMessage(Recieved, String, ChannelID) {
    if (ChannelID === "REMOVE") return;

    if (!ChannelID || ChannelID === "NULL") {
        try {
            await Recieved.reply(String);
        } catch (error) {
            console.log(Colors.RED + `Failed to send level up message with error:\n${error}`);
        };

    } else {
        const Channel = await Bot.channels.fetch(ChannelID);

        // Fallback to normal reply
        if (!Channel) {
            ReplyMessage(Recieved, String)
        };

        const CanRead = await Recieved.guild.members.me?.permissionsIn(Channel).has("READ_MESSAGE_HISTORY");
        const CanSend = await Recieved.guild.members.me?.permissionsIn(Channel).has("SEND_MESSAGES");

        if (CanRead || CanSend) {
            await Channel.send(String);
        } else {
            ReplyMessage(Recieved, String + `\nError with set-channel: ${error}`);
        };
    };
};

const LevelSaveMap = CacheMaid.new("LevelSaveMap");
async function GetExperienceNeeded({ GuildSettings, Level }) {
    const ExperienceCalculation = GuildSettings.EXPERIENCE_CALCULATION;
    if (!LevelSaveMap.map[ExperienceCalculation]) LevelSaveMap.map[GuildSettings.EXPERIENCE_CALCULATION] = {};

    const LevelMap = LevelSaveMap.map[ExperienceCalculation];

    if (LevelMap[Level]) {
        return LevelMap[Level];
    } else {
        let Needed = 100; // Fallback to 100 of non match

        // Credit to Arcane for math formulas, cause i wanna be lazy.
        switch (ExperienceCalculation) {
            case "LINEAR": {
                Needed = (Level * 100) + 75;
                LevelMap[Level] = Needed;
                return Needed;
            }

            case "EXPONENTIAL": {
                Needed = 5 * (Level^2) + (Level * 50) + 75;
                LevelMap[Level] = Needed;
                return Needed;
            }

            case "FLAT": {
                LevelMap[Level] = 1000;
                return 1000;
            }

            case "NORMAL": {
                Needed = 100 * (1 + Level);
                LevelMap[Level] = Needed;
                return Needed;
            }
        };
    };
};


/**
 * Returns the level up message with only GuildSettings and Data as input.
 *
 * @param {string} GuildSettings
 * @param {object} Data
 */
async function GetLevelUpMessage(GuildSettings, Data) {
    const Context = {
        "{user_nick}": Data.AuthorNick,
        "{user_name}": Data.AuthorName,
        "{user_ping}": `<@${Data.AuthorID}>`,
        "{level_new}": Data.Level,
        "{level_old}": (Data.Level - 1)
    };

    return await ParseString(GuildSettings.LEVEL_UP_MESSAGE, Context);
};

const CommandFunctions = {
    "test": async ({ Data, GuildSettings }) => {
        const RandomLevel = Math.round(Math.random() * 50);
        const Message = await GetLevelUpMessage(GuildSettings, {
            AuthorName: Data.AuthorName,
            AuthorNick: Data.AuthorNick,
            AuthorID: Data.AuthorID,
            Level: RandomLevel
        })

        ReplyMessage(Data.Recieved, Message, GuildSettings.LEVEL_UP_CHANNEL);
    },

    "level-up-message": async ({ Data, GuildSettings, Arguments }) => {
        const Message = Arguments.join(" ");

        GuildSettings = {
            LEVEL_UP_MESSAGE: Message,
            LEVEL_UP_CHANNEL: GuildSettings.LEVEL_UP_CHANNEL,
            EXPERIENCE_CALCULATION: GuildSettings.EXPERIENCE_CALCULATION
        };
        await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings })

        Data.Recieved.reply(`New message set to:\n'${Message}'\n Use !settings test to test the message out.`)
    },

    "set-channel": async ({ Data, GuildSettings, Arguments }) => {
        const Input = Arguments[0]?.toUpperCase();

        if (!Input) {
            Data.Recieved.reply("Please chose a channel or type **NULL** to set a level up message channel.");
            return;
        };

        if (Input === "NULL") {
            GuildSettings = {
                LEVEL_UP_MESSAGE: GuildSettings.LEVEL_UP_MESSAGE,
                LEVEL_UP_CHANNEL: "NULL",
                EXPERIENCE_CALCULATION: GuildSettings.EXPERIENCE_CALCULATION
            };
            await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings });

            Data.Recieved.reply("Level up channel successfully removed.");
            return;
        };

        if (Input === "REMOVE") {
            GuildSettings = {
                LEVEL_UP_MESSAGE: GuildSettings.LEVEL_UP_MESSAGE,
                LEVEL_UP_CHANNEL: "REMOVE",
                EXPERIENCE_CALCULATION: GuildSettings.EXPERIENCE_CALCULATION
            };
            await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings });

            Data.Recieved.reply("Level up messages successfully disabled.");
            return;
        };

        const MessageLenght = Input.length;
        const ChannelID = Input.slice(2, (MessageLenght - 1));
        const Surrounding = Input.slice(0, 2) + Input.slice((MessageLenght - 1), MessageLenght);
        const Channel = await Bot.channels.fetch(ChannelID);

        if (Surrounding !== "<#>" || !Channel) {
            Data.Recieved.reply("Channel does not exist or was not found.");
            return;
        };

        const CanRead = await Data.Recieved.guild.members.me?.permissionsIn(Channel).has("READ_MESSAGE_HISTORY");
        const CanSend = await Data.Recieved.guild.members.me?.permissionsIn(Channel).has("SEND_MESSAGES");

        if (CanRead || CanSend) {
            GuildSettings = {
                LEVEL_UP_MESSAGE: GuildSettings.LEVEL_UP_MESSAGE,
                LEVEL_UP_CHANNEL: ChannelID,
                EXPERIENCE_CALCULATION: GuildSettings.EXPERIENCE_CALCULATION,
            };
            await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings });
            
            Data.Recieved.reply(`Level up channel successfully set to: <#${ChannelID}>`);
        } else {
            Data.Recieved.reply(`Bot has no permissions to send messages to <#${ChannelID}>`);
        };
    },

    "set-xp-calculation": async ({ Data, GuildSettings, Arguments }) => {
        const Input = Arguments[0]?.toUpperCase();

        if (!Input) {
            Data.Recieved.reply("No input, please chose any of the following:\nLinear: (Level * 100) + 75\nExponential: 5 * (Level^2) + (Level * 50} + 75\nFlat: 1000\nNormal: 100 * (Level + 1)");
            return;
        };

        const Available = [
            "LINEAR",
            "EXPONENTIAL",
            "FLAT",
            "NORMAL"
        ];

        if (Available.includes(Input)) {
            GuildSettings = {
                LEVEL_UP_MESSAGE: GuildSettings.LEVEL_UP_MESSAGE,
                LEVEL_UP_CHANNEL: GuildSettings.LEVEL_UP_CHANNEL,
                EXPERIENCE_CALCULATION: Input,
            };
            await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings });

            ReplyMessage(Data.Recieved, `Set xp calculation to ${Input}`);
        } else {
            Data.Recieved.reply("No input, please chose any of the following:\nLinear: (Level * 100) + 75\nExponential: 5 * (Level^2) + (Level * 50) + 75\nFlat: 1000\nNormal: 100 * (Level + 1)");
            return;
        };
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
    let GuildData = await GetAsync(Data.GuildDataID, "DATA_FROM_SERVERS");

    const SettingValidateError = await CheckMissingValues(GuildSettings, {
        requiredProps: ["LEVEL_UP_MESSAGE", "LEVEL_UP_CHANNEL", "EXPERIENCE_CALCULATION"],
        typeChecks: {
            LEVEL_UP_MESSAGE: "string",
            LEVEL_UP_CHANNEL: "string",
            EXPERIENCE_CALCULATION: "string"
        },
        minValues: []
    });

    if (SettingValidateError.needsReset) {
        GuildSettings = {
            LEVEL_UP_MESSAGE: GuildSettings.LEVEL_UP_MESSAGE ? GuildSettings.LEVEL_UP_MESSAGE : Config.FALLBACK.LEVEL_UP_MESSAGE,
            LEVEL_UP_CHANNEL: GuildSettings.LEVEL_UP_CHANNEL ? GuildSettings.LEVEL_UP_CHANNEL : "NULL",
            EXPERIENCE_CALCULATION: GuildSettings.EXPERIENCE_CALCULATION ? GuildSettings.EXPERIENCE_CALCULATION : Config.FALLBACK.EXPERIENCE_CALCULATION
        };
        await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings })
    };

    if (!GuildData[Data.AuthorID]) {
        GuildData[Data.AuthorID.toString()] = 0;
        await SetAsync(Data.GuildDataID, { "DATA_FROM_SERVERS": GuildData });
    };

    // Handle settings
    if (Data.Content.startsWith(Config.PREFIX.SETTINGS)) {
        if (Data.AuthorID !== Data.GuildOwnerID) {
            ReplyMessage(Data.Recieved, "You must be the owner to change settings.");
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
        } else {
            ReplyMessage(Data.Recieved, "Invalid command");
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

    LevelData.XP += 5;
    LevelData.MESSAGES++;
    const ExperienceNeeded = await GetExperienceNeeded({ GuildSettings: GuildSettings, Level: LevelData.LEVEL });

    let FakeMessages = LevelData.MESSAGES;
    const Step = 1000;
    const Message = "Dring sum water please.";
    do {
        FakeMessages = FakeMessages - Step;
    } while (FakeMessages > Step);

    if (FakeMessages === Step) {
        await Data.Recieved.reply(Message);
    };

    if (GuildData[Data.AuthorID.toString()] !== LevelData.LEVEL) {
        GuildData[Data.AuthorID.toString()] = LevelData.LEVEL;
    };

    if (LevelData.XP >= ExperienceNeeded) {
        LevelData.XP = 0;
        LevelData.LEVEL++;

        if (Config.DEBUG.LEVEL_UP) console.log(Colors.GREEN + `Level up!${Colors.RESET}\nUser ID: ${Data.AuthorID}\nLevel: ${LevelData.LEVEL}`);

        GuildData[Data.AuthorID.toString()] = LevelData.LEVEL;
        await SetAsync(Data.GuildDataID, { "DATA_FROM_SERVERS": GuildData });

        const Message = await GetLevelUpMessage(GuildSettings, {
            AuthorName: Data.AuthorName,
            AuthorNick: Data.AuthorNick,
            AuthorID: Data.AuthorID,
            Level: LevelData.LEVEL
        });

        ReplyMessage(Data.Recieved, Message, GuildSettings.LEVEL_UP_CHANNEL);
    };

    LevelData = ServerData[Data.GuildID];
    await SetAsync(Data.AuthorID, { "DATA_FROM_SERVERS": ServerData });
});

// #endregion


// #region Handling Interactions [Commands]

const Commands = {
    // Types:
    // 3: Predefined Choise / String
    // 4: Number
    // 5: Boolean
    // 6: User
    // 7: Channel
    // 8: Role

    "leaderboard": {
        data: {
            name: "leaderboard",
            description: "Check the servers leaderboard"
        },

        run: async (Interaction) => {
            const GuildID = Interaction.guild.id;
            const GuildDataID = `Guild-${GuildID}`

            let GuildData = await GetAsync(GuildDataID, "DATA_FROM_SERVERS");

            let Sortable = []
            for (var UserID in GuildData) {
               Sortable.push([UserID, GuildData[UserID]]); 
            };

            Sortable.sort(function(a, b) {
                return a[1] - b[1];
            });

            Sortable.reverse();

            let LineCount = 0;
            let Lines = "";

            do {
                const UserID = Sortable[LineCount][0];
                let Username = UserID;
                if (!UserID) break;

                const CachedUsername = Bot.users.cache.get(UserID);

                if (CachedUsername) {
                    Username = CachedUsername.globalName;
                } else {
                    try {
                        const Fetched = await Bot.users.fetch(UserID);
                        Username = Fetched.globalName;
                    } catch {
                        Username = `Could not fetch`;
                    };
                };

                if (LineCount !== 10) {
                    Lines = Lines + `**${Username}** - ${Sortable[LineCount][1]}\n`
                } else {
                    Lines = Lines + `**${Username}** - ${Sortable[LineCount][1]}`
                };

                LineCount++;
            } while (LineCount < 10);

            const Embed = new EmbedBuilder()
                .setColor([250, 100, 150])
                .setTitle(`${Interaction.guild.name}'s Leaderboard`)
                .setDescription(Lines);

            return Interaction.editReply({ embeds: [Embed] });
        }
    },

    "level": {
        data: {
            name: "level",
            description: "Check your or another ones current level",
            options: [
                { name: "user", type: 6, required: true, description: "User" }
            ]
        },

        run: async (Interaction) => {
            const Option = Interaction.options.getUser("user");
            const User = Option || Interaction.user;
            const UserID = User.id;
            const GuildID = Interaction.guild.id;
            const GuildDataID = `Guild-${GuildID}`

            if (User.bot) {
                return Interaction.editReply("Cannot check the level of a bot.");
            };

            const Data = await GetAsync(UserID, "DATA_FROM_SERVERS");
            let GuildSettings = await GetAsync(GuildDataID, "SETTINGS");
            let GuildData = await GetAsync(GuildDataID, "DATA_FROM_SERVERS");

            const SettingValidateError = await CheckMissingValues(GuildSettings, {
                requiredProps: ["LEVEL_UP_MESSAGE", "LEVEL_UP_CHANNEL", "EXPERIENCE_CALCULATION"],
                typeChecks: {
                    LEVEL_UP_MESSAGE: "string",
                    LEVEL_UP_CHANNEL: "string",
                    EXPERIENCE_CALCULATION: "string"
                },
                minValues: []
            });

            if (SettingValidateError.needsReset) {
                GuildSettings = {
                    LEVEL_UP_MESSAGE: GuildSettings.LEVEL_UP_MESSAGE ? GuildSettings.LEVEL_UP_MESSAGE : Config.FALLBACK.LEVEL_UP_MESSAGE,
                    LEVEL_UP_CHANNEL: GuildSettings.LEVEL_UP_CHANNEL ? GuildSettings.LEVEL_UP_CHANNEL : "NULL",
                    EXPERIENCE_CALCULATION: GuildSettings.EXPERIENCE_CALCULATION ? GuildSettings.EXPERIENCE_CALCULATION : Config.FALLBACK.EXPERIENCE_CALCULATION
                };
                await SetAsync(Data.GuildDataID, { "SETTINGS": GuildSettings })
            };

            let LevelData = Data[GuildID];

            if (!LevelData) {
                if (Config.DEBUG.NEW_GUILD_FOR_USER) console.log(Colors.GREEN + "Indexing new guild for user with id:" + Colors.BLUE + ` ${Data.AuthorID} ` + Colors.RESET);

                Data[GuildID] = { XP: 0, LEVEL: 0, MESSAGES: 0 };
                LevelData = Data[GuildID];
                await SetAsync(Data.AuthorID, { "DATA_FROM_SERVERS": Data });
            };

            const ExperienceNeeded = await GetExperienceNeeded({ GuildSettings: GuildSettings, Level: LevelData.LEVEL });

            const Embed = new EmbedBuilder()
                .setColor([100, 250, 225])
                .setTitle(`${User.globalName}'s level`)
                .setDescription(`**Level:** ${LevelData.LEVEL}
**Experience:** ${LevelData.XP}/${ExperienceNeeded}
**Messages:** ${LevelData.MESSAGES}`);

            return Interaction.editReply({ embeds: [Embed] });
        }
    }
};



Bot.on("interactionCreate", async(interaction) => {
    if (!interaction?.isChatInputCommand()) return;

    const { commandName, user, guild } = interaction;

    const CommandName = interaction.commandName;
    const User = interaction.user;
    const Guild = interaction.guild;

    if (User.bot) return;

    // ========================
    // Defer
    // ========================
    if (!interaction.deferred && !interaction.replied) {
        try {
            await interaction.deferReply();
        } catch (err) {
            if (err.code === DISCORD_ERRORS.UNKNOWN_INTERACTION || err.code === DISCORD_ERRORS.INTERACTION_ALREADY_ACKNOWLEDGED) {
                console.log(`[Interaction Log] ${interaction.user.tag} interaction expired or was already handled.`);
                return;
            }

            // Log other serious errors (API down, etc.)
            console.error("Critical error during deferral:", err);
            return;
        }
    };

    // ========================
    // Gather base variables
    // ========================
    const userId = user.id;
    const { data, settings, run } = Commands[commandName];

    if (!data || !run) {
        return interaction.editReply("Command is currently incomplete setup");
    };

    try {
        await run(interaction);
    } catch(err) {
        console.log(`Command ${CommandName} failed to execute with error: ` + err);
        interaction.editReply("Command not available at this time.");
    };
});

// #endregion

// Login / Startup
if (Token.TOKEN) {
    const Refresh = false;

    if (Refresh) {
        RefreshCommands(RestClient, Token.CLIENT_ID, Commands)
    };

    Bot.login(Token.TOKEN);
    console.log(Colors.GREEN + "Logged in successfully" + Colors.RESET);
} else {
    console.log(Colors.RED + "[ERROR]: " + Colors.RESET + "NO TOKEN SET IN ENV.");
    process.exit(1);
};