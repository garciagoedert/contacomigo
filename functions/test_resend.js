const { Resend } = require('resend');

const RESEND_API_KEY = 're_X6gRBcc2_Gc1EjFJBq2hbpV9FQt4gGJsH';
const resend = new Resend(RESEND_API_KEY);

// NOW TESTING WITH VERIFIED DOMAIN
const SENDER = 'marketing@southsea.com.br';
const RECIPIENT = 'marketing@southsea.com.br';

async function testSend() {
    console.log(`🚀 Tentando enviar DE: ${SENDER} ...`);

    try {
        const { data, error } = await resend.emails.send({
            from: `Trilha News <${SENDER}>`,
            to: [RECIPIENT],
            subject: 'Teste Pós-Verificação de Domínio',
            html: '<p>Se este email chegou, o domínio <strong>southsea.com.br</strong> está verificado e enviando corretamente!</p>'
        });

        if (error) {
            console.error('❌ Falha Resend:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Sucesso! ID:', data.id);
        }
    } catch (e) {
        console.error('❌ Exceção:', e);
    }
}

testSend();
