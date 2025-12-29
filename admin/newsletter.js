import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, setDoc, writeBatch, serverTimestamp, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIG (Copied from admin.js) ---
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
const db = getFirestore(app);

// Elements
const adminEmailSpan = document.getElementById('admin-email');
const logoutBtn = document.getElementById('logout-btn');

// Tabs
const tabComposeBtn = document.getElementById('tab-compose-btn');
const tabHistoryBtn = document.getElementById('tab-history-btn');
const tabSubscribersBtn = document.getElementById('tab-subscribers-btn');
const tabCompose = document.getElementById('tab-compose');
const tabHistory = document.getElementById('tab-history');
const tabSubscribers = document.getElementById('tab-subscribers');

// Compose
const sendTestBtn = document.getElementById('send-test-btn');
const sendAllBtn = document.getElementById('send-all-btn');
const saveDraftBtn = document.getElementById('save-draft-btn');
const testEmailInput = document.getElementById('test-email-input');
const subjectInput = document.getElementById('email-subject');

// History
const historyTableBody = document.getElementById('history-table-body');
const refreshHistoryBtn = document.getElementById('refresh-history-btn');

// Subscribers
const importCsvBtn = document.getElementById('import-csv-btn');
const csvFileInput = document.getElementById('csv-file-input');
const subscribersList = document.getElementById('subscribers-list');
const totalSubscribersCount = document.getElementById('total-subscribers-count');

// Common
const statusMessage = document.getElementById('status-message');
const statusText = document.getElementById('status-text');

// Initialize Quill Editor
var quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Escreva o conteúdo da sua newsletter aqui...',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link', 'image'],
            ['clean']
        ]
    }
});

// Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        adminEmailSpan.textContent = user.email;
        loadHistory(); // Load initial data
        loadSubscribers();
    } else {
        window.location.href = '../login/index.html';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '../login/index.html';
    });
});

// --- TABS LOGIC ---
function switchTab(tabId) {
    // Hide all
    tabCompose.classList.add('hidden');
    tabHistory.classList.add('hidden');
    tabSubscribers.classList.add('hidden');

    // Reset styles
    [tabComposeBtn, tabHistoryBtn, tabSubscribersBtn].forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    // Show selected
    if (tabId === 'compose') {
        tabCompose.classList.remove('hidden');
        tabComposeBtn.classList.add('border-blue-500', 'text-blue-600');
        tabComposeBtn.classList.remove('border-transparent', 'text-gray-500');
    } else if (tabId === 'history') {
        tabHistory.classList.remove('hidden');
        tabHistoryBtn.classList.add('border-blue-500', 'text-blue-600');
        tabHistoryBtn.classList.remove('border-transparent', 'text-gray-500');
        loadHistory();
    } else if (tabId === 'subscribers') {
        tabSubscribers.classList.remove('hidden');
        tabSubscribersBtn.classList.add('border-blue-500', 'text-blue-600');
        tabSubscribersBtn.classList.remove('border-transparent', 'text-gray-500');
        loadSubscribers();
    }
}

tabComposeBtn.addEventListener('click', () => switchTab('compose'));
tabHistoryBtn.addEventListener('click', () => switchTab('history'));
tabSubscribersBtn.addEventListener('click', () => switchTab('subscribers'));

// --- COMPOSE & SEND ACTIONS ---

