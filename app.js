// Importações do Firebase
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, writeBatch, getDoc, where, getDocs, setDoc, arrayUnion, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- PASSO 1: COLE A CONFIGURAÇÃO DO SEU FIREBASE AQUI ---
const firebaseConfig = {
    apiKey: "AIzaSyBVLS7bARnU_mH3KlueEeFjDSywN3FCESY",
    authDomain: "financeapp-6da16.firebaseapp.com",
    projectId: "financeapp-6da16",
    storageBucket: "financeapp-6da16.firebasestorage.app",
    messagingSenderId: "342917624338",
    appId: "1:342917624338:web:b9977ec338b63f4d50decb",
    measurementId: "G-KRNK2W5VPX"
};

// --- VERIFICAÇÃO DE CONFIGURAÇÃO ---
if (!firebaseConfig.apiKey) {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('config-error-view').classList.remove('hidden');
    const loginButton = document.querySelector('#login-form button[type="submit"]');
    loginButton.disabled = true;
    loginButton.textContent = "Configuração Incompleta";
    loginButton.classList.add('bg-gray-400', 'hover:bg-gray-400');
    throw new Error("Configuração do Firebase não encontrada. Preencha o objeto firebaseConfig.");
}

// --- INICIALIZAÇÃO DO FIREBASE ---
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// --- SELETORES DE ELEMENTOS DO DOM ---
const appView = document.getElementById('app-view');
const logoutButton = document.getElementById('logout-button');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');
const transactionListEl = document.getElementById('transaction-list');
const noTransactionsEl = document.getElementById('no-transactions');
const addTransactionBtnMobile = document.getElementById('add-transaction-btn-mobile');
const addTransactionBtnDesktop = document.getElementById('add-transaction-btn-desktop');
const transactionsSection = document.getElementById('transactions');
const showTransactionsViewBtn = document.getElementById('show-transactions-view');
const modal = document.getElementById('transaction-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const transactionForm = document.getElementById('transaction-form');
const transactionIdInput = document.getElementById('transaction-id');
const cancelBtn = document.getElementById('cancel-btn');
const addGoalBtn = document.getElementById('add-goal-btn');
const goalModal = document.getElementById('goal-modal');
const goalForm = document.getElementById('goal-form');
const cancelGoalBtn = document.getElementById('cancel-goal-btn');
const goalListEl = document.getElementById('goal-list');
const showInvestmentsViewBtn = document.getElementById('show-investments-view');
const investmentsView = document.getElementById('investments-view');
const addInvestmentBtn = document.getElementById('add-investment-btn');
const investmentModal = document.getElementById('investment-modal');
const investmentForm = document.getElementById('investment-form');
const cancelInvestmentBtn = document.getElementById('cancel-investment-btn');
const investmentSummaryEl = document.getElementById('investment-summary');
const investmentListEl = document.getElementById('investment-list');
const showBudgetsViewBtn = document.getElementById('show-budgets-view');
const budgetsView = document.getElementById('budgets-view');
const budgetListEl = document.getElementById('budget-list');
const addBudgetBtn = document.getElementById('add-budget-btn');
const budgetModal = document.getElementById('budget-modal');
const budgetForm = document.getElementById('budget-form');
const cancelBudgetBtn = document.getElementById('cancel-budget-btn');
const summary = document.getElementById('summary');
const charts = document.getElementById('charts');
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Seletores das novas Views
const goalsView = document.getElementById('goals-view');
const debtsView = document.getElementById('debts-view');
const tasksView = document.getElementById('tasks-view');
const showGoalsViewBtn = document.getElementById('show-goals-view-btn');
const showDebtsViewBtn = document.getElementById('show-debts-view-btn');
const showTasksViewBtn = document.getElementById('show-tasks-view-btn');

// Seletores da View de Dívidas
const debtListEl = document.getElementById('debt-list');
const addDebtBtn = document.getElementById('add-debt-btn');
const debtModal = document.getElementById('debt-modal');
const debtForm = document.getElementById('debt-form');
const cancelDebtBtn = document.getElementById('cancel-debt-btn');

// Seletores da View de Tarefas
const taskListEl = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const cancelTaskBtn = document.getElementById('cancel-task-btn');


// Seletores da View de Configurações
const settingsView = document.getElementById('settings-view');
const showSettingsViewBtn = document.getElementById('show-settings-view');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const colorOptionsContainer = document.getElementById('color-options');
const incomeCategoriesListSettings = document.getElementById('income-categories-list-settings');
const expenseCategoriesListSettings = document.getElementById('expense-categories-list-settings');
const addIncomeCategoryFormSettings = document.getElementById('add-income-category-form-settings');
const addExpenseCategoryFormSettings = document.getElementById('add-expense-category-form-settings');
const familyMembersListSettings = document.getElementById('family-members-list-settings');
const inviteMemberFormSettings = document.getElementById('invite-member-form-settings');

// Seletores da Calculadora
const calculatorView = document.getElementById('calculator-view');
const showCalculatorViewBtn = document.getElementById('show-calculator-view-btn');
const calcInitial = document.getElementById('calc-initial');
const calcMonthly = document.getElementById('calc-monthly');
const calcRate = document.getElementById('calc-rate');
const calcTime = document.getElementById('calc-time');
const btnCalculate = document.getElementById('btn-calculate');
const btnFetchCDI = document.getElementById('btn-fetch-cdi');
const calcResultInvested = document.getElementById('calc-result-invested');
const calcResultInterest = document.getElementById('calc-result-interest');
const calcResultTotal = document.getElementById('calc-result-total');
const calculatorChartCanvas = document.getElementById('calculator-chart');
let calculatorChart = null;

const categorySelect = document.getElementById('category');
const investmentOption = document.getElementById('investment-option');
const isInvestmentCheckbox = document.getElementById('is-investment');
const transactionTypeRadios = document.querySelectorAll('input[name="type"]');

let currentUserId = null;
let currentFamilyId = null;
let transactions = [];
let goals = [];
let currentUserPlan = 'free'; // Plano do usuário: 'free', 'premium_monthly', 'premium_yearly'
let trialEndsAt = null; // Data de fim do trial
let unsubscribeFromTransactions = null;
let unsubscribeFromGoals = null;
let unsubscribeFromInvestments = null;
let unsubscribeFromBudgets = null;
let unsubscribeFromCategories = null;
let unsubscribeFromFamily = null;
let unsubscribeFromDebts = null;

let unsubscribeFromTasks = null;
let unsubscribeFromCalculator = null; // Placeholder se precisar de real-time


// --- LÓGICA DE APARÊNCIA ---
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    loadAndApplyColor();
});

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDarkMode = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

const colors = [
    { name: 'Padrão', value: '#4F46E5' },
    { name: 'Esmeralda', value: '#059669' },
    { name: 'Rosa', value: '#DB2777' },
    { name: 'Laranja', value: '#F97316' }
];

colors.forEach(color => {
    const colorCircle = document.createElement('button');
    colorCircle.className = 'w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800';
    colorCircle.style.backgroundColor = color.value;
    colorCircle.dataset.color = color.value;
    colorCircle.setAttribute('title', color.name);
    colorCircle.addEventListener('click', () => {
        document.documentElement.style.setProperty('--cor-principal', color.value);
        localStorage.setItem('mainColor', color.value);
        updateActiveColor();
    });
    if (colorOptionsContainer) {
        colorOptionsContainer.appendChild(colorCircle);
    }
});

function updateActiveColor() {
    const currentColor = getComputedStyle(document.documentElement).getPropertyValue('--cor-principal').trim();
    document.querySelectorAll('#color-options button').forEach(button => {
        if (button.dataset.color.toLowerCase() === currentColor.toLowerCase()) {
            button.classList.add('ring-2', 'ring-[var(--cor-principal)]');
        } else {
            button.classList.remove('ring-2', 'ring-[var(--cor-principal)]');
        }
    });
}

function loadAndApplyColor() {
    const savedColor = localStorage.getItem('mainColor') || '#4F46E5';
    document.documentElement.style.setProperty('--cor-principal', savedColor);
    updateActiveColor();
}



