const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Configuração do Asaas
// A chave de API é armazenada de forma segura usando Firebase Functions Config
// Para configurar: firebase functions:config:set asaas.api_key="SUA_CHAVE_AQUI"


exports.createAsaasSubscription = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Obter chave de API do Asaas
        const ASAAS_API_KEY = functions.config().asaas?.api_key;
        const ASAAS_API_BASE_URL = 'https://api.asaas.com/v3';

        // Validar se a chave está configurada
        if (!ASAAS_API_KEY) {
            console.error('❌ ERRO: Chave de API do Asaas não configurada!');
            return res.status(500).json({
                error: 'Chave de API não configurada. Configure usando: firebase functions:config:set asaas.api_key="SUA_CHAVE"'
            });
        }

        try {
            if (req.method !== 'POST') {
                return res.status(405).send('Method Not Allowed');
            }

            const { planType, userId, userEmail, userName, returnUrl } = req.body;

            if (!planType || !userId || !userEmail) {
                return res.status(400).send('Missing required parameters');
            }

            // Definição dos planos
            const planData = {
                premium_monthly: {
                    value: 9.90,
                    cycle: 'MONTHLY',
                    description: 'Trilha Comigo Premium (Mensal) - Acesso ilimitado a todas as features'
                },
                premium_yearly: {
                    value: 89.90,
                    cycle: 'YEARLY',
                    description: 'Trilha Comigo Premium (Anual) - Acesso ilimitado a todas as features (25% off)'
                }
            };

            const selectedPlan = planData[planType];
            if (!selectedPlan) {
                return res.status(400).send('Invalid plan type');
            }

            // Passo 1: Criar ou buscar cliente no Asaas
            const customerResponse = await fetch(`${ASAAS_API_BASE_URL}/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': ASAAS_API_KEY
                },
                body: JSON.stringify({
                    name: userName || 'Cliente Trilha Comigo',
                    email: userEmail,
                    externalReference: userId
                })
            });

            const customerData = await customerResponse.json();

            if (!customerResponse.ok) {
                console.error('Erro ao criar cliente Asaas:', customerData);
                return res.status(500).json({ error: 'Erro ao criar cliente', details: customerData });
            }

            const customerId = customerData.id;

            // Passo 2: Calcular data da primeira cobrança (14 dias de trial)
            const nextDueDate = new Date();
            nextDueDate.setDate(nextDueDate.getDate() + 14);
            const formattedDueDate = nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD

            // Passo 3: Criar assinatura no Asaas
            const subscriptionResponse = await fetch(`${ASAAS_API_BASE_URL}/subscriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': ASAAS_API_KEY
                },
                body: JSON.stringify({
                    customer: customerId,
                    billingType: 'CREDIT_CARD',
                    value: selectedPlan.value,
                    nextDueDate: formattedDueDate,
                    cycle: selectedPlan.cycle,
                    description: selectedPlan.description,
                    externalReference: `${userId}_${planType}`,
                    callback: {
                        successUrl: `${returnUrl}?subscription_id={SUBSCRIPTION_ID}&plan=${planType}&status=success`,
                        autoRedirect: true
                    }
                })
            });

            const subscriptionData = await subscriptionResponse.json();

            if (!subscriptionResponse.ok) {
                console.error('Erro ao criar assinatura Asaas:', subscriptionData);
                return res.status(500).json({ error: 'Erro ao criar assinatura', details: subscriptionData });
            }

            // Retornar URL de checkout
            res.json({
                subscriptionId: subscriptionData.id,
                checkoutUrl: subscriptionData.invoiceUrl || `https://www.asaas.com/c/${subscriptionData.id}`,
                customerId: customerId
            });

        } catch (error) {
            console.error('Erro ao processar assinatura:', error);
            res.status(500).json({ error: error.message });
        }
    });
});
