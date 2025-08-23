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
const addTransactionBtn = document.getElementById('add-transaction-btn');
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
const goals = document.getElementById('goals');
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const incomeCategoriesList = document.getElementById('income-categories-list');
const expenseCategoriesList = document.getElementById('expense-categories-list');
const addIncomeCategoryForm = document.getElementById('add-income-category-form');
const addExpenseCategoryForm = document.getElementById('add-expense-category-form');
const categorySelect = document.getElementById('category');
const familyMembersList = document.getElementById('family-members-list');
const inviteMemberForm = document.getElementById('invite-member-form');
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
let incomeCategories = [];
let expenseCategories = [];

// --- LÓGICA DE APARÊNCIA ---
// Carregar Tema e Cor Salvos ao iniciar o app
document.addEventListener('DOMContentLoaded', () => {
    // Carregar Tema
    if (localStorage.getItem('theme') === 'dark' || 
       (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    // Carregar Cor
    const savedColor = localStorage.getItem('mainColor') || '#4F46E5'; // Cor padrão
    document.documentElement.style.setProperty('--cor-principal', savedColor);
});


// --- LÓGICA DE AUTENTICAÇÃO E NAVEGAÇÃO DE VIEW ---

// --- LÓGICA DA SIDEBAR ---
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
    navLinks.forEach(link => {
        link.classList.remove('sidebar-active');
    });
    activeLink.classList.add('sidebar-active');
}

const showTransactions = (e) => {
    e.preventDefault();
    investmentsView.classList.add('hidden');
    budgetsView.classList.add('hidden');
    transactionsSection.classList.remove('hidden');
    summary.classList.remove('hidden');
    charts.classList.remove('hidden');
    goals.classList.remove('hidden');
    updateActiveLink(showTransactionsViewBtn);
    closeSidebar();
};

const showInvestments = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    goals.classList.add('hidden');
    budgetsView.classList.add('hidden');
    investmentsView.classList.remove('hidden');
    updateActiveLink(showInvestmentsViewBtn);
    closeSidebar();
};

const showBudgets = (e) => {
    e.preventDefault();
    transactionsSection.classList.add('hidden');
    summary.classList.add('hidden');
    charts.classList.add('hidden');
    goals.classList.add('hidden');
    investmentsView.classList.add('hidden');
    budgetsView.classList.remove('hidden');
    updateActiveLink(showBudgetsViewBtn);
    closeSidebar();
};

