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

// Navbar / Auth Elements
const adminEmailSpan = document.getElementById('admin-email');
const logoutBtn = document.getElementById('logout-btn');

// Tab Elements
const tabComposeBtn = document.getElementById('tab-compose-btn');
const tabHistoryBtn = document.getElementById('tab-history-btn');
const tabSubscribersBtn = document.getElementById('tab-subscribers-btn');
const tabCompose = document.getElementById('tab-compose');
const tabHistory = document.getElementById('tab-history');
const tabSubscribers = document.getElementById('tab-subscribers');

// Compose Elements
const composeForm = document.getElementById('compose-form');
const sendTestBtn = document.getElementById('send-test-btn');
const sendAllBtn = document.getElementById('send-all-btn');
const saveDraftBtn = document.getElementById('save-draft-btn');
const testEmailInput = document.getElementById('test-email-input');
const subjectInput = document.getElementById('email-subject');
const postCategorySelect = document.getElementById('post-category');
const postThumbnailInput = document.getElementById('post-thumbnail');
const publishOnlyCheck = document.getElementById('publish-only-check');
const editingBanner = document.getElementById('editing-banner');
const editingBannerLabel = document.getElementById('editing-banner-label');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formErrorLive = document.getElementById('form-error-live');
let currentEditingSlug = null;

// History Elements
const historyTableBody = document.getElementById('history-table-body');
const refreshHistoryBtn = document.getElementById('refresh-history-btn');
const importPostsCsvBtn = document.getElementById('import-posts-csv-btn');
const csvPostsInput = document.getElementById('csv-posts-input');

// Subscribers Elements
const importCsvBtn = document.getElementById('import-csv-btn');
const csvFileInput = document.getElementById('csv-file-input');
const subscriberSearchInput = document.getElementById('subscriber-search');
const subscribersList = document.getElementById('subscribers-list');
const totalSubscribersCount = document.getElementById('total-subscribers-count');

// Common / Status Elements
const statusMessage = document.getElementById('status-message');
const statusText = document.getElementById('status-text');
let statusTimeoutId = null;

// --- QUILL INITIALIZATION ---
// Register custom attributors to preserve classes and inline styles
var Parchment = Quill.import('parchment');
var ClassAttributor = new Parchment.Attributor.Attribute('class', 'class', { scope: Parchment.Scope.ANY });
var StyleAttributor = new Parchment.Attributor.Attribute('style', 'style', { scope: Parchment.Scope.ANY });
Quill.register(ClassAttributor, true);
Quill.register(StyleAttributor, true);

var quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Escreva o conteúdo da sua matéria ou newsletter aqui...',
    modules: {
        clipboard: {
            matchVisual: false
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
                ['markdown-btn'],
                ['code-view-btn']
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

// Custom toolbar buttons
const markdownBtn = document.querySelector('.ql-markdown-btn');
if (markdownBtn) {
    markdownBtn.innerHTML = '<span class="flex items-center gap-1 font-bold text-xs"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> AI Import</span>';
    markdownBtn.style.width = 'auto';
    markdownBtn.style.padding = '0 6px';
    markdownBtn.title = "Importar do Gemini/ChatGPT (Markdown)";
}

const codeViewBtn = document.querySelector('.ql-code-view-btn');
if (codeViewBtn) {
    codeViewBtn.innerHTML = '<span class="flex items-center gap-1 font-bold text-xs"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> HTML</span>';
    codeViewBtn.style.width = 'auto';
    codeViewBtn.style.padding = '0 6px';
    codeViewBtn.title = "Editar HTML Fonte";
}

// --- CODE VIEW LOGIC ---
const editorContainer = document.getElementById('editor-container');
const codeViewContainer = document.getElementById('code-view-container');
const htmlEditor = document.getElementById('html-editor');
const previewFrame = document.getElementById('html-preview-frame');
const forceRenderBtn = document.getElementById('force-render-btn');
let isCodeView = false;

function enterCodeView(syncFromQuill = true) {
    if (syncFromQuill && (!htmlEditor.value || htmlEditor.value.trim() === '')) {
        htmlEditor.value = quill.root.innerHTML;
    }
    isCodeView = true;
    editorContainer.classList.add('hidden');
    if (codeViewContainer) {
        codeViewContainer.classList.remove('hidden');
    } else {
        htmlEditor.classList.remove('hidden');
    }
    if (codeViewBtn) codeViewBtn.classList.add('text-[#E11D48]', 'bg-rose-50');
    if (previewFrame) previewFrame.classList.add('hidden');
}

function exitCodeView({ syncToQuill = true, confirmComplex = true } = {}) {
    if (syncToQuill) {
        const html = htmlEditor.value;
        if (confirmComplex && (html.includes('<html') || html.includes('<style'))) {
            if (!confirm("Atenção: Voltar para o modo visual pode quebrar seu template HTML customizado (tags <head>, <style>, etc). Deseja continuar?")) {
                return false;
            }
        }
        quill.clipboard.dangerouslyPasteHTML(0, html, 'user');
    }

    isCodeView = false;
    if (codeViewContainer) {
        codeViewContainer.classList.add('hidden');
    } else {
        htmlEditor.classList.add('hidden');
    }
    editorContainer.classList.remove('hidden');
    if (codeViewBtn) codeViewBtn.classList.remove('text-[#E11D48]', 'bg-rose-50');
    return true;
}

function toggleCodeView() {
    if (!isCodeView) {
        enterCodeView(true);
    } else {
        exitCodeView({ syncToQuill: true, confirmComplex: true });
    }
}

function renderPreview() {
    const html = htmlEditor.value;
    if (!previewFrame) {
        console.error("Preview frame not found");
        return;
    }

    previewFrame.classList.remove('hidden');
    const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    showStatus("Pré-visualização atualizada!", "success");
}

if (forceRenderBtn) {
    forceRenderBtn.addEventListener('click', renderPreview);
}

// --- ACCESSIBLE VALIDATION & FORM HELPERS ---
const interactedFields = new WeakSet();
const flaggedFields = new WeakSet();
const announcedFields = new WeakSet();
let announceTimerId = null;
let lastAnnouncedEl = null;

/**
 * Link or unlink the field's inline error element ID in aria-describedby only while invalid.
 */
function linkError(el, shown) {
    const errorId = el?.dataset?.error;
    if (!errorId) return;
    const ids = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(id => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
}

function spokenText(node) {
    if (!node) return '';
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
    copy.querySelectorAll('[role="img"][aria-label]').forEach(n => {
        n.replaceWith(`${n.getAttribute('aria-label')}: `);
    });
    return copy.textContent.replace(/\s+/g, ' ').trim();
}

function announceError(el) {
    if (!formErrorLive || !el?.dataset?.error) return;
    const errorEl = document.getElementById(el.dataset.error);
    if (!errorEl) return;
    const labelText = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : '';
    clearTimeout(announceTimerId);
    formErrorLive.textContent = '';
    lastAnnouncedEl = el;
    announceTimerId = setTimeout(() => {
        formErrorLive.textContent = labelText + spokenText(errorEl);
    }, 450);
}

/**
 * Sync aria-invalid, aria-describedby, and fallback visual error classes for a form control.
 */
function syncFieldAria(el, { announce = false, forceInvalid = false } = {}) {
    if (!el || !el.matches?.('input, select, textarea') || !el.hasAttribute('data-error')) return;

    const isInvalid = forceInvalid
        ? !el.validity.valid
        : (el.matches(':user-invalid') || (interactedFields.has(el) && !el.validity.valid));

    if (isInvalid) {
        el.classList.add('user-invalid-fallback');
        el.setAttribute('aria-invalid', 'true');
        linkError(el, true);
        flaggedFields.add(el);
        if (announce && !announcedFields.has(el)) {
            announceError(el);
            announcedFields.add(el);
        }
    } else if (flaggedFields.has(el) || el.getAttribute('aria-invalid') !== 'true') {
        el.classList.remove('user-invalid-fallback');
        el.setAttribute('aria-invalid', 'false');
        linkError(el, false);
        flaggedFields.delete(el);
        announcedFields.delete(el);
        if (lastAnnouncedEl === el && formErrorLive) {
            clearTimeout(announceTimerId);
            formErrorLive.textContent = '';
        }
    }
}

function clearFormValidation() {
    [subjectInput, postCategorySelect].forEach(el => {
        if (!el) return;
        interactedFields.delete(el);
        flaggedFields.delete(el);
        announcedFields.delete(el);
        el.classList.remove('user-invalid-fallback');
        el.setAttribute('aria-invalid', 'false');
        linkError(el, false);
    });
    if (formErrorLive) {
        clearTimeout(announceTimerId);
        formErrorLive.textContent = '';
    }
}

/**
 * Match a stored Firestore category string against the select's canonical options.
 */
function normalizeCategoryValue(rawCategory) {
    if (!postCategorySelect || !rawCategory) return '';
    const normalize = (str) => String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const target = normalize(rawCategory);
    for (const option of postCategorySelect.options) {
        if (option.value && normalize(option.value) === target) {
            return option.value;
        }
    }
    return '';
}

function updatePrimaryActionLabel() {
    if (!sendAllBtn) return;
    sendAllBtn.textContent = publishOnlyCheck?.checked
        ? 'Publicar no Portal'
        : 'Enviar para Todos';
}

function setEditingBanner(slug, title) {
    if (!editingBanner || !editingBannerLabel) return;
    if (slug) {
        editingBanner.classList.remove('hidden');
        editingBannerLabel.textContent = `Editando: ${title || slug}`;
    } else {
        editingBanner.classList.add('hidden');
        editingBannerLabel.textContent = 'Editando matéria existente';
    }
}

function resetComposeForm() {
    const preservedTestEmail = testEmailInput ? testEmailInput.value : '';
    currentEditingSlug = null;
    if (composeForm) composeForm.reset();
    if (subjectInput) {
        subjectInput.setCustomValidity('');
        subjectInput.value = '';
    }
    if (postCategorySelect) postCategorySelect.value = '';
    if (postThumbnailInput) postThumbnailInput.value = '';
    if (testEmailInput) testEmailInput.value = preservedTestEmail;
    if (isCodeView) {
        exitCodeView({ syncToQuill: false, confirmComplex: false });
    }
    htmlEditor.value = '';
    if (previewFrame) previewFrame.classList.add('hidden');
    quill.setContents([]);
    if (publishOnlyCheck) publishOnlyCheck.checked = false;
    updatePrimaryActionLabel();
    setEditingBanner(null);
    clearFormValidation();
}

// Prevent whitespace-only titles from passing Constraint Validation as valid
if (subjectInput) {
    subjectInput.addEventListener('input', () => {
        if (subjectInput.value.length > 0 && subjectInput.value.trim().length === 0) {
            subjectInput.setCustomValidity('Informe um título ou assunto válido.');
        } else {
            subjectInput.setCustomValidity('');
        }
    });
}

// Track interaction & clear errors lazily on compose fields
if (composeForm) {
    composeForm.addEventListener('input', (e) => {
        const el = e.target;
        if (!el?.dataset?.error) return;
        interactedFields.add(el);
        if (el.validity.valid) {
            syncFieldAria(el);
        }
    });

    composeForm.addEventListener('change', (e) => {
        const el = e.target;
        if (!el?.dataset?.error) return;
        interactedFields.add(el);
        syncFieldAria(el, { announce: true, forceInvalid: !el.validity.valid });
    });

    composeForm.addEventListener('blur', (e) => {
        const el = e.target;
        if (!el?.dataset?.error) return;
        if (interactedFields.has(el) || el.matches(':user-invalid')) {
            syncFieldAria(el, { announce: true, forceInvalid: !el.validity.valid });
        }
    }, true);

    composeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendEmailAction(false, false);
    });
}

if (publishOnlyCheck) {
    publishOnlyCheck.addEventListener('change', updatePrimaryActionLabel);
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        resetComposeForm();
        showStatus('Modo edição encerrado. Pronto para nova matéria.', 'info');
    });
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
    setTimeout(() => mdInput.focus(), 50);
    renderMdPreview();
}

