/* ========================================
   TAWABIL SPICES – CONFIGURATION
   Environment-aware configuration for frontend
======================================== */

(function() {
    'use strict';

    // Detect environment based on hostname
    const isLocalhost = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('192.168.');

    const isProduction = window.location.hostname.includes('vercel.app') ||
                         window.location.hostname.includes('tawabil.');

    // API Configuration
    const API_CONFIG = {
        development: {
            baseUrl: 'http://localhost:5000/api',
            razorpayKey: '' // Leave empty in development - will use test mode
        },
        production: {
            baseUrl: '/api',
            razorpayKey: '' // Set via environment or leave empty for COD-only mode
        }
    };

    // WhatsApp Configuration - SINGLE SOURCE OF TRUTH
    const WHATSAPP_CONFIG = {
        number: '919901888305', // Primary business WhatsApp number
        defaultMessage: "Hi Tawabil! I'm interested in your premium spices. Please share details."
    };

    // Business Configuration
    const BUSINESS_CONFIG = {
        name: 'Tawabil Spices',
        currency: 'INR',
        deliveryCharge: 40,
        freeDeliveryAbove: 500,
        minOrderAmount: 200,
        supportedPincodes: /^560[0-9]{3}$/, // Bengaluru only
        deliveryCity: 'Bengaluru'
    };

    // Get current environment config
    function getConfig() {
        const env = isProduction ? 'production' : 'development';
        return {
            ...API_CONFIG[env],
            whatsapp: WHATSAPP_CONFIG,
            business: BUSINESS_CONFIG,
            isProduction: isProduction,
            isDevelopment: !isProduction
        };
    }

    // Expose configuration globally
    window.TawabilConfig = getConfig();

    // Helper function to get API URL
    window.getApiUrl = function(endpoint) {
        const baseUrl = window.TawabilConfig.baseUrl;
        return endpoint.startsWith('/') ? baseUrl + endpoint : baseUrl + '/' + endpoint;
    };

    // Helper function for WhatsApp
    window.openWhatsAppWithMessage = function(message) {
        const config = window.TawabilConfig.whatsapp;
        const url = `https://wa.me/${config.number}?text=${encodeURIComponent(message || config.defaultMessage)}`;
        window.open(url, '_blank');
    };

    // ----------------------------------------
    // ERROR MONITORING (Sentry)
    // ----------------------------------------

    // Error tracking configuration
    // To enable: Add Sentry script and set SENTRY_DSN_FRONTEND in your deployment
    const ERROR_CONFIG = {
        enabled: isProduction,
        sampleRate: 0.1, // Sample 10% of errors in production
        ignoreErrors: [
            'Network request failed',
            'Failed to fetch',
            'Load failed',
            'Script error'
        ]
    };

    // Global error handler
    window.onerror = function(message, source, lineno, colno, error) {
        if (!ERROR_CONFIG.enabled) {
            console.error('Error:', message, error);
            return false;
        }

        // Check if error should be ignored
        if (ERROR_CONFIG.ignoreErrors.some(ignored => message.includes(ignored))) {
            return false;
        }

        // Sample errors
        if (Math.random() > ERROR_CONFIG.sampleRate) {
            return false;
        }

        // Send to error tracking service if available
        if (window.Sentry) {
            window.Sentry.captureException(error || new Error(message), {
                extra: {
                    source: source,
                    line: lineno,
                    column: colno
                }
            });
        }

        // Log to console in development
        if (!isProduction) {
            console.error('Captured error:', { message, source, lineno, colno, error });
        }

        return false;
    };

    // Unhandled promise rejection handler
    window.onunhandledrejection = function(event) {
        if (!ERROR_CONFIG.enabled) {
            console.error('Unhandled rejection:', event.reason);
            return;
        }

        // Send to error tracking service if available
        if (window.Sentry) {
            window.Sentry.captureException(event.reason, {
                extra: {
                    type: 'unhandledrejection'
                }
            });
        }

        // Log in development
        if (!isProduction) {
            console.error('Unhandled rejection:', event.reason);
        }
    };

    // Custom error reporter
    window.reportError = function(error, context) {
        if (!ERROR_CONFIG.enabled && !window.TawabilConfig.isDevelopment) {
            return;
        }

        const errorData = {
            message: error.message || String(error),
            stack: error.stack,
            context: context,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        // Send to Sentry if available
        if (window.Sentry) {
            window.Sentry.withScope(function(scope) {
                if (context) {
                    scope.setExtras(context);
                }
                window.Sentry.captureException(error);
            });
        }

        // Log in development
        if (window.TawabilConfig.isDevelopment) {
            console.error('Reported error:', errorData);
        }

        // Optional: Send to custom endpoint
        // This can be enabled when you have a custom error logging endpoint
        /*
        fetch(window.TawabilConfig.baseUrl + '/errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData)
        }).catch(() => {});
        */
    };

    // Performance monitoring helper
    window.trackPerformance = function(name, value) {
        if (!isProduction) return;

        // Send to analytics if available
        if (window.gtag) {
            window.gtag('event', 'timing_complete', {
                name: name,
                value: Math.round(value)
            });
        }
    };

})();
