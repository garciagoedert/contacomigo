import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do Firebase (mesma do app.js)
const firebaseConfig = {
    apiKey: "AIzaSyBVLS7bARnU_mH3KlueEeFjDSywN3FCESY",
    authDomain: "financeapp-6da16.firebaseapp.com",
    projectId: "financeapp-6da16",
    storageBucket: "financeapp-6da16.firebasestorage.app",
    messagingSenderId: "342917624338",
    appId: "1:342917624338:web:b9977ec338b63f4d50decb",
    measurementId: "G-KRNK2W5VPX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variáveis globais do módulo
let currentUserPlan = 'free';
// let trialEndsAt = null; // Legacy trial removed

// Processar retorno do Asaas
async function handleAsaasRedirect(userId) {
    const urlParams = new URLSearchParams(window.location.search);
    // Suporte a AbacatePay (ID salvo no localStorage)
    let subscriptionId = urlParams.get('subscription_id') || localStorage.getItem('pending_payment_id');
    const plan = urlParams.get('plan') || localStorage.getItem('pending_plan');
    const status = urlParams.get('status');

    if (subscriptionId && plan && status === 'success') {
        try {
            // Limpar URL e Storage
            localStorage.removeItem('pending_payment_id');
            localStorage.removeItem('pending_plan');
            window.history.replaceState({}, document.title, window.location.pathname);

            // Calcular validade da assinatura
            const validUntil = new Date();
            if (plan.includes('yearly') || plan.includes('anual')) {
                validUntil.setDate(validUntil.getDate() + 365);
            } else {
                // Default to monthly (30 days)
                validUntil.setDate(validUntil.getDate() + 30);
            }

            await updateDoc(doc(db, 'users', userId), {
                plan: plan,
                subscriptionId: subscriptionId,
                subscriptionValidUntil: Timestamp.fromDate(validUntil),
                upgradedAt: Timestamp.now(),
                subscriptionStatus: 'active'
            });

            // Mostrar sucesso
            alert('🎉 Pagamento confirmado! Bem-vindo ao Premium!\n\nSeu período de teste de 14 dias começou.');

            // Recarregar plano
            await loadUserPlan(userId);

        } catch (error) {
            console.error('Erro ao processar retorno do pagamento:', error);
            alert('Erro ao confirmar assinatura. Entre em contato com o suporte.');
        }
    }
}

// Função para carregar plano do usuário
async function loadUserPlan(userId) {
    try {
        // Verificar se tem retorno do Asaas pendente
        await handleAsaasRedirect(userId);

        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();

        currentUserPlan = userData?.plan || 'free';
        const validUntil = userData?.subscriptionValidUntil;
        const status = userData?.subscriptionStatus;

        // Verificar se assinatura expirou
        if (currentUserPlan !== 'free') {
            const now = new Date();
            // Se não tem data de validade (dados antigos) ou data já passou
            if (!validUntil || validUntil.toDate() < now) {
                console.log("Assinatura expirada ou inválida. Downgrading...");

                // Downgrade para free
                currentUserPlan = 'free';

                // Atualizar no banco apenas se o status não for 'expired' ainda
                if (status !== 'expired') {
                    await updateDoc(doc(db, 'users', userId), {
                        plan: 'free',
                        subscriptionStatus: 'expired'
                    });
                }
            }
        }

        updateUIForPlan();
        return currentUserPlan;
    } catch (error) {
        console.error('Erro ao carregar plano:', error);
        return 'free';
    }
}

// Atualizar UI baseado no plano
function updateUIForPlan() {
    const isPremium = currentUserPlan !== 'free';

    // Adicionar badge premium no header se for premium
    const headerTitle = document.querySelector('header h1');
    if (headerTitle && isPremium) {
        if (!document.getElementById('premium-badge')) {
            const badge = document.createElement('span');
            badge.id = 'premium-badge';
            badge.className = 'ml-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold rounded-full';
            badge.innerHTML = '👑 PREMIUM';
            headerTitle.appendChild(badge);
        }
    }

    // Mostrar/ocultar botão de upgrade
    let upgradeBtn = document.getElementById('upgrade-btn');
    if (!isPremium) {
        if (!upgradeBtn) {
            upgradeBtn = document.createElement('a');
            upgradeBtn.id = 'upgrade-btn';
            upgradeBtn.href = 'checkout.html';
            upgradeBtn.className = 'hidden md:inline-flex items-center px-4 py-2 bg-gradient-to-r from-[var(--cor-principal)] to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity';
            upgradeBtn.innerHTML = '⭐ Fazer Upgrade';

            const headerActions = document.querySelector('header .flex.items-center.space-x-4');
            if (headerActions) {
                headerActions.insertBefore(upgradeBtn, headerActions.firstChild);
            }
        }
    } else if (upgradeBtn) {
        upgradeBtn.remove();
    }
}

// Verificar se usuário tem acesso a uma feature
function hasFeatureAccess(feature) {
    const premiumFeatures = [
        'recurring_transactions',
        'export_reports',
        'unlimited_categories',
        'unlimited_history',
        'bank_sync'
    ];

    if (premiumFeatures.includes(feature)) {
        return currentUserPlan !== 'free';
    }
    return true;
}

// Mostrar modal de upgrade
function showUpgradeModal(featureName) {
    const modal = document.createElement('div');
    modal.id = 'upgrade-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button onclick="closeUpgradeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
            
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold mb-2">Feature Premium</h2>
                <p class="text-gray-600 dark:text-gray-400">${featureName} é exclusivo para assinantes Premium</p>
            </div>
            
            <div class="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6">
                <h3 class="font-bold mb-3">Com o Premium você tem:</h3>
                <ul class="space-y-2 text-sm">
                    <li class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Categorias ilimitadas
                    </li>
                    <li class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Transações recorrentes
                    </li>
                    <li class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Exportação PDF/Excel
                    </li>
                    <li class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Histórico ilimitado
                    </li>
                </ul>
            </div>
            
            <div class="text-center mb-4">
                <div class="text-3xl font-bold text-[var(--cor-principal)] mb-1">R$ 9,90/mês</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">14 dias grátis • Cancele quando quiser</div>
            </div>
            
            <a href="checkout.html" class="block w-full py-3 bg-gradient-to-r from-[var(--cor-principal)] to-purple-600 text-white rounded-lg text-center font-bold hover:opacity-90 transition-opacity">
                Fazer Upgrade Agora
            </a>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeUpgradeModal();
        }
    });
}

// Fechar modal de upgrade
window.closeUpgradeModal = function () {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
        modal.remove();
    }
};

// Exportar funções para uso global
window.hasFeatureAccess = hasFeatureAccess;
window.showUpgradeModal = showUpgradeModal;
window.loadUserPlan = loadUserPlan;
