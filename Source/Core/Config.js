module.exports = {
    DEBUG: {
        MEMORY: false,
        MESSAGES: false,
        MESSAGE_IGNORED: false,
        NEW_USER: false,
        NEW_GUILD_FOR_USER: false,
        LEVEL_UP: false,

        IS_CHANGING_SETTINGS: false,
    },
    LIMIT: {
        MEMORY: 1024
    },
    CONSOLE_COLORS: {
        RESET: "\x1b[0m",
        CYAN: "\x1b[36m",
        MAGENTA: "\x1b[35m",
        GREEN: "\x1b[32m",
        BLUE: "\x1b[34m",
        GRAY: "\x1b[90m",
        YELLOW: "\x1b[93m",
        RED: "\x1b[12",
        BOLD: "\x1b[1m"
    },

    // Settings
    FALLBACK: {
        LEVEL_UP_MESSAGE: "**Level up!**\n{user_nick} is now Lvl. {level_new} 🎉!",
        EXPERIENCE_CALCULATION: "LINEAR"
    },

    PREFIX: {
        SETTINGS: "!settings",
        IGNORE: [
            "!",
            "?",
            "$",
            "%",
            "-",
            ".",
            ":",
            ";",
            "§",
            "&",
            "/",
            "+"
        ]
    }
}