const { Resend } = require('resend');
const { getFirebaseAdmin, parseJsonBody, setCors } = require('./_firebaseAdmin');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscribe an email address to the Trilha News newsletter in Firestore.
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
        const body = parseJsonBody(req);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

        if (!email || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: 'Por favor, informe um e-mail válido.' });
        }

        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const subscriberRef = db.collection('newsletter_subscribers').doc(email);
        const subscriberDoc = await subscriberRef.get();

        if (subscriberDoc.exists) {
            if (subscriberDoc.data()?.status !== 'active') {
                await subscriberRef.update({
                    status: 'active',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return res.status(200).json({ success: true, message: 'Inscrição reativada com sucesso!' });
            }
            return res.status(200).json({ success: true, message: 'Você já está inscrito!' });
        }

        await subscriberRef.set({
            email,
            status: 'active',
            source: 'internal_form',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (process.env.RESEND_API_KEY) {
            const sender = process.env.SENDER_EMAIL || 'Trilha News <marketing@southsea.com.br>';
            const resend = new Resend(process.env.RESEND_API_KEY);
            const welcomeHtml = `
                <div style="font-family: sans-serif; color: #333;">
                    <h1>Bem-vindo(a) à Newsletter Trilha News!</h1>
                    <p>É um prazer ter você conosco.</p>
                    <p>Aguarde nossas análises sobre economia, investimentos, mercado e tecnologia.</p>
                    <br>
                    <p>Att, Equipe Trilha News.</p>
                </div>
            `;

            try {
                await resend.emails.send({
                    from: sender,
                    to: email,
                    subject: 'Bem-vindo ao Trilha News!',
                    html: welcomeHtml
                });
            } catch (emailError) {
                console.error('Erro ao enviar email de boas-vindas:', emailError);
            }
        }

        return res.status(200).json({ success: true, message: 'Inscrição realizada com sucesso!' });
    } catch (error) {
        console.error('Erro na inscrição:', error);
        return res.status(500).json({
            error: 'Falha na inscrição.',
            details: error.message
        });
    }
};
