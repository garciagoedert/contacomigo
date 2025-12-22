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

// Função para obter dados do Admin Dashboard - VERSÃO COMPLETA COM AUTH E FIRESTORE
exports.getAdminData = functions.https.onRequest((req, res) => {
    // Configurar CORS para permitir requisições do frontend
    cors(req, res, async () => {
        console.log('========================================');
        console.log('🔍 getAdminData: VERSÃO COMPLETA INICIADA!');
        console.log('🔍 getAdminData: Timestamp:', new Date().toISOString());
        console.log('🔍 getAdminData: Method:', req.method);
        console.log('🔍 getAdminData: Origin:', req.headers.origin);
        console.log('========================================');

        try {
            // Aceitar apenas POST
            if (req.method !== 'POST') {
                console.error('❌ Method not allowed:', req.method);
                return res.status(405).json({ error: 'Method not allowed' });
            }

            // Verificar token de autenticação (header ou body)
            let token;
            const authHeader = req.headers.authorization;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split('Bearer ')[1];
                console.log('🔑 Token recebido do header');
            } else if (req.body && req.body.token) {
                token = req.body.token;
                console.log('🔑 Token recebido do body');
            } else {
                console.error('❌ No authorization token provided');
                return res.status(401).json({ error: 'Unauthorized: No token provided' });
            }

            // Verificar token com Firebase Admin
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
                console.log('✅ Token verificado para usuário:', decodedToken.uid);
                console.log('✅ Email:', decodedToken.email);
            } catch (error) {
                console.error('❌ Erro ao verificar token:', error);
                return res.status(401).json({ error: 'Unauthorized: Invalid token' });
            }

            console.log('✅ Usuário autenticado, buscando dados do Firestore...');

            // Buscar todos os usuários do Firestore
            const usersSnapshot = await admin.firestore().collection('users').get();
            console.log('📊 Total de documentos encontrados:', usersSnapshot.size);

            // Processar dados dos usuários
            let totalUsers = 0;
            let activePremiumUsers = 0;
            let totalMRR = 0;
            const users = [];

            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                totalUsers++;

                // Verificar se é premium ativo
                const isPremium = userData.plan && userData.plan !== 'free';
                const isActive = userData.validUntil && new Date(userData.validUntil) > new Date();

                if (isPremium && isActive) {
                    activePremiumUsers++;

                    // Calcular MRR (assumindo plano mensal de R$ 9,90)
                    if (userData.plan === 'premium_monthly') {
                        totalMRR += 9.90;
                    }
                }

                // Adicionar usuário à lista
                users.push({
                    uid: doc.id,
                    email: userData.email || 'N/A',
                    name: userData.name || userData.displayName || 'N/A',
                    plan: userData.plan || 'free',
                    status: isActive ? 'Ativo' : 'Inativo',
                    validUntil: userData.validUntil || null
                });
            });

            const responseData = {
                stats: {
                    totalUsers,
                    activePremiumUsers,
                    totalMRR: parseFloat(totalMRR.toFixed(2))
                },
                users
            };

            console.log('✅ Dados processados:');
            console.log('   - Total de usuários:', totalUsers);
            console.log('   - Premium ativos:', activePremiumUsers);
            console.log('   - MRR:', totalMRR.toFixed(2));
            console.log('========================================');

            return res.status(200).json(responseData);
        } catch (error) {
            console.error('❌ getAdminData: Erro:', error);
            return res.status(500).json({ error: 'Erro ao processar dados: ' + error.message });
        }
    });
});
