// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, writeBatch, getDoc, where, getDocs, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- SELETORES DE ELEMENTOS DO DOM ---
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const showRegisterBtn = document.getElementById('show-register-view');
const showLoginBtn = document.getElementById('show-login-view');
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

const categorySelect = document.getElementById('category');
const investmentOption = document.getElementById('investment-option');
const isInvestmentCheckbox = document.getElementById('is-investment');
const transactionTypeRadios = document.querySelectorAll('input[name="type"]');

let currentUserId = null;
let currentFamilyId = null;
let unsubscribeFromTransactions = null;
let unsubscribeFromGoals = null;
let unsubscribeFromInvestments = null;
let unsubscribeFromBudgets = null;
let unsubscribeFromCategories = null;
let unsubscribeFromFamily = null;
let unsubscribeFromDebts = null;
let unsubscribeFromTasks = null;

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

themeToggleBtn.addEventListener('click', () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

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
    colorOptionsContainer.appendChild(colorCircle);
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

// --- LÓGICA DE NAVEGAÇÃO E SIDEBAR ---
function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
}

menuBtn.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

const navLinks = document.querySelectorAll('aside nav a, aside nav button');
function updateActiveLink(activeLink) {
    navLinks.forEach(link => link.classList.remove('sidebar-active'));
    activeLink.classList.add('sidebar-active');
}

const showTransactions = (e) => {
    e.preventDefault();
    investmentsView.classList.add('hidden');
    budgetsView.classList.add('hidden');
    settingsView.classList.add('hidden');
    goalsView.classList.add('hidden');
    debtsView.classList.add('hidden');
    tasksView.classList.add('hidden');
    transactionsSection.classList.remove('hidden');
    summary.classList.remove('hidden');
    charts.classList.remove('hidden');
    updateActiveLink(showTransactionsViewBtn);
    closeSidebar();
};

const showInvestments = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    budgetsView.classList.add('hidden');
    settingsView.classList.add('hidden');
    goalsView.classList.add('hidden');
    debtsView.classList.add('hidden');
    tasksView.classList.add('hidden');
    investmentsView.classList.remove('hidden');
    updateActiveLink(showInvestmentsViewBtn);
    closeSidebar();
};

const showBudgets = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    investmentsView.classList.add('hidden');
    settingsView.classList.add('hidden');
    goalsView.classList.add('hidden');
    debtsView.classList.add('hidden');
    tasksView.classList.add('hidden');
    budgetsView.classList.remove('hidden');
    updateActiveLink(showBudgetsViewBtn);
    closeSidebar();
};

const showSettings = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    investmentsView.classList.add('hidden');
    budgetsView.classList.add('hidden');
    goalsView.classList.add('hidden');
    debtsView.classList.add('hidden');
    tasksView.classList.add('hidden');
    settingsView.classList.remove('hidden');
    updateActiveLink(showSettingsViewBtn);
    closeSidebar();
};

const showGoals = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    investmentsView.classList.add('hidden');
    budgetsView.classList.add('hidden');
    settingsView.classList.add('hidden');
    debtsView.classList.add('hidden');
    tasksView.classList.add('hidden');
    goalsView.classList.remove('hidden');
    updateActiveLink(showGoalsViewBtn);
    closeSidebar();
};

const showDebts = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    investmentsView.classList.add('hidden');
    budgetsView.classList.add('hidden');
    settingsView.classList.add('hidden');
    goalsView.classList.add('hidden');
    tasksView.classList.add('hidden');
    debtsView.classList.remove('hidden');
    updateActiveLink(showDebtsViewBtn);
    closeSidebar();
};

const showTasks = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    investmentsView.classList.add('hidden');
    budgetsView.classList.add('hidden');
    settingsView.classList.add('hidden');
    goalsView.classList.add('hidden');
    debtsView.classList.add('hidden');
    tasksView.classList.remove('hidden');
    updateActiveLink(showTasksViewBtn);
    closeSidebar();
};

