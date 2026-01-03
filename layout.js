
/**
 * Shared Layout Component
 * Injects the Sure-inspired Sidebar and Header into pages.
 */

const sidebarHTML = `
<aside class="hidden md:flex flex-col w-64 bg-gray-950 border-r border-gray-800 h-screen fixed left-0 top-0 z-50">
    <div class="p-6 flex items-center gap-3">
        <img src="imgs/favicon.png" alt="Logo" class="w-8 h-8 rounded-lg shadow-lg shadow-indigo-500/20">
        <span class="font-bold text-lg text-white tracking-tight">Trilha Comigo</span>
    </div>
    
    <nav class="flex-1 px-3 space-y-1 py-4">
        <div class="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</div>
        
        <a href="dashboard.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
            Dashboard
        </a>

        <a href="transactions.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Transações
        </a>

        <a href="investments.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            Investimentos
        </a>
        
        <a href="goals.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Metas
        </a>
        
        <div class="px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Outros</div>

        <a href="coach.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            Coach AI
        </a>

        <a href="settings.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Configurações
        </a>
        
        <a href="budgets.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
             <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Orçamentos
        </a>

        <a href="debts.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Dívidas
        </a>

        <a href="tasks.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
             <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            Tarefas
        </a>

        <a href="calculator.html" class="nav-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
            <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Calculadora
        </a>
    </nav>

    <div class="p-4 border-t border-gray-800">
        <a href="checkout.html" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer group">
            <div class="relative">
                <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold" id="user-avatar">
                   U
                </div>
                <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-950 rounded-full"></div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-white truncate" id="user-name">Carregando...</div>
                <div class="text-xs text-indigo-400">Premium Member</div>
            </div>
            <svg class="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </a>
    </div>
</aside>

<!-- Mobile Header -->
<div class="md:hidden fixed top-0 w-full bg-gray-950 text-white z-50 flex items-center justify-between p-4 border-b border-gray-800">
    <div class="flex items-center gap-2">
        <img src="imgs/favicon.png" alt="Logo" class="w-8 h-8 rounded">
        <span class="font-bold">Trilha Comigo</span>
    </div>
    <button id="mobile-menu-toggle" class="p-2 text-gray-300 hover:text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
    </button>
</div>

<!-- Mobile Menu Overlay -->
<div id="mobile-sidebar-overlay" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden glass-effect"></div>
`;

function renderLayout() {
    // 1. Inject Sidebar
    const body = document.body;
    const layoutContainer = document.createElement('div');
    layoutContainer.innerHTML = sidebarHTML;
    body.prepend(layoutContainer);

    // 2. Adjust Main Content
    // Find the main content wrapper (usually #app-view or body itself)
    // We expect the specific page content to be in a <main> or similar.
    // We add 'md:ml-64' to body or the wrapper to account for the fixed sidebar.
    // But since pages might have different structures, check for #app-view.

    // For specific pages, we might need a dedicated container.
    // Let's assume we target the existing layouts.

    const appView = document.getElementById('app-view');
    if (appView) {
        // Prepare app-view for the new layout
        // Remove existing sidebar if any
        const existingSidebar = document.getElementById('sidebar');
        if (existingSidebar) existingSidebar.remove();

        // Remove existing mobile nav/header if they conflict
        const existingHeader = document.querySelector('header');
        if (existingHeader) existingHeader.className += ' md:ml-64'; // Add margin to header

        // Add margin to the main content container
        appView.className += ' md:ml-64 min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-0 pb-20 md:pb-0 transition-all duration-300';
    } else {
        // Fallback for pages without app-view
        body.className += ' md:ml-64 min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-0';
    }

    // 3. Highlight Active Link
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('href') && currentPath.includes(link.getAttribute('href'))) {
            // Active State
            link.classList.remove('text-gray-400', 'group-hover:text-indigo-400');
            link.classList.add('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-500/30');
            link.querySelector('svg').classList.remove('text-gray-400');
            link.querySelector('svg').classList.add('text-white');
        } else {
            // Inactive State
            link.classList.add('text-gray-400', 'hover:bg-white/5', 'hover:text-white');
        }
    });

    // 4. Mobile Menu Logic
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    // We need to clone the sidebar for mobile or toggle visibility logic
    // The current Sidebar HTML is 'hidden md:flex'. We need a mobile version or toggle classes.
    // Easiest is to select the sidebar we injected and toggle classes.

    const sidebarElement = document.querySelector('aside');

    if (mobileBtn && sidebarElement) {
        mobileBtn.addEventListener('click', () => {
            sidebarElement.classList.toggle('hidden');
            sidebarElement.classList.toggle('flex');
            sidebarElement.classList.toggle('fixed');
            sidebarElement.classList.toggle('inset-y-0');
            sidebarElement.classList.toggle('z-50');
            // Assuming we just toggle the hidden class and add standard mobile drawer classes
            // But the HTML above is 'hidden md:flex', so removing 'hidden' makes it 'flex'.
            // Being 'fixed left-0 top-0' works for mobile too.

            overlay.classList.toggle('hidden');
        });

        overlay.addEventListener('click', () => {
            sidebarElement.classList.add('hidden');
            overlay.classList.add('hidden');
        });
    }

    // 5. User Data Injection (Placeholder)
    // app.js will handle the actual data fetching, but we prepare the slots.
}

// Auto-render on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderLayout);
} else {
    renderLayout();
}
