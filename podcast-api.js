async function fetchPodcastEpisodes(count = 10) {
    const rssUrl = 'https://anchor.fm/s/10d95686c/podcast/rss';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'ok') {
            return data.items.slice(0, count).map(item => ({
                title: item.title,
                pubDate: new Date(item.pubDate),
                description: item.description, // Can contain HTML
                thumbnail: item.thumbnail || data.feed.image, // Fallback to feed image
                audio: item.enclosure.link,
                link: item.link
            }));
        } else {
            console.error('Error fetching podcast feed:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Network error fetching podcast:', error);
        return [];
    }
}
