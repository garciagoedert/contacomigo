const PROJECT_ID = 'financeapp-6da16';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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

function hashString(str) {
    let sum = 0;
    const text = String(str || '');
    for (let i = 0; i < text.length; i++) {
        sum = (sum + text.charCodeAt(i)) % 1000003;
    }
    return sum;
}

/**
 * Resolve a reliable editorial thumbnail, replacing empty or legacy placeholder/rate-limited URLs
 * with deterministic local category covers.
 */
function resolveThumbnail(rawThumbnail, category, slug) {
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
    return variants[hashString(slug) % variants.length];
}

function decodeHtmlEntities(text) {
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

function stripTags(html) {
    return decodeHtmlEntities(String(html || '').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract a ~175-character plain-text excerpt from article HTML content without cutting words.
 */
function extractExcerpt(htmlContent, category) {
    const fallback = `Análise e cobertura editorial sobre ${category || 'economia e mercados'} no Trilha News.`;
    if (!htmlContent || typeof htmlContent !== 'string') {
        return fallback;
    }

    let plain = '';
    const paragraphMatches = htmlContent.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const para of paragraphMatches) {
        const text = stripTags(para);
        if (text.length >= 40) {
            plain = text;
            break;
        }
    }

    if (!plain) {
        plain = stripTags(htmlContent);
    }

    if (!plain) {
        return fallback;
    }

    const maxLen = 175;
    if (plain.length <= maxLen) {
        return plain;
    }

    const sliced = plain.slice(0, maxLen);
    const lastSpace = sliced.lastIndexOf(' ');
    const cut = (lastSpace > 110 ? sliced.slice(0, lastSpace) : sliced).replace(/[,;:\-–—\s]+$/, '');
    return `${cut}...`;
}

/**
 * Decode a single Firestore REST Typed Value into a native JS value.
 */
function decodeValue(value) {
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
        return items.map(decodeValue);
    }
    if ('mapValue' in value) {
        return decodeFields((value.mapValue && value.mapValue.fields) || {});
    }
    return null;
}

/**
 * Decode a Firestore REST document fields map into a plain JS object.
 */
function decodeFields(fields = {}) {
    const out = {};
    for (const [key, val] of Object.entries(fields)) {
        out[key] = decodeValue(val);
    }
    return out;
}

function setPublicCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Public read endpoint for Trilha News articles stored in Firestore.
 * Uses the public Firestore REST API so it requires zero external packages or secrets.
 */
module.exports = async function handler(req, res) {
    setPublicCors(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { slug, limit, category } = req.query || {};

        if (slug) {
            const cleanSlug = String(slug).trim();
            const encodedSlug = encodeURIComponent(cleanSlug);
            const resp = await fetch(`${FIRESTORE_BASE}/newsletter_posts/${encodedSlug}`);

            if (resp.status === 404) {
                res.setHeader('Cache-Control', 'no-store');
                return res.status(404).json({ error: 'Post não encontrado' });
            }

            if (!resp.ok) {
                const errBody = await resp.text();
                console.error('Firestore single-post error:', resp.status, errBody);
                res.setHeader('Cache-Control', 'no-store');
                return res.status(502).json({ error: 'Erro ao consultar Firestore' });
            }

            const doc = await resp.json();
            const data = decodeFields(doc.fields || {});
            data.slug = data.slug || cleanSlug;
            data.thumbnail = resolveThumbnail(data.thumbnail, data.category, data.slug);
            data.description = data.description || extractExcerpt(data.content, data.category);

            res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
            return res.status(200).json(data);
        }

        const parsedLimit = parseInt(limit, 10);
        const finalLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 50;

        const cleanCategory = category ? String(category).trim() : null;

        const where = cleanCategory
            ? {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'sent' } } },
                        { fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: { stringValue: cleanCategory } } }
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

        const queryPayload = {
            structuredQuery: {
                from: [{ collectionId: 'newsletter_posts' }],
                where,
                orderBy: [{ field: { fieldPath: 'sentAt' }, direction: 'DESCENDING' }],
                limit: finalLimit,
                select: {
                    fields: ['title', 'thumbnail', 'sentAt', 'category', 'slug', 'content'].map(fieldPath => ({ fieldPath }))
                }
            }
        };

        const resp = await fetch(`${FIRESTORE_BASE}:runQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryPayload)
        });

        if (!resp.ok) {
            const errBody = await resp.text();
            console.error('Firestore list query error:', resp.status, errBody);
            res.setHeader('Cache-Control', 'no-store');
            return res.status(502).json({ error: 'Erro ao listar notícias no Firestore' });
        }

        const rows = await resp.json();
        const posts = [];

        if (Array.isArray(rows)) {
            for (const row of rows) {
                if (!row || !row.document) continue;
                const docSlug = row.document.name.split('/').pop();
                const data = decodeFields(row.document.fields || {});
                const sentAtStr = typeof data.sentAt === 'string' && data.sentAt
                    ? data.sentAt
                    : new Date().toISOString();

                posts.push({
                    slug: docSlug,
                    title: data.title || '',
                    thumbnail: resolveThumbnail(data.thumbnail, data.category, docSlug),
                    sentAt: sentAtStr,
                    date: sentAtStr,
                    category: data.category || null,
                    description: extractExcerpt(data.content, data.category)
                });
            }
        }

        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(posts);
    } catch (error) {
        console.error('Erro em getNewsletterPosts:', error);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(500).json({ error: error.message });
    }
};
