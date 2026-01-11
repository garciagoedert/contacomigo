const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

// Configuração do Asaas
// A chave de API é armazenada de forma segura usando Firebase Functions Config
// Para configurar: firebase functions:config:set asaas.api_key="SUA_CHAVE_AQUI"


exports.createAbacatePayBilling = functions
    .runWith({ invoker: 'public' })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            // Obter chave de API do AbacatePay
            // Prioridade: Variável de ambiente (local/.env) -> Configuração do Firebase (produção)
            const ABACATE_API_KEY = process.env.ABACATE_API_KEY || functions.config().abacate?.api_key;
            const ABACATE_API_BASE_URL = 'https://api.abacatepay.com/v1';

            if (!ABACATE_API_KEY) {
                console.error('❌ ERRO: Chave de API do AbacatePay não configurada!');
                return res.status(500).json({ error: 'Configuração de pagamento ausente.' });
            }

            try {
                if (req.method !== 'POST') {
                    return res.status(405).send('Method Not Allowed');
                }

                const { planType, userId, userEmail, userName, returnUrl } = req.body;

                if (!planType || !userId || !userEmail) {
                    return res.status(400).send('Missing required parameters');
                }

                // Definição dos planos (Preços em centavos)
                const planData = {
                    premium_monthly: {
                        frequency: 'MONTHLY',
                        amount: 990, // R$ 9,90
                        title: 'Trilha Comigo Premium (Mensal)',
                        description: 'Acesso ilimitado a todas as features.'
                    },
                    premium_yearly: {
                        frequency: 'YEARLY',
                        amount: 8990, // R$ 89,90
                        title: 'Trilha Comigo Premium (Anual)',
                        description: 'Acesso ilimitado a todas as features com desconto.'
                    }
                };

                const selectedPlan = planData[planType];
                if (!selectedPlan) {
                    return res.status(400).send('Invalid plan type');
                }

                // Payload para o AbacatePay
                const payload = {
                    frequency: 'ONE_TIME', // 'MONTHLY' não é suportado nativamente neste endpoint, usamos ONE_TIME para a cobrança atual
                    methods: ["PIX"], // CARD removido pois a loja não está habilitada
                    products: [
                        {
                            externalId: planType,
                            name: selectedPlan.title,
                            description: selectedPlan.description,
                            quantity: 1,
                            price: selectedPlan.amount
                        }
                    ],
                    returnUrl: `${returnUrl}?status=success&plan=${planType}`,
                    completionUrl: `${returnUrl}?status=success&plan=${planType}`,
                    customer: {
                        name: userName || 'Cliente Trilha Comigo',
                        email: userEmail,
                        cellphone: req.body.cellphone || "11999999999",
                        taxId: req.body.taxId || "38852890053"
                    }
                };

                console.log("Enviando payload para AbacatePay:", JSON.stringify(payload, null, 2));

                // Criação do Billing no AbacatePay
                const billingResponse = await fetch(`${ABACATE_API_BASE_URL}/billing/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ABACATE_API_KEY}`
                    },
                    body: JSON.stringify(payload)
                });

                const billingData = await billingResponse.json();

                if (!billingResponse.ok) {
                    const errorDetails = JSON.stringify(billingData, null, 2);
                    console.error('❌ Erro na API do AbacatePay:', errorDetails);
                    return res.status(500).json({
                        error: 'Falha ao criar cobrança no provedor de pagamentos',
                        details: billingData,
                        status: billingResponse.status
                    });
                }

                console.log("✅ Billing criado com sucesso:", billingData.data.id);

                res.json({
                    checkoutUrl: billingData.data.url,
                    billingId: billingData.data.id
                });

            } catch (error) {
                console.error('Erro ao processar pagamento:', error);
                res.status(500).json({
                    error: error.message,
                    details: error.stack
                });
            }
        });
    });

const { getPluggyClient } = require('./pluggy');

// --- OPEN BANKING (PLUGGY) FUNCTIONS ---

// 1. Criar Token para o Widget "Pluggy Connect"
exports.createPluggyConnectToken = functions
    .runWith({ invoker: 'public' })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            // Aceitar apenas POST
            if (req.method !== 'POST') {
                return res.status(405).send('Method Not Allowed');
            }

            try {
                const client = getPluggyClient();
                // Cria um item vazio ou atualiza um existente seitemId for passado
                // Para simplificar, vamos criar um token de criação
                const data = await client.createConnectToken();

                res.json({ accessToken: data.accessToken });
            } catch (error) {
                console.error("Erro ao criar token Pluggy:", error);
                res.status(500).json({ error: error.message });
            }
        });
    });

