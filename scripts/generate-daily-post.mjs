import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import Parser from 'rss-parser';

const SCHEDULE_TABLE = {
    0: { 8: 'Economia', 10: 'Investimentos', 12: 'Tecnologia', 14: 'Política', 16: 'Carreira', 18: 'Games', 20: 'Esportes' },
    1: { 8: 'Investimentos', 10: 'Tecnologia', 12: 'Política', 14: 'Carreira', 16: 'Games', 18: 'Economia', 20: 'Esportes' },
    2: { 8: 'Tecnologia', 10: 'Política', 12: 'Carreira', 14: 'Games', 16: 'Economia', 18: 'Investimentos', 20: 'Esportes' },
    3: { 8: 'Política', 10: 'Carreira', 12: 'Games', 14: 'Economia', 16: 'Investimentos', 18: 'Tecnologia', 20: 'Esportes' },
    4: { 8: 'Carreira', 10: 'Games', 12: 'Economia', 14: 'Investimentos', 16: 'Tecnologia', 18: 'Política', 20: 'Esportes' },
    5: { 8: 'Games', 10: 'Economia', 12: 'Investimentos', 14: 'Tecnologia', 16: 'Política', 18: 'Carreira', 20: 'Esportes' },
    6: { 8: 'Economia', 10: 'Investimentos', 12: 'Tecnologia', 14: 'Política', 16: 'Carreira', 18: 'Games', 20: 'Esportes' }
};

const BATCH_5_CATEGORIES = [
    'Economia',
    'Investimentos',
    'Tecnologia',
    'Política',
    'Carreira'
];

const DEFAULT_BATCH_DELAY_MS = 4000;

const CATEGORY_COVERS = {
    economia: ['/imgs/covers/economia-1.jpg', '/imgs/covers/economia-2.jpg'],
    investimentos: ['/imgs/covers/investimentos-1.jpg', '/imgs/covers/investimentos-2.jpg'],
    tecnologia: ['/imgs/covers/tecnologia-1.jpg', '/imgs/covers/tecnologia-2.jpg'],
    politica: ['/imgs/covers/politica-1.jpg', '/imgs/covers/politica-2.jpg'],
    carreira: ['/imgs/covers/carreira-1.jpg', '/imgs/covers/carreira-2.jpg'],
    games: ['/imgs/covers/games-1.jpg', '/imgs/covers/games-2.jpg'],
    esportes: ['/imgs/covers/esportes-1.jpg']
};

function getEditorialCoverUrl(category, slug) {
    const key = String(category || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const variants = CATEGORY_COVERS[key] || CATEGORY_COVERS.economia;
    let sum = 0;
    const text = String(slug || '');
    for (let i = 0; i < text.length; i++) {
        sum = (sum + text.charCodeAt(i)) % 1000003;
    }
    return `https://www.trilhacomigo.com${variants[sum % variants.length]}`;
}

const VALID_CATEGORIES = new Set([
    'Economia',
    'Investimentos',
    'Tecnologia',
    'Política',
    'Carreira',
    'Games',
    'Esportes'
]);

const RSS_FEEDS = [
    { category: 'Economia', url: 'https://g1.globo.com/rss/g1/economia/', limit: 3 },
    { category: 'Investimentos', url: 'https://br.investing.com/rss/news_11.rss', limit: 3 },
    { category: 'Tecnologia', url: 'https://g1.globo.com/rss/g1/tecnologia/', limit: 3 },
    { category: 'Política', url: 'https://g1.globo.com/rss/g1/politica/', limit: 3 },
    { category: 'Games', url: 'https://www.polygon.com/rss/index.xml', limit: 3 },
    { category: 'Esportes', url: 'https://ge.globo.com/rss/ge/', limit: 4 }
];

const WEEKDAY_MAP = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getSaoPauloDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'short',
        hour: 'numeric',
        hourCycle: 'h23'
    });

    const parts = formatter.formatToParts(date);
    const weekdayLabel = parts.find(p => p.type === 'weekday')?.value || 'Sun';
    const hourValue = Number(parts.find(p => p.type === 'hour')?.value ?? '8');

    return {
        dayOfWeek: WEEKDAY_MAP[weekdayLabel] ?? 0,
        hour: Number.isFinite(hourValue) ? hourValue : 8
    };
}