function closeMarkdownModal() {
    mdModal.classList.add('hidden');
    mdInput.value = '';
    mdPreview.innerHTML = '<p class="text-zinc-400 italic text-center mt-20">A pré-visualização aparecerá aqui...</p>';
}

function renderMdPreview() {
    const text = mdInput.value;
    const format = importFormatSelect ? importFormatSelect.value : 'markdown';

    if (!text.trim()) {
        mdPreview.innerHTML = '<p class="text-zinc-400 italic text-center mt-20">A pré-visualização aparecerá aqui...</p>';
        return;
    }

    try {
        const html = format === 'markdown' ? marked.parse(text) : text;
        mdPreview.innerHTML = html;
    } catch (e) {
        console.error(e);
        mdPreview.innerHTML = '<p class="text-rose-600 text-center mt-10">Erro na pré-visualização</p>';
    }
}

mdInput.addEventListener('input', renderMdPreview);
if (importFormatSelect) {
    importFormatSelect.addEventListener('change', renderMdPreview);
}

[closeMdBtn, cancelMdBtn].forEach(btn => btn?.addEventListener('click', closeMarkdownModal));

if (mdModal) {
    mdModal.addEventListener('click', (e) => {
        if (e.target === mdModal) closeMarkdownModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mdModal.classList.contains('hidden')) {
            closeMarkdownModal();
        }
    });
}