// --- LÓGICA DE SIDEBAR (Mobile) ---
// openSidebar e closeSidebar mantidos para o menu mobile
function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
}

if (menuBtn) menuBtn.addEventListener('click', openSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Navegação agora é via links HTML diretos (MPA)


// --- LÓGICA DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, async user => {
    if (user) {
        try {
            // Usuário está logado, busca informações da família e carrega os dados
            currentUserId = user.uid;
            await setupUserFamily(user);

            // Tenta carregar o plano, mas não bloqueia se falhar (função global window.loadUserPlan)
            if (typeof window.loadUserPlan === 'function') {
                await window.loadUserPlan(user.uid);
            } else {
                console.warn("loadUserPlan não encontrado globalmente. Verifique imports.");
            }

            appView.classList.remove('hidden'); // Mostra a aplicação
            setupRealtimeListeners(currentFamilyId);
            processRecurringTransactions(currentFamilyId); // Processa recorrência ao iniciar
            if (document.getElementById('ai-coach')) {
                updateAICoach();
            }
        } catch (error) {
            console.error("Erro fatal na inicialização do app:", error);
            alert("Erro ao carregar aplicação. Verifique o console.");
        }
    } else {
        // Usuário não está logado, redireciona para a página de login
        window.location.href = 'login/index.html';
    }
});

async function setupUserFamily(user) {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().familyId) {
        currentFamilyId = userDoc.data().familyId;
    } else {
        const q = query(collection(db, 'invitations'), where('email', '==', user.email));
        const invitationsSnapshot = await getDocs(q);
        if (!invitationsSnapshot.empty) {
            const invitation = invitationsSnapshot.docs[0];
            currentFamilyId = invitation.data().familyId;

            const familyRef = doc(db, 'families', currentFamilyId);
            await updateDoc(familyRef, { members: arrayUnion(user.uid) });

            await setDoc(userRef, { familyId: currentFamilyId, email: user.email }, { merge: true });

            await deleteDoc(invitation.ref);
        } else {
            const newFamilyRef = await addDoc(collection(db, 'families'), {
                members: [user.uid],
                owner: user.uid
            });
            currentFamilyId = newFamilyRef.id;
            await setDoc(userRef, { familyId: currentFamilyId, email: user.email });
            await createDefaultCategories(currentFamilyId); // Muriel Strategy: Default Categories

            if (window.Analytics) {
                window.Analytics.track('Sign_Up', { method: 'email' });
            }
        }
    }
}

if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).catch(error => {
            console.error("Erro ao fazer logout:", error);
        });
    });
}

// --- FUNÇÃO AUXILIAR: MURIEL STRATEGY (CATEGORIAS PADRÃO) ---
async function createDefaultCategories(familyId) {
    const categoriesRef = collection(db, 'families', familyId, 'categories');
    const batch = writeBatch(db);

    const defaultIncome = [
        'Salário', 'Renda Extra', 'Investimentos', 'Outros'
    ];

    const defaultExpense = [
        'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', // Essenciais
        'Lazer', 'Restaurantes', 'Compras', // Estilo de Vida
        'Investimentos', 'Assinaturas' // Futuro/Recorrente
    ];

    defaultIncome.forEach(name => {
        const docRef = doc(categoriesRef);
        batch.set(docRef, { name, type: 'income', createdAt: serverTimestamp() });
    });

    defaultExpense.forEach(name => {
        const docRef = doc(categoriesRef);
        batch.set(docRef, { name, type: 'expense', createdAt: serverTimestamp() });
    });

    await batch.commit();
    console.log("Categorias padrão criadas com sucesso (Estratégia Muriel)");
}

// --- LÓGICA DO FIRESTORE E RENDERIZAÇÃO ---
function setupRealtimeListeners(familyId) {
    if (!familyId) return;

    const transactionsCol = collection(db, 'families', familyId, 'transactions');
    unsubscribeFromTransactions = onSnapshot(query(transactionsCol), (snapshot) => {
        transactions = [];
        snapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }));
        transactions.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
        renderTransactions(transactions);
        updateSummary(transactions);
    });

    const goalsCol = collection(db, 'families', familyId, 'goals');
    unsubscribeFromGoals = onSnapshot(query(goalsCol), (snapshot) => {
        goals = [];
        snapshot.forEach(doc => goals.push({ id: doc.id, ...doc.data() }));
        renderGoals(goals);
    });

    const debtsCol = collection(db, 'families', familyId, 'debts');
    unsubscribeFromDebts = onSnapshot(query(debtsCol), (snapshot) => {
        const debts = [];
        snapshot.forEach(doc => debts.push({ id: doc.id, ...doc.data() }));
        renderDebts(debts);
    });

    const tasksCol = collection(db, 'families', familyId, 'tasks');
    unsubscribeFromTasks = onSnapshot(query(tasksCol), (snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
        renderTasks(tasks);
    });

    const investmentsCol = collection(db, 'families', familyId, 'investments');
    unsubscribeFromInvestments = onSnapshot(query(investmentsCol), (snapshot) => {
        const investments = [];
        snapshot.forEach(doc => investments.push({ id: doc.id, ...doc.data() }));
        renderInvestments(investments);
    });

    const budgetsCol = collection(db, 'families', familyId, 'budgets');
    unsubscribeFromBudgets = onSnapshot(query(budgetsCol), (snapshot) => {
        const budgets = [];
        snapshot.forEach(doc => budgets.push({ id: doc.id, ...doc.data() }));
        getDocs(query(transactionsCol)).then(transactionsSnapshot => {
            const transactions = [];
            transactionsSnapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }));
            renderBudgets(budgets, transactions);
        });
    });

    const categoriesCol = collection(db, 'families', familyId, 'categories');
    unsubscribeFromCategories = onSnapshot(query(categoriesCol), (snapshot) => {
        const incomeCategories = [];
        const expenseCategories = [];
        snapshot.forEach(doc => {
            const category = { id: doc.id, ...doc.data() };
            if (category.type === 'income') {
                incomeCategories.push(category);
            } else {
                expenseCategories.push(category);
            }
        });
        renderCategories(incomeCategories, expenseCategories);
        updateCategoryDropdown(incomeCategories, expenseCategories);
    });

    const familyRef = doc(db, 'families', familyId);
    unsubscribeFromFamily = onSnapshot(familyRef, async (familySnapshot) => {
        const family = familySnapshot.data();
        if (family && family.members) {
            const memberPromises = family.members.map(id => getDoc(doc(db, 'users', id)));
            const memberDocs = await Promise.all(memberPromises);
            const members = memberDocs.map(d => d.data());
            renderFamilyMembers(members);
        }
    });
}