// 2. Sincronizar Transações (Webhook ou Manual)
exports.syncPluggyTransactions = functions
    .runWith({ invoker: 'public', timeoutSeconds: 300 }) // Timeout maior para sync
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            const { itemId, familyId } = req.body;

            if (!itemId || !familyId) {
                return res.status(400).json({ error: "Missing itemId or familyId" });
            }

            try {
                const client = getPluggyClient();
                const now = new Date();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(now.getDate() - 30);

                // 1. Buscar Contas
                const accounts = await client.fetchAccounts(itemId);

                // 2. Buscar Transações dos últimos 30 dias para todas as contas
                let allTransactions = [];
                for (const account of accounts.results) {
                    const transactions = await client.fetchTransactions(account.id, {
                        from: thirtyDaysAgo.toISOString().split('T')[0],
                        to: now.toISOString().split('T')[0]
                    });

                    // Enriquecer com ID da conta
                    const enriched = transactions.results.map(t => ({ ...t, accountId: account.id, bankName: account.bankData?.name || 'Bank' }));
                    allTransactions = allTransactions.concat(enriched);
                }

                console.log(`Função Sync: Encontradas ${allTransactions.length} transações.`);

                // 3. Salvar no Firestore
                const batch = admin.firestore().batch();
                const transactionRef = admin.firestore().collection('families', familyId, 'transactions');

                let count = 0;
                allTransactions.forEach(t => {
                    // Evitar duplicatas usando o ID da Pluggy como ID do doc (ou parte dele)
                    const docId = `pluggy_${t.id}`;
                    const docRef = transactionRef.doc(docId);

                    // Mapeamento Pluggy -> FinanceApp
                    const amount = Math.abs(t.amount); // Pluggy usa negativo para gastos, nosso app usa type='expense'
                    const type = t.amount < 0 ? 'expense' : 'income';

                    batch.set(docRef, {
                        // Dados do App
                        description: t.description,
                        amount: amount,
                        type: type,
                        category: t.category || 'Outros', // Pluggy já traz categoria, mas pode precisar de DE-PARA
                        date: t.date, // YYYY-MM-DD
                        timestamp: admin.firestore.Timestamp.fromDate(new Date(t.date)),

                        // Metadados Pluggy
                        pluggyId: t.id,
                        pluggyAccountId: t.accountId,
                        pluggyBankName: t.bankName,
                        pluggyStatus: t.status,
                        source: 'open_banking',
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }); // Merge para não sobrescrever se já existir e só atualizar campos

                    count++;
                });

                await batch.commit();

                res.json({
                    success: true,
                    message: `${count} transações sincronizadas.`,
                    count
                });

            } catch (error) {
                console.error("Erro no Sync Pluggy:", error);
                res.status(500).json({ error: error.message });
            }
        });
    });


// --- AI FINANCIAL COACH (GEMINI) ---
// const { GoogleGenerativeAI } = require("@google/generative-ai"); // REMOVED DUPLICATE
const Parser = require('rss-parser');
const parser = new Parser();

exports.generateWeeklyInsights = functions
    .runWith({ invoker: 'public', timeoutSeconds: 60 })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            try {
                const { transactions, goals } = req.body;

                // Configurar Gemini
                const API_KEY = process.env.GOOGLE_GENAI_API_KEY || functions.config().google?.genai_api_key;
                if (!API_KEY) throw new Error("Google GenAI API Key not configured.");

                const genAI = new GoogleGenerativeAI(API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

                // Preparar Prompt Otimizado
                const prompt = `
                Você é um Coach Financeiro Pessoal experiente, direto e motivador.
                Analise os dados financeiros abaixo (últimos 30 dias) e forneça insights acionáveis.

                DADOS:
                - Transações: ${JSON.stringify(transactions)}
                - Metas do Usuário: ${JSON.stringify(goals)}

                TAREFA:
                Retorne uma resposta em formato JSON estrito com a seguinte estrutura:
                {
                    "summary": "Uma frase de impacto sobre o mês atual (ex: 'Você gastou 20% a menos em iFood!')",
                    "tips": ["Dica prática 1", "Dica prática 2", "Dica prática 3"],
                    "alert": "Um alerta importante se houver (ou null)",
                    "mood": "positive" | "neutral" | "warning"
                }
                
                Seja conciso. Use emojis. Fale português do Brasil.
                `;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                // Limpeza básica para garantir JSON (às vezes o modelo coloca markdown ```json)
                const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const insights = JSON.parse(cleanedText);

                res.json(insights);

            } catch (error) {
                console.error("Erro no AI Coach (usando fallback):", error.message);

                // Fallback gracioso para não quebrar o app
                res.json({
                    summary: "O Coach está indisponível temporariamente, mas aqui vão dicas gerais: mantenha seus gastos essenciais abaixo de 50% da renda!",
                    tips: [
                        "Revise suas assinaturas mensais não utilizadas.",
                        "Tente aplicar a regra 50/30/20.",
                        "Evite compras por impulso, espere 24h."
                    ],
                    alert: "Modo Offline (API Key Restrita)",
                    mood: "neutral"
                });
            }
        });
    });

// --- AI CHATBOT (GEMINI) ---
exports.chatWithCoach = functions
    .runWith({ invoker: 'public', timeoutSeconds: 60 })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            try {
                const { message, financialContext } = req.body;

                // Configurar Gemini
                const API_KEY = process.env.GOOGLE_GENAI_API_KEY || functions.config().google?.genai_api_key;
                if (!API_KEY) throw new Error("Google GenAI API Key not configured.");

                const genAI = new GoogleGenerativeAI(API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

                // Preparar Prompt de Chat
                let systemPrompt = `
                Você é o Coach Financeiro do usuário. Um assistente amigável, motivador e expert em finanças pessoais.
                
                CONTEXTO FINANCEIRO DO USUÁRIO (RASCUNHO):
                `;

                if (financialContext) {
                    if (financialContext.transactions && financialContext.transactions.length > 0) {
                        systemPrompt += `\n- Últimas Transações: ${JSON.stringify(financialContext.transactions)}`;
                    } else {
                        systemPrompt += `\n- Sem transações recentes disponíveis.`;
                    }

                    if (financialContext.goals && financialContext.goals.length > 0) {
                        systemPrompt += `\n- Metas Definidas: ${JSON.stringify(financialContext.goals)}`;
                    }
                }

                systemPrompt += `
                
                SUA MISSÃO:
                Responder à mensagem do usuário: "${message}"
                
                DIRETRIZES:
                1. Use o contexto financeiro acima para dar respostas personalizadas SÓ se a pergunta pedir.
                2. Se o usuário perguntar "Quanto gastei com X?", some os valores das transações do contexto.
                3. Seja conciso (máximo 2-3 parágrafos curtos).
                4. Use emojis.
                5. Se não tiver dados suficientes no contexto para responder com precisão, avise educadamente.
                6. Fale sempre em Português do Brasil.
                `;

                const result = await model.generateContent(systemPrompt);
                const responseText = result.response.text();

                res.json({ reply: responseText });

            } catch (error) {
                console.error("Erro no Chat Coach:", error);
                res.status(500).json({
                    error: "Falha ao processar mensagem.",
                    details: error.message
                });
            }
        });
    });
// --- ADMIN PANEL FUNCTIONS ---

