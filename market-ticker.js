document.addEventListener('DOMContentLoaded', async () => {
    const marketTicker = document.getElementById('market-ticker');
    if (!marketTicker) return;

    try {
        // Fetch Currency Data (USD, EUR, BTC) from AwesomeAPI
        const currencyResponse = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
        const currencyData = await currencyResponse.json();

        const usd = parseFloat(currencyData.USDBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const eur = parseFloat(currencyData.EURBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const btc = parseFloat(currencyData.BTCBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // SELIC/CDI Strategy
        // Since BCB API often has CORS or complexity, we will set a fallback/static value 
        // OR try to fetch from a proxy if available. For now, let's use a "nice to have" approach.
        // We will hardcode a recent approximate value if fetch fails, or use a reliable public JSON if found.
        // For this MVP, we will stick to Currencies + "CDI/Selic" if we can find them, otherwise static recent.
        // Let's rely on standard Currencies which are dynamic.

        let tickerHtml = `
            <div class="flex items-center gap-6 overflow-hidden whitespace-nowrap">
                <span class="flex items-center gap-1 font-bold text-green-400">
                    <span class="text-xs text-gray-400">USD</span> ${usd}
                </span>
                <span class="flex items-center gap-1 font-bold text-blue-400">
                    <span class="text-xs text-gray-400">EUR</span> ${eur}
                </span>
                <span class="flex items-center gap-1 font-bold text-yellow-400">
                    <span class="text-xs text-gray-400">BTC</span> ${btc}
                </span>
                 <!-- Placeholder for Selic/CDI - Hardcoded fallback for now as reliable open API is tricky without backend proxy -->
                <span class="flex items-center gap-1 font-bold text-white opacity-60">
                    <span class="text-xs text-gray-400">SELIC</span> 11.25%
                </span>
            </div>
        `;

        // Replace the "Marquee" or content in the container
        marketTicker.innerHTML = tickerHtml;

    } catch (error) {
        console.error("Error fetching market data:", error);
        if (marketTicker) marketTicker.innerHTML = '<span class="text-gray-500 text-xs">Mercado Indisponível</span>';
    }
});
