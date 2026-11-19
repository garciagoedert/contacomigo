const { getFirebaseAdmin, escapeHtml } = require('./_firebaseAdmin');

function renderHtmlPage(title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - Trilha News</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 50px; color: #1f2937;">
    ${bodyHtml}
</body>
</html>`;
}

/**
 * Unsubscribe an email address from the Trilha News newsletter.
 */
module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    const rawEmail = typeof req.query?.email === 'string' ? req.query.email.trim() : '';
    if (!rawEmail) {
        return res.status(400).send('Email is required');
    }

    try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const collection = db.collection('newsletter_subscribers');

        let subscriberRef = collection.doc(rawEmail);
        let doc = await subscriberRef.get();

        if (!doc.exists) {
            const lowerEmail = rawEmail.toLowerCase();
            if (lowerEmail !== rawEmail) {
                subscriberRef = collection.doc(lowerEmail);
                doc = await subscriberRef.get();
            }
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        if (!doc.exists) {
            return res.status(200).send(renderHtmlPage(
                'Email não encontrado',
                '<h1>Email não encontrado na nossa lista.</h1><br><a href="https://www.trilhacomigo.com/" style="color: #2563eb; text-decoration: underline;">Voltar ao site</a>'
            ));
        }

        await subscriberRef.update({
            status: 'unsubscribed',
            unsubscribedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const safeEmail = escapeHtml(rawEmail);
        return res.status(200).send(renderHtmlPage(
            'Inscrição Cancelada',
            `<h1>Inscrição Cancelada</h1>
             <p>O email <strong>${safeEmail}</strong> foi removido da nossa newsletter.</p>
             <p>Você não receberá mais nossos emails.</p>
             <br>
             <a href="https://www.trilhacomigo.com/" style="color: #2563eb; text-decoration: underline;">Voltar ao site</a>`
        ));
    } catch (error) {
        console.error('Erro no unsubscribe:', error);
        return res.status(500).send('Erro ao cancelar inscrição.');
    }
};