showTransactionsViewBtn.addEventListener('click', showTransactions);
showInvestmentsViewBtn.addEventListener('click', showInvestments);
showBudgetsViewBtn.addEventListener('click', showBudgets);
showSettingsViewBtn.addEventListener('click', showSettings);
showGoalsViewBtn.addEventListener('click', showGoals);
showDebtsViewBtn.addEventListener('click', showDebts);
showTasksViewBtn.addEventListener('click', showTasks);

// --- LÓGICA DE AUTENTICAÇÃO ---
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
});

onAuthStateChanged(auth, async user => {
    if (user) {
        currentUserId = user.uid;
        await setupUserFamily(user);
        loginView.classList.add('hidden');
        registerView.classList.add('hidden');
        appView.classList.remove('hidden');
        setupRealtimeListeners(currentFamilyId);
    } else {
        currentUserId = null;
        currentFamilyId = null;
        registerView.classList.add('hidden');
        appView.classList.add('hidden');
        loginView.classList.remove('hidden');
        if (unsubscribeFromTransactions) unsubscribeFromTransactions();
        if (unsubscribeFromGoals) unsubscribeFromGoals();
        if (unsubscribeFromInvestments) unsubscribeFromInvestments();
        if (unsubscribeFromBudgets) unsubscribeFromBudgets();
        if (unsubscribeFromCategories) unsubscribeFromCategories();
        if (unsubscribeFromFamily) unsubscribeFromFamily();
        if (unsubscribeFromDebts) unsubscribeFromDebts();
        if (unsubscribeFromTasks) unsubscribeFromTasks();
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
        }
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    loginError.textContent = '';
    loginError.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Erro de login:", error.code);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            loginError.textContent = "Email ou senha inválidos.";
        } else {
            loginError.textContent = "Ocorreu um erro. Tente novamente.";
        }
        loginError.classList.remove('hidden');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    registerError.textContent = '';
    registerError.classList.add('hidden');

    if (password.length < 6) {
        registerError.textContent = "A senha deve ter no mínimo 6 caracteres.";
        registerError.classList.remove('hidden');
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Erro de cadastro:", error.code);
        if (error.code === 'auth/email-already-in-use') {
            registerError.textContent = "Este email já está em uso.";
        } else if (error.code === 'auth/invalid-email') {
            registerError.textContent = "O email fornecido é inválido.";
        } else {
            registerError.textContent = "Ocorreu um erro ao criar a conta.";
        }
        registerError.classList.remove('hidden');
    }
});

logoutButton.addEventListener('click', () => signOut(auth));

// --- LÓGICA DO FIRESTORE E RENDERIZAÇÃO ---
function setupRealtimeListeners(familyId) {
    if (!familyId) return;

    const transactionsCol = collection(db, 'families', familyId, 'transactions');
    unsubscribeFromTransactions = onSnapshot(query(transactionsCol), (snapshot) => {
        const transactions = [];
        snapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }));
        transactions.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
        renderTransactions(transactions);
        updateSummary(transactions);
    });

    const goalsCol = collection(db, 'families', familyId, 'goals');
    unsubscribeFromGoals = onSnapshot(query(goalsCol), (snapshot) => {
        const goals = [];
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
    unsubscribeFromFamily = onSnapshot(familyRef, async (doc) => {
        const family = doc.data();
        if (family && family.members) {
            const memberPromises = family.members.map(id => getDoc(doc(db, 'users', id)));
            const memberDocs = await Promise.all(memberPromises);
            const members = memberDocs.map(d => d.data());
            renderFamilyMembers(members);
        }
    });
}

function renderBudgets(budgets, transactions) {
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
    familyMembersListSettings.innerHTML = '';
    members.forEach(member => {
        const el = document.createElement('div');
        el.className = 'bg-gray-50 dark:bg-gray-700 p-3 rounded-md';
        el.textContent = member.email;
        familyMembersListSettings.appendChild(el);
    });
}

function renderGoals(goals) {
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
    incomeCategoriesListSettings.innerHTML = '';
    expenseCategoriesListSettings.innerHTML = '';
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
    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpenseEl.textContent = formatCurrency(totalExpense);
    balanceEl.textContent = formatCurrency(totalIncome - totalExpense);
    renderExpenseChart(transactions);
    renderIncomeExpenseChart(transactions);
}

function renderTransactions(transactions) {
    transactionListEl.innerHTML = '';
    if (transactions.length === 0) {
        transactionListEl.appendChild(noTransactionsEl);
        noTransactionsEl.classList.remove('hidden');
    } else {
        noTransactionsEl.classList.add('hidden');
        transactions.forEach(t => {
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
    const ctx = document.getElementById('income-expense-chart').getContext('2d');
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last6Months.push({
            label: d.toLocaleString('pt-BR', { month: 'long' }),
            month: d.getMonth(),
            year: d.getFullYear(),
            income: 0,
            expense: 0
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
            } else {
                monthData.expense += t.amount;
            }
        }
    });

    const labels = last6Months.map(m => m.label);
    const incomeData = last6Months.map(m => m.income);
    const expenseData = last6Months.map(m => m.expense);

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
    const ctx = document.getElementById('expense-chart').getContext('2d');
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
addIncomeCategoryFormSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-income-category-settings');
    const newCategoryName = input.value.trim();
    if (newCategoryName && currentFamilyId) {
        await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'income' });
        input.value = '';
    }
});

addExpenseCategoryFormSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-expense-category-settings');
    const newCategoryName = input.value.trim();
    if (newCategoryName && currentFamilyId) {
        await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'expense' });
        input.value = '';
    }
});

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
addTransactionBtnMobile.addEventListener('click', () => openTransactionModal());
addTransactionBtnDesktop.addEventListener('click', () => openTransactionModal());
cancelBtn.addEventListener('click', closeTransactionModal);
modal.addEventListener('click', (e) => {
    // Fecha o modal se o clique for no overlay (fundo)
    if (e.target === modal) {
        closeTransactionModal();
    }
});
transactionTypeRadios.forEach(radio => {
    radio.addEventListener('change', toggleInvestmentOption);
});

// Lógica de submissão do formulário de transação
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = transactionIdInput.value;
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const category = categorySelect.value;
    const isInvestment = isInvestmentCheckbox.checked;

    if (!description || isNaN(amount) || !date || !category) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const transactionData = {
        description,
        amount,
        timestamp: Timestamp.fromDate(new Date(date)),
        type,
        category,
        isInvestment,
        userId: currentUserId
    };

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

        closeTransactionModal();
    } catch (error) {
        console.error("Erro ao salvar transação: ", error);
        alert("Ocorreu um erro ao salvar a transação. Tente novamente.");
    }
});

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

addGoalBtn.addEventListener('click', () => openGoalModal());
cancelGoalBtn.addEventListener('click', closeGoalModal);
goalModal.addEventListener('click', (e) => {
    if (e.target === goalModal) {
        closeGoalModal();
    }
});

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

addDebtBtn.addEventListener('click', () => openDebtModal());
cancelDebtBtn.addEventListener('click', closeDebtModal);
debtModal.addEventListener('click', (e) => {
    if (e.target === debtModal) {
        closeDebtModal();
    }
});

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

function renderTasks(tasks) {
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
        document.getElementById('task-client').value = task.client || '';
    } else {
        modalTitle.textContent = 'Nova Tarefa';
    }
    taskModal.classList.remove('hidden');
}

function closeTaskModal() {
    taskModal.classList.add('hidden');
}

addTaskBtn.addEventListener('click', () => openTaskModal());
cancelTaskBtn.addEventListener('click', closeTaskModal);
taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        closeTaskModal();
    }
});

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        responsible: document.getElementById('task-responsible').value,
        dueDate: document.getElementById('task-due-date').value,
        priority: document.getElementById('task-priority').value,
        status: document.getElementById('task-status').value,
        client: document.getElementById('task-client').value,
        userId: currentUserId
    };

    if (id) {
        await updateDoc(doc(db, 'families', currentFamilyId, 'tasks', id), taskData);
    } else {
        await addDoc(collection(db, 'families', currentFamilyId, 'tasks'), taskData);
    }
    closeTaskModal();
});

// (O código para os outros modais viria aqui, se necessário)
