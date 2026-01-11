document.addEventListener('DOMContentLoaded', async () => {
    const tickerLabel = document.getElementById('ticker-label');
    const tickerContent = document.getElementById('ticker-content');

    if (!tickerLabel || !tickerContent) return;

    let marketData = null;
    let newsHeadlines = [];
    let currentMode = 'market'; // 'market' or 'news'

    // Fetch Market Data
    async function fetchMarketData() {
        try {
            const currencyResponse = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
            const currencyData = await currencyResponse.json();

            const usd = parseFloat(currencyData.USDBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const eur = parseFloat(currencyData.EURBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const btc = parseFloat(currencyData.BTCBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            marketData = { usd, eur, btc };
        } catch (error) {
            console.error("Error fetching market data:", error);
        }
    }

    // Fetch Latest News Headlines
    async function fetchNewsHeadlines() {
        try {
            const posts = await fetchNewsletterPosts(5); // Get 5 latest posts
            newsHeadlines = posts.map(post => post.title);
        } catch (error) {
            console.error("Error fetching news headlines:", error);
        }
    }

    // Display Market Data
    function showMarket() {
        if (!marketData) {
            tickerContent.innerHTML = '<span class="text-gray-500">Carregando...</span>';
            return;
        }

        tickerLabel.textContent = 'MERCADO AGORA:';
        tickerLabel.className = 'text-yellow-400 font-bold text-[10px] md:text-xs whitespace-nowrap mr-2';

        // Remove old classes that might conflict
        tickerContent.className = "text-[10px] md:text-xs font-medium flex items-center flex-1 min-w-0";

        tickerContent.innerHTML = `
            <div class="marquee-container w-full overflow-hidden whitespace-nowrap relative">
                <div class="animate-marquee inline-block">
                    <span class="inline-flex gap-6 items-center">
                        <span class="flex items-center gap-1 font-bold text-green-400">
                            <span class="text-xs text-gray-400">USD</span> ${marketData.usd}
                        </span>
                        <span class="flex items-center gap-1 font-bold text-blue-400">
                            <span class="text-xs text-gray-400">EUR</span> ${marketData.eur}
                        </span>
                        <span class="flex items-center gap-1 font-bold text-yellow-400">
                            <span class="text-xs text-gray-400">BTC</span> ${marketData.btc}
                        </span>
                        <span class="flex items-center gap-1 font-bold text-white opacity-60">
                            <span class="text-xs text-gray-400">SELIC</span> 11.25%
                        </span>
                    </span>
                </div>
            </div>
        `;
    }

    // Display News Headlines
    function showNews() {
        if (newsHeadlines.length === 0) {
            // Se não tiver notícias, tenta buscar novamente ou mantém no mercado
            fetchNewsHeadlines();
            showMarket();
            currentMode = 'market';
            return;
        }

        tickerLabel.textContent = 'ÚLTIMAS NOTÍCIAS:';
        tickerLabel.className = 'text-pink-500 font-bold text-[10px] md:text-xs whitespace-nowrap mr-2';

        tickerContent.className = "text-[10px] md:text-xs font-medium flex items-center flex-1 min-w-0 text-white";

        const headlinesText = newsHeadlines.join('  •  ');

        tickerContent.innerHTML = `
            <div class="marquee-container w-full overflow-hidden whitespace-nowrap relative">
                <div class="animate-marquee inline-block">
                    <span class="font-medium">${headlinesText}</span>
                </div>
            </div>
        `;
    }

    // Toggle between market and news
    function toggleTicker() {
        currentMode = currentMode === 'market' ? 'news' : 'market';

        if (currentMode === 'market') {
            showMarket();
        } else {
            showNews();
        }
    }

    // Initialize
    await Promise.all([fetchMarketData(), fetchNewsHeadlines()]);
    showMarket(); // Start with market data

    // Alternate every 5 seconds
    setInterval(toggleTicker, 5000);
});