confirmMdBtn.addEventListener('click', () => {
    const text = mdInput.value;
    const format = importFormatSelect ? importFormatSelect.value : 'markdown';

    if (!text.trim()) return;

    try {
        const html = format === 'markdown' ? marked.parse(text) : text;
        if (isCodeView) {
            htmlEditor.value = html;
            renderPreview();
        } else {
            const range = quill.getSelection(true);
            if (range) {
                quill.clipboard.dangerouslyPasteHTML(range.index, html);
            } else {
                quill.clipboard.dangerouslyPasteHTML(quill.getLength(), html);
            }
        }

        closeMarkdownModal();
        showStatus("Conteúdo importado com sucesso!", 'success');
    } catch (e) {
        showStatus("Erro ao importar.", 'error');
    }
});

// --- AUTH STATE ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        adminEmailSpan.textContent = user.email;
        loadHistory();
        loadSubscribers();
    } else {
        window.location.href = '../login/index.html';
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '../login/index.html';
    });
});

// --- TABS LOGIC ---
const ACTIVE_TAB_CLASSES = ['border-[#E11D48]', 'text-[#0A0A0B]', 'font-extrabold'];
const INACTIVE_TAB_CLASSES = ['border-transparent', 'text-zinc-500', 'font-bold'];

function switchTab(tabId) {
    tabCompose.classList.add('hidden');
    tabHistory.classList.add('hidden');
    tabSubscribers.classList.add('hidden');

    [tabComposeBtn, tabHistoryBtn, tabSubscribersBtn].forEach(btn => {
        btn.classList.remove(...ACTIVE_TAB_CLASSES);
        btn.classList.add(...INACTIVE_TAB_CLASSES);
        btn.removeAttribute('aria-current');
    });

    if (tabId === 'compose') {
        tabCompose.classList.remove('hidden');
        tabComposeBtn.classList.remove(...INACTIVE_TAB_CLASSES);
        tabComposeBtn.classList.add(...ACTIVE_TAB_CLASSES);
        tabComposeBtn.setAttribute('aria-current', 'page');
    } else if (tabId === 'history') {
        tabHistory.classList.remove('hidden');
        tabHistoryBtn.classList.remove(...INACTIVE_TAB_CLASSES);
        tabHistoryBtn.classList.add(...ACTIVE_TAB_CLASSES);
        tabHistoryBtn.setAttribute('aria-current', 'page');
        loadHistory();
    } else if (tabId === 'subscribers') {
        tabSubscribers.classList.remove('hidden');
        tabSubscribersBtn.classList.remove(...INACTIVE_TAB_CLASSES);
        tabSubscribersBtn.classList.add(...ACTIVE_TAB_CLASSES);
        tabSubscribersBtn.setAttribute('aria-current', 'page');
        loadSubscribers();
    }
}

tabComposeBtn.addEventListener('click', () => {
    resetComposeForm();
    switchTab('compose');
});
tabHistoryBtn.addEventListener('click', () => switchTab('history'));
tabSubscribersBtn.addEventListener('click', () => switchTab('subscribers'));

