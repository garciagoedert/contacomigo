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

function estimateEditorialReadingTime(htmlContent) {
    const plain = stripHtmlTagsClient(htmlContent);
    if (!plain) return 1;
    const words = plain.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
}

function getCategoryKickerColor(category) {
    const key = normalizeCategoryKey(category);
    const map = {
        economia: 'text-purple-700',
        investimentos: 'text-emerald-700',
        tecnologia: 'text-blue-700',
        politica: 'text-rose-700',
        carreira: 'text-amber-700',
        games: 'text-orange-700',
        esportes: 'text-teal-700'
    };
    return map[key] || 'text-[#E11D48]';
}

function getCategoryDarkKickerColor(category) {
    const key = normalizeCategoryKey(category);
    const map = {
        economia: 'text-purple-300',
        investimentos: 'text-emerald-300',
        tecnologia: 'text-blue-300',
        politica: 'text-rose-300',
        carreira: 'text-amber-300',
        games: 'text-orange-300',
        esportes: 'text-teal-300'
    };
    return map[key] || 'text-rose-300';
}

function getCategoryBadgeClasses(category) {
    const key = normalizeCategoryKey(category);
    const map = {
        economia: 'bg-purple-700 text-white rounded-sm',
        investimentos: 'bg-emerald-700 text-white rounded-sm',
        tecnologia: 'bg-blue-700 text-white rounded-sm',
        politica: 'bg-rose-700 text-white rounded-sm',
        carreira: 'bg-amber-600 text-white rounded-sm',
        games: 'bg-orange-600 text-white rounded-sm',
        esportes: 'bg-teal-700 text-white rounded-sm'
    };
    return map[key] || 'bg-[#E11D48] text-white rounded-sm';
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
        readingTime: item.readingTime || estimateEditorialReadingTime(item.content),
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
                description: extractEditorialExcerpt(data.content, data.category),
                readingTime: estimateEditorialReadingTime(data.content)
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
    data.readingTime = data.readingTime || estimateEditorialReadingTime(data.content);
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
                data.readingTime = data.readingTime || estimateEditorialReadingTime(data.content);
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
 * Renders a semantic editorial news card with stretched primary link and lazy image loading.
 */
function createPostCard(post) {
    let dateStr;
    try {
        dateStr = post.pubDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        dateStr = 'Recente';
    }

    const kickerColor = getCategoryKickerColor(post.category);
    const readMins = post.readingTime || 4;

    return `
    <article class="news-card feed-card-deferred bg-white border border-zinc-200 flex flex-col h-full group hover:border-zinc-900 transition-colors">
        <img src="${post.thumbnail}" alt="${post.title}" loading="lazy"
             class="transition-transform duration-500 group-hover:scale-[1.02]"
             onerror="this.onerror=null;this.src='/imgs/covers/economia-1.jpg'">
        <div class="p-5 flex flex-col flex-grow">
            <header class="mb-2">
                <div class="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    <span class="${kickerColor}">${post.category || 'Notícia'}</span>
                    <span class="text-zinc-400 font-medium normal-case tracking-normal">${readMins} min</span>
                </div>
                <h3 class="text-lg font-bold text-[#0A0A0B] leading-snug news-headline">
                    <a href="${post.link}" class="card-link group-hover:text-[var(--cor-principal)] transition-colors">${post.title}</a>
                </h3>
            </header>
            <p class="feed-excerpt text-zinc-600 text-sm line-clamp-3 mb-4 flex-grow">
                ${post.description}
            </p>
            <footer class="flex items-center justify-between text-xs text-zinc-500 pt-3 border-t border-zinc-200 mt-auto">
                <span>${dateStr}</span>
                <span class="text-[#0A0A0B] font-bold uppercase tracking-wider text-[11px] group-hover:text-[var(--cor-principal)] transition-colors">
                    Ler matéria →
                </span>
            </footer>
        </div>
    </article>
    `;
}