async function sendEmailAction(isTest = true, saveOnly = false) {
    const subject = subjectInput.value;
    const content = quill.root.innerHTML;
    const testEmail = testEmailInput.value;

    if (!subject) return showStatus('Por favor, informe um assunto.', 'error');
    if (quill.getText().trim().length === 0 && !content.includes('<img')) return showStatus('O conteúdo não pode estar vazio.', 'error');
    if (isTest && !testEmail && !saveOnly) return showStatus('Para enviar um teste, informe um email de destino.', 'error');

    if (!isTest && !saveOnly && !confirm('ATENÇÃO: Você está prestes a enviar este email para TODOS os seus inscritos ativos. Esta ação não pode ser desfeita. Deseja continuar?')) {
        return;
    }

    setLoading(true);

    try {
        const token = await auth.currentUser.getIdToken();

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let functionUrl = isLocalhost
            ? 'http://127.0.0.1:5001/financeapp-6da16/us-central1/sendNewsletter'
            : 'https://us-central1-financeapp-6da16.cloudfunctions.net/sendNewsletter';

        const payload = {
            token,
            subject,
            htmlContent: content,
            isTest,
            testEmail: isTest ? testEmail : null,
            saveOnly
        };

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showStatus(result.message, 'success');
            if (saveOnly) {
                // Could highlight draft saved
            } else if (!isTest) {
                // Clear form if real send
                // subjectInput.value = '';
                // quill.setContents([]);
                switchTab('history');
            }
        } else {
            throw new Error(result.error || 'Falha ao enviar email.');
        }

    } catch (error) {
        console.error(error);
        showStatus('Erro: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

sendTestBtn.addEventListener('click', () => sendEmailAction(true));
sendAllBtn.addEventListener('click', () => sendEmailAction(false));
saveDraftBtn.addEventListener('click', () => sendEmailAction(false, true));

// --- HISTORY LOGIC ---

// Import Posts UI
const csvPostsInput = document.getElementById('csv-posts-input');

csvPostsInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("Importar posts deste CSV? O sistema tentará detectar automaticamente colunas como 'web_title', 'content_html', 'create_at' ou 'title', 'content', 'date'.")) {
        csvPostsInput.value = '';
        return;
    }

    showStatus("Lendo CSV de posts...", 'info');

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function (results) {
            console.log("Parsed Posts CSV:", results);

            const batchSize = 400;
            let totalImported = 0;
            let batch = writeBatch(db);
            let operationCount = 0;

            try {
                for (const row of results.data) {
                    // Normalize keys to lowercase for easier matching
                    const keys = Object.keys(row).reduce((acc, k) => { acc[k.toLowerCase()] = k; return acc; }, {});

                    // Detect columns (Enhanced for User's specific Beehiiv export)
                    const titleKey = keys['web_title'] || keys['title'] || keys['assunto'] || keys['subject'];
                    const contentKey = keys['content_html'] || keys['content'] || keys['html'] || keys['body'] || keys['conteudo'];
                    const dateKey = keys['create_at'] || keys['publish_date'] || keys['created_at'] || keys['date'] || keys['data'];
                    const slugKey = keys['url'] || keys['slug'] || keys['web_url'];
                    const subtitleKey = keys['web_subtitle'] || keys['subtitle'] || keys['subtitulo'];
                    const thumbnailKey = keys['thumbnail_url'] || keys['thumbnail'] || keys['image'];

                    if (titleKey && row[titleKey]) {
                        let title = row[titleKey].trim();

                        // Try to get slug from URL (e.g. https://.../slug)
                        let slug = '';
                        if (slugKey && row[slugKey]) {
                            const urlStr = row[slugKey].split('?')[0]; // Remove query params
                            const parts = urlStr.split('/');
                            const cleanParts = parts.filter(p => p);
                            slug = cleanParts[cleanParts.length - 1] || row[slugKey];
                        }

                        if (!slug) {
                            slug = title.toLowerCase()
                                .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-+|-+$/g, '');
                        }

                        // CRITICAL: Normalize slug to ensure matching (lowercase, trimmed)
                        slug = slug.toLowerCase().trim();

                        const content = contentKey ? row[contentKey] : '';
                        const thumbnail = thumbnailKey ? row[thumbnailKey] : '';

                        // Parse Date
                        let sentAt = serverTimestamp();
                        // ... date parsing ...

                        const ref = doc(db, "newsletter_posts", slug);
                        batch.set(ref, {
                            slug,
                            title,
                            content,
                            thumbnail, // Saved to DB
                            status: 'sent',
                            sentAt: sentAt,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(), // Critical: loadHistory orders by this
                            sentCount: 0
                        }, { merge: true });

                        operationCount++;

                        if (operationCount >= batchSize) {
                            await batch.commit();
                            totalImported += operationCount;
                            batch = writeBatch(db);
                            operationCount = 0;
                        }
                    }
                }

                if (operationCount > 0) {
                    await batch.commit();
                    totalImported += operationCount;
                }

                if (totalImported === 0) {
                    alert("Nenhum post importado. Verifique se as colunas correspondem. Ex: web_title, content_html, create_at.");
                    console.log("Colunas encontradas na primeira linha:", results.data[0] ? Object.keys(results.data[0]) : "Nenhuma");
                    showStatus("Nenhum post importado.", 'warning');
                } else {
                    showStatus(`Sucesso! ${totalImported} posts importados.`, 'success');
                    loadHistory(); // Refresh table
                }
                csvPostsInput.value = '';

            } catch (err) {
                console.error("Erro na importação de posts:", err);
                showStatus("Erro ao salvar posts.", 'error');
                csvPostsInput.value = '';
            }
        },
        error: function (err) {
            showStatus("Erro ao ler CSV.", 'error');
            csvPostsInput.value = '';
        }
    });
});

