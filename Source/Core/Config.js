module.exports = {
    DEBUG: {
        MEMORY: false,
        MESSAGES: true,
        MESSAGE_IGNORED: true,
        NEW_USER: true,
        NEW_GUILD_FOR_USER: true,
        LEVEL_UP: true,
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
    PREFIX: {
        COMMAND: "!",
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