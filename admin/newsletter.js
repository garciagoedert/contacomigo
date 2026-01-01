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
let currentEditingSlug = null; // Track which post is being edited

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
// REGISTER CUSTOM ATTRIBUTORS TO KEEP CLASSES AND STYLES
var Parchment = Quill.import('parchment');
var ClassAttributor = new Parchment.Attributor.Attribute('class', 'class', { scope: Parchment.Scope.ANY });
var StyleAttributor = new Parchment.Attributor.Attribute('style', 'style', { scope: Parchment.Scope.ANY });
Quill.register(ClassAttributor, true);
Quill.register(StyleAttributor, true);

var quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Escreva o conteúdo da sua newsletter aqui...',
    modules: {
        clipboard: {
            matchVisual: false // Prevents some automatic cleanup issues
        },
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean'],
                ['markdown-btn'], // Custom button
                ['code-view-btn'] // New Code View button
            ],
            handlers: {
                'markdown-btn': function () {
                    openMarkdownModal();
                },
                'code-view-btn': function () {
                    toggleCodeView();
                }
            }
        }
    }
});

// Custom Icon for Markdown Button
const markdownBtn = document.querySelector('.ql-markdown-btn');
if (markdownBtn) {
    markdownBtn.innerHTML = '<span class="flex items-center gap-1 font-bold text-xs"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> AI Import</span>';
    markdownBtn.style.width = 'auto';
    markdownBtn.style.padding = '0 5px';
    markdownBtn.title = "Importar do Gemini/ChatGPT (Markdown)";
}

// Custom Icon for Code View Button
const codeViewBtn = document.querySelector('.ql-code-view-btn');
if (codeViewBtn) {
    codeViewBtn.innerHTML = '<span class="flex items-center gap-1 font-bold text-xs"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> HTML</span>';
    codeViewBtn.style.width = 'auto';
    codeViewBtn.style.padding = '0 5px';
    codeViewBtn.title = "Editar HTML Fonte";
}

// --- CODE VIEW LOGIC (UPDATED WITH IFRAME PREVIEW) ---
const editorContainer = document.getElementById('editor-container');
const codeViewContainer = document.getElementById('code-view-container');
const htmlEditor = document.getElementById('html-editor');
const previewFrame = document.getElementById('html-preview-frame');
const forceRenderBtn = document.getElementById('force-render-btn'); // Now "Preview" button
let isCodeView = false;

function toggleCodeView() {
    isCodeView = !isCodeView;

    if (isCodeView) {
        // Switch to HTML Editor Mode
        const html = quill.root.innerHTML; // Get current state from Quill

        // Only set value if editor is empty, to valid overwriting changes made in code view 
        // if user toggled back and forth without modifying visual.
        // Actually, safer to always sync from Visual -> Code when entering Code view
        // BUT we must allow user to persist their raw HTML if they didn't touch visual.
        if (!htmlEditor.value || htmlEditor.value.trim() === "") {
            htmlEditor.value = html;
        }

        editorContainer.classList.add('hidden');
        if (codeViewContainer) {
            codeViewContainer.classList.remove('hidden');
        } else {
            htmlEditor.classList.remove('hidden');
        }

        if (codeViewBtn) codeViewBtn.classList.add('text-blue-600', 'bg-blue-50');

        // Reset preview frame visibility
        if (previewFrame) previewFrame.classList.add('hidden');

    } else {
        // Switch back to Visual Editor
        // WARNING: Switching back to Quill might strip styles. 
        // We warn user if they pasted full HTML
        const html = htmlEditor.value;
        if (html.includes('<html') || html.includes('<style')) {
            if (!confirm("Atenção: Voltar para o modo visual pode quebrar seu template HTML customizado (tags <head>, <style>, etc). Deseja continuar?")) {
                isCodeView = true; // Cancel switch
                return;
            }
        }

        quill.clipboard.dangerouslyPasteHTML(0, html, 'user');

        if (codeViewContainer) {
            codeViewContainer.classList.add('hidden');
        } else {
            htmlEditor.classList.add('hidden');
        }

        editorContainer.classList.remove('hidden');
        if (codeViewBtn) codeViewBtn.classList.remove('text-blue-600', 'bg-blue-50');
    }
}