function mapHourToSlot(hour) {
    if (hour < 9) return 8;
    if (hour < 11) return 10;
    if (hour < 13) return 12;
    if (hour < 15) return 14;
    if (hour < 17) return 16;
    if (hour < 19) return 18;
    return 20;
}

function getCategoryForSchedule() {
    const forced = (process.env.FORCE_CATEGORY || '').trim();
    if (forced && forced !== 'auto') {
        if (VALID_CATEGORIES.has(forced)) {
            console.log(`🎯 Categoria forçada via FORCE_CATEGORY: ${forced}`);
            return forced;
        }
        console.warn(`⚠️ FORCE_CATEGORY="${forced}" não é uma categoria válida. Usando agenda automática.`);
    }

    const { dayOfWeek, hour } = getSaoPauloDateParts();
    const slot = mapHourToSlot(hour);
    const category = SCHEDULE_TABLE[dayOfWeek]?.[slot] || 'Economia';
    console.log(`📅 Horário SP: dia=${dayOfWeek}, hora=${hour}h (slot ${slot}h) -> Categoria: ${category}`);
    return category;
}

function normalizeCategoryName(raw) {
    const norm = (str) => String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const target = norm(raw);
    for (const valid of VALID_CATEGORIES) {
        if (norm(valid) === target) return valid;
    }
    return null;
}

/**
 * Resolve which category list should be generated based on CLI flags and env vars.
 */
function resolveTargetCategories() {
    const runMode = (process.env.RUN_MODE || '').trim().toLowerCase();
    const hasBatchFlag = process.argv.includes('--batch-5') || process.argv.includes('--batch=5');

    if (hasBatchFlag || runMode === 'batch-5') {
        return [...BATCH_5_CATEGORIES];
    }

    const rawBatchList = (process.env.BATCH_CATEGORIES || '').trim();
    if (rawBatchList) {
        const parsed = [];
        for (const item of rawBatchList.split(',')) {
            const canonical = normalizeCategoryName(item);
            if (canonical && !parsed.includes(canonical)) {
                parsed.push(canonical);
            }
        }
        if (parsed.length > 0) {
            return parsed;
        }
        console.warn(`⚠️ BATCH_CATEGORIES="${rawBatchList}" não contém editorias válidas. Usando modo padrão.`);
    }

    return [getCategoryForSchedule()];
}

function initFirebaseAdmin() {
    if (admin.apps.length > 0) return admin;

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT não configurado.');
    }

    const trimmed = raw.trim();
    const jsonStr = trimmed.startsWith('{')
        ? trimmed
        : Buffer.from(trimmed, 'base64').toString('utf8');

    const serviceAccount = JSON.parse(jsonStr);
    if (typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    return admin;
}

function extractImageUrl(item) {
    if (item?.enclosure?.url) {
        return item.enclosure.url;
    }

    const media = item?.['media:content'];
    if (Array.isArray(media)) {
        for (const entry of media) {
            if (entry?.$?.url) return entry.$.url;
        }
    } else if (media?.$?.url) {
        return media.$.url;
    }

    return null;
}

/**
 * Fetch and parse all configured RSS feeds once per run.
 */
async function fetchAllRssFeeds() {
    const parser = new Parser({
        customFields: {
            item: ['media:content']
        }
    });

    const results = await Promise.allSettled(
        RSS_FEEDS.map(async feed => {
            const resp = await fetch(feed.url, {
                signal: AbortSignal.timeout(10000),
                headers: {
                    'User-Agent': 'TrilhaNewsBot/1.0 (+https://www.trilhacomigo.com)'
                }
            });
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            const xml = await resp.text();
            const parsed = await parser.parseString(xml);
            return {
                feed,
                items: (parsed.items || []).slice(0, feed.limit)
            };
        })
    );

    const feedEntries = [];
    const feedStatus = [];

    for (let i = 0; i < results.length; i++) {
        const res = results[i];
        const feedMeta = RSS_FEEDS[i];

        if (res.status === 'fulfilled') {
            feedStatus.push({ category: feedMeta.category, ok: true, count: res.value.items.length, url: feedMeta.url });
            feedEntries.push(res.value);
        } else {
            const msg = res.reason?.message || String(res.reason);
            console.warn(`⚠️ Falha no feed [${feedMeta.category}] (${feedMeta.url}): ${msg}`);
            feedStatus.push({ category: feedMeta.category, ok: false, error: msg, url: feedMeta.url });
        }
    }

    return { feedEntries, feedStatus };
}

