// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, getDoc, where, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- PASSO 1: COLE A CONFIGURAÇÃO DO SEU FIREBASE AQUI ---
// (Esta configuração deve ser a mesma do seu arquivo app.js)
const firebaseConfig = {
    apiKey: "AIzaSyBVLS7bARnU_mH3KlueEeFjDSywN3FCESY",
    authDomain: "financeapp-6da16.firebaseapp.com",
    projectId: "financeapp-6da16",
    storageBucket: "financeapp-6da16.firebasestorage.app",
    messagingSenderId: "342917624338",
    appId: "1:342917624338:web:b9977ec338b63f4d50decb",
    measurementId: "G-KRNK2W5VPX"
};

// --- INICIALIZAÇÃO DO FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- SELETORES DO DOM ---
const incomeCategoriesList = document.getElementById('income-categories-list');
const expenseCategoriesList = document.getElementById('expense-categories-list');
const addIncomeCategoryForm = document.getElementById('add-income-category-form');
const addExpenseCategoryForm = document.getElementById('add-expense-category-form');
const familyMembersList = document.getElementById('family-members-list');
const inviteMemberForm = document.getElementById('invite-member-form');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const colorOptionsContainer = document.getElementById('color-options');

let currentUserId = null;
let currentFamilyId = null;
let unsubscribeFromCategories = null;
let unsubscribeFromFamily = null;

// --- LÓGICA DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, async user => {
    if (user) {
        currentUserId = user.uid;
        await setupUserFamily(user);
        if (currentFamilyId) {
            setupRealtimeListeners(currentFamilyId);
        }
    } else {
        // Se não estiver logado, redireciona para a página de login
        window.location.href = 'index.html';
    }
});

async function setupUserFamily(user) {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().familyId) {
        currentFamilyId = userDoc.data().familyId;
    } else {
        console.error("ID da família não encontrado para o usuário.");
        // Tratar o caso em que o usuário está logado mas não tem família associada
    }
}

// --- LISTENERS DO FIRESTORE ---
function setupRealtimeListeners(familyId) {
    // Listener para categorias
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

// --- RENDERIZAÇÃO ---
function renderCategories(incomeCategories, expenseCategories) {
    incomeCategoriesList.innerHTML = '';
    expenseCategoriesList.innerHTML = '';

    incomeCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-md';
        el.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" class="delete-category-btn text-red-500 hover:text-red-700 font-bold">X</button>`;
        incomeCategoriesList.appendChild(el);
    });

    expenseCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-md';
        el.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" class="delete-category-btn text-red-500 hover:text-red-700 font-bold">X</button>`;
        expenseCategoriesList.appendChild(el);
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

function renderFamilyMembers(members) {
    familyMembersList.innerHTML = '';
    members.forEach(member => {
        const el = document.createElement('div');
        el.className = 'bg-gray-50 dark:bg-gray-700 p-3 rounded-md';
        el.textContent = member.email;
        familyMembersList.appendChild(el);
    });
}

// --- EVENT LISTENERS DOS FORMULÁRIOS ---
addIncomeCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-income-category');
    const newCategoryName = input.value.trim();
    if (newCategoryName && currentFamilyId) {
        await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'income' });
        input.value = '';
    }
});

addExpenseCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-expense-category');
    const newCategoryName = input.value.trim();
    if (newCategoryName && currentFamilyId) {
        await addDoc(collection(db, 'families', currentFamilyId, 'categories'), { name: newCategoryName, type: 'expense' });
        input.value = '';
    }
});

inviteMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('invite-email');
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

// --- LÓGICA DE APARÊNCIA ---

// Troca de Tema
themeToggleBtn.addEventListener('click', () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Carregar Tema Salvo
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark' || 
       (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    loadAndApplyColor();
});

// Seleção de Cor
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
        if (button.dataset.color === currentColor) {
            button.classList.add('ring-2', 'ring-[var(--cor-principal)]');
        } else {
            button.classList.remove('ring-2', 'ring-[var(--cor-principal)]');
        }
    });
}

function loadAndApplyColor() {
    const savedColor = localStorage.getItem('mainColor') || '#4F46E5'; // Cor padrão
    document.documentElement.style.setProperty('--cor-principal', savedColor);
    updateActiveColor();
}
