
const fetch = require('node-fetch');

async function checkPosts() {
    console.log("Fetching recent posts...");
    const response = await fetch('https://us-central1-financeapp-6da16.cloudfunctions.net/getNewsletterPosts?limit=5');
    const posts = await response.json();

    console.log("\nLast 5 Posts:");
    posts.forEach(p => {
        console.log(`- [${p.date}] ${p.title} (${p.category})`);
    });

    // Check if one exists for today around 18:00
    // Timezone -03:00. 18:00 is 21:00 UTC.
    const today = new Date();
    // Simple check
    console.log("\nCurrent Time:", today.toISOString());
}

checkPosts();
