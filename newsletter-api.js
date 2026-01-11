
// Use absolute URL for production to avoid custom domain rewrite issues
const API_URL = 'https://us-central1-financeapp-6da16.cloudfunctions.net/getNewsletterPosts';

/**
 * Fetches newsletter posts from Internal API.
 * @param {number} limit Optional limit
 * @param {string} category Optional category filter
 * @returns {Promise<Array>} Array of post objects
 */
async function fetchNewsletterPosts(limit = null, category = null) {
    try {
        // Handle Localhost vs Prod URL
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let url = isLocalhost
            ? 'http://127.0.0.1:5001/financeapp-6da16/us-central1/getNewsletterPosts'
            : API_URL;

        const params = [];
        if (limit) params.push(`limit=${limit}`);
        if (category) params.push(`category=${encodeURIComponent(category)}`);

        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            const errText = await response.text();
            console.error("API Error Body:", errText);
            throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
        }

        const posts = await response.json();

        return posts.map(item => ({
            title: item.title,
            link: `/post_viewer.html?slug=${item.slug}`, // Fixed link to point to viewer
            // Backend now ensures sentAt/date is ISO string
            pubDate: item.date ? new Date(item.date) : (item.sentAt ? new Date(item.sentAt) : new Date()),
            thumbnail: item.thumbnail || 'imgs/article-placeholder.jpg',
            description: 'Clique para acessar esta edição da newsletter exclusiva.',
            category: item.category || 'Trilha News' // Map new field
        }));

    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
}

/**
 * Renders a post card HTML string
 */
function createPostCard(post) {
    let dateStr;
    try {
        dateStr = post.pubDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
        dateStr = 'Recentemente';
    }

    return `
    <a href="${post.link}" 
        class="bg-white dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-2 flex flex-col h-full group">
        <div class="h-48 overflow-hidden bg-gray-200 relative">
            <img src="${post.thumbnail}" alt="${post.title}" 
                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                 onerror="this.src='imgs/article-placeholder.jpg'">
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