// Middleware para verificar se o usuário é ADMIN
const checkAdminRole = async (context) => {
    // Se não houver autenticação
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Requer autenticação.');
    }

    // Verificar se o token tem a claim de admin ou verificar no Firestore
    const uid = context.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(uid).get();

    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Requer privilégios de administrador.');
    }

    return true;
};

exports.getAdminData = functions
    .runWith({ invoker: 'public' }) // Permitir chamada pública (a validação é feita dentro com o token)
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            // Aceitar apenas POST
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            try {
                // Como é uma requisição HTTP normal, precisamos verificar o token manualmente
                const idToken = req.headers.authorization?.split('Bearer ')[1] || req.body.token;

                if (!idToken) {
                    return res.status(401).json({ error: 'Unauthorized: No token provided' });
                }

                // Verificar token e obter UID
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                const uid = decodedToken.uid;

                // Verificar Role de Admin no Firestore
                const userDoc = await admin.firestore().collection('users').doc(uid).get();
                if (!userDoc.exists || userDoc.data().role !== 'admin') {
                    return res.status(403).json({ error: 'Permission Denied: User is not an admin' });
                }

                // --- INICIO DA LÓGICA DO DASHBOARD ---

                const usersSnapshot = await admin.firestore().collection('users').get();

                let totalUsers = 0;
                let activePremiumUsers = 0;
                let totalMRR = 0;
                const usersList = [];

                usersSnapshot.forEach(doc => {
                    const data = doc.data();
                    totalUsers++;

                    // Check Premium Logic
                    const isPremium = data.plan === 'premium_monthly' || data.plan === 'premium_yearly';
                    if (isPremium && data.subscriptionStatus === 'active') {
                        activePremiumUsers++;
                        // Simple MRR calc
                        if (data.plan === 'premium_monthly') totalMRR += 9.90;
                        if (data.plan === 'premium_yearly') totalMRR += (89.90 / 12);
                    }

                    usersList.push({
                        uid: doc.id,
                        name: data.firstName || data.displayName || 'Sem Nome',
                        email: data.email,
                        plan: data.plan || 'free',
                        status: data.subscriptionStatus || 'unknown',
                        validUntil: data.validUntil ? data.validUntil.toDate() : null
                    });
                });

                // Ordenar por data (opcional, aqui pego os últimos por padrão ou sem ordem)
                // Vamos retornar apenas os últimos 50 para não pesar
                const recentUsers = usersList.slice(0, 50);

                res.json({
                    stats: {
                        totalUsers,
                        activePremiumUsers,
                        totalMRR
                    },
                    users: recentUsers
                });

            } catch (error) {
                console.error("Erro no getAdminData:", error);
                res.status(500).json({ error: error.message });
            }
        });
    });