// --- EDIT DRAFT LOGIC ---
window.loadDraft = async function (slug) {
    try {
        showStatus('Carregando matéria...', 'info');
        const docRef = doc(db, "newsletter_posts", slug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            resetComposeForm();
            subjectInput.value = data.title || '';
            if (postThumbnailInput) postThumbnailInput.value = data.thumbnail || '';
            if (postCategorySelect) {
                postCategorySelect.value = normalizeCategoryValue(data.category);
            }

            const content = data.content || '';
            const isComplexHtml = content.includes('<html') || content.includes('<body') || content.includes('<style');

            if (isComplexHtml) {
                if (!isCodeView) enterCodeView(false);
                htmlEditor.value = content;
                renderPreview();
            } else {
                try {
                    if (isCodeView) exitCodeView({ syncToQuill: false, confirmComplex: false });
                    htmlEditor.value = '';
                    quill.setContents([]);
                    quill.clipboard.dangerouslyPasteHTML(0, content);
                } catch (quillErr) {
                    console.error("Quill failed to parse content, falling back to Code View:", quillErr);
                    showStatus('Conteúdo complexo detectado. Abrindo em modo Código.', 'warning');
                    if (!isCodeView) enterCodeView(false);
                    htmlEditor.value = content;
                    renderPreview();
                }
            }

            currentEditingSlug = slug;
            setEditingBanner(slug, data.title || slug);
            clearFormValidation();
            switchTab('compose');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showStatus('Matéria carregada. Pode editar agora.', 'success');
        } else {
            showStatus('Rascunho não encontrado.', 'error');
        }
    } catch (error) {
        console.error("Erro ao carregar rascunho:", error);
        showStatus('Erro ao carregar rascunho.', 'error');
    }
};

// --- COMPOSE & SEND ACTIONS ---
async function sendEmailAction(isTest = true, saveOnly = false) {
    let content = '';
    if (isCodeView) {
        content = htmlEditor.value;
    } else {
        content = quill.root.innerHTML;
    }

    const subject = subjectInput.value.trim();
    const category = postCategorySelect ? postCategorySelect.value.trim() : '';
    const thumbnail = postThumbnailInput?.value.trim() || null;
    const testEmail = testEmailInput.value.trim();
    const publishOnly = publishOnlyCheck ? publishOnlyCheck.checked : false;

    if (!subject) {
        announcedFields.add(subjectInput);
        syncFieldAria(subjectInput, { forceInvalid: true });
        subjectInput.focus();
        return showStatus('Por favor, informe o título ou assunto da matéria.', 'error');
    }

    if (!saveOnly && !isTest && !category) {
        announcedFields.add(postCategorySelect);
        syncFieldAria(postCategorySelect, { forceInvalid: true });
        postCategorySelect.focus();
        return showStatus('Selecione uma editoria para publicar no portal.', 'error');
    }

    if (isCodeView) {
        if (!content || content.trim().length === 0) {
            htmlEditor.focus();
            return showStatus('O conteúdo HTML não pode estar vazio.', 'error');
        }
    } else {
        const textContent = quill.getText().trim();
        if (textContent.length === 0 && !content.includes('<img') && !content.includes('<table') && !content.includes('<div')) {
            quill.focus();
            return showStatus('O conteúdo da matéria não pode estar vazio.', 'error');
        }
    }

    if (isTest && !saveOnly && !publishOnly && (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail))) {
        testEmailInput.focus();
        return showStatus('Para enviar um teste, informe um email de destino válido.', 'error');
    }

    if (!isTest && !saveOnly) {
        let confirmMsg = 'ATENÇÃO: Você está prestes a enviar este email para TODOS os seus inscritos ativos. Esta ação não pode ser desfeita. Deseja continuar?';
        if (publishOnly) {
            confirmMsg = 'Confirmar publicação no Portal? (Nenhum email será enviado)';
        }

        if (!confirm(confirmMsg)) {
            return;
        }
    }

    setLoading(true);

    try {
        const token = await auth.currentUser.getIdToken();
        const functionUrl = '/api/sendNewsletter';

        const payload = {
            token,
            subject,
            thumbnail,
            category: category || null,
            htmlContent: content,
            isTest,
            testEmail: isTest ? testEmail : null,
            saveOnly,
            publishOnly,
            slug: currentEditingSlug
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
                if (!currentEditingSlug && result.slug) {
                    currentEditingSlug = result.slug;
                    setEditingBanner(result.slug, subject);
                }
            } else if (!isTest) {
                resetComposeForm();
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

sendTestBtn.addEventListener('click', () => sendEmailAction(true, false));
saveDraftBtn.addEventListener('click', () => sendEmailAction(false, true));

// --- HISTORY LOGIC ---
if (importPostsCsvBtn && csvPostsInput) {
    importPostsCsvBtn.addEventListener('click', () => csvPostsInput.click());
}

if (csvPostsInput) {
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
                csvPostsInput.value = '';
            },
            error: function () {
                showStatus("Erro ao ler CSV.", 'error');
                csvPostsInput.value = '';
            }
        });
    });
}

