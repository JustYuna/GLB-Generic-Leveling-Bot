module.exports = {
    /**
     * Checks if an object needs to be reset based on missing or invalid values
     * @param {Object} data - The data to validate
     * @param {Object} options - Validation options
     * @param {Array} options.requiredProps - Array of property names that must exist
     * @param {Object} options.typeChecks - Object mapping property names to expected types
     * @param {Array} options.minValues - Array of { prop, min } for minimum values
     * @returns {Object} { needsReset: boolean, reason: string }
     */
    CheckMissingValues(data, options = {}) {
        const { requiredProps = [], typeChecks = {}, minValues = [] } = options;

        // Check if data is null or undefined
        if (!data || typeof data !== "object") {
            return { needsReset: true, reason: "data is null or not an object" };
        }

        // Check for required properties
        for (const prop of requiredProps) {
            if (!data.hasOwnProperty(prop)) {
                return { needsReset: true, reason: `missing required property: ${prop}` };
            }
        }

        // Check property types
        for (const [prop, expectedType] of Object.entries(typeChecks)) {
            if (data.hasOwnProperty(prop) && typeof data[prop] !== expectedType) {
                return { needsReset: true, reason: `${prop} should be ${expectedType}, got ${typeof data[prop]}` };
            }
        }

        // Check minimum values
        for (const { prop, min } of minValues) {
            if (data.hasOwnProperty(prop) && typeof data[prop] === "number" && data[prop] < min) {
                return { needsReset: true, reason: `${prop} is ${data[prop]} (minimum ${min})` };
            }
        }

        return { needsReset: false, reason: null };
    },

    /**
     * Resets an object to default values
     * @param {Object} defaultValues - The default values to reset to
     * @returns {Object} The reset object
     */
    GetResetData(defaultValues) {
        return { ...defaultValues };
    },
};