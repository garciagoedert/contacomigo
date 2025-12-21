
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

// ... (config)
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
const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');

// Se estiver rodando localmente, usar emuladores
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log("📍 Rodando localmente: Conectando ao emulador de Funções...");
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Elements
const loadingOverlay = document.getElementById('loading-overlay');
const adminEmailSpan = document.getElementById('admin-email');
const logoutBtn = document.getElementById('logout-btn');

const statTotalUsers = document.getElementById('stat-total-users');
const statPremiumUsers = document.getElementById('stat-premium-users');
const statMrr = document.getElementById('stat-mrr');
const usersTableBody = document.getElementById('users-table-body');

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        adminEmailSpan.textContent = user.email;
        loadDashboardData();
    } else {
        // Redireciona para login se não autenticado
        // window.location.href = '../login/index.html';
        alert('Você precisa estar logado.');
        window.location.href = '../login/index.html';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '../login/index.html';
    });
});

async function loadDashboardData() {
    try {
        const getAdminData = httpsCallable(functions, 'getAdminData');
        const result = await getAdminData();
        const data = result.data;

        renderStats(data.stats);
        renderTable(data.users);

        loadingOverlay.classList.add('hidden');
    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
        alert('Erro ao carregar dados: ' + error.message);

        if (error.message.includes('permission-denied')) {
            window.location.href = '../app.html';
        }
    }
}

function renderStats(stats) {
    statTotalUsers.textContent = stats.totalUsers;
    statPremiumUsers.textContent = stats.activePremiumUsers;

    // Formatar MRR como moeda
    statMrr.textContent = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(stats.totalMRR);
}

function renderTable(users) {
    usersTableBody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');

        // Status Badge Style
        let statusClass = 'bg-gray-100 text-gray-800';
        if (user.status === 'Ativo') statusClass = 'bg-green-100 text-green-800';
        if (user.status === 'expired') statusClass = 'bg-red-100 text-red-800';

        // Date Format
        const validUntilDate = user.validUntil ? new Date(user.validUntil).toLocaleDateString('pt-BR') : '-';

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">${user.name}</div>
                        <div class="text-sm text-gray-500">${user.email}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white capitalize">${user.plan.replace('_', ' ')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    ${user.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                ${validUntilDate}
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
}