function renderBudgets(budgets, transactions) {
    if (!budgetListEl) return;
    budgetListEl.innerHTML = '';
    if (budgets.length === 0) {
        budgetListEl.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhum orçamento definido.</p>';
        return;
    }
    const now = new Date();
    const currentMonthExpenses = transactions.filter(t => {
        const date = t.timestamp.toDate();
        return t.type === 'expense' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const expensesByCategory = currentMonthExpenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});
    budgets.forEach(budget => {
        const spentAmount = expensesByCategory[budget.category] || 0;
        const limitAmount = budget.limit;
        const percentage = (spentAmount / limitAmount) * 100;
        const remaining = limitAmount - spentAmount;
        let progressBarColor = 'bg-blue-600';
        if (percentage > 75 && percentage <= 100) progressBarColor = 'bg-yellow-500';
        else if (percentage > 100) progressBarColor = 'bg-red-600';
        const el = document.createElement('div');
        el.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';
        el.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="font-semibold">${budget.category.charAt(0).toUpperCase() + budget.category.slice(1)}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">${formatCurrency(spentAmount)} / ${formatCurrency(limitAmount)}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div class="${progressBarColor} h-2.5 rounded-full" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
            <p class="text-right text-xs mt-1 ${remaining < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}">
                ${remaining >= 0 ? `${formatCurrency(remaining)} restantes` : `${formatCurrency(Math.abs(remaining))} acima`}
            </p>`;
        budgetListEl.appendChild(el);
    });
}

function renderFamilyMembers(members) {
    if (!familyMembersListSettings) return;
    familyMembersListSettings.innerHTML = '';
    members.forEach(member => {
        const el = document.createElement('div');
        el.className = 'bg-gray-50 dark:bg-gray-700 p-3 rounded-md';
        el.textContent = member.email;
        familyMembersListSettings.appendChild(el);
    });
}

function renderGoals(goals) {
    if (!goalListEl) return;
    goalListEl.innerHTML = '';
    if (goals.length === 0) {
        goalListEl.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhuma meta definida.</p>';
        return;
    }
    goals.forEach(goal => {
        const percentage = (goal.targetAmount > 0) ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        const el = document.createElement('div');
        el.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';
        el.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold">${goal.name}</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button data-id="${goal.id}" class="edit-goal-btn p-1 text-gray-500 hover:text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                    </button>
                    <button data-id="${goal.id}" class="delete-goal-btn p-1 text-gray-500 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>`;
        goalListEl.appendChild(el);
    });

    // Adicionar event listeners para os novos botões
    document.querySelectorAll('.edit-goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const goal = goals.find(g => g.id === id);
            openGoalModal(goal);
        });
    });

    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm('Tem certeza que deseja excluir esta meta?')) {
                deleteGoal(id);
            }
        });
    });
}

function renderCategories(incomeCategories, expenseCategories) {
    if (incomeCategoriesListSettings) incomeCategoriesListSettings.innerHTML = '';
    if (expenseCategoriesListSettings) expenseCategoriesListSettings.innerHTML = '';
    if (!incomeCategoriesListSettings && !expenseCategoriesListSettings) return;
    incomeCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-md';
        el.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" class="delete-category-btn text-red-500 hover:text-red-700 font-bold">X</button>`;
        incomeCategoriesListSettings.appendChild(el);
    });
    expenseCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-md';
        el.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" class="delete-category-btn text-red-500 hover:text-red-700 font-bold">X</button>`;
        expenseCategoriesListSettings.appendChild(el);
    });
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Tem certeza que deseja excluir esta categoria?')) {
                await deleteDoc(doc(db, 'families', currentFamilyId, 'categories', id));
            }
        });
    });
}

function updateCategoryDropdown(incomeCategories, expenseCategories) {
    if (!categorySelect) return;
    const currentSelection = categorySelect.value;
    categorySelect.innerHTML = '';
    categorySelect.innerHTML += '<optgroup label="Receitas">';
    incomeCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name.toLowerCase();
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
    categorySelect.innerHTML += '</optgroup>';
    categorySelect.innerHTML += '<optgroup label="Despesas">';
    expenseCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name.toLowerCase();
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
    categorySelect.innerHTML += '</optgroup>';
    categorySelect.value = currentSelection;
}

function renderInvestments(investments) {
    if (!investmentListEl) return;
    investmentListEl.innerHTML = '';
    let totalInvested = 0;
    let currentTotalValue = 0;

    if (investments.length === 0) {
        investmentListEl.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhum ativo de investimento encontrado.</p>';
        investmentSummaryEl.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Investido</h3>
            <p class="text-2xl font-semibold mt-1">${formatCurrency(0)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Atual do Portfólio</h3>
            <p class="text-2xl font-semibold mt-1">${formatCurrency(0)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Lucro/Prejuízo Total</h3>
            <p class="text-2xl font-semibold mt-1">${formatCurrency(0)}</p>
        </div>
    `;
    } else {
        // Ordena para mostrar os mais recentes primeiro
        investments.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

        investments.forEach(asset => {
            const el = document.createElement('div');
            el.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';

            if (asset.isContribution) {
                // É um aporte direto de uma transação
                const investedValue = asset.averagePrice;
                totalInvested += investedValue;
                currentTotalValue += investedValue; // Aporte tem valor atual igual ao investido

                el.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold">${asset.name}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Aporte em ${asset.timestamp ? asset.timestamp.toDate().toLocaleDateString('pt-BR') : ''}</p>
                        </div>
                        <div class="flex items-center">
                             <p class="font-bold text-blue-500 mr-4">${formatCurrency(investedValue)}</p>
                             <button data-id="${asset.id}" class="delete-investment-btn p-1 text-gray-500 hover:text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // É um ativo (como ação, cripto, etc.)
                const investedValue = asset.quantity * asset.averagePrice;
                const currentValue = asset.quantity * asset.currentPrice;
                const profitLoss = currentValue - investedValue;
                const profitLossColor = profitLoss >= 0 ? 'text-green-500' : 'text-red-500';

                totalInvested += investedValue;
                currentTotalValue += currentValue;

                el.innerHTML = `
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                        <div class="flex-grow mb-4 sm:mb-0">
                            <p class="font-semibold">${asset.name}</p>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm">
                                <div>
                                    <p class="text-gray-500 dark:text-gray-400">Quantidade</p>
                                    <p>${asset.quantity}</p>
                                </div>
                                <div>
                                    <p class="text-gray-500 dark:text-gray-400">Preço Médio</p>
                                    <p>${formatCurrency(asset.averagePrice)}</p>
                                </div>
                                <div>
                                    <p class="text-gray-500 dark:text-gray-400">Valor Atual</p>
                                    <p>${formatCurrency(currentValue)}</p>
                                </div>
                                <div class="col-span-2 sm:col-span-1">
                                    <p class="text-gray-500 dark:text-gray-400">Lucro/Prejuízo</p>
                                    <p class="${profitLossColor}">${formatCurrency(profitLoss)} (${investedValue > 0 ? ((profitLoss / investedValue) * 100).toFixed(2) : 0}%)</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-2 self-end sm:self-start">
                            <button data-id="${asset.id}" class="edit-investment-btn p-1 text-gray-500 hover:text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                            </button>
                            <button data-id="${asset.id}" class="delete-investment-btn p-1 text-gray-500 hover:text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                `;
            }
            investmentListEl.appendChild(el);
        });

        // Adicionar event listeners para os novos botões
        document.querySelectorAll('.edit-investment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const investment = investments.find(inv => inv.id === id);
                openInvestmentModal(investment);
            });
        });

        document.querySelectorAll('.delete-investment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (confirm('Tem certeza que deseja excluir este investimento? Esta ação não pode ser desfeita.')) {
                    deleteInvestment(id);
                }
            });
        });

        // Renderiza o resumo
        const totalProfitLoss = currentTotalValue - totalInvested;
        const totalProfitLossColor = totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500';
        investmentSummaryEl.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Investido</h3>
                <p class="text-2xl font-semibold mt-1">${formatCurrency(totalInvested)}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Atual do Portfólio</h3>
                <p class="text-2xl font-semibold mt-1">${formatCurrency(currentTotalValue)}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Lucro/Prejuízo Total</h3>
                <p class="text-2xl font-semibold ${totalProfitLossColor} mt-1">${formatCurrency(totalProfitLoss)}</p>
            </div>
        `;
    }
}

function formatCurrency(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function updateSummary(transactions) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense' && !t.isInvestment).reduce((sum, t) => sum + t.amount, 0);

    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totalIncome);
    if (totalExpenseEl) totalExpenseEl.textContent = formatCurrency(totalExpense);
    if (balanceEl) balanceEl.textContent = formatCurrency(totalIncome - totalExpense);

    // Charts logic handles missing elements internally ideally, but let's check
    renderExpenseChart(transactions);
    renderIncomeExpenseChart(transactions);
}

function renderTransactions(transactions) {
    if (!transactionListEl) return;
    transactionListEl.innerHTML = '';
    if (transactions.length === 0) {
        transactionListEl.appendChild(noTransactionsEl);
        noTransactionsEl.classList.remove('hidden');
    } else {
        noTransactionsEl.classList.add('hidden');

        let displayTransactions = transactions;

        // Verificar limite de histórico (Premium Feature)
        if (!window.hasFeatureAccess('unlimited_history')) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            displayTransactions = transactions.filter(t => {
                const tDate = t.timestamp ? t.timestamp.toDate() : new Date();
                return tDate >= thirtyDaysAgo;
            });
        }

        displayTransactions.forEach(t => {
            const isIncome = t.type === 'income';
            const isInvestment = t.isInvestment;
            const sign = isIncome ? '+' : '-';
            let amountColor = isIncome ? 'text-green-500' : 'text-red-500';
            let borderColor = isIncome ? 'border-green-500' : 'border-red-500';

            if (isInvestment) {
                amountColor = 'text-blue-500';
                borderColor = 'border-blue-500';
            }

            const el = document.createElement('div');
            el.className = `bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between border-l-4 ${borderColor}`;

            let investmentBadge = '';
            if (isInvestment) {
                investmentBadge = `<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">Investimento</span>`;
            }

            el.innerHTML = `
                <div class="flex-1 mb-4 sm:mb-0">
                    <p class="font-semibold">${t.description}</p>
                    <div class="flex items-center flex-wrap mt-1">
                        <span class="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full mr-2 mb-1">${t.category || 'Sem Categoria'}</span>
                        ${isInvestment ? investmentBadge : ''}
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">${t.timestamp ? t.timestamp.toDate().toLocaleDateString('pt-BR') : 'Data pendente'}</p>
                    </div>
                </div>
                <div class="flex items-center self-end sm:self-center">
                    <p class="font-bold ${amountColor} mr-4">${sign} ${formatCurrency(t.amount)}</p>
                    <div class="flex space-x-2">
                        <button data-id="${t.id}" class="edit-btn p-1 text-gray-500 hover:text-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                        </button>
                        <button data-id="${t.id}" class="delete-btn p-1 text-gray-500 hover:text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>`;
            transactionListEl.appendChild(el);
        });

        // Adicionar event listeners para os novos botões
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const transaction = transactions.find(t => t.id === id);
                openModalForEdit(transaction);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                    deleteTransaction(id);
                }
            });
        });
    }
}