showTransactionsViewBtn.addEventListener('click', showTransactions);
showInvestmentsViewBtn.addEventListener('click', showInvestments);
showBudgetsViewBtn.addEventListener('click', showBudgets);


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
            
            // Adiciona o novo membro ao array de membros da família
            const familyRef = doc(db, 'families', currentFamilyId);
            await updateDoc(familyRef, {
                members: arrayUnion(user.uid)
            });

            // Associa o ID da família ao novo usuário
            await setDoc(userRef, { familyId: currentFamilyId, email: user.email }, { merge: true });
            
            // Deleta o convite para que não seja usado novamente
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

    // Listener para transações
    const transactionsCol = collection(db, 'families', familyId, 'transactions');
    const qTransactions = query(transactionsCol);
    unsubscribeFromTransactions = onSnapshot(qTransactions, (snapshot) => {
        const transactions = [];
        snapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }));
        transactions.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
        renderTransactions(transactions);
        updateSummary(transactions);
    });

    // Listener para metas
    const goalsCol = collection(db, 'families', familyId, 'goals');
    const qGoals = query(goalsCol);
    unsubscribeFromGoals = onSnapshot(qGoals, (snapshot) => {
        const goals = [];
        snapshot.forEach(doc => goals.push({ id: doc.id, ...doc.data() }));
        renderGoals(goals);
    });

    // Listener para investimentos
    const investmentsCol = collection(db, 'families', familyId, 'investments');
    const qInvestments = query(investmentsCol);
    unsubscribeFromInvestments = onSnapshot(qInvestments, (snapshot) => {
        const investments = [];
        snapshot.forEach(doc => investments.push({ id: doc.id, ...doc.data() }));
        renderInvestments(investments);
    });

    // Listener para orçamentos
    const budgetsCol = collection(db, 'families', familyId, 'budgets');
    const qBudgets = query(budgetsCol);
    unsubscribeFromBudgets = onSnapshot(qBudgets, (snapshot) => {
        const budgets = [];
        snapshot.forEach(doc => budgets.push({ id: doc.id, ...doc.data() }));
        // Precisamos das transações para renderizar os orçamentos, então chamamos a partir daqui
        const transactionsCol = collection(db, 'families', familyId, 'transactions');
        getDocs(query(transactionsCol)).then(transactionsSnapshot => {
            const transactions = [];
            transactionsSnapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }));
            renderBudgets(budgets, transactions);
        });
    });

    // Listener para categorias
    const categoriesCol = collection(db, 'families', familyId, 'categories');
    const qCategories = query(categoriesCol);
    unsubscribeFromCategories = onSnapshot(qCategories, (snapshot) => {
        incomeCategories = [];
        expenseCategories = [];
        snapshot.forEach(doc => {
            const category = { id: doc.id, ...doc.data() };
            if (category.type === 'income') {
                incomeCategories.push(category);
            } else {
                expenseCategories.push(category);
            }
        });
        renderCategories();
        updateCategoryDropdown();
    });

    // Listener para família
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
        budgetListEl.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhum orçamento definido para este mês.</p>';
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtra transações de despesa do mês corrente
    const currentMonthExpenses = transactions.filter(t => {
        const date = t.timestamp.toDate();
        return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Agrupa os gastos por categoria
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
        if (percentage > 75 && percentage <= 100) {
            progressBarColor = 'bg-yellow-500';
        } else if (percentage > 100) {
            progressBarColor = 'bg-red-600';
        }

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
                ${remaining >= 0 ? `${formatCurrency(remaining)} restantes` : `${formatCurrency(Math.abs(remaining))} acima do limite`}
            </p>
        `;
        budgetListEl.appendChild(el);
    });
}

function renderFamilyMembers(members) {
    familyMembersList.innerHTML = '';
    members.forEach(member => {
        const el = document.createElement('div');
        el.textContent = member.email;
        familyMembersList.appendChild(el);
    });
}

function renderGoals(goals) {
    goalListEl.innerHTML = '';
    if (goals.length === 0) {
        goalListEl.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Nenhuma meta definida.</p>';
        return;
    }

    goals.forEach(goal => {
        const percentage = (goal.currentAmount / goal.targetAmount) * 100;
        const el = document.createElement('div');
        el.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';
        el.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="font-semibold">${goal.name}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
        `;
        goalListEl.appendChild(el);
    });
}

function renderCategories() {
    incomeCategoriesList.innerHTML = '';
    expenseCategoriesList.innerHTML = '';

    incomeCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center';
        el.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" class="delete-category-btn text-red-500">X</button>`;
        incomeCategoriesList.appendChild(el);
    });

    expenseCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center';
        el.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" class="delete-category-btn text-red-500">X</button>`;
        expenseCategoriesList.appendChild(el);
    });

    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            await deleteDoc(doc(db, 'families', currentFamilyId, 'categories', id));
        });
    });
}