/**
 * Build prioritized RSS news context and pick a category-matched unused RSS image when available.
 */
function buildCategoryContext(feedEntries, targetCategory, usedImageUrls = new Set()) {
    const orderedFeeds = [...feedEntries].sort((a, b) => {
        if (a.feed.category === targetCategory && b.feed.category !== targetCategory) return -1;
        if (b.feed.category === targetCategory && a.feed.category !== targetCategory) return 1;
        return 0;
    });

    const prioritizedItems = orderedFeeds.flatMap(entry =>
        entry.items.map(item => ({
            feedCategory: entry.feed.category,
            item
        }))
    );

    let realImageUrl = null;
    for (const entry of prioritizedItems) {
        if (entry.feedCategory !== targetCategory) continue;
        const img = extractImageUrl(entry.item);
        if (img && !usedImageUrls.has(img)) {
            realImageUrl = img;
            break;
        }
    }

    const articlesText = prioritizedItems
        .map(({ feedCategory, item }) => {
            const snippet = (item.contentSnippet || item.content || '').replace(/\s+/g, ' ').trim().slice(0, 350);
            return `- [${feedCategory}] ${item.title}: ${snippet}`;
        })
        .join('\n');

    return {
        newsContext: articlesText
            ? `ÚLTIMAS NOTÍCIAS (FONTE REAL):\n${articlesText}`
            : 'Sem notícias recentes nos feeds. Escolha um tema evergreen relevante para a categoria.',
        realImageUrl
    };
}

function buildSlug(subject) {
    const base = String(subject || 'trilha-news')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'noticia';

    return `${base}-${Date.now()}`;
}

function parseAiJson(rawText) {
    let cleaned = String(rawText || '').trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
}

/**
 * Generate one article via Gemini Interactions API (with 1 transient retry) and publish to Firestore.
 */
