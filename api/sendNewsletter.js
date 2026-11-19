const { Resend } = require('resend');
const {
    getFirebaseAdmin,
    parseJsonBody,
    setCors,
    getNewsletterTemplate
} = require('./_firebaseAdmin');

const RESEND_BATCH_SIZE = 100;

function generateSlug(subject) {
    return subject
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Admin-only endpoint to save drafts, publish posts, and send newsletter emails in batches.
 */
module.exports = async function handler(req, res) {
    setCors(res, 'POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const body = parseJsonBody(req);

        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length).trim()
            : body.token;

        if (!idToken) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (authError) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
            return res.status(403).json({ error: 'Permission Denied' });
        }

        const {
            subject,
            htmlContent,
            thumbnail,
            category,
            isTest,
            testEmail,
            saveOnly,
            publishOnly,
            slug: providedSlug
        } = body;

        if (!subject || !htmlContent) {
            return res.status(400).json({ error: 'Assunto e conteúdo HTML são obrigatórios.' });
        }

        const slug = providedSlug || generateSlug(subject);
        if (!slug) {
            return res.status(400).json({ error: 'Não foi possível gerar um slug válido.' });
        }

        const postData = {
            slug,
            title: subject,
            thumbnail: thumbnail || null,
            content: htmlContent,
            status: saveOnly ? 'draft' : 'sent',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (category) {
            postData.category = category;
        }

        const postRef = db.collection('newsletter_posts').doc(slug);

        if (saveOnly) {
            await postRef.set(postData, { merge: true });
            return res.status(200).json({
                success: true,
                message: 'Rascunho salvo com sucesso!',
                slug
            });
        }

        if (publishOnly) {
            const docSnap = await postRef.get();
            if (!docSnap.exists) {
                postData.sentAt = admin.firestore.FieldValue.serverTimestamp();
                postData.sentCount = 0;
                postData.createdAt = admin.firestore.FieldValue.serverTimestamp();
            }

            await postRef.set(postData, { merge: true });
            return res.status(200).json({
                success: true,
                message: 'Publicado no blog com sucesso (sem envio de email)!',
                slug
            });
        }

        if (!process.env.RESEND_API_KEY) {
            return res.status(500).json({
                error: 'RESEND_API_KEY não configurada nas variáveis de ambiente da Vercel.'
            });
        }

        const isTestSend = Boolean(isTest && testEmail);
        const recipients = [];

        if (isTestSend) {
            recipients.push(String(testEmail).trim());
        } else {
            const subscribersSnapshot = await db.collection('newsletter_subscribers')
                .where('status', '==', 'active')
                .get();

            if (subscribersSnapshot.empty) {
                return res.status(200).json({ message: 'Nenhum inscrito ativo encontrado.' });
            }

            subscribersSnapshot.forEach(doc => recipients.push(doc.id));
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const sender = process.env.SENDER_EMAIL || 'Trilha News <marketing@southsea.com.br>';

        let successCount = 0;
        let failureCount = 0;
        const errors = [];

        for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) {
            const chunk = recipients.slice(i, i + RESEND_BATCH_SIZE);
            const batchPayload = chunk.map(email => {
                const unsubscribeUrl = `https://www.trilhacomigo.com/api/unsubscribeUser?email=${encodeURIComponent(email)}`;
                return {
                    from: sender,
                    to: email,
                    subject,
                    html: getNewsletterTemplate(subject, htmlContent, unsubscribeUrl),
                    headers: {
                        'List-Unsubscribe': `<${unsubscribeUrl}>`
                    }
                };
            });

            try {
                const { data, error } = await resend.batch.send(batchPayload, {
                    batchValidation: 'permissive'
                });

                if (error) {
                    failureCount += chunk.length;
                    errors.push(error.message || JSON.stringify(error));
                } else {
                    const sentIds = Array.isArray(data?.data) ? data.data : [];
                    const batchErrors = Array.isArray(data?.errors) ? data.errors : [];

                    successCount += sentIds.length;
                    failureCount += batchErrors.length;

                    for (const itemErr of batchErrors) {
                        const targetEmail = chunk[itemErr.index] || `index ${itemErr.index}`;
                        errors.push(`${targetEmail}: ${itemErr.message}`);
                    }
                }
            } catch (err) {
                failureCount += chunk.length;
                errors.push(err.message);
            }
        }

        if (!isTestSend) {
            const existingDoc = await postRef.get();
            postData.sentAt = admin.firestore.FieldValue.serverTimestamp();
            postData.sentCount = successCount;
            if (!existingDoc.exists || !existingDoc.data()?.createdAt) {
                postData.createdAt = admin.firestore.FieldValue.serverTimestamp();
            }

            await postRef.set(postData, { merge: true });
        }

        return res.status(200).json({
            success: true,
            message: `Envio finalizado. Sucessos: ${successCount}, Falhas: ${failureCount}`,
            stats: {
                successCount,
                failureCount,
                total: recipients.length,
                errors
            },
            slug
        });
    } catch (error) {
        console.error('Erro em sendNewsletter:', error);
        return res.status(500).json({ error: error.message });
    }
};
