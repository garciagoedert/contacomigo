const PROJECT_ID = 'financeapp-6da16';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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
                    fields: ['title', 'thumbnail', 'sentAt', 'category', 'slug'].map(fieldPath => ({ fieldPath }))
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
                    thumbnail: data.thumbnail || null,
                    sentAt: sentAtStr,
                    date: sentAtStr,
                    category: data.category || null
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