// --- LÓGICA DO GRÁFICO ---
let expenseChart = null;
let incomeExpenseChart = null;

function renderIncomeExpenseChart(transactions) {
    const canvasElement = document.getElementById('income-expense-chart');
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last6Months.push({
            label: d.toLocaleString('pt-BR', { month: 'long' }),
            month: d.getMonth(),
            year: d.getFullYear(),
            income: 0,
            expense: 0,
            investment: 0
        });
    }

    transactions.forEach(t => {
        const date = t.timestamp.toDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthData = last6Months.find(m => m.month === month && m.year === year);
        if (monthData) {
            if (t.type === 'income') {
                monthData.income += t.amount;
            } else if (t.type === 'expense') {
                if (t.isInvestment) {
                    monthData.investment += t.amount;
                } else {
                    monthData.expense += t.amount;
                }
            }
        }
    });

    const labels = last6Months.map(m => m.label);
    const incomeData = last6Months.map(m => m.income);
    const expenseData = last6Months.map(m => m.expense);
    const investmentData = last6Months.map(m => m.investment);

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: incomeData,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(22, 163, 74, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(220, 38, 38, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Investimentos',
                    data: investmentData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderExpenseChart(transactions) {
    const canvasElement = document.getElementById('expense-chart');
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    const expenses = transactions.filter(t => t.type === 'expense');

    const dataByCategory = expenses.reduce((acc, t) => {
        const category = t.category || 'outros';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
    }, {});

    const labels = Object.keys(dataByCategory);
    const data = Object.values(dataByCategory);

    if (expenseChart) {
        expenseChart.destroy();
    }

    if (labels.length > 0) {
        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)), // Capitalize
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    } else {
        // Se não houver despesas, pode-se mostrar uma mensagem ou deixar o canvas em branco.
    }
}

// --- LÓGICA DOS MODAIS (Transação, Meta, Orçamento, Investimento) ---
// ... Funções open/close e event listeners para cada modal ...

// --- LÓGICA DOS FORMULÁRIOS DE CONFIGURAÇÕES ---
if (addIncomeCategoryFormSettings) {
    addIncomeCategoryFormSettings.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Verificar limite de categorias (Premium Feature)
        const currentCategories = incomeCategoriesListSettings.children.length;
        if (!window.hasFeatureAccess('unlimited_categories') && currentCategories >= 5) {
            window.showUpgradeModal('Categorias Ilimitadas');
            return;
        }

        const input = document.getElementById('new-income-category-settings');
        const newCategoryName = input.value.trim();
        if (newCategoryName && currentFamilyId) {
            await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'income' });
            input.value = '';
        }
    });
}

if (addExpenseCategoryFormSettings) {
    addExpenseCategoryFormSettings.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Verificar limite de categorias (Premium Feature)
        const currentCategories = expenseCategoriesListSettings.children.length;
        if (!window.hasFeatureAccess('unlimited_categories') && currentCategories >= 5) {
            window.showUpgradeModal('Categorias Ilimitadas');
            return;
        }

        const input = document.getElementById('new-expense-category-settings');
        const newCategoryName = input.value.trim();
        if (newCategoryName && currentFamilyId) {
            await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'expense' });
            input.value = '';
        }
    });
}

if (inviteMemberFormSettings) {
    inviteMemberFormSettings.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('invite-email-settings');
        const email = input.value.trim();

        if (email && currentFamilyId) {
            await addDoc(collection(db, 'invitations'), {
                familyId: currentFamilyId,
                email: email,
                invitedBy: auth.currentUser.email
            });
            input.value = '';
            alert('Convite enviado!');
        }

    });
}

