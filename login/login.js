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

let isRegisteringPremium = false;

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
    if (user && !isRegisteringPremium) {
        // Se o usuário já está logado e NÃO está no fluxo de premium, redireciona
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
// --- LÓGICA DE CADASTRO ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const selectedPlan = document.querySelector('input[name="plan"]:checked').value;
    const phone = registerForm.phone.value.replace(/\D/g, '');
    const cpf = registerForm.cpf.value.replace(/\D/g, '');

    registerError.textContent = '';
    registerError.classList.add('hidden');

    if (password.length < 6) {
        registerError.textContent = "A senha deve ter no mínimo 6 caracteres.";
        registerError.classList.remove('hidden');
        return;
    }

    // Se for premium, seta a flag para evitar redirect automático do onAuthStateChanged
    if (selectedPlan === 'premium') {
        if (!phone || !cpf) {
            registerError.textContent = "Telefone e CPF são obrigatórios para o plano Premium.";
            registerError.classList.remove('hidden');
            return;
        }
        isRegisteringPremium = true;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setupUserFamily(user);

        // Se for PREMIUM, inicia o checkout
        if (selectedPlan === 'premium') {
            const registerBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = registerBtn.innerText;
            registerBtn.innerText = 'Redirecionando para pagamento...';
            registerBtn.disabled = true;

            try {
                await startCheckout(user, 'premium_monthly', phone, cpf);
            } catch (checkoutError) {
                console.error("Erro no checkout:", checkoutError);
                registerError.textContent = "Erro ao iniciar pagamento. Redirecionando para o app...";
                registerError.classList.remove('hidden');
                // Em caso de erro, redireciona para o app após 3s
                setTimeout(() => window.location.href = '../app.html', 3000);
            }
        } else {
            // Se for FREE, o onAuthStateChanged vai cuidar do redirecionamento, 
            // mas como já estamos autenticados aqui, podemos forçar se o listener não tiver disparado ainda
            // ou apenas deixar o listener disparar (que agora checa !isRegisteringPremium, que é true para free... wait. !false = true. OK.)
        }

    } catch (error) {
        isRegisteringPremium = false; // Reset em caso de erro
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

// Função de Checkout (Adaptada de checkout.html)
async function startCheckout(user, planType, cellphone, taxId) {
    const CLOUD_FUNCTION_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5001/financeapp-6da16/us-central1/createAbacatePayBilling'
        : 'https://us-central1-financeapp-6da16.cloudfunctions.net/createAbacatePayBilling';

    const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            planType: planType,
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName || 'Novo Cliente Trilha Comigo',
            returnUrl: `${window.location.origin}/app.html`,
            cellphone: cellphone,
            taxId: taxId
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar assinatura');
    }

    if (data.checkoutUrl) {
        localStorage.setItem('pending_payment_id', data.billingId);
        localStorage.setItem('pending_plan', planType);
        window.location.href = data.checkoutUrl;
    } else {
        throw new Error('URL de checkout não recebida');
    }
}

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
