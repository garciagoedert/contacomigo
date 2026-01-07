
const fetch = require('node-fetch');

async function triggerDebug() {
    console.log("Triggering debugGenerateDailyPost...");
    try {
        const response = await fetch('https://us-central1-financeapp-6da16.cloudfunctions.net/debugGenerateDailyPost', {
            method: 'POST'
        });

        const text = await response.text();
        console.log("Response Status:", response.status);
        console.log("Response Body:", text);
    } catch (err) {
        console.error("Error:", err);
    }
}

triggerDebug();