// --- FEATURE: PROCESSAR TRANSAÇÕES RECORRENTES ---
async function processRecurringTransactions(familyId) {
    if (!familyId) return;
    // Verifica apenas se o usuário tiver acesso (embora a lógica seja executada p/ todos, só quem é premium cria recorrência)
    if (!window.hasFeatureAccess('recurring_transactions')) {
        // Se usuário deixou de ser premium, não processa
        return;
    }

    const transactionsRef = collection(db, 'families', familyId, 'transactions');
    const q = query(transactionsRef, where('isRecurring', '==', true), where('nextDueDate', '<=', Timestamp.now().toDate().toISOString().split('T')[0]));

    // Simplificação: processamento client-side básico ao abrir o app
    // Idealmente seria backend. Aqui buscamos transações recorrentes passadas.
    // Como o Firestore requer índices compostos para filtrar, vamos buscar as recorrentes e filtrar no cliente por data
    const recurringQuery = query(transactionsRef, where('isRecurring', '==', true));
    const querySnapshot = await getDocs(recurringQuery);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const batch = writeBatch(db);
    let hasUpdates = false;

    querySnapshot.forEach((docSnap) => {
        const t = docSnap.data();
        if (t.nextDueDate && t.nextDueDate <= today) {
            // Criar nova transação
            const newDate = new Date(t.nextDueDate);
            // Ajustar próxima data
            let nextDate = new Date(newDate);

            if (t.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (t.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (t.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

            // Nova transação
            const newTransactionRef = doc(collection(db, 'families', familyId, 'transactions'));
            batch.set(newTransactionRef, {
                ...t,
                timestamp: Timestamp.fromDate(newDate),
                isRecurring: false, // A cópia não é a "mãe" recorrente
                originalRecurringId: docSnap.id,
                userId: currentUserId // Quem abriu o app 'criou' a recorrência
            });

            // Atualizar transação original com nova data
            batch.update(docSnap.ref, {
                nextDueDate: nextDate.toISOString().split('T')[0],
                lastProcessedAt: Timestamp.now()
            });
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        await batch.commit();
        console.log('Transações recorrentes processadas.');
    }
}

// --- FEATURE: EXPORTAR RELATÓRIO ---
window.exportReport = async function () {
    if (!window.hasFeatureAccess('export_reports')) {
        window.showUpgradeModal('Exportação de Relatórios');
        return;
    }

    // Gerar CSV das transações visíveis
    if (!currentFamilyId) return;

    const transactionsRef = collection(db, 'families', currentFamilyId, 'transactions');
    const snapshot = await getDocs(transactionsRef);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Descrição,Categoria,Valor,Tipo\n"; // Cabeçalho

    snapshot.forEach(doc => {
        const t = doc.data();
        const date = t.timestamp ? t.timestamp.toDate().toLocaleDateString('pt-BR') : '';
        const row = `${date},"${t.description}",${t.category},${t.amount},${t.type === 'income' ? 'Receita' : 'Despesa'}`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trilha_comigo_relatorio.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- LÓGICA DO MODAL DE TRANSAÇÃO ---

// Função para abrir o modal de transação para adicionar ou editar
function openTransactionModal(transaction = null) {
    transactionForm.reset();
    transactionIdInput.value = '';

    if (transaction) {
        // Modo de edição
        modalTitle.textContent = 'Editar Transação';
        transactionIdInput.value = transaction.id;
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = transaction.amount;
        // Converte o timestamp do Firebase para o formato YYYY-MM-DD
        document.getElementById('date').value = transaction.timestamp.toDate().toISOString().split('T')[0];
        document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
        categorySelect.value = transaction.category;
        isInvestmentCheckbox.checked = transaction.isInvestment || false;
    } else {
        // Modo de adição
        modalTitle.textContent = 'Nova Transação';
        // Define a data atual por padrão
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    toggleInvestmentOption();

    modal.classList.remove('hidden');
    // Pequeno timeout para a animação de entrada funcionar
    setTimeout(() => modalContent.classList.remove('modal-enter'), 10);
}

// Função para fechar o modal de transação
function closeTransactionModal() {
    modalContent.classList.add('modal-enter');
    // Espera a animação de saída terminar antes de esconder o modal
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// Mostra a opção de investimento apenas para despesas
function toggleInvestmentOption() {
    const selectedType = document.querySelector('input[name="type"]:checked').value;
    if (selectedType === 'expense') {
        investmentOption.classList.remove('hidden');
    } else {
        investmentOption.classList.add('hidden');
        isInvestmentCheckbox.checked = false; // Garante que não seja marcado para receitas
    }
}

// Adiciona os event listeners
if (addTransactionBtnMobile) addTransactionBtnMobile.addEventListener('click', () => openTransactionModal());
if (addTransactionBtnDesktop) addTransactionBtnDesktop.addEventListener('click', () => openTransactionModal());
if (cancelBtn) cancelBtn.addEventListener('click', closeTransactionModal);
if (modal) {
    modal.addEventListener('click', (e) => {
        // Fecha o modal se o clique for no overlay (fundo)
        if (e.target === modal) {
            closeTransactionModal();
        }
    });
}
if (transactionTypeRadios) {
    transactionTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleInvestmentOption);
    });
}

// Toggle recurrence details
const isRecurringCheckbox = document.getElementById('is-recurring');
const recurrenceDetails = document.getElementById('recurrence-details');

if (isRecurringCheckbox) {
    isRecurringCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            recurrenceDetails.classList.remove('hidden');
        } else {
            recurrenceDetails.classList.add('hidden');
        }
    });
}

// Lógica de submissão do formulário de transação
// Lógica de submissão do formulário de transação
if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = transactionIdInput.value;
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value;
        const type = document.querySelector('input[name="type"]:checked').value;
        const category = categorySelect.value;
        const isInvestment = isInvestmentCheckbox.checked;

        // Recurrence Data
        const isRecurring = document.getElementById('is-recurring').checked;
        const frequency = document.getElementById('recurrence-frequency').value;

        if (!description || isNaN(amount) || !date || !category) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Check recurrence permission
        if (isRecurring && !window.hasFeatureAccess('recurring_transactions')) {
            window.showUpgradeModal('Transações Recorrentes');
            return;
        }

        const transactionData = {
            description,
            amount,
            timestamp: Timestamp.fromDate(new Date(date)),
            type,
            category,
            isInvestment,
            userId: currentUserId,
            isRecurring: isRecurring || false
        };

        if (isRecurring) {
            transactionData.frequency = frequency;
            // Calcular próxima data
            const nextDate = new Date(date);
            if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            transactionData.nextDueDate = nextDate.toISOString().split('T')[0];
        }

        try {
            if (id) {
                // Atualizar transação existente
                const transactionRef = doc(db, 'families', currentFamilyId, 'transactions', id);
                await updateDoc(transactionRef, transactionData);
            } else {
                // Adicionar nova transação
                await addDoc(collection(db, 'families', currentFamilyId, 'transactions'), transactionData);
            }

            // Se for uma despesa marcada como investimento, cria um registro correspondente em investimentos
            if (isInvestment && type === 'expense') {
                await addDoc(collection(db, 'families', currentFamilyId, 'investments'), {
                    name: `Aporte: ${description}`,
                    averagePrice: amount, // Para aportes, o preço médio é o valor total
                    quantity: 1,
                    currentPrice: amount, // O valor atual é o mesmo do aporte
                    timestamp: Timestamp.fromDate(new Date(date)),
                    isContribution: true, // Marca como um aporte para diferenciar de outros ativos
                    userId: currentUserId
                });
            }

            // Tracking Event
            if (window.Analytics) {
                window.Analytics.track('Add_Transaction', {
                    amount: amount,
                    category: category,
                    type: type
                });
            }

            closeTransactionModal();
        } catch (error) {
            console.error("Erro ao salvar transação: ", error);
            alert("Ocorreu um erro ao salvar a transação. Tente novamente.");
        }
    });
}

// A função openModalForEdit é chamada pelos botões de edição na lista de transações
function openModalForEdit(transaction) {
    openTransactionModal(transaction);
}

// Função para deletar uma transação
async function deleteTransaction(id) {
    if (!currentFamilyId || !id) return;
    try {
        await deleteDoc(doc(db, 'families', currentFamilyId, 'transactions', id));
    } catch (error) {
        console.error("Erro ao deletar transação:", error);
        alert("Ocorreu um erro ao deletar a transação.");
    }
}

// --- LÓGICA DO MODAL DE METAS ---

function openGoalModal(goal = null) {
    goalForm.reset();
    document.getElementById('goal-id').value = '';
    const modalTitle = document.getElementById('goal-modal-title');

    if (goal) {
        modalTitle.textContent = 'Editar Meta';
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.targetAmount;
        document.getElementById('goal-current').value = goal.currentAmount;
    } else {
        modalTitle.textContent = 'Nova Meta';
    }
    goalModal.classList.remove('hidden');
}

function closeGoalModal() {
    goalModal.classList.add('hidden');
}

if (addGoalBtn) addGoalBtn.addEventListener('click', () => openGoalModal());
if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', closeGoalModal);
if (goalModal) {
    goalModal.addEventListener('click', (e) => {
        if (e.target === goalModal) {
            closeGoalModal();
        }
    });
}

if (goalForm) {
    goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('goal-id').value;
        const goalData = {
            name: document.getElementById('goal-name').value,
            targetAmount: parseFloat(document.getElementById('goal-target').value),
            currentAmount: parseFloat(document.getElementById('goal-current').value),
            userId: currentUserId
        };

        if (id) {
            await updateDoc(doc(db, 'families', currentFamilyId, 'goals', id), goalData);
        } else {
            await addDoc(collection(db, 'families', currentFamilyId, 'goals'), goalData);
        }
        closeGoalModal();
    });
}

async function deleteGoal(id) {
    if (!currentFamilyId || !id) return;
    try {
        await deleteDoc(doc(db, 'families', currentFamilyId, 'goals', id));
    } catch (error) {
        console.error("Erro ao deletar meta:", error);
        alert("Ocorreu um erro ao deletar a meta.");
    }
}


