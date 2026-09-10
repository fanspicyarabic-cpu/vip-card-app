/**
 * Telegram WebApp Mock & Bridge Provider
 * Emulates the window.Telegram.WebApp environment when loaded outside Telegram client.
 */

(function () {
  if (!window.Telegram) {
    window.Telegram = {};
  }

  if (!window.Telegram.WebApp) {
    console.log('⚡ [VIP Card App] Running outside Telegram: Emulating Telegram.WebApp API');

    // Retrieve or generate mock user
    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem('vip_mock_user'));
    } catch (e) {}

    if (!storedUser) {
      const mockId = Math.floor(100000000 + Math.random() * 900000000);
      storedUser = {
        id: mockId,
        first_name: 'VIP Trader',
        last_name: '',
        username: 'viptrader_' + mockId.toString().slice(-4),
        language_code: 'en',
        is_premium: true
      };
      localStorage.setItem('vip_mock_user', JSON.stringify(storedUser));
    }

    window.Telegram.WebApp = {
      initData: 'query_id=AAHd...' + storedUser.id,
      initDataUnsafe: {
        query_id: 'AAHd...' + storedUser.id,
        user: storedUser,
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'mock_hash_vip_card_app'
      },
      version: '7.0',
      platform: 'web_preview',
      colorScheme: 'dark',
      themeParams: {
        bg_color: '#0a0b0e',
        text_color: '#ffffff',
        hint_color: '#94a3b8',
        link_color: '#facc15',
        button_color: '#eab308',
        button_text_color: '#000000',
        secondary_bg_color: '#161922'
      },
      isExpanded: true,
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight,
      headerColor: '#0a0b0e',
      backgroundColor: '#0a0b0e',

      ready: function () {
        console.log('[Telegram.WebApp] ready() called');
      },
      expand: function () {
        console.log('[Telegram.WebApp] expand() called');
      },
      close: function () {
        console.log('[Telegram.WebApp] close() called');
      },
      MainButton: {
        text: 'CONTINUE',
        color: '#eab308',
        textColor: '#000000',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        setText: function (t) { this.text = t; },
        onClick: function (fn) { this._handler = fn; },
        show: function () { this.isVisible = true; },
        hide: function () { this.isVisible = false; },
        enable: function () { this.isActive = true; },
        disable: function () { this.isActive = false; }
      },
      BackButton: {
        isVisible: false,
        onClick: function (fn) { this._handler = fn; },
        show: function () { this.isVisible = true; },
        hide: function () { this.isVisible = false; }
      },
      HapticFeedback: {
        impactOccurred: function (style) {
          if (navigator.vibrate) navigator.vibrate(15);
        },
        notificationOccurred: function (type) {
          if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
        },
        selectionChanged: function () {
          if (navigator.vibrate) navigator.vibrate(10);
        }
      },
      openTelegramLink: function (url) {
        window.open(url, '_blank');
      },
      openLink: function (url) {
        window.open(url, '_blank');
      },
      openInvoice: function (invoiceUrl, callback) {
        console.log('[Telegram.WebApp] openInvoice called with:', invoiceUrl);
        // Prompt simulation modal
        const confirmPay = confirm(`⭐ Telegram Stars Payment\nOpen invoice: ${invoiceUrl}\nSimulate successful payment?`);
        if (callback) {
          callback(confirmPay ? 'paid' : 'cancelled');
        }
      },
      showAlert: function (msg, callback) {
        alert(msg);
        if (callback) callback();
      },
      showConfirm: function (msg, callback) {
        const res = confirm(msg);
        if (callback) callback(res);
      }
    };
  }
})();