function updateCategoryDropdown() {
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
                    <div class="flex justify-between items-start">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 items-center flex-grow">
                            <p class="font-semibold col-span-2 md:col-span-1">${asset.name}</p>
                            <div class="text-sm">
                                <p class="text-gray-500 dark:text-gray-400">Quantidade</p>
                                <p>${asset.quantity}</p>
                            </div>
                            <div class="text-sm">
                                <p class="text-gray-500 dark:text-gray-400">Preço Médio</p>
                                <p>${formatCurrency(asset.averagePrice)}</p>
                            </div>
                            <div class="text-sm">
                                <p class="text-gray-500 dark:text-gray-400">Valor Atual</p>
                                <p>${formatCurrency(currentValue)}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2 ml-4">
                            <button data-id="${asset.id}" class="edit-investment-btn p-1 text-gray-500 hover:text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                            </button>
                            <button data-id="${asset.id}" class="delete-investment-btn p-1 text-gray-500 hover:text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                    <div class="mt-2 text-right">
                        <span class="text-sm ${profitLossColor}">${formatCurrency(profitLoss)} (${investedValue > 0 ? ((profitLoss / investedValue) * 100).toFixed(2) : 0}%)</span>
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
    // Apenas despesas que NÃO são investimentos
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
            el.className = `bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center justify-between border-l-4 ${borderColor}`;
            
            let investmentBadge = '';
            if (isInvestment) {
                investmentBadge = `<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full ml-2">Investimento</span>`;
            }

            el.innerHTML = `
                <div class="flex-1">
                    <p class="font-semibold">${t.description}</p>
                    <div class="flex items-center mt-1">
                        <span class="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">${t.category || 'Sem Categoria'}</span>
                        ${investmentBadge}
                        <p class="text-xs text-gray-500 dark:text-gray-400 ml-3">${t.timestamp ? t.timestamp.toDate().toLocaleDateString('pt-BR') : 'Data pendente'}</p>
                    </div>
                </div>
                <div class="flex items-center">
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
        // Por enquanto, apenas destruímos o gráfico antigo.
    }
}

// --- LÓGICA DE DELETAR E EDITAR INVESTIMENTOS E TRANSAÇÕES ---
async function deleteInvestment(id) {
    if (!currentFamilyId) return;
    try {
        // Adicionalmente, verificar se este investimento veio de uma transação
        // e talvez desmarcar a transação. Por enquanto, a exclusão é direta.
        const investmentRef = doc(db, 'families', currentFamilyId, 'investments', id);
        await deleteDoc(investmentRef);
    } catch (error) {
        console.error("Erro ao excluir investimento:", error);
        alert("Ocorreu um erro ao excluir o investimento.");
    }
}

async function deleteTransaction(id) {
    if (!currentFamilyId) return;
    try {
        const transactionRef = doc(db, 'families', currentFamilyId, 'transactions', id);
        await deleteDoc(transactionRef);
    } catch (error) {
        console.error("Erro ao excluir transação:", error);
    }
}

function openModalForEdit(transaction) {
    modalTitle.textContent = "Editar Transação";
    transactionIdInput.value = transaction.id;
    transactionForm.description.value = transaction.description;
    transactionForm.amount.value = transaction.amount;
    transactionForm.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
    transactionForm.category.value = transaction.category || 'outros';
    // Converte o timestamp do Firebase para o formato YYYY-MM-DD
    transactionForm.date.value = transaction.timestamp ? transaction.timestamp.toDate().toISOString().split('T')[0] : '';
    openModal();
}

// --- LÓGICA DO MODAL ---
function openModal() {
    modalTitle.textContent = "Nova Transação";
    transactionIdInput.value = '';
    // Define a data atual como padrão no formulário
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    modal.classList.remove('hidden');
    setTimeout(() => modalContent.classList.add('modal-enter-active'), 10);
}

function closeModal() {
    modalContent.classList.remove('modal-enter-active');
    modalContent.classList.add('modal-leave-active');
    setTimeout(() => {
        modal.classList.add('hidden');
        modalContent.classList.remove('modal-leave-active');
        transactionForm.reset();
    }, 200);
}

addTransactionBtn.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => e.target === modal && closeModal());

// --- LÓGICA DO MODAL DE METAS ---
function openGoalModal(goal = null) {
    goalForm.reset();
    if (goal) {
        document.getElementById('goal-modal-title').textContent = 'Editar Meta';
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.targetAmount;
        document.getElementById('goal-current').value = goal.currentAmount;
    } else {
        document.getElementById('goal-modal-title').textContent = 'Nova Meta';
    }
    goalModal.classList.remove('hidden');
}

function closeGoalModal() {
    goalModal.classList.add('hidden');
}

addGoalBtn.addEventListener('click', () => openGoalModal());
cancelGoalBtn.addEventListener('click', closeGoalModal);
goalModal.addEventListener('click', (e) => e.target === goalModal && closeGoalModal());

// --- LÓGICA DO MODAL DE ORÇAMENTO ---
function openBudgetModal() {
    budgetForm.reset();
    const budgetCategorySelect = document.getElementById('budget-category');
    budgetCategorySelect.innerHTML = '';
    expenseCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name.toLowerCase();
        option.textContent = cat.name;
        budgetCategorySelect.appendChild(option);
    });
    budgetModal.classList.remove('hidden');
}

function closeBudgetModal() {
    budgetModal.classList.add('hidden');
}

addBudgetBtn.addEventListener('click', openBudgetModal);
cancelBudgetBtn.addEventListener('click', closeBudgetModal);
budgetModal.addEventListener('click', (e) => e.target === budgetModal && closeBudgetModal());

budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFamilyId) return;

    const category = document.getElementById('budget-category').value;
    const limit = parseFloat(document.getElementById('budget-limit').value);

    if (!category || isNaN(limit) || limit < 0) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    try {
        // Usamos o nome da categoria como ID do documento para garantir um orçamento por categoria
        const budgetRef = doc(db, 'families', currentFamilyId, 'budgets', category);
        await setDoc(budgetRef, { category, limit });
        closeBudgetModal();
    } catch (error) {
        console.error("Erro ao salvar orçamento:", error);
        alert("Ocorreu um erro ao salvar o orçamento.");
    }
});


// --- LÓGICA DO MODAL DE CONFIGURAÇÕES ---
// A lógica do modal de configurações será removida pois agora é uma página separada.
// O código abaixo será mantido caso seja necessário no futuro, mas o botão que o aciona foi removido.
// settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => e.target === settingsModal && settingsModal.classList.add('hidden'));

addIncomeCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newCategoryName = document.getElementById('new-income-category').value;
    if (newCategoryName) {
        await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'income' });
        addIncomeCategoryForm.reset();
    }
});

addExpenseCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newCategoryName = document.getElementById('new-expense-category').value;
    if (newCategoryName) {
        await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'expense' });
        addExpenseCategoryForm.reset();
    }
});

inviteMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('invite-email').value;
    if (email) {
        await addDoc(collection(db, 'invitations'), {
            familyId: currentFamilyId,
            email: email,
            invitedBy: auth.currentUser.email
        });
        inviteMemberForm.reset();
    }
});

// --- LÓGICA DO MODAL DE INVESTIMENTOS ---
function openInvestmentModal(investment = null) {
    investmentForm.reset();
    if (investment) {
        document.getElementById('investment-modal-title').textContent = 'Editar Ativo';
        document.getElementById('investment-id').value = investment.id;
        document.getElementById('asset-name').value = investment.name;
        document.getElementById('asset-quantity').value = investment.quantity;
        document.getElementById('asset-price').value = investment.averagePrice;
        document.getElementById('current-asset-price').value = investment.currentPrice;
    } else {
        document.getElementById('investment-modal-title').textContent = 'Novo Ativo';
    }
    investmentModal.classList.remove('hidden');
}

function closeInvestmentModal() {
    investmentModal.classList.add('hidden');
}

addInvestmentBtn.addEventListener('click', () => openInvestmentModal());
cancelInvestmentBtn.addEventListener('click', closeInvestmentModal);
investmentModal.addEventListener('click', (e) => e.target === investmentModal && closeInvestmentModal());

investmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFamilyId) return;

    const id = document.getElementById('investment-id').value;
    const name = document.getElementById('asset-name').value;
    const quantity = parseFloat(document.getElementById('asset-quantity').value);
    const averagePrice = parseFloat(document.getElementById('asset-price').value);
    const currentPrice = parseFloat(document.getElementById('current-asset-price').value);

    if (!name || isNaN(quantity) || isNaN(averagePrice) || isNaN(currentPrice)) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const investmentData = { name, quantity, averagePrice, currentPrice };

    try {
        if (id) {
            const investmentRef = doc(db, 'families', currentFamilyId, 'investments', id);
            await updateDoc(investmentRef, investmentData);
        } else {
            const investmentsCol = collection(db, 'families', currentFamilyId, 'investments');
            await addDoc(investmentsCol, investmentData);
        }
        closeInvestmentModal();
    } catch (error) {
        console.error("Erro ao salvar ativo:", error);
        alert("Ocorreu um erro ao salvar o ativo.");
    }
});

goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFamilyId) return;

    const id = document.getElementById('goal-id').value;
    const name = document.getElementById('goal-name').value;
    const targetAmount = parseFloat(document.getElementById('goal-target').value);
    const currentAmount = parseFloat(document.getElementById('goal-current').value);

    if (!name || isNaN(targetAmount) || isNaN(currentAmount)) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const goalData = { name, targetAmount, currentAmount };

    try {
        if (id) {
            const goalRef = doc(db, 'families', currentFamilyId, 'goals', id);
            await updateDoc(goalRef, goalData);
        } else {
            const goalsCol = collection(db, 'families', currentFamilyId, 'goals');
            await addDoc(goalsCol, goalData);
        }
        closeGoalModal();
    } catch (error) {
        console.error("Erro ao salvar meta:", error);
        alert("Ocorreu um erro ao salvar a meta.");
    }
});

// --- LÓGICA PARA MOSTRAR OPÇÃO DE INVESTIMENTO ---
transactionTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'expense') {
            investmentOption.classList.remove('hidden');
        } else {
            investmentOption.classList.add('hidden');
            isInvestmentCheckbox.checked = false;
        }
    });
});

transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFamilyId) return;

    const id = transactionIdInput.value;
    const description = transactionForm.description.value;
    const amount = parseFloat(transactionForm.amount.value);
    const type = transactionForm.type.value;
    const category = transactionForm.category.value;
    const date = transactionForm.date.value;
    const isInvestment = isInvestmentCheckbox.checked && type === 'expense';

    if (!description || isNaN(amount) || amount <= 0 || !date) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }
    
    const timestamp = Timestamp.fromDate(new Date(date));

    const transactionData = { description, amount, type, category, timestamp, isInvestment };

    try {
        const batch = writeBatch(db);

        if (id) {
            // Se estiver editando, a lógica pode ser mais complexa (ex: remover do investimento se a flag mudar)
            // Por simplicidade, vamos focar em adicionar. A edição de um investimento deve ser feita na tela de investimentos.
            const transactionRef = doc(db, 'families', currentFamilyId, 'transactions', id);
            batch.update(transactionRef, transactionData);
        } else {
            const transactionRef = doc(collection(db, 'families', currentFamilyId, 'transactions'));
            batch.set(transactionRef, transactionData);

            // Se for um investimento, cria um registro correspondente em 'investments'
            if (isInvestment) {
                const investmentRef = doc(collection(db, 'families', currentFamilyId, 'investments'));
                const investmentData = {
                    name: description,
                    quantity: 1, // Aporte único
                    averagePrice: amount,
                    currentPrice: amount, // Valor atual é o mesmo do aporte inicial
                    isContribution: true, // Flag para diferenciar de ativos
                    timestamp: timestamp
                };
                batch.set(investmentRef, investmentData);
            }
        }
        
        await batch.commit();
        closeModal();

    } catch (error) {
        console.error("Erro ao salvar transação:", error);
        alert("Ocorreu um erro ao salvar a transação. Tente novamente.");
    }
});