async function loadHistory() {
    historyTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Carregando...</td></tr>';

    try {
        const q = query(collection(db, "newsletter_posts"), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);

        historyTableBody.innerHTML = '';

        if (querySnapshot.empty) {
            historyTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Nenhum envio encontrado.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = data.sentAt ? new Date(data.sentAt.seconds * 1000).toLocaleString() : (data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toLocaleDateString() + ' (Rascunho)' : '-');
            const statusClass = data.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
            const sentCount = data.sentCount !== undefined ? data.sentCount : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${data.title}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${dateStr}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${sentCount}</td>
                 <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${data.status === 'sent' ? 'Enviado' : 'Rascunho'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                     <a href="/artigos/${docSnap.id}" target="_blank" class="text-blue-600 hover:text-blue-900 mr-3">Ver</a>
                     <button onclick="window.deletePost('${docSnap.id}')" class="text-red-500 hover:text-red-700 font-bold" title="Excluir">✕</button>
                </td>
            `;
            historyTableBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        historyTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-red-500">Erro ao carregar dados.</td></tr>';
    }
}

refreshHistoryBtn.addEventListener('click', loadHistory);

// --- DELETE LOGIC ---
window.deletePost = async function (slug) {
    if (!confirm('Tem certeza que deseja EXCLUIR este post permanentemente?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, "newsletter_posts", slug));
        showStatus('Post excluído com sucesso.', 'success');
        loadHistory(); // Refresh
    } catch (error) {
        console.error("Erro ao excluir:", error);
        showStatus('Erro ao excluir post.', 'error');
    }
}


// --- SUBSCRIBER IMPORT LOGIC ---

async function loadSubscribers() {
    // For MVP, just count. Listing all might be heavy if many.
    // Let's just list last 50 for now or summary.
    try {
        const q = query(collection(db, "newsletter_subscribers"), orderBy("createdAt", "desc")); // limit handled basically
        const querySnapshot = await getDocs(q); // TODO: Add limit(50) if gets slow

        totalSubscribersCount.textContent = querySnapshot.size;

        subscribersList.innerHTML = '';
        let count = 0;
        querySnapshot.forEach((doc) => {
            if (count >= 50) return; // Client side limit for now
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : '-';

            const li = document.createElement('li');
            li.className = "px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700";
            li.innerHTML = `
                <div class="text-sm font-medium text-gray-900 dark:text-white">${data.email}</div>
                <div class="text-xs text-gray-500 gap-2 flex items-center">
                    <span>${date}</span>
                    <span class="px-2 py-0.5 rounded-full text-xs ${data.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${data.status}</span>
                </div>
             `;
            subscribersList.appendChild(li);
            count++;
        });

    } catch (e) {
        console.error(e);
    }
}

importCsvBtn.addEventListener('click', () => {
    const file = csvFileInput.files[0];
    if (!file) return showStatus("Selecione um arquivo CSV.", 'error');

    setLoading(true); // Reusing loader style logic if possible or just disable btn
    importCsvBtn.disabled = true;
    importCsvBtn.textContent = "Processando...";

    Papa.parse(file, {
        header: true, // Try to auto-detect header
        skipEmptyLines: true,
        complete: async function (results) {
            console.log("Parsed CSV:", results);

            // Expected formats: 
            // 1. Column "email"
            // 2. OR just one column which IS the email

            let emailsToImport = [];

            // Helper to validate email
            const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (results.meta.fields && results.meta.fields.some(f => f.toLowerCase().includes('email'))) {
                const emailField = results.meta.fields.find(f => f.toLowerCase().includes('email'));
                results.data.forEach(row => {
                    if (row[emailField] && isValidEmail(row[emailField].trim())) {
                        emailsToImport.push(row[emailField].trim());
                    }
                });
            } else {
                // Fallback: assume first column is email if it looks like it
                results.data.forEach(row => {
                    const firstVal = Object.values(row)[0];
                    if (firstVal && isValidEmail(firstVal.trim())) {
                        emailsToImport.push(firstVal.trim());
                    }
                });
            }

            if (emailsToImport.length === 0) {
                showStatus("Nenhum email válido encontrado no CSV.", 'error');
                importCsvBtn.disabled = false;
                importCsvBtn.textContent = "Importar";
                setLoading(false);
                return;
            }

            // Batch Write to Firestore (limit 500 per batch)
            // We use batches of 400 to be safe
            const batchSize = 400;
            let batchCount = 0;
            let totalImported = 0;

            try {
                for (let i = 0; i < emailsToImport.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = emailsToImport.slice(i, i + batchSize);

                    chunk.forEach(email => {
                        const ref = doc(db, "newsletter_subscribers", email);
                        batch.set(ref, {
                            email: email,
                            status: 'active',
                            source: 'csv_import',
                            importedAt: serverTimestamp(),
                            createdAt: serverTimestamp() // If new
                        }, { merge: true });
                    });

                    await batch.commit();
                    totalImported += chunk.length;
                    console.log(`Batch ${batchCount + 1} committed (${chunk.length} emails).`);
                    batchCount++;
                }

                showStatus(`Sucesso! ${totalImported} emails processados.`, 'success');
                loadSubscribers(); // Refresh list

            } catch (err) {
                console.error("Erro na importação:", err);
                showStatus("Erro ao salvar no banco de dados.", 'error');
            } finally {
                importCsvBtn.disabled = false;
                importCsvBtn.textContent = "Importar";
                setLoading(false);
            }
        },
        error: function (err) {
            console.error(err);
            showStatus("Erro ao ler arquivo CSV.", 'error');
            importCsvBtn.disabled = false;
            importCsvBtn.textContent = "Importar";
            setLoading(false);
        }
    });
});


// --- UTILS ---

function showStatus(msg, type) {
    statusMessage.classList.remove('hidden');
    statusMessage.className = `rounded-md p-4 mb-8 fixed bottom-4 right-4 max-w-sm shadow-lg z-50 ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`;
    statusText.textContent = msg;

    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

function setLoading(isLoading) {
    const btns = [sendTestBtn, sendAllBtn, saveDraftBtn];
    btns.forEach(btn => {
        if (btn) {
            btn.disabled = isLoading;
            if (isLoading) btn.classList.add('opacity-50', 'cursor-not-allowed');
            else btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
}
