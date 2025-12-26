/**
 * Analytics Module - Trilha Comigo
 * Responsável por centralizar o disparo de eventos para Facebook Pixel, Google Ads e GA4.
 */

const Analytics = {
    settings: {
        facebookPixelId: 'YOUR_PIXEL_ID_HERE', // TODO: Bruno preencher
        googleTagId: 'G-KRNK2W5VPX',
        debug: true // Set to false in production
    },

    init: function () {
        this.log('Analytics initialized');
        this.loadFacebookPixel();
        this.loadGoogleTagManager();
    },

    loadFacebookPixel: function () {
        if (this.settings.facebookPixelId === 'YOUR_PIXEL_ID_HERE') {
            this.log('Facebook Pixel ID not set. Skipping load.');
            return;
        }
        // Standard Facebook Pixel Code would go here
        this.log('Loading Facebook Pixel...');
    },

    loadGoogleTagManager: function () {
        if (this.settings.googleTagId === 'YOUR_GTM_ID_HERE') {
            this.log('GTM ID not set. Skipping load.');
            return;
        }
        // Standard GTM Code would go here
        this.log('Loading GTM...');
    },

    /**
     * Dispara um evento de rastreamento
     * @param {string} eventName Nome do evento (ex: 'Sign_Up', 'Purchase', 'Add_Transaction')
     * @param {object} eventData Dados adicionais do evento (ex: { value: 9.90, currency: 'BRL' })
     */
    track: function (eventName, eventData = {}) {
        this.log(`Tracking Event: ${eventName}`, eventData);

        // Disparar para Facebook (Exemplo)
        if (typeof fbq === 'function') {
            fbq('track', eventName, eventData);
        }

        // Disparar para GTM (DataLayer)
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'event': eventName,
            ...eventData
        });
    },

    log: function (message, data) {
        if (this.settings.debug) {
            console.log(`[Analytics] ${message}`, data || '');
        }
    }
};

window.Analytics = Analytics;
Analytics.init();