exports.cancelUserSubscription = functions
    .runWith({ invoker: 'public' })
    .https.onCall(async (data, context) => {
        await checkAdminRole(context);

        const targetUid = data.uid;
        if (!targetUid) throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório.');

        try {
            await admin.firestore().collection('users').doc(targetUid).update({
                plan: 'free',
                subscriptionStatus: 'cancelled_by_admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, message: 'Assinatura cancelada com sucesso.' };
        } catch (error) {
            console.error('Erro ao cancelar assinatura:', error);
            throw new functions.https.HttpsError('internal', 'Erro ao atualizar usuário.');
        }
    });

exports.deleteUserAccount = functions
    .runWith({ invoker: 'public' })
    .https.onCall(async (data, context) => {
        await checkAdminRole(context);

        const targetUid = data.uid;
        if (!targetUid) throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório.');

        try {
            // 1. Deletar do Authentication
            await admin.auth().deleteUser(targetUid);

            // 2. Deletar documento do Firestore
            await admin.firestore().collection('users').doc(targetUid).delete();

            // Opcional: Deletar subcoleções (Ex: transactions)
            // O Firestore não deleta subcoleções automaticamente. 
            // Para um app real, use um script recursivo ou extension do Firebase.

            return { success: true, message: 'Usuário excluído permanentemente.' };
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            // Include specific error message
            throw new functions.https.HttpsError('internal', `Erro ao excluir conta: ${error.message}`);
        }
    });

// --- NEWSLETTER SYSTEM ---

// --- NEWSLETTER SYSTEM ---

const { Resend } = require('resend');

// Configuração do Resend
// API Key fixada para resolver o problema imediato (ideal: mover para .env depois)
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_X6gRBcc2_Gc1EjFJBq2hbpV9FQt4gGJsH';
const resend = new Resend(RESEND_API_KEY);

// FROM: Agora usando o domínio verificado
const SENDER_EMAIL = 'Trilha News <marketing@southsea.com.br>';


// Helper sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper Function: Send Emails to All Active Subscribers
const sendEmailsToSubscribers = async (subject, htmlContent, slug) => {
    try {
        console.log(`📧 Iniciando envio em massa para: ${subject}`);
        const subscribersSnapshot = await admin.firestore().collection('newsletter_subscribers')
            .where('status', '==', 'active')
            .get();

        if (subscribersSnapshot.empty) {
            console.log('⚠️ Nenhum inscrito ativo encontrado.');
            return { successCount: 0, failureCount: 0 };
        }

        const recipients = [];
        subscribersSnapshot.forEach(doc => recipients.push(doc.id));

        console.log(`👥 Encontrados ${recipients.length} destinatários.`);

        let successCount = 0;
        let failureCount = 0;
        let failureErrors = []; // Track specific errors

        // Loop de envio (Resend tem rate limit de 2 reqs/seg e 100/dia no plano free)
        for (const email of recipients) {
            try {
                // Rate Limit Protection: Wait 1 second between emails (conservative)
                await sleep(1000);

                // Link de Unsubscribe
                const unsubscribeUrl = `https://us-central1-financeapp-6da16.cloudfunctions.net/unsubscribeUser?email=${encodeURIComponent(email)}`;

                // Nao precisa gerar template aqui se ja vier pronto, mas vamos garantir o unsubscribe
                // O HTML Content ja deve vir "pronto" do gerador, mas podemos envelopar.
                // Mas atenção: o `sendNewsletter` já envelopa. Aqui é só envio interno?
                // Não, `sendNewsletter` chama `sendEmailsToSubscribers`? 
                // Ah, `sendNewsletter` faz o loop ele mesmo!!
                // ESTA FUNCAO AQUI parece ser usada pelo Agente Automatico (`generateDailyPost`).
                // O `sendNewsletter` (Admin) usa nodemailer direto no loop dele (linhas 852-872).
                // PRECISAMOS ATUALIZAR AMBOS.

                const { data, error } = await resend.emails.send({
                    from: SENDER_EMAIL,
                    to: email,
                    subject: subject,
                    html: htmlContent,
                    headers: {
                        'List-Unsubscribe': `<${unsubscribeUrl}>`
                    }
                });

                if (error) {
                    console.error(`❌ Falha ao enviar para ${email}:`, error);
                    failureErrors.push(`${email}: ${error.message || JSON.stringify(error)}`);
                    failureCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.error(`❌ Erro inesperado ao enviar para ${email}:`, err);
                failureErrors.push(`${email}: ${err.message}`);
                failureCount++;
            }
        }

        console.log(`✅ Envio finalizado. Sucessos: ${successCount}, Falhas: ${failureCount}`);
        return { successCount, failureCount, errors: failureErrors }; // Return detailed errors

    } catch (error) {
        console.error("❌ Erro crítico no envio de emails:", error);
        throw error;
    }
};

// Helper: Gerar Template de Email Responsivo
const getNewsletterTemplate = (title, content, unsubscribeUrl) => {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
            <img src="https://www.trilhacomigo.com/imgs/bannertrilha.png" alt="Trilha Comigo" style="max-height: 40px; display: block; margin: 0 auto; filter: invert(0);">
        </div>

        <!-- Hero Section -->
        <div style="background-color: #F4B000; padding: 40px 30px; text-align: center;">
            <h1 style="color: #1A1A1A; font-size: 24px; font-weight: 800; line-height: 1.2; margin: 0;">
                ${title}
            </h1>
        </div>

        <!-- Body Content -->
        <div class="content" style="padding: 40px 40px; color: #4A4A4A; font-size: 16px; line-height: 1.6;">
            ${content}
        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px; margin-bottom: 15px;">
                © 2025 Trilha Comigo. Todos os direitos reservados.<br>
            </p>
            <div style="margin-bottom: 15px;">
                <a href="https://www.instagram.com/trilhacomigo.cc/#" style="color: #9CA3AF; text-decoration: none; margin: 0 10px; font-size: 12px;">Instagram</a>
                <a href="https://www.trilhacomigo.com/" style="color: #9CA3AF; text-decoration: none; margin: 0 10px; font-size: 12px;">Website</a>
            </div>
            <p style="color: #D1D5DB; font-size: 11px;">
                Você recebeu este email porque se inscreveu em nossa newsletter.<br>
                <a href="${unsubscribeUrl}" style="color: #9CA3AF; text-decoration: underline;">Cancelar inscrição</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
};

// 1. Inscrição na Newsletter (Salvar no Firestore)
exports.subscribeToNewsletter = functions
    .runWith({ invoker: 'public' })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });

            try {
                // Verificar se já existe
                const subscriberDoc = await admin.firestore().collection('newsletter_subscribers').doc(email).get();

                if (subscriberDoc.exists) {
                    // Se já existe e estava inativo, reativar
                    if (subscriberDoc.data().status !== 'active') {
                        await subscriberDoc.ref.update({ status: 'active', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        return res.json({ success: true, message: 'Inscrição reativada com sucesso!' });
                    }
                    return res.json({ success: true, message: 'Você já está inscrito!' });
                }

                // Salvar novo inscrito
                await admin.firestore().collection('newsletter_subscribers').doc(email).set({
                    email,
                    status: 'active',
                    source: 'internal_form',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Enviar Email de Boas-vindas (Opcional, mas recomendado)
                const welcomeHtml = `
                    <div style="font-family: sans-serif; color: #333;">
                        <h1>Bem-vindo(a) à Newsletter Trilha Comigo!</h1>
                        <p>É um prazer ter você conosco.</p>
                        <p>Aguarde nossas dicas semanais sobre investimentos e economia.</p>
                        <br>
                        <p>Att, Equipe Trilha Comigo.</p>
                    </div>
                `;

                try {
                    await resend.emails.send({
                        from: SENDER_EMAIL,
                        to: email,
                        subject: 'Bem-vindo ao Trilha Comigo!',
                        html: welcomeHtml
                    });
                } catch (emailError) {
                    console.error("Erro ao enviar email de boas-vindas:", emailError);
                    // Não falhar a inscrição se o email de boas vindas der erro
                }

                res.json({ success: true, message: 'Inscrição realizada com sucesso!' });

            } catch (error) {
                console.error('Erro na inscrição:', error);
                res.status(500).json({
                    error: 'Falha na inscrição.',
                    details: error.message
                });
            }
        });
    });



// 1.5 Cancelar Inscrição (Unsubscribe)
exports.unsubscribeUser = functions
    .runWith({ invoker: 'public' })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

            const { email } = req.query;
            if (!email) return res.status(400).send('Email is required');

            try {
                const subscriberRef = admin.firestore().collection('newsletter_subscribers').doc(email);
                const doc = await subscriberRef.get();

                if (!doc.exists) {
                    return res.send('<h1>Email não encontrado na nossa lista.</h1>');
                }

                await subscriberRef.update({
                    status: 'unsubscribed',
                    unsubscribedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                res.send(`
                    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>Inscrição Cancelada</h1>
                        <p>O email <strong>${email}</strong> foi removido da nossa newsletter.</p>
                        <p>Você não receberá mais nossos emails.</p>
                        <br>
                        <a href="https://financeapp-6da16.web.app/" style="color: blue; text-decoration: underline;">Voltar ao site</a>
                    </div>
                `);

            } catch (error) {
                console.error("Erro no unsubscribe:", error);
                res.status(500).send('Erro ao cancelar inscrição.');
            }
        });
    });

