const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

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
                    console.error('❌ Erro na API do AbacatePay:', JSON.stringify(billingData, null, 2));
                    return res.status(500).json({
                        error: 'Falha ao criar cobrança no provedor de pagamentos',
                        details: billingData,
                        status: billingResponse.status
                    });
                }

                console.log("✅ Billing criado com sucesso:", billingData.data.id);



            } catch (error) {
                console.error('Erro ao processar pagamento:', error);
                res.status(500).json({ error: error.message });
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
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
            throw new functions.https.HttpsError('internal', 'Erro ao excluir conta.');
        }
    });

// --- NEWSLETTER SYSTEM ---

const nodemailer = require('nodemailer');

// Configuração do Transportador de Email (Nodemailer)
// Usando as credenciais fornecidas: marketing@southsea.com.br
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Assumindo Gmail/Google Workspace dado o uso de App Password
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'marketing@southsea.com.br',
        pass: 'dzjjhqnpvxlrobyk' // CUIDADO: Em produção, usar Variáveis de Ambiente!
    }
});

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
                    await transporter.sendMail({
                        from: '"Trilha Comigo" <marketing@southsea.com.br>',
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

                const { subject, htmlContent, thumbnail, isTest, testEmail, saveOnly, publishOnly } = req.body;
                if (!subject || !htmlContent) {
                    return res.status(400).json({ error: 'Assunto e conteúdo HTML são obrigatórios.' });
                }

                // Gerar Slug (ID amigável)
                const slug = subject
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
                    content: htmlContent, // CUIDADO: Armazenar HTML pode ser pesado, mas ok para MVP
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
                    // Set sentAt for ordering
                    postData.sentAt = admin.firestore.FieldValue.serverTimestamp();
                    postData.sentCount = 0; // No emails sent
                    postData.createdAt = postData.createdAt || admin.firestore.FieldValue.serverTimestamp();

                    await admin.firestore().collection('newsletter_posts').doc(slug).set(postData, { merge: true });

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
                        const mailOptions = {
                            from: '"Trilha Comigo" <marketing@southsea.com.br>',
                            to: email,
                            subject: subject,
                            html: htmlContent,
                            // Opcional: Adicionar Link de Unsubscribe no rodapé
                        };

                        await transporter.sendMail(mailOptions);
                        successCount++;
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

                    // ALLOW DRAFTS: For single post view by slug, we allow viewing drafts/sent posts.
                    // If strict public access control is needed later, add a 'preview_token' or similar.
                    // For now, if you have the slug, you can view it (Draft or Sent).
                    // if (data.status !== 'sent') {
                    //    return res.status(404).json({ error: 'Post não disponível (Status mismatch)' });
                    // }

                    return res.json(sanitizedData);
                } else {
                    // Buscar lista
                    let q = admin.firestore().collection('newsletter_posts')
                        .where('status', '==', 'sent');
                    // .orderBy('sentAt', 'desc'); // Commented out to debug missing index error

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
                                date: sentAtStr
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