// --- LÓGICA DOS OUTROS MODAIS (Orçamento, Investimento) ---
function renderDebts(debts) {
    if (!debtListEl) return;
    debtListEl.innerHTML = '';
    if (debts.length === 0) {
        debtListEl.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhuma dívida encontrada.</p>';
        return;
    }

    debts.forEach(debt => {
        const el = document.createElement('div');
        el.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';
        const dueDate = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('pt-BR') : 'Não definida';

        el.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                <div class="flex-grow mb-4 sm:mb-0">
                    <p class="font-semibold text-lg">${debt.company}</p>
                    <p class="font-bold text-xl text-red-500 mt-1">${formatCurrency(debt.amount)}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Vencimento: ${dueDate}</p>
                    ${debt.negotiation ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-2"><strong>Detalhes:</strong> ${debt.negotiation}</p>` : ''}
                </div>
                <div class="flex space-x-2 self-end sm:self-start">
                    <button data-id="${debt.id}" class="edit-debt-btn p-1 text-gray-500 hover:text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                    </button>
                    <button data-id="${debt.id}" class="delete-debt-btn p-1 text-gray-500 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `;
        debtListEl.appendChild(el);
    });

    document.querySelectorAll('.edit-debt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const debt = debts.find(d => d.id === id);
            openDebtModal(debt);
        });
    });

    document.querySelectorAll('.delete-debt-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (confirm('Tem certeza que deseja excluir esta dívida?')) {
                await deleteDoc(doc(db, 'families', currentFamilyId, 'debts', id));
            }
        });
    });
}

function openDebtModal(debt = null) {
    debtForm.reset();
    document.getElementById('debt-id').value = '';
    const modalTitle = document.getElementById('debt-modal-title');

    if (debt) {
        modalTitle.textContent = 'Editar Dívida';
        document.getElementById('debt-id').value = debt.id;
        document.getElementById('debt-company').value = debt.company;
        document.getElementById('debt-amount').value = debt.amount;
        document.getElementById('debt-due-date').value = debt.dueDate || '';
        document.getElementById('debt-negotiation').value = debt.negotiation || '';
    } else {
        modalTitle.textContent = 'Nova Dívida';
    }
    debtModal.classList.remove('hidden');
}

function closeDebtModal() {
    debtModal.classList.add('hidden');
}

if (addDebtBtn) addDebtBtn.addEventListener('click', () => openDebtModal());
if (cancelDebtBtn) cancelDebtBtn.addEventListener('click', closeDebtModal);
if (debtModal) {
    debtModal.addEventListener('click', (e) => {
        if (e.target === debtModal) {
            closeDebtModal();
        }
    });
}

if (debtForm) {
    debtForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('debt-id').value;
        const debtData = {
            company: document.getElementById('debt-company').value,
            amount: parseFloat(document.getElementById('debt-amount').value),
            dueDate: document.getElementById('debt-due-date').value,
            negotiation: document.getElementById('debt-negotiation').value,
            userId: currentUserId
        };

        if (id) {
            await updateDoc(doc(db, 'families', currentFamilyId, 'debts', id), debtData);
        } else {
            await addDoc(collection(db, 'families', currentFamilyId, 'debts'), debtData);
        }
        closeDebtModal();
    });
}