// 2. Enviar Newsletter (Admin Only) - USANDO NODEMAILER INTERNO
exports.sendNewsletter = functions
    .runWith({ invoker: 'public', timeoutSeconds: 540 }) // Timeout alto para envio em massa
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            try {
                // Verificar Token de Admin
                const idToken = req.headers.authorization?.split('Bearer ')[1] || req.body.token;
                if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

                const decodedToken = await admin.auth().verifyIdToken(idToken);
                const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
                if (!userDoc.exists || userDoc.data().role !== 'admin') {
                    return res.status(403).json({ error: 'Permission Denied' });
                }

                const { subject, htmlContent, thumbnail, isTest, testEmail, saveOnly, publishOnly, slug: providedSlug } = req.body;
                if (!subject || !htmlContent) {
                    return res.status(400).json({ error: 'Assunto e conteúdo HTML são obrigatórios.' });
                }

                // Use provided slug (Edit Mode) OR Generate new one
                const slug = providedSlug || subject
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
                    .replace(/[^a-z0-9]+/g, '-') // Substitui não alfanuméricos por -
                    .replace(/^-+|-+$/g, ''); // Remove - do início/fim

                // Preparar documento do post
                // Status mapping:
                // saveOnly -> 'draft'
                // publishOnly -> 'sent' (but no email)
                // standard send -> 'sent' (with email)
                let status = 'sent';
                if (saveOnly) status = 'draft';

                const postData = {
                    slug,
                    title: subject,
                    thumbnail: thumbnail || null,
                    content: htmlContent,
                    status: status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                if (saveOnly) {
                    // Apenas Salvar Rascunho
                    await admin.firestore().collection('newsletter_posts').doc(slug).set(postData, { merge: true });
                    return res.json({ success: true, message: 'Rascunho salvo com sucesso!', slug });
                }

                // Se for Publish Only (Blog Only), não envia emails
                if (publishOnly) {
                    const docRef = admin.firestore().collection('newsletter_posts').doc(slug);
                    const docSnap = await docRef.get();

                    if (!docSnap.exists) {
                        // New Post: Initialize counters and timestamps
                        postData.sentAt = admin.firestore.FieldValue.serverTimestamp();
                        postData.sentCount = 0; // No emails sent
                        postData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                    }
                    // If exists, preserve existing sentAt, sentCount, and createdAt (don't add them to postData)

                    await docRef.set(postData, { merge: true });

                    return res.json({
                        success: true,
                        message: 'Publicado no blog com sucesso (sem envio de email)!',
                        slug
                    });
                }

                // --- ENVIO REAL (EMAIL) ---

                let recipients = [];
                let isTestSend = false;

                if (isTest && testEmail) {
                    isTestSend = true;
                    recipients.push(testEmail);
                } else {
                    // Buscar inscritos ativos
                    const subscribersSnapshot = await admin.firestore().collection('newsletter_subscribers')
                        .where('status', '==', 'active')
                        .get();

                    if (subscribersSnapshot.empty) {
                        return res.json({ message: 'Nenhum inscrito ativo encontrado.' });
                    }

                    subscribersSnapshot.forEach(doc => recipients.push(doc.id));
                }

                console.log(`Iniciando envio (${isTestSend ? 'TESTE' : 'REAL'}) para ${recipients.length} destinatários...`);

                let successCount = 0;
                let failureCount = 0;

                // Loop de envio
                for (const email of recipients) {
                    try {
                        // Rate Limit: 1 sec delay
                        await sleep(1000);

                        const unsubscribeUrl = `https://us-central1-financeapp-6da16.cloudfunctions.net/unsubscribeUser?email=${encodeURIComponent(email)}`;

                        // Gerar HTML final usando o template
                        const finalHtml = getNewsletterTemplate(subject, htmlContent, unsubscribeUrl);

                        const { error } = await resend.emails.send({
                            from: SENDER_EMAIL,
                            to: email,
                            subject: subject,
                            html: finalHtml,
                            headers: {
                                'List-Unsubscribe': `<${unsubscribeUrl}>`
                            }
                        });


                        if (error) {
                            console.error(`Falha ao enviar para ${email}:`, error);
                            failureCount++;
                        } else {
                            successCount++;
                        }
                    } catch (err) {
                        console.error(`Falha ao enviar para ${email}:`, err);
                        failureCount++;
                    }
                }

                // Se for envio real (para todos), atualizar estatísticas no post
                if (!isTestSend) {
                    postData.sentAt = admin.firestore.FieldValue.serverTimestamp();
                    postData.sentCount = successCount;
                    postData.createdAt = postData.createdAt || admin.firestore.FieldValue.serverTimestamp(); // Mantém criação original se já existir

                    await admin.firestore().collection('newsletter_posts').doc(slug).set(postData, { merge: true });
                }

                res.json({
                    success: true,
                    message: `Envio finalizado. Sucessos: ${successCount}, Falhas: ${failureCount}`,
                    stats: { successCount, failureCount, total: recipients.length },
                    slug
                });

            } catch (error) {
                console.error("Erro ao buscar posts:", error);
                res.status(500).json({ error: error.message, stack: error.stack });
            }
        });
    });