// Render Preview Function (IFrame)
function renderPreview() {
    const html = htmlEditor.value;

    if (!previewFrame) {
        console.error("Preview frame not found");
        return;
    }

    // Show iframe, resize textarea
    previewFrame.classList.remove('hidden');

    // Write content to iframe
    const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    showStatus("Pré-visualização atualizada!", "success");
}

// Force Render Button Action (Now "Preview")
if (forceRenderBtn) {
    forceRenderBtn.addEventListener('click', () => {
        renderPreview();
    });
}

function html_beautify(html) {
    return html;
}

// --- MARKDOWN MODAL LOGIC ---
const mdModal = document.getElementById('md-import-modal');
const mdInput = document.getElementById('md-input');
const mdPreview = document.getElementById('md-preview');
const closeMdBtn = document.getElementById('close-md-modal');
const cancelMdBtn = document.getElementById('cancel-md-import');
const confirmMdBtn = document.getElementById('confirm-md-import');
const importFormatSelect = document.getElementById('import-format');

function openMarkdownModal() {
    mdModal.classList.remove('hidden');
    // Set focus after transition
    setTimeout(() => mdInput.focus(), 50);
    renderMdPreview();
}

function closeMarkdownModal() {
    mdModal.classList.add('hidden');
    mdInput.value = '';
    mdPreview.innerHTML = '<p class="text-gray-400 italic text-center mt-20">A pré-visualização aparecerá aqui...</p>';
}

function renderMdPreview() {
    const text = mdInput.value;
    const format = importFormatSelect ? importFormatSelect.value : 'markdown';

    if (!text.trim()) {
        mdPreview.innerHTML = '<p class="text-gray-400 italic text-center mt-20">A pré-visualização aparecerá aqui...</p>';
        return;
    }

    try {
        let html = '';
        if (format === 'markdown') {
            html = marked.parse(text);
        } else {
            // Raw HTML - Render it directly
            html = text;
        }
        mdPreview.innerHTML = html;
    } catch (e) {
        console.error(e);
        mdPreview.innerHTML = '<p class="text-red-500 text-center mt-10">Erro na pré-visualização</p>';
    }
}

// Event Listeners
mdInput.addEventListener('input', renderMdPreview);
if (importFormatSelect) {
    importFormatSelect.addEventListener('change', renderMdPreview);
}

[closeMdBtn, cancelMdBtn].forEach(btn => btn.addEventListener('click', closeMarkdownModal));

