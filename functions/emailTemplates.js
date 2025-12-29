/**
 * Gera o HTML do email de boas-vindas.
 * @param {string} name - Nome do usuário para personalização.
 * @param {string} unsubscribeUrl - Link de cancelamento de inscrição.
 * @returns {string} HTML completo do email.
 */
exports.getWelcomeEmailTemplate = (name = 'Trilheiro(a)', unsubscribeUrl = '#') => {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao Trilha Comigo</title>
    <style>
        body, p, h1, h2, h3, a { margin: 0; padding: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; }
        body { background-color: #F5F5F5; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content, .header { padding: 20px !important; }
        }
    </style>
</head>
<body style="background-color: #F5F5F5; margin: 0; padding: 20px;">
    <div class="container" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div class="header" style="background-color: #1A1A1A; padding: 30px; text-align: center;">
            <img src="https://trilhacomigo.br/imgs/14.png" alt="Trilha Comigo" style="max-height: 40px; display: block; margin: 0 auto; filter: invert(1);">
        </div>

        <!-- Hero -->
        <div style="background-color: #F4B000; padding: 40px 30px; text-align: center;">
            <h1 style="color: #1A1A1A; font-size: 28px; font-weight: 800; line-height: 1.2; margin-bottom: 10px;">Bem-vindo ao time! 🚀</h1>
            <p style="color: #1A1A1A; font-size: 16px; font-weight: 500;">Você acaba de dar o primeiro passo.</p>
        </div>

        <!-- Content -->
        <div class="content" style="padding: 40px 40px;">
            <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6; margin-bottom: 20px;"><strong>Olá, ${name}!</strong> 👋</p>
            <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Seja muito bem-vindo(a) à newsletter do <strong>Trilha Comigo</strong>.</p>
            
            <div style="background-color: #FFF9E5; border-left: 4px solid #F4B000; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #1A1A1A; font-size: 15px; margin-bottom: 10px; font-weight: bold; text-transform: uppercase;">O que você vai receber:</p>
                <ul style="color: #4A4A4A; font-size: 15px; line-height: 1.6; padding-left: 20px; margin: 0;">
                    <li style="margin-bottom: 8px;">💰 <strong>Investimentos:</strong> Análises simples.</li>
                    <li style="margin-bottom: 8px;">📉 <strong>Economia:</strong> Dicas práticas.</li>
                    <li>🧠 <strong>Educação:</strong> Aprendizados reais.</li>
                </ul>
            </div>

            <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                <strong>Missão rápida:</strong> Responda com um "Oi!" para garantir o recebimento.
            </p>

            <div style="text-align: center; margin-top: 40px;">
                <a href="https://trilhacomigo.br" style="background-color: #1A1A1A; color: #FFFFFF; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">Acessar o Site</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px; margin-bottom: 15px;">© 2025 Trilha Comigo.</p>
            <a href="${unsubscribeUrl}" style="color: #9CA3AF; text-decoration: underline; font-size: 11px;">Cancelar inscrição</a>
        </div>
    </div>
</body>
</html>
    `;
};
