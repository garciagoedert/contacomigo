const API_URL = '/api/getNewsletterPosts';
const FIRESTORE_REST_BASE = 'https://firestore.googleapis.com/v1/projects/financeapp-6da16/databases/(default)/documents';

const CATEGORY_COVERS = {
    economia: ['/imgs/covers/economia-1.jpg', '/imgs/covers/economia-2.jpg'],
    investimentos: ['/imgs/covers/investimentos-1.jpg', '/imgs/covers/investimentos-2.jpg'],
    tecnologia: ['/imgs/covers/tecnologia-1.jpg', '/imgs/covers/tecnologia-2.jpg'],
    politica: ['/imgs/covers/politica-1.jpg', '/imgs/covers/politica-2.jpg'],
    carreira: ['/imgs/covers/carreira-1.jpg', '/imgs/covers/carreira-2.jpg'],
    games: ['/imgs/covers/games-1.jpg', '/imgs/covers/games-2.jpg'],
    esportes: ['/imgs/covers/esportes-1.jpg']
};

function normalizeCategoryKey(category) {
    return String(category || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function hashSlugForCover(slug) {
    let sum = 0;
    const text = String(slug || '');
    for (let i = 0; i < text.length; i++) {
        sum = (sum + text.charCodeAt(i)) % 1000003;
    }
    return sum;
}

function resolveEditorialThumbnail(rawThumbnail, category, slug) {
    const candidate = typeof rawThumbnail === 'string' ? rawThumbnail.trim() : '';
    const lower = candidate.toLowerCase();
    const isLegacyBroken = !candidate
        || lower.includes('pollinations.ai')
        || lower.includes('article-placeholder.jpg');

    if (!isLegacyBroken) {
        return candidate;
    }

    const key = normalizeCategoryKey(category);
    const variants = CATEGORY_COVERS[key] || CATEGORY_COVERS.economia;
    return variants[hashSlugForCover(slug) % variants.length];
}

function decodeHtmlEntitiesClient(text) {
    return text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#0?39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&mdash;/gi, '—')
        .replace(/&ndash;/gi, '–')
        .replace(/&rsquo;/gi, '’')
        .replace(/&lsquo;/gi, '‘')
        .replace(/&ldquo;/gi, '“')
        .replace(/&rdquo;/gi, '”');
}

function stripHtmlTagsClient(html) {
    return decodeHtmlEntitiesClient(String(html || '').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

function extractEditorialExcerpt(htmlContent, category) {
    const fallback = `Análise e cobertura editorial sobre ${category || 'economia e mercados'} no Trilha News.`;
    if (!htmlContent || typeof htmlContent !== 'string') {
        return fallback;
    }

    let plain = '';
    const paragraphMatches = htmlContent.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const para of paragraphMatches) {
        const text = stripHtmlTagsClient(para);
        if (text.length >= 40) {
            plain = text;
            break;
        }
    }

    if (!plain) {
        plain = stripHtmlTagsClient(htmlContent);
    }

    if (!plain) {
        return fallback;
    }

    const maxLen = 175;
    if (plain.length <= maxLen) return plain;

    const sliced = plain.slice(0, maxLen);
    const lastSpace = sliced.lastIndexOf(' ');
    const cut = (lastSpace > 110 ? sliced.slice(0, lastSpace) : sliced).replace(/[,;:\-–—\s]+$/, '');
    return `${cut}...`;
}

function getCategoryBadgeClasses(category) {
    const key = normalizeCategoryKey(category);
    const map = {
        economia: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
        investimentos: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
        tecnologia: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
        politica: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
        carreira: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        games: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
        esportes: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'
    };
    return map[key] || 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200';
}

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
    const category = item.category || 'Trilha News';
    return {
        slug: item.slug,
        title: item.title,
        link: `/post_viewer.html?slug=${encodeURIComponent(item.slug)}`,
        pubDate: item.date ? new Date(item.date) : (item.sentAt ? new Date(item.sentAt) : new Date()),
        thumbnail: resolveEditorialThumbnail(item.thumbnail, category, item.slug),
        description: item.description || extractEditorialExcerpt(item.content, category),
        category
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
                    fields: ['title', 'thumbnail', 'sentAt', 'category', 'slug', 'content'].map(fieldPath => ({ fieldPath }))
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
                thumbnail: resolveEditorialThumbnail(data.thumbnail, data.category, docSlug),
                sentAt: sentAtStr,
                date: sentAtStr,
                category: data.category || null,
                description: extractEditorialExcerpt(data.content, data.category)
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
    data.thumbnail = resolveEditorialThumbnail(data.thumbnail, data.category, data.slug);
    data.description = data.description || extractEditorialExcerpt(data.content, data.category);
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
                data.thumbnail = resolveEditorialThumbnail(data.thumbnail, data.category, data.slug || cleanSlug);
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
 * Renders a post card HTML string with lazy image loading and deferred rendering.
 */
function createPostCard(post) {
    let dateStr;
    try {
        dateStr = post.pubDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        dateStr = 'Recente';
    }

    const badgeClasses = getCategoryBadgeClasses(post.category);

    return `
    <a href="${post.link}"
        class="feed-card-deferred bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:-translate-y-1 flex flex-col h-full group">
        <div class="aspect-[16/10] overflow-hidden bg-slate-200 dark:bg-slate-700 relative">
            <img src="${post.thumbnail}" alt="${post.title}" loading="lazy"
                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                 onerror="this.onerror=null;this.src='/imgs/covers/economia-1.jpg'">
            <div class="absolute top-3 left-3">
                <span class="${badgeClasses} text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                    ${post.category}
                </span>
            </div>
        </div>
        <div class="p-6 flex flex-col flex-grow">
            <h3 class="text-lg font-bold mb-2.5 text-slate-900 dark:text-white line-clamp-2 news-headline group-hover:text-[var(--cor-principal)] transition-colors">${post.title}</h3>
            <p class="feed-excerpt text-slate-600 dark:text-slate-400 mb-4 text-sm flex-grow line-clamp-3 leading-relaxed">
                ${post.description}
            </p>
            <div class="flex items-center justify-between text-xs text-slate-500 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                <span>${dateStr}</span>
                <span class="text-[var(--cor-principal)] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Ler matéria <span aria-hidden="true">→</span>
                </span>
            </div>
        </div>
    </a>
    `;
}