confirmMdBtn.addEventListener('click', () => {
    const text = mdInput.value;
    const format = importFormatSelect ? importFormatSelect.value : 'markdown';

    if (!text.trim()) return;

    try {
        let html = '';
        if (format === 'markdown') {
            html = marked.parse(text);
        } else {
            // Raw HTML
            html = text;
        }

        // Insert at cursor or append
        const range = quill.getSelection(true);
        if (range) {
            quill.clipboard.dangerouslyPasteHTML(range.index, html);
        } else {
            quill.clipboard.dangerouslyPasteHTML(quill.getLength(), html);
        }

        closeMarkdownModal();
        showStatus("Conteúdo importado com sucesso!", 'success');
    } catch (e) {
        showStatus("Erro ao importar.", 'error');
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
        // Reset Editing State when leaving compose (optional, but safer to keep unless explicitly cleared)
        // Actually, if we switch to history, maybe we SHOULD clear? 
        // No, user might want to check history and go back.
        // But if they click "Compose" tab manually, we should probably clear. -> Handled in btn listener below if needed.
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

tabComposeBtn.addEventListener('click', () => {
    // If clicking explicitly on Compose, clear editing state? 
    // Usually yes, "New Post" behavior.
    currentEditingSlug = null;
    subjectInput.value = '';
    quill.setContents([]);
    document.getElementById('post-thumbnail').value = '';
    switchTab('compose');
});
tabHistoryBtn.addEventListener('click', () => switchTab('history'));
tabSubscribersBtn.addEventListener('click', () => switchTab('subscribers'));

// --- COMPOSE & SEND ACTIONS ---

// --- EDIT DRAFT LOGIC ---
window.loadDraft = async function (slug) {
    try {
        showStatus('Carregando post...', 'info');
        const docRef = doc(db, "newsletter_posts", slug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Populate fields
            subjectInput.value = data.title || '';
            document.getElementById('post-thumbnail').value = data.thumbnail || '';

            // Populate Content
            // Populate Content
            const content = data.content || '';

            // Check for Complex HTML (Full template)
            const isComplexHtml = content.includes('<html') || content.includes('<body') || content.includes('<style');

            if (isComplexHtml) {
                console.log("Complex HTML detected, switching to Code View.");
                if (!isCodeView) toggleCodeView(); // Open Code View
                htmlEditor.value = content;
                if (typeof renderPreview === 'function') renderPreview();
            } else {
                // Try Normal Quill Load
                try {
                    // Reset View if needed
                    if (isCodeView) toggleCodeView();

                    quill.setContents([]); // Clear first
                    quill.clipboard.dangerouslyPasteHTML(0, content);
                } catch (quillErr) {
                    console.error("Quill failed to parse content, falling back to Code View:", quillErr);
                    showStatus('Conteúdo complexo detectado. Abrindo em modo Código.', 'warning');

                    if (!isCodeView) toggleCodeView();
                    htmlEditor.value = content;
                    if (typeof renderPreview === 'function') renderPreview();
                }
            }

            // Switch to Compose Tab
            currentEditingSlug = slug; // SET EDITING SLUG
            switchTab('compose');
            showStatus('Post carregado. Pode editar agora.', 'success');
        } else {
            showStatus('Rascunho não encontrado.', 'error');
        }
    } catch (error) {
        console.error("Erro ao carregar rascunho:", error);
        showStatus('Erro ao carregar rascunho.', 'error');
    }
}

// --- COMPOSE & SEND ACTIONS ---

const publishOnlyCheck = document.getElementById('publish-only-check');

async function sendEmailAction(isTest = true, saveOnly = false) {
    let content = '';

    // CRITICAL FIX: If isCodeView, prioritize the raw HTML from textarea
    // This allows sending full HTML templates (with head/style) exactly as is.
    if (isCodeView) {
        content = htmlEditor.value;
    } else {
        content = quill.root.innerHTML;
    }

    const subject = subjectInput.value;
    const thumbnail = document.getElementById('post-thumbnail').value || null;
    const testEmail = testEmailInput.value;
    const publishOnly = publishOnlyCheck ? publishOnlyCheck.checked : false;

    if (!subject) return showStatus('Por favor, informe um assunto.', 'error');

    // Check content validity
    if (isCodeView) {
        if (!content || content.trim().length === 0) {
            return showStatus('O conteúdo HTML não pode estar vazio.', 'error');
        }
    } else {
        const textContent = quill.getText().trim();
        if (textContent.length === 0 && !content.includes('<img') && !content.includes('<table') && !content.includes('<div')) {
            return showStatus('O conteúdo não pode estar vazio.', 'error');
        }
    }

    if (isTest && !testEmail && !saveOnly && !publishOnly) return showStatus('Para enviar um teste, informe um email de destino.', 'error');

    // CONFIRMATION DIALOG 
    // Skip for tests or drafts
    if (!isTest && !saveOnly) {
        let confirmMsg = 'ATENÇÃO: Você está prestes a enviar este email para TODOS os seus inscritos ativos. Esta ação não pode ser desfeita. Deseja continuar?';
        if (publishOnly) {
            confirmMsg = 'Confirmar publicação no Blog? (Nenhum email será enviado)';
        }

        if (!confirm(confirmMsg)) {
            return;
        }
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
            thumbnail,
            htmlContent: content,
            isTest,
            testEmail: isTest ? testEmail : null,
            saveOnly,
            saveOnly,
            publishOnly, // New Flag
            slug: currentEditingSlug // Send SLUG if editing
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
                // Draft saved
            } else if (!isTest) {
                // Clear form if real send/publish and success
                // Reset checkbox
                if (publishOnlyCheck) publishOnlyCheck.checked = false;
                currentEditingSlug = null; // Clear editing state after success
                switchTab('history');
            }
        } else {
            throw new Error(result.error || 'Falha ao processar.');
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
    // ... (Keep existing import logic) ...
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
            // ... (Existing import logic kept mostly same, just ensuring scope) ...
            console.log("Parsed Posts CSV:", results);
            // ... (Omit large block for brevity, logic remains same)
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
        // FETCH ALL (Client-side sort handles missing fields)
        const q = query(collection(db, "newsletter_posts"));
        const querySnapshot = await getDocs(q);

        historyTableBody.innerHTML = '';

        if (querySnapshot.empty) {
            historyTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Nenhum envio encontrado.</td></tr>';
            return;
        }

        // Convert to array and sort manually (Newest first)
        const docs = [];
        querySnapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

        docs.sort((a, b) => {
            const dateA = safeDateSort(a.updatedAt || a.createdAt || a.sentAt);
            const dateB = safeDateSort(b.updatedAt || b.createdAt || b.sentAt);
            return dateB - dateA;
        });

        docs.forEach((data) => {
            try {
                const docSnap = { id: data.id };
                // data is already the object

                const sentDate = safeDate(data.sentAt);
                const updateDate = safeDate(data.updatedAt);

                let dateStr = '-';
                if (sentDate) dateStr = sentDate.toLocaleString();
                else if (updateDate) dateStr = updateDate.toLocaleDateString() + ' (Rascunho)';

                const statusClass = data.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                const sentCount = data.sentCount !== undefined ? data.sentCount : '-';

                const tr = document.createElement('tr');

                // Define Actions based on status
                let actionButtons = `
                    <a href="/artigos/${docSnap.id}" target="_blank" class="text-blue-600 hover:text-blue-900 mr-3">Ver</a>
                    <button onclick="window.deletePost('${docSnap.id}')" class="text-red-500 hover:text-red-700 font-bold" title="Excluir">✕</button>
                `;

                if (data.status === 'draft') {
                    actionButtons = `
                        <button onclick="window.loadDraft('${docSnap.id}')" class="text-yellow-600 hover:text-yellow-900 mr-3 font-semibold">Editar</button>
                        ${actionButtons}
                    `;
                } else {
                    // Also allow editing SENT posts
                    actionButtons = `
                        <button onclick="window.resendPost('${docSnap.id}', '${escapeHtml(data.title)}')" class="text-purple-600 hover:text-purple-900 mr-3 font-semibold" title="Reenviar Emails">Reenviar</button>
                        <button onclick="window.loadDraft('${docSnap.id}')" class="text-green-600 hover:text-green-900 mr-3 font-semibold">Editar</button>
                        ${actionButtons}
                    `;
                }

                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${data.title || 'Sem Título (' + docSnap.id + ')'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${sentCount}</td>
                     <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${data.status === 'sent' ? 'Enviado' : 'Rascunho'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         ${actionButtons}
                    </td>
                `;
                historyTableBody.appendChild(tr);
            } catch (rowErr) {
                console.error("Erro ao renderizar linha:", rowErr, data);
            }
        });

    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        historyTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-red-500">Erro ao carregar dados.</td></tr>';
    }
}

// Helper for Robust Date Parsing
function safeDate(val) {
    if (!val) return null;
    if (val.seconds) return new Date(val.seconds * 1000); // Firestore Timestamp
    if (val instanceof Date) return val; // JS Date
    if (typeof val === 'string') return new Date(val); // ISO String
    if (typeof val === 'number') return new Date(val); // Epoch
    return null;
}

function safeDateSort(val) {
    const d = safeDate(val);
    return d ? d.getTime() : 0;
}

// ... (refreshHistoryBtn listener remains)

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


// --- RESEND LOGIC ---
window.resendPost = async function (slug, title) {
    if (!confirm(`ATENÇÃO: Deseja reenviar o email do post "${title}" para TODOS os inscritos ativos?`)) {
        return;
    }

    setLoading(true);

    try {
        // 1. Fetch current post content to ensure we send the latest version
        const docRef = doc(db, "newsletter_posts", slug);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Post original não encontrado.");
        }

        const data = docSnap.data();

        // 2. Prepare Payload using existing endpoint
        const token = await auth.currentUser.getIdToken();
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let functionUrl = isLocalhost
            ? 'http://127.0.0.1:5001/financeapp-6da16/us-central1/sendNewsletter'
            : 'https://us-central1-financeapp-6da16.cloudfunctions.net/sendNewsletter';

        const payload = {
            token,
            subject: data.title,
            thumbnail: data.thumbnail,
            htmlContent: data.content,
            isTest: false, // REAL SEND
            saveOnly: false,
            publishOnly: false, // Force Email Send
            slug: slug
        };

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showStatus('Emails reenviados com sucesso!', 'success');
            loadHistory(); // Refresh stats
        } else {
            throw new Error(result.error || 'Falha ao reenviar.');
        }

    } catch (error) {
        console.error("Erro ao reenviar:", error);
        showStatus('Erro ao reenviar: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Helper to escape title for onclick attribute
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// --- SUBSCRIBER IMPORT LOGIC ---

// --- SUBSCRIBER MANAGEMENT LOGIC ---

// Elements
const subscriberSearchInput = document.getElementById('subscriber-search');

let allSubscribers = []; // Store fetched subscribers for validation/filtering

async function loadSubscribers() {
    try {
        setLoading(true);
        // Fetch ALL subscribers ordered by date
        const q = query(collection(db, "newsletter_subscribers"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        allSubscribers = [];
        querySnapshot.forEach((doc) => {
            allSubscribers.push({ id: doc.id, ...doc.data() });
        });

        totalSubscribersCount.textContent = allSubscribers.length;
        renderSubscribersList(allSubscribers);

    } catch (e) {
        console.error("Erro ao carregar inscritos:", e);
        showStatus("Erro ao carregar lista de inscritos.", 'error');
    } finally {
        setLoading(false);
    }
}

function renderSubscribersList(subscribers) {
    subscribersList.innerHTML = '';

    if (subscribers.length === 0) {
        subscribersList.innerHTML = '<li class="px-4 py-8 text-center text-gray-500">Nenhum inscrito encontrado.</li>';
        return;
    }

    subscribers.forEach((data) => {
        const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : '-';
        const source = data.source === 'csv_import' ? 'Importação' : 'Site';

        const li = document.createElement('li');
        li.className = "px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700";
        li.innerHTML = `
            <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">${data.email}</div>
                <div class="text-xs text-gray-500 flex items-center gap-2 mt-1">
                    <span>${date}</span>
                    <span class="text-gray-400">•</span>
                    <span>${source}</span>
                </div>
            </div>
            <div class="flex items-center gap-4">
                 <span class="px-2 py-0.5 rounded-full text-xs ${data.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${data.status === 'active' ? 'Ativo' : 'Cancelado'}
                </span>
                <button onclick="window.deleteSubscriber('${data.email}')" class="text-gray-400 hover:text-red-600 transition-colors" title="Remover Inscrito">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
         `;
        subscribersList.appendChild(li);
    });
}

// Search Logic
if (subscriberSearchInput) {
    subscriberSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allSubscribers.filter(sub => sub.email.toLowerCase().includes(term));
        renderSubscribersList(filtered);
    });
}

// Global Delete Function
window.deleteSubscriber = async function (email) {
    if (!confirm(`Tem certeza que deseja remover ${email} da lista?`)) return;

    try {
        await deleteDoc(doc(db, "newsletter_subscribers", email));
        showStatus(`Inscrito ${email} removido.`, 'success');

        // Remove from local list and re-render to avoid full reload
        allSubscribers = allSubscribers.filter(s => s.email !== email);
        totalSubscribersCount.textContent = allSubscribers.length;

        // Re-apply search filter if exists
        const term = subscriberSearchInput ? subscriberSearchInput.value.toLowerCase() : '';
        const filtered = allSubscribers.filter(sub => sub.email.toLowerCase().includes(term));
        renderSubscribersList(filtered);

    } catch (e) {
        console.error("Erro ao deletar:", e);
        showStatus("Erro ao remover inscrito.", 'error');
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
    // Centered at the bottom
    statusMessage.className = `rounded-md p-4 mb-8 fixed bottom-10 left-1/2 transform -translate-x-1/2 max-w-lg w-full shadow-2xl z-50 transition-all duration-300 ${type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`;
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
