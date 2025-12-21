const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Configuração do Asaas
// A chave de API é armazenada de forma segura usando Firebase Functions Config
// Para configurar: firebase functions:config:set asaas.api_key="SUA_CHAVE_AQUI"


exports.createAbacatePayBilling = functions.https.onRequest((req, res) => {
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

            // O AbacatePay retorna a URL de pagamento dentro de data.url
            res.json({
                billingId: billingData.data.id,
                checkoutUrl: billingData.data.url,
            });

        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Função para obter dados do Admin Dashboard
exports.getAdminData = functions.https.onCall(async (data, context) => {
    // 1. Verificar autenticação
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'O usuário deve estar logado.');
    }

    const userId = context.auth.uid;

    try {
        // 2. Verificar se usuário é admin (checando flag 'role' no documento do usuário)
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Acesso negado. Apenas administradores.');
        }

        // 3. Buscar todos os usuários para estatísticas
        // (Nota: Em produção com muitos usuários, isso deve ser paginado ou usar contadores distribuídos)
        const usersSnapshot = await admin.firestore().collection('users').get();

        let totalUsers = 0;
        let activePremiumUsers = 0;
        let totalMRR = 0; // Monthly Recurring Revenue estimado
        const recentUsers = [];

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            totalUsers++;

            try {
                // Verificar se é premium ativo
                // Ensure properties exist before accessing methods
                const plan = user.plan || 'free';
                const validUntil = user.subscriptionValidUntil; // Timestamp object

                const isPlanActive = plan !== 'free';
                const isStatusActive = user.subscriptionStatus === 'active';

                // Safe date check: ensure validUntil exists and has toDate method
                let isValidDate = false;
                if (validUntil && typeof validUntil.toDate === 'function') {
                    isValidDate = validUntil.toDate() > new Date();
                }

                const isValidPremium = isPlanActive && isStatusActive && isValidDate;

                if (isValidPremium) {
                    activePremiumUsers++;
                    // Somar ao MRR (Estimativa simples)
                    if (plan.includes('monthly')) totalMRR += 9.90;
                    if (plan.includes('yearly')) totalMRR += (89.90 / 12);
                }

                // Adicionar aos usuários recentes (limitado a 50 para não estourar payload)
                if (activePremiumUsers <= 50 || recentUsers.length < 50) {
                    recentUsers.push({
                        uid: doc.id,
                        email: user.email || 'Sem email',
                        name: user.firstName || 'Usuário',
                        plan: plan,
                        status: isValidPremium ? 'Ativo' : (user.subscriptionStatus || 'Inativo'),
                        validUntil: (validUntil && typeof validUntil.toDate === 'function') ? validUntil.toDate().toISOString() : null
                    });
                }
            } catch (err) {
                console.error(`Erro ao processar usuário ${doc.id}:`, err);
                // Não repassar o erro para não quebrar a request inteira
            }
        });

        // Retornar dados
        return {
            stats: {
                totalUsers,
                activePremiumUsers,
                totalMRR: parseFloat(totalMRR.toFixed(2))
            },
            users: recentUsers
        };

    } catch (error) {
        console.error('Erro ao buscar dados de admin:', error);
        throw new functions.https.HttpsError('internal', 'Erro interno ao buscar dados.');
    }
});