async function generateAndPublishArticle({
    ai,
    db,
    model,
    targetCategory,
    feedEntries,
    usedImageUrls,
    avoidedTitles,
    isDryRun
}) {
    const { newsContext, realImageUrl } = buildCategoryContext(feedEntries, targetCategory, usedImageUrls);
    const recentTitlesList = [...avoidedTitles].slice(0, 25).join(', ');

    const articleJsonSchema = {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Título chamativo e jornalístico em português' },
            subject: { type: 'string', description: 'Slug curto em minúsculas separado por hífens sem acentos' },
            category: { type: 'string', description: `Deve ser exatamente: ${targetCategory}` },
            content: { type: 'string', description: 'Conteúdo HTML com tags h2, h3, p, ul, li, strong' },
            imagePrompt: { type: 'string', description: 'Descriptive English prompt for an editorial illustration representing the article' }
        },
        required: ['title', 'subject', 'category', 'content', 'imagePrompt']
    };

    const prompt = `
CONTEXTO DE MUNDO REAL (USE ISSO):
${newsContext}

TÓPICOS A EVITAR (JÁ PUBLICADOS RECENTEMENTE):
${recentTitlesList || 'Nenhum'}

CATEGORIA OBRIGATÓRIA: ${targetCategory}

Você é o Editor-Chefe do "Trilha News". Sua missão é criar um artigo profundo e atualizado sobre ${targetCategory}.

IMPORTANTE: Você DEVE criar um artigo sobre ${targetCategory}. Escolha a notícia mais relevante relacionada a esta categoria na lista acima.
Se não houver notícias específicas sobre ${targetCategory}, crie um artigo evergreen relevante e atual sobre um tema importante desta categoria.
NÃO repita assunto já listado em TÓPICOS A EVITAR.

ESTILO E TOM:
- Visual: Limpo, arejado, uso estratégico de <strong>.
- Tom: Profissional, analítico, mas acessível ao leitor brasileiro.
- Estrutura:
  1. Título Impactante (no campo "title"): Curto e direto.
  2. Introdução (<p>): Contexto imediato.
  3. Desenvolvimento: 3 a 4 seções com subtítulos (<h2>) e parágrafos bem estruturados.
  4. Análise Trilha (<h2>Análise Trilha</h2>): Um parágrafo conectando a notícia ao bolso ou à realidade do leitor.
  5. Conclusão (<p>).

CONTEÚDO:
- O artigo deve ter entre 800 e 1200 palavras.
- Retorne exclusivamente JSON válido aderindo ao schema solicitado.
`;

    let articleData = null;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`🤖 [${targetCategory}] Gerando artigo (tentativa ${attempt}/${maxAttempts}) com modelo ${model}...`);
            const interaction = await ai.interactions.create({
                model,
                input: prompt,
                store: false,
                generation_config: {
                    max_output_tokens: 8192
                },
                response_format: {
                    type: 'text',
                    mime_type: 'application/json',
                    schema: articleJsonSchema
                }
            });

            const rawOutput = interaction.output_text;
            if (!rawOutput) {
                throw new Error(`Modelo retornou resposta vazia (status=${interaction.status}).`);
            }

            articleData = parseAiJson(rawOutput);
            if (!articleData.title || !articleData.subject || !articleData.content) {
                throw new Error('JSON retornado pelo modelo está incompleto (faltando title, subject ou content).');
            }
            break;
        } catch (err) {
            if (attempt < maxAttempts) {
                console.warn(`⚠️ Falha na tentativa ${attempt} para [${targetCategory}]: ${err.message}. Tentando novamente em 5s...`);
                await sleep(5000);
            } else {
                throw err;
            }
        }
    }

    if (articleData.category !== targetCategory) {
        console.warn(`⚠️ Modelo retornou categoria "${articleData.category}", forçando "${targetCategory}".`);
        articleData.category = targetCategory;
    }

    const slug = buildSlug(articleData.subject);

    let finalThumbnail;
    if (realImageUrl) {
        usedImageUrls.add(realImageUrl);
        finalThumbnail = realImageUrl;
        console.log(`🖼️ [${targetCategory}] Usando imagem real extraída do RSS.`);
    } else {
        finalThumbnail = getEditorialCoverUrl(targetCategory, slug);
        console.log(`🖼️ [${targetCategory}] Sem imagem no RSS da editoria; usando capa editorial: ${finalThumbnail}`);
    }

    avoidedTitles.add(articleData.title);

    if (isDryRun) {
        const drySummary = {
            slug,
            title: articleData.title,
            category: articleData.category,
            thumbnail: finalThumbnail,
            contentLength: articleData.content.length
        };
        console.log(`🧪 DRY_RUN=true — resumo [${targetCategory}]:`);
        console.log(JSON.stringify(drySummary, null, 2));
        return { ...drySummary, dryRun: true };
    }

    const nowTs = admin.firestore.FieldValue.serverTimestamp();
    const postData = {
        slug,
        title: articleData.title,
        category: targetCategory,
        content: articleData.content,
        thumbnail: finalThumbnail,
        status: 'sent',
        sentAt: nowTs,
        createdAt: nowTs,
        updatedAt: nowTs,
        sentCount: 0,
        emailStats: { successCount: 0, failureCount: 0 },
        generatedBy: 'AI Agent (GitHub Actions v4)',
        tags: ['AI', 'Daily', targetCategory]
    };

    await db.collection('newsletter_posts').doc(slug).set(postData);
    console.log(`✅ Artigo publicado no Firestore: ${slug} [${targetCategory}]`);

    return {
        slug,
        title: articleData.title,
        category: targetCategory,
        thumbnail: finalThumbnail,
        contentLength: articleData.content.length,
        dryRun: false
    };
}

