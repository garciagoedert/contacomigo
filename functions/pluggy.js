const { PluggyClient } = require('pluggy-sdk');
const functions = require('firebase-functions');

/**
 * Initializes and returns a Pluggy Client instance.
 * Prioritizes environment variables (local) over Firebase Config (production).
 */
const getPluggyClient = () => {
    const CLIENT_ID = process.env.PLUGGY_CLIENT_ID || functions.config().pluggy?.client_id;
    const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || functions.config().pluggy?.client_secret;

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error("⚠️  Pluggy credentials missing! Set PLUGGY_CLIENT_ID/SECRET in .env or firebase config.");
        // We throw a clear error but the caller should catch it
        throw new Error("Pluggy configuration missing.");
    }

    return new PluggyClient({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
    });
};

module.exports = { getPluggyClient };
