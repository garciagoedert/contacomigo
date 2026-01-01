const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
// Assuming we are in a cloud environment or have default credentials. 
// If this fails, we might need to ask user/check for service account.
try {
    admin.initializeApp();
} catch (e) {
    if (!admin.apps.length) {
        const serviceAccount = require('./serviceAccountKey.json'); // Try looking for a key if default fails, though unlikely to exist
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
}

async function checkSubscribers() {
    try {
        console.log("Checking active subscribers...");
        const snapshot = await admin.firestore().collection('newsletter_subscribers')
            .where('status', '==', 'active')
            .get();

        console.log(`✅ Active Subscribers Found: ${snapshot.size}`);

        if (snapshot.size > 0) {
            console.log("Sample Emails:");
            snapshot.docs.slice(0, 5).forEach(doc => console.log(` - ${doc.id}`));
        } else {
            console.log("⚠️ No active subscribers found. This explains why emails are not sent.");
        }

    } catch (error) {
        console.error("❌ Error checking subscribers:", error);
    }
}

checkSubscribers();