function renderTasks(tasks) {
    if (!taskListEl) return;
    taskListEl.innerHTML = '';
    if (tasks.length === 0) {
        taskListEl.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma tarefa encontrada.</td></tr>';
        return;
    }

    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 dark:hover:bg-gray-700";
        const dueDate = task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${task.title}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${task.responsible || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${dueDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityClass(task.priority)}">
                    ${task.priority}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(task.status)}">
                    ${task.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-id="${task.id}" class="edit-task-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">Editar</button>
            </td>
        `;
        taskListEl.appendChild(row);
    });

    document.querySelectorAll('.edit-task-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const task = tasks.find(t => t.id === id);
            openTaskModal(task);
        });
    });
}

function getPriorityClass(priority) {
    switch (priority) {
        case 'Urgente': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'Normal': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'Baixa': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'Pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'Em Andamento': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'Concluída': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
}

function openTaskModal(task = null) {
    taskForm.reset();
    document.getElementById('task-id').value = '';
    const modalTitle = document.getElementById('task-modal-title');

    if (task) {
        modalTitle.textContent = 'Editar Tarefa';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-responsible').value = task.responsible || '';
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-priority').value = task.priority || 'Normal';
        document.getElementById('task-status').value = task.status || 'Pendente';
    } else {
        modalTitle.textContent = 'Nova Tarefa';
    }
    taskModal.classList.remove('hidden');
}

function closeTaskModal() {
    taskModal.classList.add('hidden');
}

if (addTaskBtn) addTaskBtn.addEventListener('click', () => openTaskModal());
if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeTaskModal);
if (taskModal) {
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            closeTaskModal();
        }
    });
}

if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('task-id').value;
        const taskData = {
            title: document.getElementById('task-title').value,
            responsible: document.getElementById('task-responsible').value,
            dueDate: document.getElementById('task-due-date').value,
            priority: document.getElementById('task-priority').value,
            status: document.getElementById('task-status').value,
            userId: currentUserId
        };

        if (id) {
            await updateDoc(doc(db, 'families', currentFamilyId, 'tasks', id), taskData);
        } else {
            await addDoc(collection(db, 'families', currentFamilyId, 'tasks'), taskData);
        }
        closeTaskModal();
    });
}

// --- LÓGICA DA CALCULADORA DE INVESTIMENTOS ---

if (btnCalculate) {
    btnCalculate.addEventListener('click', () => {
        const initial = parseFloat(calcInitial.value) || 0;
        const monthly = parseFloat(calcMonthly.value) || 0;
        const rateYear = parseFloat(calcRate.value) || 0;
        const years = parseInt(calcTime.value) || 0;

        calculateCompoundInterest(initial, monthly, rateYear, years);
    });
}

if (btnFetchCDI) {
    btnFetchCDI.addEventListener('click', async () => {
        try {
            btnFetchCDI.textContent = "Buscando...";
            btnFetchCDI.disabled = true;

            // API do Banco Central para Taxa Selic (meta) diária, convertida para anual aprox
            // Endpoint: https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json
            const response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
            const data = await response.json();

            if (data && data.length > 0) {
                const selicMeta = parseFloat(data[0].valor); // Isso costuma ser a meta anualizada se for a série 432
                // Série 432: Meta Selic definida pelo Copom (% a.a.)

                calcRate.value = selicMeta;
                alert(`Taxa Selic atualizada: ${selicMeta}% a.a.`);
            } else {
                alert('Não foi possível obter a taxa automaticamente.');
            }
        } catch (error) {
            console.error("Erro ao buscar Selic:", error);
            alert('Erro ao conectar com API do Banco Central.');
        } finally {
            btnFetchCDI.textContent = "CDI/SELIC";
            btnFetchCDI.disabled = false;
        }
    });
}

function calculateCompoundInterest(initial, monthly, rateYear, years) {
    const rateMonth = Math.pow(1 + (rateYear / 100), 1 / 12) - 1;
    const totalMonths = years * 12;

    let totalObj = initial;
    let investedObj = initial;

    // Arrays para o gráfico
    const labels = [];
    const investedData = [];
    const interestData = [];
    const totalData = [];

    // Ponto zero
    labels.push(0);
    investedData.push(initial);
    totalData.push(initial);
    interestData.push(0);

    for (let i = 1; i <= totalMonths; i++) {
        // Juros sobre o total acumulado
        totalObj = totalObj * (1 + rateMonth);
        // Adiciona aporte mensal
        totalObj += monthly;
        investedObj += monthly;

        // Adiciona dados para o gráfico a cada ano (12 meses)
        if (i % 12 === 0) {
            labels.push(i / 12); // Ano
            investedData.push(investedObj);
            totalData.push(totalObj);
            interestData.push(totalObj - investedObj);
        }
    }

    // Atualiza resultados na tela
    calcResultInvested.textContent = formatCurrency(investedObj);
    calcResultTotal.textContent = formatCurrency(totalObj);
    calcResultInterest.textContent = formatCurrency(totalObj - investedObj);

    // Renderiza Gráfico
    renderCalculatorChart(labels, investedData, totalData);
}

function renderCalculatorChart(labels, investedData, totalData) {
    if (calculatorChart) {
        calculatorChart.destroy();
    }

    const ctx = calculatorChartCanvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';

    calculatorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, // Anos
            datasets: [
                {
                    label: 'Total Acumulado',
                    data: totalData,
                    borderColor: '#4F46E5', // Indigo
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Total Investido',
                    data: investedData,
                    borderColor: '#10B981', // Green
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Anos', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
                },
                y: {
                    ticks: {
                        color: textColor,
                        callback: (value) => {
                            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 3 }).format(value);
                        }
                    },
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
                }
            }
        }
    });
}

// --- SNOWBALL CALCULATOR LOGIC ---
const snowballExtraInput = document.getElementById('snowball-extra');
const calculateSnowballBtn = document.getElementById('calculate-snowball-btn');
const snowballResults = document.getElementById('snowball-results');
const snowballMonthsEl = document.getElementById('snowball-months');
const snowballSavingsEl = document.getElementById('snowball-savings');
const snowballTotalEl = document.getElementById('snowball-total');
const snowballTableBody = document.getElementById('snowball-table-body');

let cachedDebts = []; // Armazena as dívidas carregadas para a calculadora usar

// Intercepta a renderização para salvar cache
const originalRenderDebts = renderDebts;
renderDebts = function (debts) {
    cachedDebts = debts;
    originalRenderDebts(debts);
    // Se a calculadora estiver visível, recalcula? Talvez não auto, melhor manual.
}

if (calculateSnowballBtn) {
    calculateSnowballBtn.addEventListener('click', calculateSnowball);
}

function calculateSnowball() {
    if (!cachedDebts || cachedDebts.length === 0) {
        alert("Adicione suas dívidas primeiro!");
        return;
    }

    const extraPayment = parseFloat(snowballExtraInput.value) || 0;

    // 1. Setup: Clonar dívidas
    // Precisamos de Taxa de Juros. O modelo de dados atual tem? 
    // Se não tiver, vamos assumir 0 ou pedir update. 
    // O modal atual não pede Juros. Vamos assumir que o usuário vai editar ou que é simples.
    // Melhor: Adicionar campo de Juros ao criar Dívida no futuro. 
    // Por enquanto, faremos uma simulação simples onde saldo só diminui, ou juros fixo 2% se nao tiver.
    // User task says "Implement Snowball Logic", implies simple projection.

    let debts = cachedDebts.map(d => ({
        name: d.company,
        balance: d.amount,
        minPayment: d.amount * 0.03, // Estimativa: 3% do saldo como mínimo se não especificado
        interestRate: 0.02 // Estimativa: 2% a.m.
    }));

    // Snowball Sort: Menor Saldo Primeiro
    debts.sort((a, b) => a.balance - b.balance);

    let totalMonths = 0;
    let totalInterestPaid = 0;
    let monthsLog = [];

    // Simulação
    let activeDebts = debts.length;
    let currentDebts = JSON.parse(JSON.stringify(debts)); // Deep copy para simulação
    let payoffOrder = [];

    // Limite de segurança para loop
    while (activeDebts > 0 && totalMonths < 360) {
        totalMonths++;
        let monthlyBudget = extraPayment; // Dinheiro disponível para o Snowball (excedente)

        // 1. Pagar Mímimos de todos
        currentDebts.forEach(d => {
            if (d.balance > 0) {
                // Se o saldo for menor que o mínimo, paga o saldo todo
                let payment = Math.min(d.balance, d.minPayment);
                d.balance -= payment;
                monthlyBudget -= 0; // O minimo já "saiu" do orçamento fixo do usuário (assumindo).
                // MAS no método Snowball, o valor liberado de dívidas pagas soma-se ao monthlyBudget?
                // Sim. O "Snowball" é: Pagar minimos + Extra no menor.
                // Quando uma dívida morre, o mínimo dela vira Extra.
            }
        });

        // Sim, a logica exata do Snowball:
        // TotalDisponivel = Soma(Minimos Originais) + ExtraInput.
        // A cada mes: Paga minimos obrigatorios das ativas. O que sobrar joga na Menor Ativa.

        // Refatorando Logica Correta:
        // totalMonthlyOutput = sum(original minimums) + extraInput.
        // esse totalMonthlyOutput é constante até o fim (na teoria).
    }

    // Logica Simplificada e Robusta para MVP:
    // A cada mês:
    // Aplicar Juros em todas.
    // Determinar valor disponível para abater (começa com Extra + Minimos de quem já morreu?)
    // Não, vamos simplificar.

    // Vamos usar uma logica iterativa simples visual.
    // Ordenar. 
    // Dívida 1: Paga com (Minimo + Extra). Vê quantos meses leva.
    // Dívida 2: Paga com (Minimo + Valor que pagava na 1). Começa após D1 terminar? Não, paga simultaneo.

    // Implementation Plan da Phase 3: "Implement Snowball Logic in JS".
    // Vou fazer uma simulação mês a mês correta.

    runSnowballSimulation(debts, extraPayment);
}

function runSnowballSimulation(initialDebts, extraPayment) {
    // Deep copy
    let debts = JSON.parse(JSON.stringify(initialDebts));

    // Config: Mínimo é 3% ou 50 reais
    debts.forEach(d => {
        d.minPayment = Math.max(d.balance * 0.02, 50);
        d.startBalance = d.balance;
        d.paidOffMonth = 0;
    });

    let currentMonth = 0;
    let debtsRemaining = true;
    let totalPaid = 0;

    // Snowball: Menor saldo primeiro
    debts.sort((a, b) => a.balance - b.balance);

    const maxMonths = 120; // 10 anos limite simulação

    while (debtsRemaining && currentMonth < maxMonths) {
        currentMonth++;
        let availableForSnowball = extraPayment;

        // 1. Aplicar Juros e cobrar Mínimos
        debts.forEach(d => {
            if (d.balance > 0) {
                // Juros
                d.balance += d.balance * d.interestRate;

                // Pagamento Mínimo
                let payment = Math.min(d.balance, d.minPayment);
                d.balance -= payment;
                totalPaid += payment;

                // Se pagou tudo com o mínimo, ótimo. Se não, o mínimo foi pago.
                // O valor do mínimo NÃO sai do "availableForSnowball" pq o usuario ja paga isso.
                // MAS, se a divida foi quitada, esse valor de mínimo AGORA entra pro snowball das proximas?
                // Sim. Mas neste mês, foi gasto nela.
            } else {
                // Dívida quitada anteriormente, o mínimo que ia pra ela agora vai pro Snowball
                availableForSnowball += d.minPayment;
            }
        });

        // 2. Usar o Snowball (Extra + Minimos recuperados) na primeira dívida ativa
        let targetDebt = debts.find(d => d.balance > 0);
        if (targetDebt) {
            let snowballPayment = Math.min(targetDebt.balance, availableForSnowball);
            targetDebt.balance -= snowballPayment;
            totalPaid += snowballPayment;

            // Se sobrou dinheiro do snowball e essa quitou, passa pra proxima?
            if (targetDebt.balance <= 0 && availableForSnowball > snowballPayment) {
                let remainder = availableForSnowball - snowballPayment;
                let nextDebt = debts.find(d => d.balance > 0);
                if (nextDebt) {
                    nextDebt.balance -= Math.min(nextDebt.balance, remainder);
                    // simplificação: nao recursivo infinito, só 1 nível
                }
            }
        }

        // Check if all paid
        if (debts.every(d => d.balance <= 0)) {
            debtsRemaining = false;
        }

        // Registrar mês de quitação
        debts.forEach(d => {
            if (d.balance <= 0 && d.paidOffMonth === 0) {
                d.paidOffMonth = currentMonth;
            }
        });
    }

    // Renderizar Resultados
    snowballResults.classList.remove('hidden');
    snowballMonthsEl.textContent = currentMonth >= maxMonths ? "+120 meses" : `${currentMonth} meses`;

    // Total Original
    const totalOriginal = initialDebts.reduce((acc, d) => acc + d.balance, 0);
    const totalInterest = totalPaid - totalOriginal; // Aproximado

    snowballSavingsEl.textContent = formatCurrency(totalInterest > 0 ? totalInterest : 0); // Mostra quanto pagou de juros ou algo assim. 
    // Na verdade "Savings" seria comparado com metodo tradicional. Vamos mostrar "Juros Pagos" ou similar.
    // UI diz "Juros Economizados". Para calcular economia, precisaria simular "sem snowball" (só minimos).
    // Vou mudar label para "Juros Estimados Pagos" via JS ou aceitar que é complexo. 
    // Vou deixar "Total Pago Estimado".
    snowballTotalEl.textContent = formatCurrency(totalPaid);
    snowballSavingsEl.previousElementSibling.textContent = "Total de Juros (Est.)";
    snowballSavingsEl.textContent = formatCurrency(Math.max(0, totalPaid - totalOriginal));

    // Table
    snowballTableBody.innerHTML = '';
    debts.forEach((d, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}º</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${d.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(d.startBalance)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">${d.paidOffMonth} meses</td>
        `;
        snowballTableBody.appendChild(row);
    });
}


