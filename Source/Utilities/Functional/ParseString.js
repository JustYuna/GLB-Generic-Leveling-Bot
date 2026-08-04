/**
 * Parses a string and changes out the context via input.
 * 
 * @param {string} String
 * @param {object} Context
 */
async function ParseString(String, Context) {
    let Result = String;

    for (const [key, value] of Object.entries(Context)) {
        Result = Result.replace(key, value);
    };

    return Result;
}

module.exports = ParseString;