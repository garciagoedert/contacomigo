const API_URL = '/api/getNewsletterPosts';
const FIRESTORE_REST_BASE = 'https://firestore.googleapis.com/v1/projects/financeapp-6da16/databases/(default)/documents';

function decodeFirestoreValue(value) {
    if (!value || typeof value !== 'object') return null;
    if ('stringValue' in value) return value.stringValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('booleanValue' in value) return Boolean(value.booleanValue);
    if ('timestampValue' in value) return value.timestampValue;
    if ('nullValue' in value) return null;
    if ('arrayValue' in value) {
        const items = value.arrayValue && Array.isArray(value.arrayValue.values)
            ? value.arrayValue.values
            : [];
        return items.map(decodeFirestoreValue);
    }
    if ('mapValue' in value) {
        return decodeFirestoreFields((value.mapValue && value.mapValue.fields) || {});
    }
    return null;
}

function decodeFirestoreFields(fields = {}) {
    const out = {};
    for (const [key, val] of Object.entries(fields)) {
        out[key] = decodeFirestoreValue(val);
    }
    return out;
}

function mapPostSummary(item) {
    return {
        slug: item.slug,
        title: item.title,
        link: `/post_viewer.html?slug=${encodeURIComponent(item.slug)}`,
        pubDate: item.date ? new Date(item.date) : (item.sentAt ? new Date(item.sentAt) : new Date()),
        thumbnail: item.thumbnail || 'imgs/bannertrilha.png',
        description: 'Clique para acessar esta edição da newsletter exclusiva.',
        category: item.category || 'Trilha News'
    };
}

async function fetchPostsFromFirestoreRest(limit = null, category = null) {
    const parsedLimit = parseInt(limit, 10);
    const finalLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 50;

    const where = category
        ? {
            compositeFilter: {
                op: 'AND',
                filters: [
                    { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'sent' } } },
                    { fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: { stringValue: category } } }
                ]
            }
        }
        : {
            fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'EQUAL',
                value: { stringValue: 'sent' }
            }
        };

    const response = await fetch(`${FIRESTORE_REST_BASE}:runQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            structuredQuery: {
                from: [{ collectionId: 'newsletter_posts' }],
                where,
                orderBy: [{ field: { fieldPath: 'sentAt' }, direction: 'DESCENDING' }],
                limit: finalLimit,
                select: {
                    fields: ['title', 'thumbnail', 'sentAt', 'category', 'slug'].map(fieldPath => ({ fieldPath }))
                }
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Firestore REST fallback failed: ${response.status}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) return [];

    return rows
        .filter(row => row && row.document)
        .map(row => {
            const docSlug = row.document.name.split('/').pop();
            const data = decodeFirestoreFields(row.document.fields || {});
            const sentAtStr = typeof data.sentAt === 'string' && data.sentAt
                ? data.sentAt
                : new Date().toISOString();

            return {
                slug: docSlug,
                title: data.title || '',
                thumbnail: data.thumbnail || null,
                sentAt: sentAtStr,
                date: sentAtStr,
                category: data.category || null
            };
        });
}

async function fetchPostBySlugFromFirestoreRest(slug) {
    const cleanSlug = String(slug).trim();
    const response = await fetch(`${FIRESTORE_REST_BASE}/newsletter_posts/${encodeURIComponent(cleanSlug)}`);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Firestore REST single-post failed: ${response.status}`);
    }

    const doc = await response.json();
    const data = decodeFirestoreFields(doc.fields || {});
    data.slug = data.slug || cleanSlug;
    return data;
}

/**
 * Fetches newsletter posts from the Vercel API with automatic fallback to Firestore REST.
 * @param {number|null} limit Optional limit
 * @param {string|null} category Optional category filter
 * @returns {Promise<Array>} Array of post objects
 */
async function fetchNewsletterPosts(limit = null, category = null) {
    try {
        const params = [];
        if (limit) params.push(`limit=${encodeURIComponent(limit)}`);
        if (category) params.push(`category=${encodeURIComponent(category)}`);

        const url = params.length > 0 ? `${API_URL}?${params.join('&')}` : API_URL;

        let posts = null;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const payload = await response.json();
                if (Array.isArray(payload)) {
                    posts = payload;
                }
            }
        } catch (apiError) {
            console.warn('API local/Vercel indisponível, usando fallback Firestore REST:', apiError);
        }

        if (!posts) {
            posts = await fetchPostsFromFirestoreRest(limit, category);
        }

        return posts.map(mapPostSummary);
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
}

/**
 * Fetches a single newsletter post by slug from the Vercel API with Firestore REST fallback.
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
async function fetchNewsletterPostBySlug(slug) {
    const cleanSlug = String(slug || '').trim();
    if (!cleanSlug) return null;

    try {
        const response = await fetch(`${API_URL}?slug=${encodeURIComponent(cleanSlug)}`);
        const contentType = response.headers.get('content-type') || '';

        if (response.ok && contentType.includes('application/json')) {
            const data = await response.json();
            if (data && !data.error) {
                return data;
            }
        }

        if (response.status === 404 && contentType.includes('application/json')) {
            const errPayload = await response.json().catch(() => null);
            if (errPayload && errPayload.error === 'Post não encontrado') {
                return null;
            }
        }
    } catch (apiError) {
        console.warn('API indisponível ao buscar post, usando fallback Firestore REST:', apiError);
    }

    return fetchPostBySlugFromFirestoreRest(cleanSlug);
}

/**
 * Renders a post card HTML string.
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
                 onerror="this.onerror=null;this.src='imgs/bannertrilha.png'">
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