// 3. Buscar Posts (Público)
exports.getNewsletterPosts = functions
    .runWith({ invoker: 'public' })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

            try {
                const { slug, limit } = req.query;

                if (slug) {
                    // Buscar post único
                    const doc = await admin.firestore().collection('newsletter_posts').doc(slug).get();
                    if (!doc.exists) return res.status(404).json({ error: 'Post não encontrado' });

                    const data = doc.data();

                    // Sanitize Date for JSON response to avoid 500 on serialization of complex objects
                    let sanitizedData = { ...data };

                    ['sentAt', 'createdAt', 'updatedAt'].forEach(field => {
                        if (sanitizedData[field] && typeof sanitizedData[field].toDate === 'function') {
                            sanitizedData[field] = sanitizedData[field].toDate().toISOString();
                        } else if (sanitizedData[field] instanceof Date) {
                            sanitizedData[field] = sanitizedData[field].toISOString();
                        }
                    });

                    return res.json(sanitizedData);
                } else {
                    // Buscar lista
                    let q = admin.firestore().collection('newsletter_posts')
                        .where('status', '==', 'sent');

                    const { category } = req.query;
                    if (category) {
                        q = q.where('category', '==', category);
                    }

                    q = q.orderBy('sentAt', 'desc');

                    if (limit) {
                        q = q.limit(parseInt(limit));
                    }

                    const snapshot = await q.get();
                    console.log(`Found ${snapshot.size} posts.`);

                    const posts = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        try {
                            const sentAtStr = data.sentAt && typeof data.sentAt.toDate === 'function' ? data.sentAt.toDate().toISOString() :
                                (data.sentAt instanceof Date ? data.sentAt.toISOString() : new Date().toISOString());

                            posts.push({
                                slug: doc.id,
                                title: data.title,
                                thumbnail: data.thumbnail || null,
                                sentAt: sentAtStr,
                                date: sentAtStr,
                                category: data.category // Added field
                            });
                        } catch (err) {
                            console.error(`Error processing doc ${doc.id}:`, err);
                        }
                    });

                    console.log("Returning posts:", posts.length);
                    return res.json(posts);
                }

            } catch (error) {
                console.error("Erro ao buscar posts:", error);
                res.status(500).json({ error: error.message, stack: error.stack });
            }
        });
    });

// 4. Generate Daily Post (AI Agent)
// Runs automatically every day at 08:00 AM (Sao Paulo time)
exports.generateDailyPost = functions
    .runWith({ timeoutSeconds: 540 }) // Aumentado para 9 min (geração + email)
    .pubsub.schedule('0 8,12,18 * * *') // 08:00, 12:00, 18:00 Daily
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        try {
            console.log("🤖 Iniciando Agente de Conteúdo Automático (v3 - Multi-Category)...");
            const API_KEY = process.env.GOOGLE_GENAI_API_KEY || functions.config().google?.genai_api_key;
            if (!API_KEY) throw new Error("Google GenAI API Key not configured.");

            const genAI = new GoogleGenerativeAI(API_KEY);

            // SCHEMA DEFINITION
            const schema = {
                description: "Blog post content",
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING, description: "Catchy title", nullable: false },
                    subject: { type: SchemaType.STRING, description: "Slug safe subject", nullable: false },
                    category: { type: SchemaType.STRING, description: "Category: Economia, Investimentos, Tecnologia, Política, Carreira, Games", nullable: false },
                    content: { type: SchemaType.STRING, description: "HTML content with h2, h3, p, ul, li tags", nullable: false },
                    thumbnail: { type: SchemaType.STRING, description: "Image URL", nullable: false },
                    imagePrompt: { type: SchemaType.STRING, description: "A descriptive English prompt for the image generator, describing a scene that represents the article.", nullable: false }
                },
                required: ["title", "subject", "category", "content", "thumbnail", "imagePrompt"]
            };

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    maxOutputTokens: 8192
                }
            });

            // 1. FETCH REAL NEWS (RSS)
            let newsContext = "";
            let realImageUrl = null;
            try {
                console.log("📰 Buscando notícias em tempo real...");
                const feedG1 = await parser.parseURL('https://g1.globo.com/dynamo/economia/rss2.xml');
                const feedInvesting = await parser.parseURL('https://br.investing.com/rss/news_11.rss'); // Stock Markets
                const feedTech = await parser.parseURL('https://g1.globo.com/dynamo/tecnologia/rss2.xml');
                const feedPolitics = await parser.parseURL('https://g1.globo.com/dynamo/politica/rss2.xml');

                const allItems = [
                    ...feedG1.items.slice(0, 2),
                    ...feedInvesting.items.slice(0, 2),
                    ...feedTech.items.slice(0, 2),
                    ...feedPolitics.items.slice(0, 1)
                ];

                const articles = allItems.map(item => `- [${item.categories ? item.categories[0] : 'General'}] ${item.title}: ${item.contentSnippet || item.content || ''}`).join('\n');

                // Try to extract a real image
                for (const item of allItems) {
                    if (item.enclosure && item.enclosure.url) {
                        realImageUrl = item.enclosure.url;
                        break;
                    }
                    if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
                        realImageUrl = item['media:content'].$.url;
                        break;
                    }
                }

                newsContext = `ÚLTIMAS NOTÍCIAS (FONTE REAL): \n${articles}`;
                console.log("✅ Contexto de notícias obtido.");
            } catch (rssError) {
                console.error("⚠️ Erro ao buscar RSS (usando fallback):", rssError);
                newsContext = "Sem notícias recentes. Escolha um tema evergreen sobre Investimentos, Tecnologia ou Economia.";
            }



            // 1.5 CHECK DUPLICATES
            let resentTitlesList = "";
            try {
                const recentSnapshot = await admin.firestore().collection('newsletter_posts')
                    .orderBy('sentAt', 'desc')
                    .limit(10)
                    .get();

                if (!recentSnapshot.empty) {
                    const titles = recentSnapshot.docs.map(doc => doc.data().title);
                    resentTitlesList = titles.join(', ');
                    console.log("🚫 Evitando tópicos recentes:", resentTitlesList);
                }
            } catch (dupErr) {
                console.warn("⚠️ Erro ao checar duplicatas:", dupErr);
            }

            const prompt = `
            CONTEXTO DE MUNDO REAL (USE ISSO):
            ${newsContext}

            TÓPICOS A EVITAR (JÁ PUBLICADOS RECENTEMENTE):
            ${resentTitlesList}

            Você é o Editor-Chefe do "Trilha News". Sua missão é selecionar a notícia mais relevante do dia entre os tópicos acima (EVITANDO os já publicados) e criar um artigo profundo.

            CATEGORIAS POSSÍVEIS:
            - Economia
            - Investimentos
            - Tecnologia
            - Política
            - Carreira
            - Games

            ESTILO E TOM:
            - **Visual**: Limpo, arejado, uso estratégico de negrito.
            - **Tom**: Profissional, analítico, mas acessível.
            - **Estrutura**:
                1.  **Título Impactante**: Curto e direto.
                2.  **Subtítulo**: Resumo de valor.
                3.  **Introdução**: Contexto imediato.
                4.  **Desenvolvimento**: 3 a 4 seções com subtítulos (<h2>).
                5.  **Análise Trilha**: Um parágrafo conectando a notícia ao bolso do leitor.
                6.  **Conclusão**.

            CONTEÚDO:
            - O artigo deve ter **entre 800 e 1200 palavras**.
            - Escolha o tema mais impactante da lista de notícias fornecida.

            FORMATO DE SAÍDA (JSON ESTRITO):
            {
                "title": "Seu Título Aqui",
                "subject": "slug-do-artigo",
                "category": "Uma das categorias acima",
                "content": "<p>Seu HTML aqui...</p>",
                "imagePrompt": "A descriptive prompt for the image...",
                "thumbnail": "IGNORED"
            }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) cleanedText = cleanedText.replace(/^```json/, '').replace(/```$/, '');

            const articleData = JSON.parse(cleanedText);

            // THUMBNAIL STRATEGY
            let finalThumbnail;
            if (realImageUrl) {
                finalThumbnail = realImageUrl;
                console.log("✅ Usando imagem real da notícia.");
            } else {
                const rawPrompt = articleData.imagePrompt || articleData.title;
                const encodedTitle = encodeURIComponent(rawPrompt + " editorial news illustration flat vector high quality");
                finalThumbnail = `https://image.pollinations.ai/prompt/${encodedTitle}?width=800&height=600&nologo=true`;
                console.log("⚠️ Nenhuma imagem real encontrada. Usando AI.");
            }

            const slug = articleData.subject
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                + '-' + Date.now();

            const postData = {
                slug: slug,
                title: articleData.title,
                category: articleData.category || 'Geral', // NEW FIELD
                content: articleData.content,
                thumbnail: finalThumbnail,
                status: 'sent',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                generatedBy: "AI Agent (Scheduled v3)",
                tags: ["AI", "Daily", articleData.category || "General"]
            };

            // 1. Salvar no Firestore
            await admin.firestore().collection('newsletter_posts').doc(slug).set(postData);
            console.log(`✅ Artigo salvo no banco: ${slug} [${postData.category}]`);

            // 2. Enviar por Email (Feature Disabled)
            // ... (Code hidden/removed for brevity as per previous edits)
            const emailStats = { successCount: 0, failureCount: 0 };

            // 3. Atualizar estatísticas
            await admin.firestore().collection('newsletter_posts').doc(slug).update({
                sentCount: 0,
                emailStats: emailStats
            });

            console.log("✅ Ciclo diário concluído com sucesso.");
            return null;

        } catch (error) {
            console.error("❌ Erro no Agente Automático:", error);
            return null;
        }
    });

