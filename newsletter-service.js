
const RSS_URL = 'https://rss.beehiiv.com/feeds/GKZRsxuOVL.xml';
const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

/**
 * Fetches newsletter posts from Beehiiv RSS feed.
 * @returns {Promise<Array>} Array of post objects
 */
async function fetchNewsletterPosts() {
    try {
        const response = await fetch(RSS_TO_JSON_API + encodeURIComponent(RSS_URL) + '&t=' + new Date().getTime());
        const data = await response.json();

        if (data.status === 'ok') {
            return data.items.map(item => ({
                title: item.title,
                link: item.link,
                pubDate: new Date(item.pubDate.replace(' ', 'T')),
                // Beehiiv puts the cover image in the <enclosure> tag.
                // rss2json maps this to item.enclosure.link
                thumbnail: item.enclosure?.link || item.thumbnail || extractImageFromContent(item.content) || 'imgs/article-placeholder.jpg',
                description: stripHtml(item.description || '').substring(0, 150) + '...',
                category: 'Newsletter' // Default category
            }));
        } else {
            console.error('Error fetching RSS feed:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Network error fetching RSS feed:', error);
        return [];
    }
}

/**
 * Helper to strip HTML tags for preview text
 */
function stripHtml(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

/**
 * Helper to try and find an image in the content if thumbnail is missing
 */
function extractImageFromContent(content) {
    const div = document.createElement('div');
    div.innerHTML = content;
    const img = div.querySelector('img');
    return img ? img.src : null;
}

/**
 * Renders a post card HTML string
 */
function createPostCard(post) {
    // Format date in PT-BR
    // Format date in PT-BR
    let dateStr;
    try {
        if (isNaN(post.pubDate.getTime())) throw new Error('Invalid Date');
        dateStr = post.pubDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
        dateStr = 'Recentemente';
    }

    // Choose a random gradient or color if no image, but for now assuming placeholder
    // We will use the layout from existing cards

    return `
    <a href="${post.link}" target="_blank"
        class="bg-white dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-2 flex flex-col h-full group">
        <div class="h-48 overflow-hidden bg-gray-200 relative">
            <img src="${post.thumbnail}" alt="${post.title}" 
                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                 onerror="this.src='imgs/article-placeholder.jpg'"> <!-- Fallback -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
        <div class="p-6 flex flex-col flex-grow">
            <div class="text-sm text-[var(--cor-principal)] font-semibold mb-2 uppercase tracking-wide">
                ${post.category}
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900 dark:text-white line-clamp-2">${post.title}</h3>
            <p class="text-gray-600 dark:text-gray-400 mb-4 text-sm flex-grow line-clamp-3">
                ${post.description}
            </p>
            <div class="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                <span>${dateStr}</span>
                <span class="text-[var(--cor-principal)] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Ler edição <span class="text-lg">→</span>
                </span>
            </div>
        </div>
    </a>
    `;
}