function escapeMarkdownCell(text) {
    return String(text || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function writeStepSummary({ modeLabel, isDryRun, succeeded, failed }) {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath) return;

    const lines = [
        `## Trilha News — Execução (${modeLabel}${isDryRun ? ' · DRY-RUN' : ''})`,
        '',
        `- **Publicadas:** ${succeeded.length}`,
        `- **Falhas:** ${failed.length}`,
        '',
        '| Editoria | Título | Link | Status |',
        '| :--- | :--- | :--- | :--- |'
    ];

    for (const item of succeeded) {
        const url = `https://www.trilhacomigo.com/artigos/${encodeURIComponent(item.slug)}`;
        const statusLabel = isDryRun ? '🧪 Dry-run' : '✅ Publicado';
        lines.push(`| ${escapeMarkdownCell(item.category)} | ${escapeMarkdownCell(item.title)} | ${url} | ${statusLabel} |`);
    }

    for (const item of failed) {
        lines.push(`| ${escapeMarkdownCell(item.category)} | — | — | ❌ ${escapeMarkdownCell(item.error)} |`);
    }

    lines.push('');
    fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

async function run() {
    const checkRssOnly = process.argv.includes('--check-rss');
    const isDryRun = process.env.DRY_RUN === 'true';
    const targetCategories = resolveTargetCategories();
    const isBatch = targetCategories.length > 1;
    const modeLabel = isBatch ? `lote (${targetCategories.length} editorias)` : 'única (1 editoria)';

    console.log(`📋 Modo: ${modeLabel} -> [${targetCategories.join(', ')}]`);
    console.log('📰 Coletando feeds RSS...');

    const { feedEntries, feedStatus } = await fetchAllRssFeeds();
    const okCount = feedStatus.filter(f => f.ok).length;
    console.log(`✅ Feeds coletados: ${okCount}/${feedStatus.length} com sucesso.`);

    for (const status of feedStatus) {
        if (status.ok) {
            console.log(`   - [${status.category}] ${status.count} itens (${status.url})`);
        } else {
            console.log(`   - [${status.category}] FALHOU: ${status.error} (${status.url})`);
        }
    }

    if (okCount === 0) {
        console.warn('⚠️ Nenhum feed RSS respondeu; usando fallback evergreen.');
    }

    if (checkRssOnly) {
        const previewUsedImages = new Set();
        for (const cat of targetCategories) {
            const { realImageUrl } = buildCategoryContext(feedEntries, cat, previewUsedImages);
            if (realImageUrl) previewUsedImages.add(realImageUrl);
            const coverPreview = realImageUrl || `capa editorial ${getEditorialCoverUrl(cat, `preview-${cat}`)}`;
            console.log(`🖼️ [${cat}] Capa prevista: ${coverPreview}`);
        }
        console.log('✅ Check RSS concluído com sucesso.');
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY não configurada.');
    }

    let db = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        db = initFirebaseAdmin().firestore();
    } else if (!isDryRun) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT não configurado.');
    } else {
        console.warn('⚠️ DRY_RUN=true sem FIREBASE_SERVICE_ACCOUNT: pulando checagem de duplicatas e escrita.');
    }

    const avoidedTitles = new Set();
    if (db) {
        try {
            const recentSnapshot = await db.collection('newsletter_posts')
                .orderBy('sentAt', 'desc')
                .limit(15)
                .get();

            if (!recentSnapshot.empty) {
                recentSnapshot.docs.forEach(docItem => {
                    const title = docItem.data()?.title;
                    if (title) avoidedTitles.add(title);
                });
                console.log(`🚫 Evitando ${avoidedTitles.size} tópicos recentes do Firestore.`);
            }
        } catch (dupErr) {
            console.warn('⚠️ Erro ao checar duplicatas no Firestore:', dupErr.message);
        }
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const ai = new GoogleGenAI({ apiKey });
    const usedImageUrls = new Set();
    const succeeded = [];
    const failed = [];
    const rawDelay = Number(process.env.BATCH_DELAY_MS ?? DEFAULT_BATCH_DELAY_MS);
    const batchDelayMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : DEFAULT_BATCH_DELAY_MS;

    for (let i = 0; i < targetCategories.length; i++) {
        const targetCategory = targetCategories[i];
        try {
            const result = await generateAndPublishArticle({
                ai,
                db,
                model,
                targetCategory,
                feedEntries,
                usedImageUrls,
                avoidedTitles,
                isDryRun
            });
            succeeded.push(result);
        } catch (err) {
            console.error(`❌ Erro em [${targetCategory}]:`, err);
            failed.push({ category: targetCategory, error: err.message || String(err) });
        }

        if (i < targetCategories.length - 1 && batchDelayMs > 0) {
            console.log(`⏳ Aguardando ${Math.round(batchDelayMs / 1000)}s antes da próxima editoria...`);
            await sleep(batchDelayMs);
        }
    }

    console.log('\n📊 RESUMO DA EXECUÇÃO');
    console.log(`   Modo: ${modeLabel}${isDryRun ? ' (DRY-RUN)' : ''}`);
    console.log(`   Sucesso: ${succeeded.length}/${targetCategories.length}`);
    succeeded.forEach(item => {
        console.log(`   - [${item.category}] ${item.title} (${item.slug})`);
    });
    if (failed.length > 0) {
        console.log(`   Falhas: ${failed.length}`);
        failed.forEach(item => {
            console.log(`   - [${item.category}] ${item.error}`);
        });
    }

    writeStepSummary({ modeLabel, isDryRun, succeeded, failed });

    if (succeeded.length === 0 || failed.length > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('❌ Erro ao gerar notícia diária:', err);
    process.exit(1);
});