// 5. MANUAL DEBUG (Runs the same logic but triggers via URL)
exports.debugGenerateDailyPost = functions
    .runWith({ timeoutSeconds: 300 })
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            try {
                console.log("🤖 Iniciando Agente MANUAL (DEBUG v3 - Multi-Category)...");
                const API_KEY = process.env.GOOGLE_GENAI_API_KEY || functions.config().google?.genai_api_key;
                if (!API_KEY) throw new Error("Google GenAI API Key not configured.");

                const genAI = new GoogleGenerativeAI(API_KEY);

                // SCHEMA
                const schema = {
                    description: "Blog post content",
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING, description: "Catchy title", nullable: false },
                        subject: { type: SchemaType.STRING, description: "Slug safe subject", nullable: false },
                        category: { type: SchemaType.STRING, description: "Category: Economia, Investimentos, Tecnologia, Política, Carreira, Games", nullable: false },
                        content: { type: SchemaType.STRING, description: "HTML content with h2, h3, p, ul, li tags", nullable: false },
                        thumbnail: { type: SchemaType.STRING, description: "Image URL", nullable: false },
                        imagePrompt: { type: SchemaType.STRING, description: "A descriptive English prompt for the image generator", nullable: false }
                    },
                    required: ["title", "subject", "category", "content", "thumbnail", "imagePrompt"]
                };

                const model = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash-lite",
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                        maxOutputTokens: 8192
                    }
                });

                // 1. FETCH REAL NEWS
                let newsContext = "";
                let realImageUrl = null;
                try {
                    console.log("📰 Buscando notícias em tempo real...");
                    const feedG1 = await parser.parseURL('https://g1.globo.com/dynamo/economia/rss2.xml');
                    const feedInvesting = await parser.parseURL('https://br.investing.com/rss/news_11.rss');
                    const feedTech = await parser.parseURL('https://g1.globo.com/dynamo/tecnologia/rss2.xml');
                    const feedPolitics = await parser.parseURL('https://g1.globo.com/dynamo/politica/rss2.xml');

                    const allItems = [
                        ...feedG1.items.slice(0, 2),
                        ...feedInvesting.items.slice(0, 2),
                        ...feedTech.items.slice(0, 2),
                        ...feedPolitics.items.slice(0, 1)
                    ];

                    const articles = allItems.map(item => `- [${item.categories ? item.categories[0] : 'General'}] ${item.title}: ${item.contentSnippet || item.content || ''}`).join('\n');

                    for (const item of allItems) {
                        if (item.enclosure && item.enclosure.url) {
                            realImageUrl = item.enclosure.url;
                            break;
                        }
                        if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
                            realImageUrl = item['media:content'].$.url;
                            break;
                        }
                    }

                    newsContext = `ÚLTIMAS NOTÍCIAS REAIS: \n${articles}`;
                    console.log("✅ Contexto obtido.");
                } catch (rssError) {
                    console.error("⚠️ Erro RSS:", rssError);
                    newsContext = "Sem notícias recentes. Escolha um tema quente.";
                }

                // 2. CHECK DUPLICATES
                let resentTitlesList = "";
                try {
                    const recentSnapshot = await admin.firestore().collection('newsletter_posts')
                        .orderBy('sentAt', 'desc')
                        .limit(10)
                        .get();

                    if (!recentSnapshot.empty) {
                        const titles = recentSnapshot.docs.map(doc => doc.data().title);
                        resentTitlesList = titles.join(', ');
                        console.log("🚫 Evitando tópicos recentes:", resentTitlesList);
                    }
                } catch (dupErr) { console.warn("DupLog fail", dupErr); }

                // SAME PROMPT AS PROD
                const prompt = `
                CONTEXTO DE MUNDO REAL:
                ${newsContext}

                TÓPICOS A EVITAR (JÁ PUBLICADOS RECENTEMENTE):
                ${resentTitlesList}

                Você é o Editor-Chefe do "Trilha News". Crie o artigo do dia baseado no que é mais relevante acima (EVITANDO repetidos).

                CATEGORIAS: Economia, Investimentos, Tecnologia, Política, Carreira, Games.

                ESTILO:
                - Título Curto e Impactante.
                - HTML limpo (<h2>, <p>, <ul>).
                - Tom profissional e moderno.
                - 800 - 1200 palavras.

                OUTPUT JSON:
                {
                    "title": "Titulo",
                    "subject": "slug",
                    "category": "Category",
                    "content": "HTML...",
                    "imagePrompt": "Image description...",
                    "thumbnail": "IGNORED"
                }
                `;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                let cleanedText = responseText.trim();
                if (cleanedText.startsWith('```')) cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '');

                const articleData = JSON.parse(cleanedText);

                // THUMBNAIL
                let finalThumbnail;
                if (realImageUrl) {
                    finalThumbnail = realImageUrl;
                } else {
                    const rawPrompt = articleData.imagePrompt || articleData.title;
                    const encodedTitle = encodeURIComponent(rawPrompt + " editorial news illustration flat vector high quality");
                    finalThumbnail = `https://image.pollinations.ai/prompt/${encodedTitle}?width=800&height=600&nologo=true`;
                }

                const slug = articleData.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

                const postData = {
                    slug: slug,
                    title: articleData.title,
                    category: articleData.category || 'Geral',
                    content: articleData.content,
                    thumbnail: finalThumbnail,
                    status: 'sent',
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    generatedBy: "AI Agent (Debug v3)",
                    tags: ["AI", "Daily", articleData.category || "General"]
                };

                await admin.firestore().collection('newsletter_posts').doc(slug).set(postData);

                res.json({
                    success: true,
                    message: "Artigo Multi-Category gerado com sucesso!",
                    data: { slug, title: articleData.title, category: articleData.category, link: `https://trilhacomigo.cc/artigos.html?slug=${slug}` }
                });

            } catch (error) {
                console.error("❌ Erro Debug:", error);
                res.status(500).json({ error: error.message });
            }
        });
    });

