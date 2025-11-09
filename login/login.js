// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, updateDoc, arrayUnion, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const showRegisterBtn = document.getElementById('show-register-view');
const showLoginBtn = document.getElementById('show-login-view');

// --- LÓGICA DE NAVEGAÇÃO ENTRE LOGIN E CADASTRO ---
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

// --- VERIFICA SE JÁ ESTÁ LOGADO ---
onAuthStateChanged(auth, user => {
    if (user) {
        // Se o usuário já está logado, redireciona para a página principal do app
        window.location.href = '../app.html';
    }
});

// --- LÓGICA DE LOGIN ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    loginError.textContent = '';
    loginError.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // O onAuthStateChanged vai cuidar do redirecionamento
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

// --- LÓGICA DE CADASTRO ---
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setupUserFamily(user);
        // O onAuthStateChanged vai cuidar do redirecionamento
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

// --- FUNÇÃO PARA CONFIGURAR FAMÍLIA DO USUÁRIO ---
async function setupUserFamily(user) {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().familyId) {
        // Usuário já tem uma família, não faz nada
        return;
    }

    // Verifica se há convites pendentes para este email
    const q = query(collection(db, 'invitations'), where('email', '==', user.email));
    const invitationsSnapshot = await getDocs(q);

    if (!invitationsSnapshot.empty) {
        // Aceita o primeiro convite encontrado
        const invitation = invitationsSnapshot.docs[0];
        const familyId = invitation.data().familyId;
        
        const familyRef = doc(db, 'families', familyId);
        await updateDoc(familyRef, { members: arrayUnion(user.uid) });

        await setDoc(userRef, { familyId: familyId, email: user.email }, { merge: true });
        
        // Deleta o convite após ser aceito
        await deleteDoc(invitation.ref);
    } else {
        // Cria uma nova família para o usuário
        const newFamilyRef = await addDoc(collection(db, 'families'), {
            members: [user.uid],
            owner: user.uid
        });
        await setDoc(userRef, { familyId: newFamilyRef.id, email: user.email });
    }
}
