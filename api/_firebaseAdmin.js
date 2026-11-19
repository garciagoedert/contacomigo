const admin = require('firebase-admin');

/**
 * Initialize and return the singleton Firebase Admin SDK instance.
 */
function getFirebaseAdmin() {
    if (admin.apps.length === 0) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!raw) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT não configurado nas variáveis de ambiente.');
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
    }

    return admin;
}

/**
 * Safely parse JSON request body whether Vercel pre-parsed it or passed a raw string.
 */
function parseJsonBody(req) {
    if (typeof req.body === 'string') {
        return JSON.parse(req.body || '{}');
    }
    return req.body || {};
}

/**
 * Apply CORS headers for Vercel Serverless Functions.
 */
function setCors(res, methods = 'GET, POST, OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Escape special HTML characters to prevent injection in rendered HTML templates.
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Build the responsive HTML email template for newsletter campaigns.
 */
function getNewsletterTemplate(title, content, unsubscribeUrl) {
    const safeTitle = escapeHtml(title);
    const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <style>
        body, p, h1, h2, h3, a { margin: 0; padding: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; }
        body { background-color: #F5F5F5; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
            .header { padding: 20px !important; }
        }
    </style>
</head>
<body style="background-color: #F5F5F5; margin: 0; padding: 20px;">
    <div class="container" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div class="header" style="background-color: #1A1A1A; padding: 30px; text-align: center;">
            <img src="https://www.trilhacomigo.com/imgs/bannertrilha.png" alt="Trilha Comigo" style="max-height: 40px; display: block; margin: 0 auto;">
        </div>

        <!-- Hero Section -->
        <div style="background-color: #F4B000; padding: 40px 30px; text-align: center;">
            <h1 style="color: #1A1A1A; font-size: 24px; font-weight: 800; line-height: 1.2; margin: 0;">
                ${safeTitle}
            </h1>
        </div>

        <!-- Body Content -->
        <div class="content" style="padding: 40px 40px; color: #4A4A4A; font-size: 16px; line-height: 1.6;">
            ${content}
        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px; margin-bottom: 15px;">
                © 2026 Trilha Comigo. Todos os direitos reservados.<br>
            </p>
            <div style="margin-bottom: 15px;">
                <a href="https://www.instagram.com/trilhacomigo.cc/#" style="color: #9CA3AF; text-decoration: none; margin: 0 10px; font-size: 12px;">Instagram</a>
                <a href="https://www.trilhacomigo.com/" style="color: #9CA3AF; text-decoration: none; margin: 0 10px; font-size: 12px;">Website</a>
            </div>
            <p style="color: #D1D5DB; font-size: 11px;">
                Você recebeu este email porque se inscreveu em nossa newsletter.<br>
                <a href="${safeUnsubscribeUrl}" style="color: #9CA3AF; text-decoration: underline;">Cancelar inscrição</a>
            </p>
        </div>
    </div>
</body>
</html>`;
}

module.exports = {
    getFirebaseAdmin,
    parseJsonBody,
    setCors,
    escapeHtml,
    getNewsletterTemplate
};
