const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Configuração do Stripe (Chave Secreta de Teste)
// Em produção, use: functions.config().stripe.secret
const STRIPE_SECRET_KEY = 'YOUR_STRIPE_SECRET_KEY';
const stripe = require('stripe')(STRIPE_SECRET_KEY);

exports.createStripeCheckoutSession = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method !== 'POST') {
                return res.status(405).send('Method Not Allowed');
            }

            const { planType, userId, userEmail, returnUrl } = req.body;

            if (!planType || !userId) {
                return res.status(400).send('Missing required parameters');
            }

            // Definição dos preços
            const priceData = {
                premium_monthly: {
                    unit_amount: 990, // R$ 9,90
                    product_data: {
                        name: 'Conta Comigo Premium (Mensal)',
                        description: 'Acesso ilimitado a todas as features',
                    },
                    recurring: { interval: 'month' }
                },
                premium_yearly: {
                    unit_amount: 8990, // R$ 89,90
                    product_data: {
                        name: 'Conta Comigo Premium (Anual)',
                        description: 'Acesso ilimitado a todas as features (25% off)',
                    },
                    recurring: { interval: 'year' }
                }
            };

            const selectedPrice = priceData[planType];
            if (!selectedPrice) {
                return res.status(400).send('Invalid plan type');
            }

            // Criar sessão de checkout
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'brl',
                        product_data: selectedPrice.product_data,
                        unit_amount: selectedPrice.unit_amount,
                        recurring: selectedPrice.recurring
                    },
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planType}`,
                cancel_url: returnUrl,
                client_reference_id: userId,
                customer_email: userEmail,
            });

            res.json({ id: session.id });

        } catch (error) {
            console.error('Erro ao criar sessão:', error);
            res.status(500).send({ error: error.message });
        }
    });
});