if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener('click', loadHistory);
}

if (historyTableBody) {
    historyTableBody.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.dataset.action;
        const slug = actionBtn.dataset.slug;
        if (!slug) return;

        if (action === 'edit') window.loadDraft(slug);
        else if (action === 'resend') window.resendPost(slug);
        else if (action === 'delete') window.deletePost(slug);
    });
}

async function loadHistory() {
    historyTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-zinc-500">Carregando histórico editorial...</td></tr>';

    try {
        const q = query(collection(db, "newsletter_posts"));
        const querySnapshot = await getDocs(q);

        historyTableBody.innerHTML = '';

        if (querySnapshot.empty) {
            historyTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-zinc-500">Nenhuma matéria ou envio encontrado.</td></tr>';
            return;
        }

        const docs = [];
        querySnapshot.forEach(docItem => docs.push({ id: docItem.id, ...docItem.data() }));

        docs.sort((a, b) => {
            const dateA = safeDateSort(a.updatedAt || a.createdAt || a.sentAt);
            const dateB = safeDateSort(b.updatedAt || b.createdAt || b.sentAt);
            return dateB - dateA;
        });

        docs.forEach((data) => {
            try {
                const slug = data.id;
                const safeSlug = escapeHtml(slug);
                const encodedSlug = encodeURIComponent(slug);
                const rawTitle = data.title || `Sem Título (${slug})`;
                const safeTitle = escapeHtml(rawTitle);

                const categoryLabel = data.category ? escapeHtml(data.category) : '';
                const categoryBadge = categoryLabel
                    ? `<span class="inline-flex items-center px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-rose-50 text-[#BE123C] border border-rose-200 rounded-sm">${categoryLabel}</span>`
                    : `<span class="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200 rounded-sm">Sem editoria</span>`;

                const sentDate = safeDate(data.sentAt);
                const updateDate = safeDate(data.updatedAt);

                let dateStr = '-';
                if (sentDate && !Number.isNaN(sentDate.getTime())) {
                    dateStr = sentDate.toLocaleString('pt-BR');
                } else if (updateDate && !Number.isNaN(updateDate.getTime())) {
                    dateStr = `${updateDate.toLocaleDateString('pt-BR')} (Rascunho)`;
                }

                const isSent = data.status === 'sent';
                const statusBadge = isSent
                    ? '<span class="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-sm">Publicado / Enviado</span>'
                    : '<span class="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 rounded-sm">Rascunho</span>';

                const sentCount = data.sentCount !== undefined ? data.sentCount : '-';

                let actionButtons = `
                    <a href="/artigos/${encodedSlug}" target="_blank" rel="noopener noreferrer"
                        class="text-zinc-700 hover:text-[#0A0A0B] font-bold text-xs uppercase tracking-wider mr-3 underline-offset-4 hover:underline">Ver</a>
                    <button type="button" data-action="delete" data-slug="${safeSlug}"
                        class="text-rose-600 hover:text-rose-800 font-black text-sm align-middle" title="Excluir matéria" aria-label="Excluir ${safeTitle}">✕</button>
                `;

                if (data.status === 'draft') {
                    actionButtons = `
                        <button type="button" data-action="edit" data-slug="${safeSlug}"
                            class="text-[#0A0A0B] hover:text-[#E11D48] font-bold text-xs uppercase tracking-wider mr-3">Editar</button>
                        ${actionButtons}
                    `;
                } else {
                    actionButtons = `
                        <button type="button" data-action="resend" data-slug="${safeSlug}"
                            class="text-zinc-600 hover:text-[#0A0A0B] font-bold text-xs uppercase tracking-wider mr-3" title="Reenviar Emails">Reenviar</button>
                        <button type="button" data-action="edit" data-slug="${safeSlug}"
                            class="text-[#0A0A0B] hover:text-[#E11D48] font-bold text-xs uppercase tracking-wider mr-3">Editar</button>
                        ${actionButtons}
                    `;
                }

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-zinc-50 transition-colors';
                tr.innerHTML = `
                    <td class="px-6 py-4 text-sm font-semibold text-[#0A0A0B] max-w-xs sm:max-w-md truncate" title="${safeTitle}">${safeTitle}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${categoryBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-xs font-medium text-zinc-600 tabular-nums">${escapeHtml(dateStr)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-xs font-bold text-zinc-700 tabular-nums">${escapeHtml(String(sentCount))}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${actionButtons}</td>
                `;
                historyTableBody.appendChild(tr);
            } catch (rowErr) {
                console.error("Erro ao renderizar linha:", rowErr, data);
            }
        });

    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        historyTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-sm font-semibold text-rose-600">Erro ao carregar dados do histórico.</td></tr>';
    }
}