// --- MIGRATION UTILS ---

exports.migrateContacts = functions.runWith({
    timeoutSeconds: 540,
    memory: '1GB'
}).https.onRequest(async (req, res) => {
    // SELF-CONTAINED SETUP
    const { Resend } = require('resend');
    const RESEND_KEY = 're_X6gRBcc2_Gc1EjFJBq2hbpV9FQt4gGJsH';
    const resendClient = new Resend(RESEND_KEY);

    try {
        console.log("🚀 Iniciando migração de contatos (v3 Debug)...");

        let audienceId;
        try {
            const listResp = await resendClient.audiences.list();
            // console.log("List response:", JSON.stringify(listResp));

            if (listResp.data && listResp.data.length > 0) {
                audienceId = listResp.data[0].id;
            } else {
                const createResp = await resendClient.audiences.create({ name: 'Newsletter Subscribers' });
                // console.log("Create response:", JSON.stringify(createResp));

                if (createResp.error) {
                    // Check if it's already exists error
                    const errStr = JSON.stringify(createResp.error);
                    // If exists, list again or assume we can't find it?
                    throw new Error(`Create Error: ${createResp.error.message || errStr}`);
                }

                if (createResp.data) {
                    audienceId = createResp.data.id;
                } else if (createResp.id) {
                    audienceId = createResp.id;
                } else {
                    throw new Error(`Create returned no data: ${JSON.stringify(createResp)}`);
                }
            }
        } catch (audErr) {
            console.error("Audience Error:", audErr);
            return res.status(500).json({ step: "audience", error: audErr.message, stack: audErr.stack });
        }

        const snapshot = await admin.firestore().collection('newsletter_subscribers')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(1000)
            .get();

        if (snapshot.empty) return res.send("Nenhum inscrito para migrar.");

        let successCount = 0;
        let errors = [];
        const subscribers = [];
        snapshot.forEach(doc => subscribers.push(doc.id));

        for (const email of subscribers) {
            try {
                await new Promise(r => setTimeout(r, 200));
                const result = await resendClient.contacts.create({
                    email: email,
                    audience_id: audienceId,
                    unsubscribed: false
                });

                if (result.error) {
                    const errStr = JSON.stringify(result.error);
                    if (!errStr.includes('already')) {
                        errors.push(`${email}: ${errStr}`);
                    }
                } else {
                    successCount++;
                }
            } catch (err) {
                errors.push(`${email}: ${err.message}`);
            }
        }
        res.json({ success: true, migrated: successCount, errors });
    } catch (error) {
        console.error("Critical:", error);
        res.status(500).send(error.message);
    }
});




