/**
 * VIP Card App - Multi-Currency & IP Geolocation Module
 * Features:
 * - Automatic IP Geolocation (Cloudflare / api.country.is / ipapi.co)
 * - Country to Currency Auto Mapping:
 *   * Saudi Arabia (SA) -> SAR (الريال السعودي)
 *   * Iraq (IQ) -> IQD (الدينار العراقي)
 *   * Other Countries -> USD (الدولار الأمريكي)
 * - Telegram Stars Exchange Rates & Conversion
 * - Persistent User Preferences in localStorage
 * - Dynamic UI Price Updates
 */

const CurrencyModule = (function () {
  const CURRENCIES = {
    SAR: {
      code: 'SAR',
      symbol: 'ر.س',
      name: 'ريال سعودي',
      flag: '🇸🇦',
      ratePerStar: 0.075, // 1 Star = 0.02 USD * 3.75 SAR = 0.075 SAR
      format: (stars) => `${(stars * 0.075).toFixed(2)} ر.س`
    },
    IQD: {
      code: 'IQD',
      symbol: 'د.ع',
      name: 'دينار عراقي',
      flag: '🇮🇶',
      ratePerStar: 26.2, // 1 Star = 0.02 USD * 1,310 IQD = 26.2 IQD
      format: (stars) => `${Math.round(stars * 26.2).toLocaleString('en-US')} د.ع`
    },
    USD: {
      code: 'USD',
      symbol: '$',
      name: 'دولار أمريكي',
      flag: '🇺🇸',
      ratePerStar: 0.02, // 1 Star = 0.02 USD (50 Stars = 1 USD)
      format: (stars) => `$${(stars * 0.02).toFixed(2)}`
    },
    XTR: {
      code: 'XTR',
      symbol: 'Stars',
      name: 'نجوم تيليجرام',
      flag: '⭐',
      ratePerStar: 1,
      format: (stars) => `⭐ ${stars} Stars`
    }
  };

  let activeCurrency = 'USD';
  let detectedCountry = 'US';
  let isInitialized = false;

  async function init() {
    if (isInitialized) return;
    isInitialized = true;

    // 1. Check if visitor preference is already saved in localStorage
    const savedCurrency = localStorage.getItem('vip_currency');
    const savedCountry = localStorage.getItem('vip_country');

    if (savedCurrency && CURRENCIES[savedCurrency]) {
      activeCurrency = savedCurrency;
      if (savedCountry) detectedCountry = savedCountry;
      updateSelectorUI();
      return;
    }

    // 2. Perform fast IP Geolocation detection
    await detectVisitorLocation();
    updateSelectorUI();
  }

  async function detectVisitorLocation() {
    let countryCode = null;

    // Attempt A: Server / Cloudflare endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/geo', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.country && data.country !== 'UNKNOWN') {
          countryCode = data.country.toUpperCase();
        }
      }
    } catch (e) {}

    // Attempt B: Client-side Fast IP Geolocation (api.country.is)
    if (!countryCode) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch('https://api.country.is', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.country) {
            countryCode = data.country.toUpperCase();
          }
        }
      } catch (e) {}
    }

    // Attempt C: Client-side Fallback (ipapi.co)
    if (!countryCode) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.country_code) {
            countryCode = data.country_code.toUpperCase();
          }
        }
      } catch (e) {}
    }

    countryCode = countryCode || 'US';
    detectedCountry = countryCode;

    // Determine Currency based on visitor country
    let determinedCurrency = 'USD';
    if (countryCode === 'SA') {
      determinedCurrency = 'SAR';
    } else if (countryCode === 'IQ') {
      determinedCurrency = 'IQD';
    } else {
      determinedCurrency = 'USD';
    }

    activeCurrency = determinedCurrency;

    // Persist in localStorage to avoid redundant checks on next visit
    try {
      localStorage.setItem('vip_country', countryCode);
      localStorage.setItem('vip_currency', determinedCurrency);
    } catch (e) {}
  }

  function setCurrency(currencyCode) {
    if (!CURRENCIES[currencyCode]) return;
    activeCurrency = currencyCode;

    try {
      localStorage.setItem('vip_currency', currencyCode);
    } catch (e) {}

    updateSelectorUI();

    // Notify listeners / refresh all prices in UI
    window.dispatchEvent(new CustomEvent('vip:currency-changed', {
      detail: {
        currency: activeCurrency,
        currencyData: CURRENCIES[activeCurrency]
      }
    }));
  }

  function getActiveCurrency() {
    return activeCurrency;
  }

  function getCurrencyData() {
    return CURRENCIES[activeCurrency] || CURRENCIES.USD;
  }

  function formatPrice(priceStars) {
    const stars = Number(priceStars) || 0;
    const curr = CURRENCIES[activeCurrency] || CURRENCIES.USD;
    return curr.format(stars);
  }

  function getConverted(priceStars) {
    const stars = Number(priceStars) || 0;
    const curr = CURRENCIES[activeCurrency] || CURRENCIES.USD;
    return {
      stars,
      currency: curr.code,
      symbol: curr.symbol,
      amount: stars * curr.ratePerStar,
      formatted: curr.format(stars)
    };
  }

  function updateSelectorUI() {
    const selector = document.getElementById('currencySelector');
    if (selector) {
      selector.value = activeCurrency;
    }
  }

  return {
    init,
    setCurrency,
    getActiveCurrency,
    getCurrencyData,
    formatPrice,
    getConverted,
    CURRENCIES
  };
})();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.CurrencyModule = CurrencyModule;
}