function safeDate(val) {
    if (!val) return null;
    if (val.seconds) return new Date(val.seconds * 1000);
    if (val instanceof Date) return val;
    if (typeof val === 'string' || typeof val === 'number') return new Date(val);
    return null;
}

function safeDateSort(val) {
    const d = safeDate(val);
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
}

// --- DELETE LOGIC ---
window.deletePost = async function (slug) {
    if (!confirm('Tem certeza que deseja EXCLUIR este post permanentemente?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, "newsletter_posts", slug));
        showStatus('Post excluído com sucesso.', 'success');
        loadHistory();
    } catch (error) {
        console.error("Erro ao excluir:", error);
        showStatus('Erro ao excluir post.', 'error');
    }
};

// --- RESEND LOGIC ---
window.resendPost = async function (slug) {
    setLoading(true);

    try {
        const docRef = doc(db, "newsletter_posts", slug);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Post original não encontrado.");
        }

        const data = docSnap.data();

        setLoading(false);
        if (!confirm(`ATENÇÃO: Deseja reenviar o email do post "${data.title}" para TODOS os inscritos ativos?`)) {
            return;
        }
        setLoading(true);

        const token = await auth.currentUser.getIdToken();
        const functionUrl = '/api/sendNewsletter';

        const payload = {
            token,
            subject: data.title,
            thumbnail: data.thumbnail,
            category: data.category || null,
            htmlContent: data.content,
            isTest: false,
            saveOnly: false,
            publishOnly: false,
            slug: slug
        };

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            let msgType = 'success';
            if (result.message && result.message.includes('Nenhum inscrito')) msgType = 'warning';
            if (result.stats && result.stats.successCount === 0 && result.stats.failureCount > 0) {
                msgType = 'error';
                if (result.stats.errors && result.stats.errors.length > 0) {
                    alert(`Falha no envio: ${result.stats.errors[0]}`);
                }
            }

            showStatus(result.message || 'Emails reenviados com sucesso!', msgType);
            loadHistory();
        } else {
            throw new Error(result.error || 'Falha ao reenviar.');
        }

    } catch (error) {
        console.error("Erro ao reenviar:", error);
        showStatus('Erro ao reenviar: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
};

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- SUBSCRIBER MANAGEMENT LOGIC ---
let allSubscribers = [];

if (subscribersList) {
    subscribersList.addEventListener('click', (e) => {
        const delBtn = e.target.closest('[data-delete-email]');
        if (!delBtn) return;
        const email = delBtn.dataset.deleteEmail;
        if (email) window.deleteSubscriber(email);
    });
}

async function loadSubscribers() {
    try {
        setLoading(true);
        const q = query(collection(db, "newsletter_subscribers"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        allSubscribers = [];
        querySnapshot.forEach((docItem) => {
            allSubscribers.push({ id: docItem.id, ...docItem.data() });
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
        subscribersList.innerHTML = '<li class="px-6 py-8 text-center text-sm text-zinc-500">Nenhum inscrito encontrado.</li>';
        return;
    }

    subscribers.forEach((data) => {
        const date = data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('pt-BR')
            : '-';
        const source = data.source === 'csv_import' ? 'Importação' : 'Site';
        const rawEmail = data.email || data.id || '';
        const safeEmail = escapeHtml(rawEmail);
        const isActive = data.status === 'active';

        const li = document.createElement('li');
        li.className = "px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors";
        li.innerHTML = `
            <div class="min-w-0 pr-4">
                <div class="text-sm font-semibold text-[#0A0A0B] truncate">${safeEmail}</div>
                <div class="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                    <span class="tabular-nums">${escapeHtml(date)}</span>
                    <span class="text-zinc-300" aria-hidden="true">•</span>
                    <span>${escapeHtml(source)}</span>
                </div>
            </div>
            <div class="flex items-center gap-4 shrink-0">
                <span class="px-2.5 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider border ${isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}">
                    ${isActive ? 'Ativo' : 'Cancelado'}
                </span>
                <button type="button" data-delete-email="${safeEmail}" class="text-zinc-400 hover:text-rose-600 transition-colors p-1" title="Remover Inscrito" aria-label="Remover ${safeEmail}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        subscribersList.appendChild(li);
    });
}

if (subscriberSearchInput) {
    subscriberSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allSubscribers.filter(sub => (sub.email || '').toLowerCase().includes(term));
        renderSubscribersList(filtered);
    });
}

window.deleteSubscriber = async function (email) {
    if (!confirm(`Tem certeza que deseja remover ${email} da lista?`)) return;

    try {
        await deleteDoc(doc(db, "newsletter_subscribers", email));
        showStatus(`Inscrito ${email} removido.`, 'success');

        allSubscribers = allSubscribers.filter(s => s.email !== email);
        totalSubscribersCount.textContent = allSubscribers.length;

        const term = subscriberSearchInput ? subscriberSearchInput.value.toLowerCase() : '';
        const filtered = allSubscribers.filter(sub => (sub.email || '').toLowerCase().includes(term));
        renderSubscribersList(filtered);

    } catch (e) {
        console.error("Erro ao deletar:", e);
        showStatus("Erro ao remover inscrito.", 'error');
    }
};

importCsvBtn.addEventListener('click', () => {
    const file = csvFileInput.files[0];
    if (!file) return showStatus("Selecione um arquivo CSV.", 'error');

    setLoading(true);
    importCsvBtn.disabled = true;
    importCsvBtn.textContent = "Processando...";

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function (results) {
            console.log("Parsed CSV:", results);
            let emailsToImport = [];
            const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (results.meta.fields && results.meta.fields.some(f => f.toLowerCase().includes('email'))) {
                const emailField = results.meta.fields.find(f => f.toLowerCase().includes('email'));
                results.data.forEach(row => {
                    if (row[emailField] && isValidEmail(row[emailField].trim())) {
                        emailsToImport.push(row[emailField].trim());
                    }
                });
            } else {
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
                importCsvBtn.textContent = "Importar CSV";
                setLoading(false);
                return;
            }

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
                            createdAt: serverTimestamp()
                        }, { merge: true });
                    });

                    await batch.commit();
                    totalImported += chunk.length;
                    console.log(`Batch ${batchCount + 1} committed (${chunk.length} emails).`);
                    batchCount++;
                }

                showStatus(`Sucesso! ${totalImported} emails processados.`, 'success');
                loadSubscribers();

            } catch (err) {
                console.error("Erro na importação:", err);
                showStatus("Erro ao salvar no banco de dados.", 'error');
            } finally {
                importCsvBtn.disabled = false;
                importCsvBtn.textContent = "Importar CSV";
                setLoading(false);
            }
        },
        error: function (err) {
            console.error(err);
            showStatus("Erro ao ler arquivo CSV.", 'error');
            importCsvBtn.disabled = false;
            importCsvBtn.textContent = "Importar CSV";
            setLoading(false);
        }
    });
});

// --- UTILS ---
function showStatus(msg, type = 'info') {
    if (!statusMessage || !statusText) return;
    clearTimeout(statusTimeoutId);

    const accentByType = {
        error: 'border-l-4 border-[#E11D48]',
        success: 'border-l-4 border-emerald-400',
        warning: 'border-l-4 border-amber-400',
        info: 'border-l-4 border-zinc-400'
    };
    const borderClass = accentByType[type] || accentByType.info;

    statusMessage.className = `fixed bottom-8 left-1/2 -translate-x-1/2 max-w-lg w-[calc(100%-2rem)] shadow-2xl rounded-sm pointer-events-auto z-50 transition-all duration-300 bg-[#0A0A0B] text-white ${borderClass}`;
    statusText.textContent = msg;
    statusMessage.classList.remove('hidden');

    statusTimeoutId = setTimeout(() => {
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