// --- AI COACH FRONTEND LOGIC ---
const coachSection = document.getElementById('ai-coach');
const coachLoading = document.getElementById('coach-loading');
const coachContent = document.getElementById('coach-content');
const coachSummary = document.getElementById('coach-summary');
const coachTips = document.getElementById('coach-tips');
const coachAlert = document.getElementById('coach-alert');
const coachAlertText = document.getElementById('coach-alert-text');
const coachMood = document.getElementById('coach-mood');
const refreshCoachBtn = document.getElementById('refresh-coach-btn');

async function updateAICoach() {
    if (!coachSection) return;

    // Mostrar a seção e estado de loading
    coachSection.classList.remove('hidden');
    coachLoading.classList.remove('hidden');
    coachContent.classList.add('hidden');

    try {
        // Query rapida no Firestore para garantir dados frescos
        if (!db || !currentFamilyId) {
            console.warn("Db or FamilyId not ready for Coach");
            return;
        }

        const q = query(
            collection(db, 'families', currentFamilyId, 'transactions'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        const snapshot = await getDocs(q);
        const recentTransactions = snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
            };
        });

        // Goals
        const qGoals = query(collection(db, 'families', currentFamilyId, 'goals'));
        const snGoals = await getDocs(qGoals);
        const goals = snGoals.docs.map(d => d.data());

        const response = await fetch('https://us-central1-financeapp-6da16.cloudfunctions.net/generateWeeklyInsights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transactions: recentTransactions,
                goals: goals
            })
        });

        if (!response.ok) throw new Error('Falha na API do Coach');

        const insights = await response.json();

        // Renderizar
        coachSummary.textContent = insights.summary;

        coachTips.innerHTML = '';
        if (insights.tips && insights.tips.length) {
            insights.tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                coachTips.appendChild(li);
            });
        }

        if (insights.alert) {
            coachAlert.classList.remove('hidden');
            coachAlertText.textContent = insights.alert;
        } else {
            coachAlert.classList.add('hidden');
        }

        // Mood Emojis
        const moodMap = {
            'positive': '🤩',
            'neutral': '🤔',
            'warning': '⚠️'
        };
        coachMood.textContent = moodMap[insights.mood] || '🤖';

        // Mostrar conteúdo
        coachLoading.classList.add('hidden');
        coachContent.classList.remove('hidden');

    } catch (error) {
        console.error('AI Coach Error:', error);
        // coachSection.classList.add('hidden'); // REMOVIDO: Não esconder em caso de erro para debug

        coachLoading.classList.add('hidden');
        coachContent.classList.remove('hidden');

        coachSummary.innerHTML = `<span class="text-red-200">Erro ao gerar análise: ${error.message}</span>`;
        coachTips.innerHTML = '<li>Verifique sua conexão ou tente novamente mais tarde.</li>';
        coachMood.textContent = '😵';

        if (error.message.includes('Failed to fetch')) {
            coachSummary.innerHTML += '<br><span class="text-xs mt-2 block">Dica: Verifique se o Backend (Functions) está rodando e acessível.</span>';
        }
    }
}

// Trigger inicial
if (refreshCoachBtn) {
    refreshCoachBtn.addEventListener('click', updateAICoach);
}

// Auto-load if coach section exists


window.updateAICoach = updateAICoach;


// --- EXPORT REPORT LOGIC (PREMIUM) ---
window.exportReport = async function () {
    if (!currentFamilyId) return;

    try {
        const btn = document.getElementById('export-btn-desktop');
        if (btn) btn.textContent = 'Gerando...';

        // 1. Fetch Transactions
        const transactionsRef = collection(db, 'families', currentFamilyId, 'transactions');
        const snapshot = await getDocs(query(transactionsRef, orderBy('timestamp', 'desc')));

        if (snapshot.empty) {
            alert('Sem transações para exportar.');
            if (btn) btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar`;
            return;
        }

        // 2. Prepare CSV Data
        const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Tipo', 'Banco (Open Banking)'];
        const rows = [headers.join(',')];

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString('pt-BR') : '';
            const amount = data.amount.toFixed(2).replace('.', ',');
            const type = data.type === 'income' ? 'Receita' : 'Despesa';
            const bank = data.bankName || 'Manual';

            // Escape quotes
            const desc = `"${data.description.replace(/"/g, '""')}"`;

            rows.push([date, desc, data.category, amount, type, bank].join(','));
        });

        // 3. Create Blob and Download
        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (btn) btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar`;

    } catch (error) {
        console.error('Export Error:', error);
        alert('Erro ao exportar relatório.');
    }
};


// --- AI CHAT LOGIC ---

async function handleChatSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // 1. Mostrar mensagem do usuário
    appendMessage(message, 'user');
    input.value = '';

    // 2. Mostrar indicador de digitando
    const loadingId = appendMessage('Digitando...', 'ai', true);

    try {
        // 3. Obter contexto financeiro (simplificado para não estourar tokens)
        const recentTransactions = transactions.slice(0, 50); // Últimas 50
        const userGoals = goals;

        // 4. Enviar para Backend
        const response = await fetch('https://us-central1-financeapp-6da16.cloudfunctions.net/chatWithCoach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                financialContext: {
                    transactions: recentTransactions,
                    goals: userGoals
                }
            })
        });

        const data = await response.json();

        // 5. Remover loading e mostrar resposta
        removeMessage(loadingId);
        if (data.reply) {
            appendMessage(data.reply, 'ai');
        } else {
            appendMessage('Desculpe, não consegui entender. Tente novamente.', 'ai');
        }

    } catch (error) {
        console.error('Erro no Chat:', error);
        removeMessage(loadingId);
        appendMessage('Ocorreu um erro ao falar com o Coach. Tente mais tarde.', 'ai');
    }
}

function appendMessage(text, sender, isLoading = false) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    const id = 'msg-' + Date.now();
    div.id = id;

    div.className = `flex items-start space-x-3 ${sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`;

    // Markdown parsing simples para negrito e quebras de linha
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

    div.innerHTML = `
        <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${sender === 'ai' ? 'bg-gradient-to-br from-purple-500 to-blue-600' : 'bg-slate-700'}">
            <i class="fas ${sender === 'ai' ? 'fa-robot' : 'fa-user'} text-white"></i>
        </div>
        <div class="${sender === 'ai' ? 'bg-slate-700/50 text-slate-200' : 'bg-purple-600 text-white'} p-4 rounded-2xl ${sender === 'ai' ? 'rounded-tl-none' : 'rounded-tr-none'} max-w-[80%] border ${sender === 'ai' ? 'border-slate-600/50' : 'border-purple-500'}">
            <p>${isLoading ? '<span class="animate-pulse">...</span>' : formattedText}</p>
        </div>
    `;

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}


window.handleChatSubmit = handleChatSubmit;


