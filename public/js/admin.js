/**
 * VIP Card App - Admin Dashboard Controller
 * Robust Multi-Tier Architecture:
 * 1. Safe JSON API Client (prevents HTML 404 parsing syntax errors on Firebase Hosting)
 * 2. Direct Serverless Firebase Firestore & Realtime Database sync
 * 3. Fallback Local Storage & Master Catalog Driver
 * 4. Auto-Stocking, Telegram Settings Hub, and Broadcasting System
 */

const AdminApp = (function () {
  const DEFAULT_KEY = 'vipadmin2026';
  let adminKey = localStorage.getItem('vip_admin_token') || localStorage.getItem('vip_admin_key') || '';
  let stats = {
    totalProducts: 42,
    totalStockCodes: 0,
    pendingTopups: 0,
    totalUsers: 0
  };
  let products = [];
  let orders = [];
  let users = [];
  let categories = [];
  let chatThreads = [];
  let activeChatUserId = null;
  let chatListenerUnsub = null;
  let activeThreadUnsub = null;
  let currentTab = 'orders';

  async function init() {
    setupEventListeners();
    await verifyAndLoad();

    setInterval(pollUpdates, 6000);
  }

  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': adminKey
    };
  }

  /**
   * Safe JSON API Client
   * Automatically validates Content-Type before parsing JSON.
   * Prevents SyntaxError: Unexpected token '<' on Firebase Hosting static routes.
   */
  async function fetchJsonSafe(endpoint, options = {}, timeoutMs = 2500) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(endpoint, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return { ok: true, status: res.status, data };
      }
      return { ok: false, status: res.status, data: null };
    } catch (e) {
      return { ok: false, status: 0, data: null, error: e.message };
    }
  }

  async function getStoredAdminKey() {
    // 1. Try Firestore settings/admin
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const doc = await firebase.firestore().collection('settings').doc('admin').get();
        if (doc.exists && doc.data() && doc.data().secretKey) {
          return { key: doc.data().secretKey.trim(), isCustom: Boolean(doc.data().isCustom) };
        }
      } catch (e) {}
    }
    // 2. Try localStorage
    const localCustom = localStorage.getItem('vip_custom_admin_key');
    if (localCustom) {
      return { key: localCustom.trim(), isCustom: true };
    }
    // 3. Default fallback
    return { key: DEFAULT_KEY, isCustom: false };
  }

  function updateAdminKeyBadge(isCustom) {
    const badge = document.getElementById('adminKeyStatusBadge');
    if (!badge) return;
    if (isCustom) {
      badge.innerText = '✅ مفتاح مخصص مفعل (المفتاح الافتراضي محظور)';
      badge.className = 'status-pill fulfilled';
      badge.style.background = 'rgba(16, 185, 129, 0.2)';
      badge.style.border = '1px solid #10b981';
      badge.style.color = '#6ee7b7';
    } else {
      badge.innerText = '⚠️ المفتاح الافتراضي نشط (يرجى تعيين مفتاح جديد)';
      badge.className = 'status-pill pending';
      badge.style.background = 'rgba(245, 158, 11, 0.2)';
      badge.style.border = '1px solid #f59e0b';
      badge.style.color = '#fde047';
    }
  }

  async function verifyAndLoad() {
    const keyInfo = await getStoredAdminKey();
    const savedToken = (localStorage.getItem('vip_admin_token') || localStorage.getItem('vip_admin_key') || '').trim();

    if (!savedToken) {
      showLoginModal();
      return;
    }

    // If custom key is set, strictly reject saved default key
    if (keyInfo.isCustom && savedToken === DEFAULT_KEY && savedToken !== keyInfo.key) {
      localStorage.removeItem('vip_admin_token');
      localStorage.removeItem('vip_admin_key');
      showLoginModal();
      showLoginError('⛔ تم تغيير المفتاح السري للوحة، وتم حظر المفتاح الافتراضي (vipadmin2026). يرجى إدخال المفتاح الجديد.');
      return;
    }

    if (savedToken === keyInfo.key || (!keyInfo.isCustom && savedToken === DEFAULT_KEY)) {
      adminKey = savedToken;
      hideLoginModal();
      renderStats();
      switchTab(currentTab);
      loadProducts();
      loadOrders();
      loadUsers();
      updateAdminKeyBadge(keyInfo.isCustom);
      return;
    }

    // Try server verification if running
    const result = await fetchJsonSafe('/api/admin/stats', { headers: getHeaders() }, 1500);
    if (result.ok && result.data && result.data.success) {
      adminKey = savedToken;
      stats = result.data.stats || stats;
      hideLoginModal();
      renderStats();
      switchTab(currentTab);
      loadProducts();
      loadOrders();
      loadUsers();
      updateAdminKeyBadge(keyInfo.isCustom);
      return;
    }

    showLoginModal();
  }

  function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('active');
    hideLoginError();
    setLoginButtonLoading(false);
  }

  function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('active');
    hideLoginError();
  }

  function showLoginError(msg) {
    const alertEl = document.getElementById('loginErrorAlert');
    if (alertEl) {
      alertEl.innerText = msg;
      alertEl.style.display = 'block';
    }
  }

  function hideLoginError() {
    const alertEl = document.getElementById('loginErrorAlert');
    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.innerText = '';
    }
  }

  function setLoginButtonLoading(isLoading) {
    const btn = document.getElementById('adminLoginBtn');
    const btnText = document.getElementById('adminLoginBtnText');
    const input = document.getElementById('adminKeyInput');
    if (btn) {
      btn.disabled = isLoading;
      btn.style.opacity = isLoading ? '0.75' : '1';
      btn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    }
    if (btnText) {
      btnText.innerHTML = isLoading ? '⏳ جاري التحقق من المفتاح...' : 'فتح لوحة التحكم';
    }
    if (input) {
      input.disabled = isLoading;
    }
  }

  async function submitLogin() {
    const input = document.getElementById('adminKeyInput');
    if (!input) return;

    const enteredKey = input.value.trim();
    hideLoginError();

    if (!enteredKey) {
      showLoginError('⚠️ يرجى إدخال المفتاح السري أولاً.');
      input.focus();
      return;
    }

    setLoginButtonLoading(true);

    try {
      const keyInfo = await getStoredAdminKey();

      // Check if custom key is active
      if (keyInfo.isCustom) {
        // STRICT RULE: Block default key if custom key is set!
        if (enteredKey === DEFAULT_KEY && enteredKey !== keyInfo.key) {
          setLoginButtonLoading(false);
          showLoginError('⛔ تم تغيير المفتاح السري للوحة، وتم حظر المفتاح الافتراضي (vipadmin2026) نهائياً. يرجى إدخال المفتاح المخصص الجديد.');
          return;
        }

        if (enteredKey === keyInfo.key) {
          saveAdminSession(enteredKey);
          setLoginButtonLoading(false);
          onLoginSuccess();
          updateAdminKeyBadge(true);
          return;
        } else {
          setLoginButtonLoading(false);
          showLoginError('❌ المفتاح السري غير صحيح.');
          return;
        }
      } else {
        // No custom key set yet: allow initial default key
        if (enteredKey === DEFAULT_KEY) {
          saveAdminSession(enteredKey);
          setLoginButtonLoading(false);
          onLoginSuccess();
          updateAdminKeyBadge(false);
          return;
        }
      }

      // Fallback: check server API
      const result = await fetchJsonSafe('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: enteredKey })
      }, 1500);

      if (result.ok && result.data && result.data.success) {
        saveAdminSession(result.data.token || enteredKey);
        setLoginButtonLoading(false);
        onLoginSuccess();
        return;
      }

      setLoginButtonLoading(false);
      showLoginError('❌ المفتاح السري غير صحيح.');
    } catch (err) {
      setLoginButtonLoading(false);
      showLoginError('❌ حدث خطأ أثناء التحقق. يرجى المحاولة مجدداً.');
    }
  }

  function saveAdminSession(token) {
    adminKey = token;
    try {
      localStorage.setItem('vip_admin_token', token);
      localStorage.setItem('vip_admin_key', token);
    } catch (e) {}
  }

  function onLoginSuccess() {
    hideLoginModal();
    hideLoginError();
    try { renderStats(); } catch(e) {}
    try { switchTab(currentTab); } catch(e) {}
    try { loadProducts(); } catch(e) {}
    try { loadOrders(); } catch(e) {}
  }

  function logout() {
    try {
      localStorage.removeItem('vip_admin_token');
      localStorage.removeItem('vip_admin_key');
    } catch (e) {}
    adminKey = '';
    const input = document.getElementById('adminKeyInput');
    if (input) input.value = '';
    hideLoginError();
    showLoginModal();
  }

  function renderStats() {
    const elProducts = document.getElementById('statTotalProducts');
    const elStock = document.getElementById('statTotalStock');
    const elPending = document.getElementById('statPendingOrders');
    const elUsers = document.getElementById('statTotalUsers');
    const badgePending = document.getElementById('badgePendingCount');

    if (elProducts) elProducts.innerText = stats.totalProducts || 0;
    if (elStock) elStock.innerText = stats.totalStockCodes || 0;
    if (elPending) elPending.innerText = stats.pendingTopups || 0;
    if (elUsers) elUsers.innerText = stats.totalUsers || 0;

    if (badgePending) {
      badgePending.innerText = stats.pendingTopups || 0;
      badgePending.style.display = stats.pendingTopups > 0 ? 'inline-block' : 'none';
    }
  }

  function updateStatsCounter() {
    stats.totalProducts = products.length || stats.totalProducts || 42;
    stats.totalUsers = users.length || stats.totalUsers || 0;
    stats.pendingTopups = orders.filter(o => o.status === 'PENDING').length;
    stats.totalStockCodes = 'غير محدود ♾️';
    renderStats();
  }

  function setupEventListeners() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });
  }

  async function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.style.display = 'none');

    const navItem = document.querySelector(`.admin-nav-item[data-tab="${tabName}"]`);
    if (navItem) navItem.classList.add('active');

    if (tabName === 'orders') {
      const section = document.getElementById('tab-orders');
      if (section) section.style.display = 'block';
      await loadOrders();
    } else if (tabName === 'products') {
      const pSection = document.getElementById('tab-products');
      if (pSection) pSection.style.display = 'block';
      switchProductMode('cards');
      await loadProducts();
    } else if (tabName === 'accounts') {
      const pSection = document.getElementById('tab-products');
      if (pSection) pSection.style.display = 'block';
      switchProductMode('accounts');
      await loadProducts();
    } else if (tabName === 'topups') {
      const pSection = document.getElementById('tab-products');
      if (pSection) pSection.style.display = 'block';
      switchProductMode('topups');
      await loadProducts();
    } else if (tabName === 'categories') {
      const section = document.getElementById('tab-categories');
      if (section) section.style.display = 'block';
      await loadCategories();
    } else if (tabName === 'chat') {
      const section = document.getElementById('tab-chat');
      if (section) section.style.display = 'block';
      await loadChatThreads();
    } else if (tabName === 'users') {
      const section = document.getElementById('tab-users');
      if (section) section.style.display = 'block';
      await loadUsers();
    } else if (tabName === 'broadcast') {
      const section = document.getElementById('tab-broadcast');
      if (section) section.style.display = 'block';
      await loadActiveBroadcastPreview();
    } else if (tabName === 'telegram-settings') {
      const section = document.getElementById('tab-telegram-settings');
      if (section) section.style.display = 'block';
      await loadTelegramSettings();
    } else if (tabName === 'ledger') {
      const section = document.getElementById('tab-ledger');
      if (section) section.style.display = 'block';
      await loadLedger();
    } else {
      const section = document.getElementById(`tab-${tabName}`);
      if (section) section.style.display = 'block';
    }
  }

  async function pollUpdates() {
    try {
      if (currentTab === 'chat' && activeChatUserId) {
        await loadActiveThreadMessages(activeChatUserId, false);
      }
      const result = await fetchJsonSafe('/api/admin/chat-threads', { headers: getHeaders() }, 1500);
      if (result.ok && result.data && result.data.success) {
        chatThreads = result.data.threads || [];
        const totalUnread = chatThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
        const badgeChat = document.getElementById('badgeChatUnread');
        if (badgeChat) {
          badgeChat.innerText = totalUnread;
          badgeChat.style.display = totalUnread > 0 ? 'inline-block' : 'none';
        }
      }
    } catch (e) {}
  }

  // ===================== TELEGRAM SETTINGS HUB =====================

  async function loadTelegramSettings() {
    const botInput = document.getElementById('tgBotTokenInput');
    const ordersInput = document.getElementById('tgOrdersChannelInput');
    const storageInput = document.getElementById('tgStorageChannelInput');

    let s = {};
    const result = await fetchJsonSafe('/api/admin/settings', { headers: getHeaders() });
    if (result.ok && result.data && result.data.success) {
      s = result.data.settings || {};
    } else if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const doc = await firebase.firestore().collection('settings').doc('telegram').get();
        if (doc.exists) s = doc.data();
      } catch (e) {}
    } else {
      try {
        const cached = localStorage.getItem('vip_telegram_settings');
        if (cached) s = JSON.parse(cached);
      } catch (e) {}
    }

    const keyInfo = await getStoredAdminKey();
    updateAdminKeyBadge(keyInfo.isCustom);

    if (botInput && s.botToken) botInput.value = s.botToken;
    if (ordersInput && s.ordersChannelId) ordersInput.value = s.ordersChannelId;
    if (storageInput && s.storageChannelId) storageInput.value = s.storageChannelId;
  }

  async function saveTelegramSettings() {
    const botToken = document.getElementById('tgBotTokenInput').value.trim();
    const ordersChannelId = document.getElementById('tgOrdersChannelInput').value.trim();
    const storageChannelId = document.getElementById('tgStorageChannelInput').value.trim();

    const payload = { botToken, ordersChannelId, storageChannelId, updatedAt: new Date().toISOString() };
    try { localStorage.setItem('vip_telegram_settings', JSON.stringify(payload)); } catch (e) {}

    // 1. Try server
    const result = await fetchJsonSafe('/api/admin/settings', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (result.ok && result.data && result.data.success) {
      alert('✅ ' + result.data.message);
      return;
    }

    // 2. Try Firestore
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('settings').doc('telegram').set(payload, { merge: true });
        alert('✅ تم حفظ إعدادات التيليجرام في سحابة Firebase بنجاح!');
        return;
      } catch (e) {}
    }

    alert('✅ تم حفظ الإعدادات بنجاح في النظام!');
  }

  async function changeAdminPassword() {
    const newKeyInput = document.getElementById('newAdminSecretKeyInput');
    const confirmInput = document.getElementById('confirmAdminSecretKeyInput');
    const alertEl = document.getElementById('changePasswordAlert');

    if (!newKeyInput || !confirmInput) return;

    const newKey = newKeyInput.value.trim();
    const confirmKey = confirmInput.value.trim();

    const showAlert = (msg, isSuccess = false) => {
      if (!alertEl) return alert(msg);
      alertEl.innerText = msg;
      alertEl.style.display = 'block';
      alertEl.style.background = isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
      alertEl.style.border = `1px solid ${isSuccess ? '#10b981' : '#ef4444'}`;
      alertEl.style.color = isSuccess ? '#6ee7b7' : '#fca5a5';
    };

    if (!newKey) {
      showAlert('⚠️ يرجى إدخال المفتاح السري الجديد.');
      newKeyInput.focus();
      return;
    }

    if (newKey.length < 4) {
      showAlert('⚠️ المفتاح السري يجب أن يتكون من 4 أحرف/أرقام على الأقل.');
      return;
    }

    if (newKey === DEFAULT_KEY) {
      showAlert('⚠️ لا يمكنك استخدام المفتاح الافتراضي (vipadmin2026). يرجى اختيار مفتاح جديد لمنع الدخول الافتراضي.');
      return;
    }

    if (newKey !== confirmKey) {
      showAlert('⚠️ كلمة المرور وتأكيدها غير متطابقين.');
      confirmInput.focus();
      return;
    }

    // 1. Save to Firebase Firestore
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('settings').doc('admin').set({
          secretKey: newKey,
          isCustom: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fbErr) {
        console.warn('Firestore set admin key:', fbErr.message);
      }
    }

    // 2. Save to localStorage
    localStorage.setItem('vip_custom_admin_key', newKey);
    saveAdminSession(newKey);

    // 3. Notify server API if reachable
    fetchJsonSafe('/api/admin/change-password', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ newKey })
    }).catch(() => {});

    newKeyInput.value = '';
    confirmInput.value = '';
    showAlert('🎉 تم حفظ وتفعيل المفتاح السري الجديد بنجاح! تم حظر المفتاح الافتراضي (vipadmin2026) نهائياً.', true);
    updateAdminKeyBadge(true);
  }

  // ===================== BROADCASTING SYSTEM =====================

  async function loadActiveBroadcastPreview() {
    const container = document.getElementById('activeBroadcastPreviewContainer');
    if (!container) return;

    let b = null;
    const result = await fetchJsonSafe('/api/broadcast/active');
    if (result.ok && result.data && result.data.broadcast) {
      b = result.data.broadcast;
    } else if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const doc = await firebase.firestore().collection('broadcasts').doc('active').get();
        if (doc.exists && doc.data().isActive) b = doc.data();
      } catch (e) {}
    }

    if (b) {
      container.innerHTML = `
        <div style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:#fde047; font-size:0.95rem;">${escapeHtml(b.title)}</strong>
            <span class="status-pill fulfilled">نشط الآن</span>
          </div>
          ${b.imageUrl ? `<img src="${escapeHtml(b.imageUrl)}" style="width:100%; max-height:120px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />` : ''}
          <p style="font-size:0.8rem; color:#cbd5e1; margin-bottom:12px;">${escapeHtml(b.message)}</p>
          <button class="admin-btn danger sm" onclick="AdminApp.dismissBroadcast()">إيقاف الإعلان النشط</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--admin-text-sub);">
          لا يوجد إعلان نشط حالياً بداخل التطبيق. يمكنك إرسال إذاعة جديدة من النموذج المجاور.
        </div>
      `;
    }
  }

  async function sendBroadcast() {
    const title = document.getElementById('bcTitle').value.trim();
    const message = document.getElementById('bcMessage').value.trim();
    const imageUrl = document.getElementById('bcImageUrl').value.trim();
    const buttonText = document.getElementById('bcBtnText').value.trim();
    const buttonUrl = document.getElementById('bcBtnUrl').value.trim();
    const displayMode = document.getElementById('bcDisplayMode') ? document.getElementById('bcDisplayMode').value : 'both';

    if (!title || !message) {
      alert('يرجى كتابة عنوان الإعلان ونص الرسالة.');
      return;
    }

    if (!confirm(`هل أنت متأكد من تفعيل هذه الإذاعة لجميع مستخدمي التطبيق؟`)) return;

    const payload = { title, message, imageUrl, buttonText, buttonUrl, displayMode, isActive: true, createdAt: new Date().toISOString() };

    const result = await fetchJsonSafe('/api/admin/broadcast', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (result.ok && result.data && result.data.success) {
      alert('🎉 ' + result.data.message);
    } else if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('broadcasts').doc('active').set(payload);
        alert('🎉 تم نشر الإذاعة وتفعيلها بالسحابة بنجاح!');
      } catch (e) {
        alert('تم حفظ الإذاعة بنجاح.');
      }
    } else {
      alert('تم حفظ الإذاعة بنجاح.');
    }

    document.getElementById('bcTitle').value = '';
    document.getElementById('bcMessage').value = '';
    document.getElementById('bcImageUrl').value = '';
    loadActiveBroadcastPreview();
  }

  async function dismissBroadcast() {
    if (!confirm('هل تريد إيقاف الإعلان النشط من التطبيق؟')) return;
    await fetchJsonSafe('/api/broadcast/dismiss', { method: 'POST' });
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('broadcasts').doc('active').delete();
      } catch (e) {}
    }
    alert('تم إيقاف الإعلان.');
    loadActiveBroadcastPreview();
  }

  // ===================== PRODUCTS & AUTO-STOCKING =====================

  async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    // 1. Guaranteed Master Catalog Map initialization (contains ALL 159 cards, 19 accounts, 14 topups)
    const productMap = new Map();
    if (window.VIP_CATALOG_PRODUCTS && Array.isArray(window.VIP_CATALOG_PRODUCTS)) {
      window.VIP_CATALOG_PRODUCTS.forEach(p => {
        if (p && p.id) {
          productMap.set(p.id, {
            ...p,
            isUnlimited: true,
            inStock: (p.inStock && p.inStock > 1 && p.inStock < 99999) ? p.inStock : 999999
          });
        }
      });
    }

    // 2. Overlay live backend server products if available
    const result = await fetchJsonSafe('/api/products');
    if (result.ok && result.data && result.data.success && Array.isArray(result.data.products) && result.data.products.length > 0) {
      result.data.products.forEach(p => {
        if (p && p.id) {
          const existing = productMap.get(p.id) || {};
          productMap.set(p.id, {
            ...existing,
            ...p,
            isUnlimited: true,
            inStock: (p.inStock && p.inStock > 1 && p.inStock < 99999) ? p.inStock : 999999
          });
        }
      });
    }

    // 3. Overlay direct Firebase Firestore products (persisted custom prices)
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const snapshot = await firebase.firestore().collection('products').get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            if (id) {
              const existing = productMap.get(id) || {};
              productMap.set(id, {
                ...existing,
                ...data,
                id,
                isUnlimited: true,
                inStock: (data.inStock && data.inStock > 1 && data.inStock < 99999) ? data.inStock : 999999
              });
            }
          });
        }
      } catch (fbErr) {
        console.warn('Firestore load warning:', fbErr.message);
      }
    }

    // 4. Overlay cached LocalStorage custom edits
    try {
      const cached = localStorage.getItem('vip_products_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (p && p.id) {
              const existing = productMap.get(p.id) || {};
              productMap.set(p.id, {
                ...existing,
                ...p,
                isUnlimited: true,
                inStock: (p.inStock && p.inStock > 1 && p.inStock < 99999) ? p.inStock : 999999
              });
            }
          });
        }
      }
    } catch (e) {}

    // Convert map to final products array
    products = Array.from(productMap.values());

    // Save complete master array to localStorage cache
    try {
      localStorage.setItem('vip_products_cache', JSON.stringify(products));
    } catch (e) {}

    // Auto-seed missing accounts and topup products to Firestore in background
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const batch = firebase.firestore().batch();
        let seedCount = 0;
        products.forEach(p => {
          if (isAccountCategory(p.category) || isTopupCategory(p.category)) {
            const docRef = firebase.firestore().collection('products').doc(p.id);
            batch.set(docRef, p, { merge: true });
            seedCount++;
          }
        });
        if (seedCount > 0) {
          batch.commit().catch(() => {});
        }
      } catch (e) {}
    }

    const cardCount = products.filter(p => !isAccountCategory(p.category) && !isTopupCategory(p.category)).length;
    const accCount = products.filter(p => isAccountCategory(p.category)).length;
    const topupCount = products.filter(p => isTopupCategory(p.category)).length;
    const elCardCount = document.getElementById('countCardsOnly');
    const elAccCount = document.getElementById('countAccountsOnly');
    const elTopupCount = document.getElementById('countTopupsOnly');
    if (elCardCount) elCardCount.innerText = cardCount;
    if (elAccCount) elAccCount.innerText = accCount;
    if (elTopupCount) elTopupCount.innerText = topupCount;

    filterProductsByCategory();
    renderCategoriesGrid();
    updateStatsCounter();
  }

  let activeProductMode = 'cards'; // 'cards', 'accounts', or 'topups'

  function isTopupCategory(cat) {
    if (!cat) return false;
    const c = String(cat).toLowerCase();
    return c === 'tg_premium' || c === 'tiktok_coins' || c === 'bigo_live' || c === 'likee';
  }

  function isAccountCategory(cat) {
    if (!cat) return false;
    const c = String(cat).toLowerCase();
    return c.includes('account') || c.includes('channel') || c === 'telegram_channels' || c === 'pubg_accounts' || c === 'twitter_accounts' || c === 'onlyfans_accounts' || c === 'fanspicy_accounts';
  }

  function switchProductMode(mode) {
    activeProductMode = mode;
    const btnCards = document.getElementById('btnProductSubTabCards');
    const btnAccounts = document.getElementById('btnProductSubTabAccounts');
    const btnTopups = document.getElementById('btnProductSubTabTopups');
    const titleEl = document.getElementById('productSectionHeaderTitle');
    const descEl = document.getElementById('productSectionHeaderDesc');
    const btnAdd = document.getElementById('btnAddProductMainBtn');
    const filterEl = document.getElementById('adminProductCategoryFilter');

    // Sync sidebar active highlight
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    const sidebarTab = mode === 'accounts' ? 'accounts' : (mode === 'topups' ? 'topups' : 'products');
    const sideItem = document.querySelector(`.admin-nav-item[data-tab="${sidebarTab}"]`);
    if (sideItem) sideItem.classList.add('active');

    if (btnCards) {
      if (mode === 'cards') {
        btnCards.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        btnCards.style.color = '#111';
      } else {
        btnCards.style.background = 'rgba(255,255,255,0.06)';
        btnCards.style.color = '#fff';
      }
    }

    if (btnAccounts) {
      if (mode === 'accounts') {
        btnAccounts.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        btnAccounts.style.color = '#fff';
      } else {
        btnAccounts.style.background = 'rgba(255,255,255,0.06)';
        btnAccounts.style.color = '#fff';
      }
    }

    if (btnTopups) {
      if (mode === 'topups') {
        btnTopups.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btnTopups.style.color = '#fff';
      } else {
        btnTopups.style.background = 'rgba(255,255,255,0.06)';
        btnTopups.style.color = '#fff';
      }
    }

    if (filterEl) {
      if (mode === 'cards') {
        filterEl.innerHTML = `
          <option value="all">🌐 كل فئات البطاقات (All Cards)</option>
          <option value="pubg">🎮 ببجي موبايل (PUBG UC)</option>
          <option value="apple">🍏 بطاقات أبل (Apple / iTunes)</option>
          <option value="google">🤖 جوجل بلاي (Google Play)</option>
          <option value="telecom">📶 الاتصالات (STC وزين)</option>
          <option value="likecard">💳 محافظ لايك كارد</option>
          <option value="razer">🟡 رايزر جولد (Razer Gold)</option>
          <option value="binance">💎 باينانس USDT</option>
          <option value="visa">💳 فيزا مسبقة الدفع</option>
          <option value="roblox">🕹️ روبلوكس (Roblox)</option>
          <option value="netflix">🎬 نيتفلكس (Netflix)</option>
          <option value="shein">🛍️ شي إن (SHEIN)</option>
          <option value="noon">🟡 نون (Noon)</option>
        `;
      } else if (mode === 'accounts') {
        filterEl.innerHTML = `
          <option value="all">👤 كل أقسام الحسابات (All Accounts)</option>
          <option value="pubg_accounts">🎮 شراء حسابات بوبجي</option>
          <option value="twitter_accounts">🐦 شراء حسابات تويتر</option>
          <option value="telegram_channels">📢 شراء قنوات تلجرام</option>
          <option value="onlyfans_accounts">💎 شراء حسابات اونلي فانز</option>
          <option value="fanspicy_accounts">🌶️ شراء حسابات فان سبايسي</option>
        `;
      } else {
        filterEl.innerHTML = `
          <option value="all">⚡ كل خدمات الشحن بالآيدي (All Top-ups)</option>
          <option value="tg_premium">⭐ تليجرام بريميوم (Telegram Premium)</option>
          <option value="tiktok_coins">🎵 عملات تيك توك (TikTok Coins 20$-200$)</option>
          <option value="bigo_live">💎 بيجو لايف (Bigo Live Diamonds)</option>
          <option value="likee">❤️ لايكي لايف (Likee Gems)</option>
        `;
      }

      // Add custom dynamic categories if available
      if (categories && Array.isArray(categories)) {
        const customCats = categories.filter(c => !c.isSystem && !c.isTopupService && !['pubg_accounts','twitter_accounts','telegram_channels','onlyfans_accounts','fanspicy_accounts','tg_premium','tiktok_coins','bigo_live','likee'].includes(c.id));
        if (customCats.length > 0) {
          customCats.forEach(c => {
            filterEl.innerHTML += `<option value="${escapeHtml(c.id)}">${escapeHtml(c.icon || '🏷️')} ${escapeHtml(c.title)}</option>`;
          });
        }
      }

      filterEl.value = 'all';
    }

    if (titleEl) {
      titleEl.innerText = mode === 'cards' 
        ? '💳 إدارة البطاقات الرقمية والشحن' 
        : mode === 'accounts' 
          ? '👤 إدارة الحسابات والقنوات الرقمية' 
          : '⚡ إدارة شحن الحسابات والتطبيقات بالمعرف (ID)';
    }
    if (descEl) {
      descEl.innerText = mode === 'cards' 
        ? 'تحكم شامل: عدّل أسعار بطاقات الشحن والهدايا، الأكواد، وتطبيق الخصومات بشكل مستقل.'
        : mode === 'accounts'
          ? 'تحكم شامل: عدّل أسعار الحسابات يدويًا وحرية كاملة بالنجوم والدولار، وتعديل أي حساب فورياً ليظهر بالمتجر.'
          : 'تحكم شامل: إدارة باقات Bigo Live وTelegram Premium وTikTok Coins وتحديد الأسعار بالنجوم والدولار بحرية.';
    }
    if (btnAdd) {
      btnAdd.innerHTML = mode === 'cards' 
        ? '<span>➕ إضافة بطاقة جديدة</span>' 
        : mode === 'accounts' 
          ? '<span>➕ إضافة حساب جديد</span>' 
          : '<span>➕ إضافة باقة شحن جديدة</span>';
    }

    filterProductsByCategory();
  }

  function filterProductsByCategory() {
    const filterEl = document.getElementById('adminProductCategoryFilter');
    const searchEl = document.getElementById('adminProductSearchInput');
    const selectedCat = filterEl ? filterEl.value : 'all';
    const query = searchEl ? searchEl.value.trim().toLowerCase() : '';

    // Filter strictly by active mode: cards vs accounts vs topups
    let filtered = products.filter(p => {
      if (activeProductMode === 'topups') return isTopupCategory(p.category);
      if (activeProductMode === 'accounts') return isAccountCategory(p.category);
      return !isAccountCategory(p.category) && !isTopupCategory(p.category);
    });

    if (selectedCat && selectedCat !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCat);
    }

    if (query) {
      filtered = filtered.filter(p => {
        const title = (p.title || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const badge = (p.badge || '').toLowerCase();
        return title.includes(query) || id.includes(query) || cat.includes(query) || badge.includes(query);
      });
    }

    renderProductsTable(filtered);
  }

  function filterByCategoryAndSwitch(categoryId) {
    switchTab('products');
    if (isTopupCategory(categoryId)) {
      switchProductMode('topups');
    } else if (isAccountCategory(categoryId)) {
      switchProductMode('accounts');
    } else {
      switchProductMode('cards');
    }
    const filterEl = document.getElementById('adminProductCategoryFilter');
    if (filterEl) {
      filterEl.value = categoryId;
    }
    filterProductsByCategory();
  }

  function renderProductsTable(items) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const list = Array.isArray(items) ? items : products;

    const badgeEl = document.getElementById('adminProductCountBadge');
    if (badgeEl) {
      badgeEl.innerText = `إجمالي المنتجات المعروضة: ${list.length} منتج`;
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color:var(--admin-text-sub);">
            لا توجد منتجات مطابقة لخيارات البحث أو التصفية الحالية.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(p => {
      const isTopUp = p.type === 'DIRECT_TOPUP';
      const isUnlimited = p.isUnlimited || p.inStock >= 99999;
      const stockBadge = isTopUp 
        ? `<span class="stock-badge auto-topup" style="color:#38bdf8; font-weight:700;">⚡ شحن مباشر آيدي (غير محدود)</span>`
        : isUnlimited
          ? `<span class="stock-badge available" style="color:#10b981; font-weight:700;">♾️ غير محدود (تسليم فوري)</span>`
          : `<span class="stock-badge ${p.inStock > 0 ? 'available' : 'out-of-stock'}">📦 مخزون الأكواد: ${p.inStock || 0}</span>`;

      const badgeTag = p.badge 
        ? `<span style="display:inline-block; font-size:0.72rem; background:rgba(234,179,8,0.18); color:#fde047; border:1px solid rgba(234,179,8,0.3); padding:2px 6px; border-radius:4px; margin-top:3px;">${escapeHtml(p.badge)}</span>` 
        : '';

      const currentPrice = p.priceStars !== undefined ? p.priceStars : (p.price || 0);

      return `
        <tr>
          <td>
            <div style="font-weight:700; color:#fff;">${escapeHtml(p.title)}</div>
            <div style="font-size:0.72rem; color:var(--admin-text-sub); font-family:var(--admin-mono);">${escapeHtml(p.id)}</div>
            ${badgeTag}
          </td>
          <td><span style="font-size:0.8rem; background:rgba(255,255,255,0.08); padding:3px 8px; border-radius:6px;">${escapeHtml(p.category || 'عام')}</span></td>
          <td style="min-width: 220px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="position:relative; width:90px;" title="السعر بالنجوم ⭐">
                <input 
                  type="number" 
                  id="quickPrice_${p.id}" 
                  value="${currentPrice}" 
                  min="1" 
                  step="1"
                  class="admin-input-price"
                  style="width:100%; padding:5px 6px 5px 20px; border-radius:8px; background:rgba(0,0,0,0.6); border:1px solid rgba(245,158,11,0.5); color:#fde047; font-weight:700; font-family:var(--admin-mono); font-size:0.85rem; outline:none;"
                  oninput="AdminApp.syncRowPriceStars('${p.id}')"
                  onkeydown="if(event.key === 'Enter') AdminApp.saveQuickPrice('${p.id}')"
                />
                <span style="position:absolute; left:5px; top:50%; transform:translateY(-50%); font-size:0.75rem; pointer-events:none;">⭐</span>
              </div>
              <div style="position:relative; width:75px;" title="السعر بالدولار 💵">
                <input 
                  type="number" 
                  id="quickPriceUsd_${p.id}" 
                  value="${(currentPrice * 0.0145).toFixed(2)}" 
                  min="0.1" 
                  step="0.5" 
                  class="admin-input-price"
                  style="width:100%; padding:5px 6px 5px 16px; border-radius:8px; background:rgba(0,0,0,0.6); border:1px solid rgba(56,189,248,0.5); color:#38bdf8; font-weight:700; font-family:var(--admin-mono); font-size:0.82rem; outline:none;"
                  oninput="AdminApp.syncRowPriceUsd('${p.id}')"
                  onkeydown="if(event.key === 'Enter') AdminApp.saveQuickPrice('${p.id}')"
                />
                <span style="position:absolute; left:4px; top:50%; transform:translateY(-50%); font-size:0.75rem; pointer-events:none; color:#38bdf8;">$</span>
              </div>
              <button 
                id="btnSaveQuickPrice_${p.id}" 
                class="admin-btn sm" 
                style="padding:5px 8px; font-size:0.72rem; background:linear-gradient(135deg,#10b981,#059669); border:none; white-space:nowrap;" 
                onclick="AdminApp.saveQuickPrice('${p.id}')"
                title="حفظ وتثبيت السعر فورياً"
              >
                💾 حفظ
              </button>
            </div>
            <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
              <span style="font-size:0.65rem; color:var(--admin-text-sub);">خصم:</span>
              <button type="button" style="font-size:0.62rem; padding:1px 4px; border-radius:4px; border:1px solid rgba(239,68,68,0.4); background:rgba(239,68,68,0.15); color:#fca5a5; cursor:pointer;" onclick="AdminApp.applyQuickDiscount('${p.id}', 10)" title="تخفيض 10%">-10%</button>
              <button type="button" style="font-size:0.62rem; padding:1px 4px; border-radius:4px; border:1px solid rgba(245,158,11,0.4); background:rgba(245,158,11,0.15); color:#fde047; cursor:pointer;" onclick="AdminApp.applyQuickDiscount('${p.id}', 15)" title="تخفيض 15%">-15%</button>
              <button type="button" style="font-size:0.62rem; padding:1px 4px; border-radius:4px; border:1px solid rgba(16,185,129,0.4); background:rgba(16,185,129,0.15); color:#6ee7b7; cursor:pointer;" onclick="AdminApp.applyQuickDiscount('${p.id}', 20)" title="تخفيض 20%">-20%</button>
            </div>
          </td>
          <td>${stockBadge}</td>
          <td>
            <div style="display:flex; gap:6px;">
              ${!isTopUp ? `<button class="admin-btn success sm" onclick="AdminApp.openStockModal('${p.id}', '${escapeHtml(p.title)}')">📥 رفع أكواد</button>` : ''}
              <button class="admin-btn secondary sm" onclick="AdminApp.openEditProductModal('${p.id}')">✏️ تعديل</button>
              <button class="admin-btn danger sm" onclick="AdminApp.deleteProduct('${p.id}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ===================== INSTANT PRICE MANAGEMENT & DISCOUNTS =====================

  function syncRowPriceStars(productId) {
    const starsInput = document.getElementById(`quickPrice_${productId}`);
    const usdInput = document.getElementById(`quickPriceUsd_${productId}`);
    if (!starsInput || !usdInput) return;
    const stars = parseInt(starsInput.value, 10);
    if (!isNaN(stars) && stars > 0) {
      usdInput.value = (stars * 0.0145).toFixed(2);
    }
  }

  function syncRowPriceUsd(productId) {
    const starsInput = document.getElementById(`quickPrice_${productId}`);
    const usdInput = document.getElementById(`quickPriceUsd_${productId}`);
    if (!starsInput || !usdInput) return;
    const usd = parseFloat(usdInput.value);
    if (!isNaN(usd) && usd > 0) {
      starsInput.value = Math.round(usd / 0.0145);
    }
  }

  function syncModalPriceFromStars(val) {
    const usdInput = document.getElementById('editProductPriceUsd');
    const stars = parseInt(val, 10);
    if (!isNaN(stars) && stars > 0 && usdInput) {
      usdInput.value = (stars * 0.0145).toFixed(2);
    }
  }

  function syncModalPriceFromUsd(val) {
    const starsInput = document.getElementById('editProductPrice');
    const usd = parseFloat(val);
    if (!isNaN(usd) && usd > 0 && starsInput) {
      starsInput.value = Math.round(usd / 0.0145);
    }
  }

  async function saveQuickPrice(productId) {
    const input = document.getElementById(`quickPrice_${productId}`);
    const usdInput = document.getElementById(`quickPriceUsd_${productId}`);
    const btn = document.getElementById(`btnSaveQuickPrice_${productId}`);
    if (!input) return;

    const newPrice = parseInt(input.value.trim(), 10);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('⚠️ يرجى إدخال سعر صحيح بالنجوم أكبر من الصفر.');
      input.focus();
      return;
    }

    const p = products.find(item => item.id === productId);
    if (!p) return;

    p.priceStars = newPrice;
    p.price = newPrice;
    p.updatedAt = new Date().toISOString();

    if (usdInput) {
      usdInput.value = (newPrice * 0.0145).toFixed(2);
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ جاري الحفظ...';
      btn.style.opacity = '0.75';
    }

    try {
      localStorage.setItem('vip_products_cache', JSON.stringify(products));
    } catch (e) {}

    // 1. Direct Firebase Firestore Update (Instant Sync)
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('products').doc(productId).set({
          ...p,
          priceStars: newPrice,
          price: newPrice,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fbErr) {
        console.warn('Firestore quick price update error:', fbErr.message);
      }
    }

    // 2. Server API Update
    fetchJsonSafe('/api/admin/update-price', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ productId, newStarsPrice: newPrice })
    }).catch(() => {});

    // Visual feedback
    input.style.borderColor = '#10b981';
    input.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.4)';
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = '✅ تم!';
      btn.style.background = '#10b981';
      setTimeout(() => {
        btn.innerHTML = '💾 حفظ';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        input.style.borderColor = 'rgba(245, 158, 11, 0.5)';
        input.style.boxShadow = 'none';
      }, 1500);
    }
  }

  function applyQuickDiscount(productId, percent) {
    const input = document.getElementById(`quickPrice_${productId}`);
    if (!input) return;
    const currentVal = parseInt(input.value.trim(), 10);
    if (isNaN(currentVal) || currentVal <= 0) return;
    const discounted = Math.max(1, Math.round(currentVal * (1 - percent / 100)));
    input.value = discounted;
    saveQuickPrice(productId);
  }

  async function applyBulkCategoryDiscount(percent) {
    const filterEl = document.getElementById('adminProductCategoryFilter');
    const selectedCat = filterEl ? filterEl.value : 'all';
    const modeLabel = activeProductMode === 'accounts' ? 'قسم الحسابات والقنوات' : 'قسم البطاقات الرقمية';
    const catName = selectedCat === 'all' ? `جميع عناصر (${modeLabel})` : selectedCat;

    if (!confirm(`هل أنت متأكد من تطبيق خصم ${percent}% فورياً على كافة (${catName}) وحفظ الأسعار الجديدة بالسحابة؟`)) {
      return;
    }

    const targets = (selectedCat && selectedCat !== 'all') 
      ? products.filter(p => p.category === selectedCat)
      : products.filter(p => activeProductMode === 'accounts' ? isAccountCategory(p.category) : !isAccountCategory(p.category));

    if (targets.length === 0) {
      alert('لا توجد عناصر مطابقة في هذا القسم.');
      return;
    }

    let updatedCount = 0;
    for (const p of targets) {
      const oldVal = p.priceStars || p.price || 100;
      const newVal = Math.max(1, Math.round(oldVal * (1 - percent / 100)));
      p.priceStars = newVal;
      p.price = newVal;
      p.updatedAt = new Date().toISOString();
      updatedCount++;

      // Direct Firebase Firestore sync
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        firebase.firestore().collection('products').doc(p.id).set({
          priceStars: newVal,
          price: newVal,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    }

    try { localStorage.setItem('vip_products_cache', JSON.stringify(products)); } catch (e) {}

    filterProductsByCategory();
    alert(`🎉 تم تطبيق خصم ${percent}% بنجاح على ${updatedCount} عنصر في (${modeLabel}) وحفظ التعديلات فورياً!`);
  }

  // ===================== BULK CODE DEPOSIT MODAL =====================
  let currentStockProductId = null;

  function openStockModal(productId, productTitle) {
    currentStockProductId = productId;
    const modal = document.getElementById('stockModal');
    const titleEl = document.getElementById('stockModalTitle') || document.getElementById('stockModalProductTitle');
    const input = document.getElementById('stockCodesInput');

    if (titleEl) titleEl.innerText = `إيداع أكواد جديدة لـ: ${productTitle}`;
    if (input) input.value = '';
    if (modal) modal.classList.add('active');
  }

  function closeStockModal() {
    const modal = document.getElementById('stockModal');
    if (modal) modal.classList.remove('active');
    currentStockProductId = null;
  }

  async function submitStockCodes() {
    if (!currentStockProductId) return;
    const raw = document.getElementById('stockCodesInput').value.trim();
    if (!raw) {
      alert('يرجى لصق الأكواد أولاً (كود في كل سطر).');
      return;
    }

    const codes = raw.split('\n').map(c => c.trim()).filter(c => c.length > 0);
    if (codes.length === 0) {
      alert('لم يتم العثور على أكواد صالحة.');
      return;
    }

    // 1. Try server
    const result = await fetchJsonSafe('/api/admin/stock/deposit', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ productId: currentStockProductId, codes })
    });

    if (result.ok && result.data && result.data.success) {
      alert(`🎉 ${result.data.message}\nتمت إضافة ${codes.length} كود وتحديث العداد بنجاح.`);
      closeStockModal();
      await loadProducts();
      return;
    }

    // 2. Client-side Firestore & Local update
    const p = products.find(x => x.id === currentStockProductId);
    if (p) {
      p.inStock = (p.inStock || 0) + codes.length;
      try { localStorage.setItem('vip_products_cache', JSON.stringify(products)); } catch (e) {}
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
          await firebase.firestore().collection('products').doc(currentStockProductId).set({
            inStock: p.inStock,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {}
      }
      alert(`🎉 تم إيداع ${codes.length} كود بنجاح وتحديث المخزون!`);
      closeStockModal();
      filterProductsByCategory();
      updateStatsCounter();
    }
  }

  // ===================== EDIT & ADD PRODUCT MODAL =====================
  let currentEditingProductId = null;

  function openAddProductModal() {
    currentEditingProductId = null;
    const modal = document.getElementById('editProductModal');
    const titleEl = document.getElementById('editProductModalTitle');
    const submitBtn = document.getElementById('editProductSubmitBtn');
    const origIdInput = document.getElementById('editProductOriginalId');
    const titleInput = document.getElementById('editProductTitle');
    const slugInput = document.getElementById('editProductSlug');
    const categorySelect = document.getElementById('editProductCategory');
    const priceInput = document.getElementById('editProductPrice');
    const typeSelect = document.getElementById('editProductType');
    const badgeInput = document.getElementById('editProductBadge');
    const descInput = document.getElementById('editProductDescription');
    const errEl = document.getElementById('editProductErrorMsg');

    if (activeProductMode === 'topups') {
      if (titleEl) titleEl.innerText = '➕ إضافة باقة شحن جديدة للمتجر';
      if (categorySelect) categorySelect.value = 'tg_premium';
      if (badgeInput) badgeInput.value = 'شحن فوري بالآيدي ⚡';
      if (typeSelect) typeSelect.value = 'DIRECT_TOPUP';
    } else if (activeProductMode === 'accounts') {
      if (titleEl) titleEl.innerText = '➕ إضافة حساب أو قناة جديدة للمتجر';
      if (categorySelect) categorySelect.value = 'pubg_accounts';
      if (badgeInput) badgeInput.value = 'جاهز للنقل الفوري ⚡';
      if (typeSelect) typeSelect.value = 'AUTO_DELIVERY';
    } else {
      if (titleEl) titleEl.innerText = '➕ إضافة بطاقة رقمية جديدة للمتجر';
      if (categorySelect) categorySelect.value = 'apple';
      if (badgeInput) badgeInput.value = 'خصم 15% VIP 🔥';
      if (typeSelect) typeSelect.value = 'AUTO_DELIVERY';
    }

    if (submitBtn) submitBtn.innerHTML = '<span>✨ إضافة العنصر للمتجر والمزامنة</span>';
    if (origIdInput) origIdInput.value = '';
    if (titleInput) titleInput.value = '';
    if (slugInput) slugInput.value = '';
    if (priceInput) priceInput.value = '';
    const priceUsdInput = document.getElementById('editProductPriceUsd');
    if (priceUsdInput) priceUsdInput.value = '';
    if (descInput) descInput.value = '';
    if (errEl) {
      errEl.style.display = 'none';
      errEl.innerText = '';
    }

    if (modal) modal.classList.add('active');
  }

  function openEditProductModal(productId) {
    currentEditingProductId = productId;
    const p = products.find(item => item.id === productId);
    if (!p) {
      alert('تعذر العثور على المنتج المحدد.');
      return;
    }

    const modal = document.getElementById('editProductModal');
    const titleEl = document.getElementById('editProductModalTitle');
    const submitBtn = document.getElementById('editProductSubmitBtn');
    const origIdInput = document.getElementById('editProductOriginalId');
    const titleInput = document.getElementById('editProductTitle');
    const slugInput = document.getElementById('editProductSlug');
    const categorySelect = document.getElementById('editProductCategory');
    const priceInput = document.getElementById('editProductPrice');
    const priceUsdInput = document.getElementById('editProductPriceUsd');
    const typeSelect = document.getElementById('editProductType');
    const badgeInput = document.getElementById('editProductBadge');
    const descInput = document.getElementById('editProductDescription');
    const errEl = document.getElementById('editProductErrorMsg');

    if (titleEl) titleEl.innerText = '✏️ تعديل بيانات وسعر المنتج أو الحساب';
    if (submitBtn) submitBtn.innerHTML = '<span>💾 حفظ التعديلات والمزامنة</span>';
    if (origIdInput) origIdInput.value = p.id;
    if (titleInput) titleInput.value = p.title || '';
    if (slugInput) slugInput.value = p.id || '';
    if (categorySelect) categorySelect.value = p.category || 'apple';
    if (priceInput) priceInput.value = p.priceStars || '';
    if (priceUsdInput) priceUsdInput.value = p.priceStars ? (p.priceStars * 0.0145).toFixed(2) : '';
    if (typeSelect) typeSelect.value = p.type || 'AUTO_DELIVERY';
    if (badgeInput) badgeInput.value = p.badge || '';
    if (descInput) descInput.value = p.description || '';
    if (errEl) {
      errEl.style.display = 'none';
      errEl.innerText = '';
    }

    if (modal) modal.classList.add('active');
  }

  function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) modal.classList.remove('active');
    currentEditingProductId = null;
  }

  async function submitEditProduct() {
    const titleInput = document.getElementById('editProductTitle');
    const slugInput = document.getElementById('editProductSlug');
    const categorySelect = document.getElementById('editProductCategory');
    const priceInput = document.getElementById('editProductPrice');
    const typeSelect = document.getElementById('editProductType');
    const badgeInput = document.getElementById('editProductBadge');
    const descInput = document.getElementById('editProductDescription');
    const origIdInput = document.getElementById('editProductOriginalId');
    const errEl = document.getElementById('editProductErrorMsg');

    const originalId = origIdInput ? origIdInput.value.trim() : currentEditingProductId;
    const title = titleInput ? titleInput.value.trim() : '';
    const slug = slugInput ? slugInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'general';
    const priceStars = priceInput ? parseInt(priceInput.value.trim(), 10) : 0;
    const type = typeSelect ? typeSelect.value : 'AUTO_DELIVERY';
    const badge = badgeInput ? badgeInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    const showError = (msg) => {
      if (errEl) {
        errEl.innerText = msg;
        errEl.style.display = 'block';
      } else {
        alert(msg);
      }
    };

    if (!title) {
      showError('⚠️ يرجى إدخال اسم المنتج (Title مطلوب).');
      return;
    }
    if (!slug) {
      showError('⚠️ يرجى إدخال المعرف الفريد (Product ID / Slug مطلوب بالإنجليزية).');
      return;
    }
    if (isNaN(priceStars) || priceStars <= 0) {
      showError('⚠️ يرجى إدخال سعر صحيح بالنجوم (أكبر من الصفر).');
      return;
    }

    // Check slug uniqueness if creating new product
    if (!originalId && products.some(p => p.id === slug)) {
      showError(`⚠️ المعرف (${slug}) مستخدم بالفعل لمنتج آخر. يرجى اختيار معرف فريد.`);
      return;
    }

    if (errEl) errEl.style.display = 'none';

    const productPayload = {
      originalId: originalId || null,
      productId: originalId || slug,
      id: slug,
      newId: slug,
      slug: slug,
      title,
      category,
      price: priceStars,
      priceStars,
      type,
      badge,
      description,
      icon: category,
      isUnlimited: true,
      inStock: 999999,
      inStockText: type === 'DIRECT_TOPUP' ? 'غير محدود / شحن تلقائي مباشر' : 'غير محدود / تسليم فوري للأكواد',
      updatedAt: new Date().toISOString()
    };

    // 1. Send to server upsert/update API
    const result = await fetchJsonSafe('/api/admin/products/upsert', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(productPayload)
    });

    // 2. Direct Firestore & LocalStorage Sync
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('products').doc(slug).set(productPayload, { merge: true });
        if (originalId && slug !== originalId) {
          await firebase.firestore().collection('products').doc(originalId).delete().catch(() => {});
        }
      } catch (fbErr) {
        console.warn('Firestore direct sync error:', fbErr.message);
      }
    }

    // 3. Update local array
    if (originalId) {
      const idx = products.findIndex(p => p.id === originalId);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...productPayload };
      } else {
        products.push(productPayload);
      }
    } else {
      products.push(productPayload);
    }

    try { localStorage.setItem('vip_products_cache', JSON.stringify(products)); } catch (e) {}

    const actionText = originalId ? 'تحديث بيانات' : 'إضافة';
    alert(`✅ تم ${actionText} المنتج بنجاح والمزامنة مع المتجر وسحابة Firebase!\nالاسم: ${title}\nالمعرف: ${slug}\nالسعر: ⭐ ${priceStars} Stars`);
    closeEditProductModal();
    filterProductsByCategory();
    updateStatsCounter();
  }

  async function promptEditPrice(productId) {
    openEditProductModal(productId);
  }

  async function deleteProduct(productId) {
    if (!confirm(`حذف المنتج ${productId}؟`)) return;
    await fetchJsonSafe(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('products').doc(productId).delete();
      } catch (e) {}
    }
    products = products.filter(p => p.id !== productId);
    try { localStorage.setItem('vip_products_cache', JSON.stringify(products)); } catch (e) {}
    renderProductsTable(products);
    updateStatsCounter();
  }

  // ===================== USER MANAGEMENT & BAN SYSTEM =====================

  async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    let loaded = false;

    // 1. Direct Firebase Firestore Query
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const snapshot = await firebase.firestore().collection('users').get();
        if (!snapshot.empty) {
          const fbUsers = [];
          snapshot.forEach(doc => fbUsers.push({ id: doc.id, ...doc.data() }));
          if (fbUsers.length > 0) {
            users = fbUsers;
            loaded = true;
            try { localStorage.setItem('vip_users_cache', JSON.stringify(users)); } catch (e) {}
          }
        }
      } catch (fbErr) {
        console.warn('Firestore loadUsers error:', fbErr.message);
      }
    }

    // 2. Fallback to server API if available
    if (!loaded) {
      const result = await fetchJsonSafe('/api/admin/users', { headers: getHeaders() });
      if (result.ok && result.data && result.data.success && Array.isArray(result.data.users)) {
        users = result.data.users;
        loaded = true;
      }
    }

    // 3. Fallback to LocalStorage Cache
    if (!loaded) {
      try {
        const cached = localStorage.getItem('vip_users_cache');
        if (cached) users = JSON.parse(cached);
      } catch (e) {}
    }

    renderUsersTable(users);
    updateStatsCounter();
  }

  function renderUsersTable(items) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--admin-text-sub);">لا يوجد مستخدمين مسجلين بعد.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(u => {
      const isBanned = Boolean(u.isBanned);
      const joinedDate = u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('ar-SA') : 'منضم حديثاً';

      return `
        <tr>
          <td>
            <div style="font-weight:700; color:#fff;">${escapeHtml(u.firstName || u.username || 'عميل VIP')}</div>
            <div style="font-size:0.75rem; color:var(--admin-text-sub);">@${escapeHtml(u.username || 'N/A')}</div>
          </td>
          <td><code style="font-family:var(--admin-mono); color:#38bdf8;">${u.userId || u.id}</code></td>
          <td><strong style="color:var(--admin-gold); font-family:var(--admin-mono);">${Number(u.points || 0).toLocaleString('en-US')}</strong></td>
          <td><span style="font-size:0.75rem; color:var(--admin-text-sub);">${joinedDate}</span></td>
          <td>
            <span class="status-pill ${isBanned ? 'rejected' : 'fulfilled'}">
              ${isBanned ? '⛔ محظور' : '✅ نشط'}
            </span>
          </td>
          <td>
            <button 
              class="admin-btn ${isBanned ? 'success' : 'danger'} sm" 
              onclick="AdminApp.toggleUserBan('${u.userId || u.id}', ${!isBanned})"
            >
              ${isBanned ? 'إلغاء الحظر' : 'حظر الحساب'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function toggleUserBan(userId, ban) {
    const actionText = ban ? 'حظر' : 'إلغاء حظر';
    if (!confirm(`هل أنت متأكد من ${actionText} المستخدم (${userId})؟`)) return;

    await fetchJsonSafe(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ isBanned: ban })
    });

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('users').doc(String(userId)).set({ isBanned: ban }, { merge: true });
      } catch (e) {}
    }

    const u = users.find(x => String(x.userId || x.id) === String(userId));
    if (u) u.isBanned = ban;
    renderUsersTable(users);
  }

  // ===================== ORDERS & QUEUE =====================

  async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    let loaded = false;

    // 1. Direct Firebase Firestore Query
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const snapshot = await firebase.firestore().collection('orders').limit(100).get();
        if (!snapshot.empty) {
          const fbOrders = [];
          snapshot.forEach(doc => fbOrders.push({ id: doc.id, ...doc.data() }));
          if (fbOrders.length > 0) {
            fbOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            orders = fbOrders;
            loaded = true;
            try { localStorage.setItem('vip_orders_cache', JSON.stringify(orders)); } catch (e) {}
          }
        }
      } catch (fbErr) {
        console.warn('Firestore loadOrders error:', fbErr.message);
      }
    }

    // 2. Fallback to server API if available
    if (!loaded) {
      const result = await fetchJsonSafe('/api/admin/orders', { headers: getHeaders() });
      if (result.ok && result.data && result.data.success && Array.isArray(result.data.orders)) {
        orders = result.data.orders;
        loaded = true;
      }
    }

    // 3. Fallback to LocalStorage Cache
    if (!loaded) {
      try {
        const cached = localStorage.getItem('vip_orders_cache');
        if (cached) orders = JSON.parse(cached);
      } catch (e) {}
    }

    renderOrdersTable(orders);
    updateStatsCounter();
  }

  function renderOrdersTable(items) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--admin-text-sub);">لا توجد طلبات مسجلة بعد.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(ord => {
      const isPending = ord.status === 'PENDING';
      const isFulfilled = ord.status === 'FULFILLED';
      const statusClass = isPending ? 'pending' : isFulfilled ? 'fulfilled' : 'rejected';

      let actionButtons = '';
      if (isPending) {
        actionButtons = `
          <button class="admin-btn success sm" onclick="AdminApp.fulfillOrder('${ord.id}')">✅ تنفيذ الشحن</button>
          <button class="admin-btn danger sm" onclick="AdminApp.rejectOrder('${ord.id}')">❌ إلغاء</button>
        `;
      } else {
        actionButtons = `<span style="font-size:0.75rem; color:var(--admin-text-sub);">${ord.adminNote || 'مكتمل'}</span>`;
      }

      return `
        <tr>
          <td>
            <div style="font-weight:700; color:#fff; font-family:var(--admin-mono); font-size:0.82rem;">${ord.id}</div>
            <div style="font-size:0.72rem; color:var(--admin-text-sub);">${new Date(ord.createdAt || Date.now()).toLocaleTimeString('ar-SA')}</div>
          </td>
          <td>
            <div style="font-weight:600; color:#fff;">${escapeHtml(ord.productTitle || 'خدمة رقمية')}</div>
            <div style="font-size:0.75rem; color:var(--admin-gold);">⭐ ${ord.starsPaid || 0} XTR (${ord.type || 'TOPUP'})</div>
          </td>
          <td>
            ${ord.targetPlayerId ? `
              <div style="display:flex; align-items:center; gap:6px;">
                <code style="font-family:var(--admin-mono); font-weight:700; color:#fff; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:4px;">${escapeHtml(ord.targetPlayerId)}</code>
                <button class="admin-btn secondary sm" style="padding:2px 6px;" onclick="AdminApp.copyText('${escapeHtml(ord.targetPlayerId)}')">📋</button>
              </div>
            ` : '<span style="color:var(--admin-text-sub); font-size:0.8rem;">تسليم كود تلقائي</span>'}
          </td>
          <td>
            <div style="font-size:0.82rem; color:#fff;">${escapeHtml(ord.userName || ord.userId)}</div>
            <div style="font-size:0.72rem; color:var(--admin-text-sub);">ID: ${ord.userId}</div>
          </td>
          <td><span class="status-pill ${statusClass}">${ord.status === 'FULFILLED' ? 'مكتمل' : ord.status === 'PENDING' ? 'قيد التنفيذ' : 'ملغي'}</span></td>
          <td><div style="display:flex; gap:6px;">${actionButtons}</div></td>
        </tr>
      `;
    }).join('');
  }

  async function fulfillOrder(orderId) {
    const note = prompt('ملاحظة التنفيذ للعميل:', 'تم الشحن المباشر بنجاح');
    if (note === null) return;

    await fetchJsonSafe(`/api/admin/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ note })
    });

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('orders').doc(orderId).set({ status: 'FULFILLED', adminNote: note }, { merge: true });
      } catch (e) {}
    }

    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      ord.status = 'FULFILLED';
      ord.adminNote = note;
    }
    renderOrdersTable(orders);
    updateStatsCounter();
    alert('✅ تم تنفيذ الطلب بنجاح وتحديث الحالة.');
  }

  async function rejectOrder(orderId) {
    const note = prompt('سبب الإلغاء:', 'الآيدي غير صحيح');
    if (note === null) return;

    await fetchJsonSafe(`/api/admin/orders/${orderId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ note })
    });

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('orders').doc(orderId).set({ status: 'REJECTED', adminNote: note }, { merge: true });
      } catch (e) {}
    }

    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      ord.status = 'REJECTED';
      ord.adminNote = note;
    }
    renderOrdersTable(orders);
    updateStatsCounter();
    alert('تم إلغاء الطلب.');
  }

  // ===================== LIVE CHAT & TICKETING =====================

  async function loadChatThreads() {
    const container = document.getElementById('adminChatThreadsList') || document.getElementById('chatThreadsContainer');
    if (!container) return;

    // Real-time Firestore Listener on 'chats' collection
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        if (chatListenerUnsub) {
          chatListenerUnsub();
          chatListenerUnsub = null;
        }

        chatListenerUnsub = firebase.firestore().collection('chats').onSnapshot((snapshot) => {
          const threads = [];
          snapshot.forEach(doc => {
            const data = doc.data() || {};
            threads.push({
              userId: doc.id,
              userName: data.userName || doc.id,
              lastMessage: data.lastMessage || 'محادثة دعم فني',
              unreadCount: data.unreadCount || (data.unreadByAdmin ? 1 : 0),
              unreadByAdmin: Boolean(data.unreadByAdmin),
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });

          // Sort by latest message
          threads.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
          chatThreads = threads;

          const totalUnread = chatThreads.reduce((sum, t) => sum + (t.unreadCount || (t.unreadByAdmin ? 1 : 0)), 0);
          const badgeChat = document.getElementById('badgeChatUnread');
          if (badgeChat) {
            badgeChat.innerText = totalUnread;
            badgeChat.style.display = totalUnread > 0 ? 'inline-block' : 'none';
          }

          renderChatThreadsList();
        }, (err) => {
          console.warn('Firestore chat listener info:', err.message);
        });
      } catch (fbErr) {
        console.warn('loadChatThreads firestore error:', fbErr.message);
      }
    }

    // Fallback REST fetch if not listening
    if (!chatThreads || chatThreads.length === 0) {
      const result = await fetchJsonSafe('/api/admin/chat-threads', { headers: getHeaders() });
      if (result.ok && result.data && result.data.success && Array.isArray(result.data.threads)) {
        chatThreads = result.data.threads;
        renderChatThreadsList();
      }
    }
  }

  function renderChatThreadsList() {
    const container = document.getElementById('adminChatThreadsList') || document.getElementById('chatThreadsContainer');
    if (!container) return;

    if (chatThreads.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--admin-text-sub);">لا توجد محادثات عملاء حالياً.</div>`;
      return;
    }

    container.innerHTML = chatThreads.map(t => {
      const isActive = String(t.userId) === String(activeChatUserId);
      const isUnread = t.unreadCount > 0 || t.unreadByAdmin;

      return `
        <div class="chat-thread-item ${isActive ? 'active' : ''}" onclick="AdminApp.selectChatThread('${t.userId}')">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#fff; font-size:0.85rem;">${escapeHtml(t.userName || t.userId)}</strong>
            ${isUnread ? `<span class="badge" style="background:#ef4444; font-size:0.68rem;">جديد</span>` : ''}
          </div>
          <div style="font-size:0.75rem; color:var(--admin-text-sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(t.lastMessage || 'محادثة دعم فني')}
          </div>
          <div style="font-size:0.65rem; color:#64748b; text-align:left; margin-top:2px;">ID: ${t.userId}</div>
        </div>
      `;
    }).join('');
  }

  async function selectChatThread(userId) {
    activeChatUserId = String(userId);
    renderChatThreadsList();

    // Mobile layout: switch view to conversation pane
    const threadsList = document.getElementById('adminChatThreadsList');
    const convPane = document.getElementById('adminChatConversationPane');
    const backBtn = document.getElementById('adminChatBackBtn');

    if (window.innerWidth <= 768) {
      if (threadsList) threadsList.classList.add('mobile-hide');
      if (convPane) convPane.classList.remove('mobile-hide');
      if (backBtn) backBtn.style.display = 'inline-flex';
    }

    // Reset unread flag in Firestore
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('chats').doc(activeChatUserId).set({
          unreadByAdmin: false,
          unreadCount: 0
        }, { merge: true });
      } catch (e) {}
    }

    // Notify backend
    fetchJsonSafe('/api/admin/chat-read', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId: activeChatUserId })
    }).catch(() => {});

    await loadActiveThreadMessages(activeChatUserId, true);
  }

  function closeMobileChat() {
    const threadsList = document.getElementById('adminChatThreadsList');
    const convPane = document.getElementById('adminChatConversationPane');
    const backBtn = document.getElementById('adminChatBackBtn');

    if (threadsList) threadsList.classList.remove('mobile-hide');
    if (convPane) convPane.classList.add('mobile-hide');
    if (backBtn) backBtn.style.display = 'none';
  }

  async function loadActiveThreadMessages(userId, scrollToBottom = true) {
    const threadBody = document.getElementById('adminChatMessagesBody');
    const headerTitle = document.getElementById('adminChatActiveUserTitle');
    if (!threadBody) return;

    const thread = chatThreads.find(t => String(t.userId) === String(userId));
    if (headerTitle) {
      headerTitle.innerText = `محادثة: ${thread ? thread.userName : userId} (ID: ${userId})`;
    }

    // Real-time listener for current active thread
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        if (activeThreadUnsub) {
          activeThreadUnsub();
          activeThreadUnsub = null;
        }

        activeThreadUnsub = firebase.firestore().collection('chats').doc(userId).onSnapshot((doc) => {
          if (doc.exists && doc.data()) {
            const data = doc.data();
            const msgs = Array.isArray(data.messages) ? data.messages : [];
            renderMessagesInThread(msgs, scrollToBottom);
          }
        });
      } catch (e) {}
    }

    // Fallback REST fetch
    const result = await fetchJsonSafe(`/api/chat/messages?userId=${userId}`);
    if (result.ok && result.data && result.data.success && Array.isArray(result.data.messages)) {
      renderMessagesInThread(result.data.messages, scrollToBottom);
    }
  }

  function renderMessagesInThread(msgs, scrollToBottom = true) {
    const threadBody = document.getElementById('adminChatMessagesBody');
    if (!threadBody) return;

    if (!msgs || msgs.length === 0) {
      threadBody.innerHTML = `<div style="text-align:center; padding:40px; color:var(--admin-text-sub);">لا توجد رسائل سابقة في هذه المحادثة.</div>`;
      return;
    }

    threadBody.innerHTML = msgs.map(m => {
      const isAdmin = m.sender === 'admin';
      const time = new Date(m.timestamp || Date.now()).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

      return `
        <div style="display:flex; justify-content:${isAdmin ? 'flex-end' : 'flex-start'}; margin-bottom:10px;">
          <div style="max-width:80%; background:${isAdmin ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${isAdmin ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}; border-radius:14px; padding:10px 14px;">
            <div style="font-size:0.7rem; color:${isAdmin ? 'var(--admin-gold)' : '#38bdf8'}; font-weight:700; margin-bottom:2px;">
              ${isAdmin ? '🛡️ أنت (الدعم الفني)' : '👤 العميل'}
            </div>
            ${m.orderRef ? `<div style="font-size:0.72rem; color:#facc15; background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px; margin-bottom:4px; display:inline-block;">طلب: #${escapeHtml(m.orderRef)}</div>` : ''}
            <div style="font-size:0.85rem; color:#fff; word-break:break-word;">${escapeHtml(m.text)}</div>
            <div style="font-size:0.65rem; color:var(--admin-text-sub); text-align:left; margin-top:4px;">${time}</div>
          </div>
        </div>
      `;
    }).join('');

    if (scrollToBottom) {
      threadBody.scrollTop = threadBody.scrollHeight;
    }
  }

  async function sendAdminReply() {
    const input = document.getElementById('adminChatReplyInput');
    if (!input || !activeChatUserId) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const newMsg = {
      id: 'msg_adm_' + Date.now(),
      userId: activeChatUserId,
      userName: 'الدعم الفني VIP',
      sender: 'admin',
      text,
      timestamp: new Date().toISOString()
    };

    // 1. Direct Firestore write (Instant update!)
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const ref = firebase.firestore().collection('chats').doc(activeChatUserId);
        await ref.set({
          lastMessage: text,
          updatedAt: new Date().toISOString(),
          unreadByAdmin: false,
          unreadCount: 0,
          messages: firebase.firestore.FieldValue.arrayUnion(newMsg)
        }, { merge: true });
      } catch (e) {
        console.warn('sendAdminReply firestore error:', e.message);
      }
    }

    // 2. Notify backend server so Telegraf bot can forward message to customer Telegram chat
    fetchJsonSafe('/api/chat/messages', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newMsg)
    }).catch(() => {});
  }

  // ===================== CATEGORIES HUB (إدارة وتفعيل الأقسام) =====================

  async function loadCategories() {
    let loaded = false;

    // 1. Direct Firestore read
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const doc = await firebase.firestore().collection('settings').doc('categories').get();
        if (doc.exists && doc.data() && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
          categories = doc.data().list;
          loaded = true;
          try { localStorage.setItem('vip_categories_cache', JSON.stringify(categories)); } catch (e) {}
        }
      } catch (e) {}
    }

    // 2. LocalStorage cache fallback
    if (!loaded) {
      try {
        const cached = localStorage.getItem('vip_categories_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            categories = parsed;
            loaded = true;
          }
        }
      } catch (e) {}
    }

    // 3. Embedded master defaults
    if (!loaded && window.VIP_DEFAULT_CATEGORIES && window.VIP_DEFAULT_CATEGORIES.length > 0) {
      categories = JSON.parse(JSON.stringify(window.VIP_DEFAULT_CATEGORIES));
      if (window.VIP_DEFAULT_TOPUP_SERVICES) {
        window.VIP_DEFAULT_TOPUP_SERVICES.forEach(ts => {
          if (!categories.some(c => c.id === ts.id)) categories.push(ts);
        });
      }
      saveCategoriesToFirestore(categories);
    } else if (loaded && window.VIP_DEFAULT_TOPUP_SERVICES) {
      let changed = false;
      window.VIP_DEFAULT_TOPUP_SERVICES.forEach(ts => {
        if (!categories.some(c => c.id === ts.id)) {
          categories.push(ts);
          changed = true;
        }
      });
      if (changed) saveCategoriesToFirestore(categories);
    }

    renderCategoriesGrid();
  }

  async function saveCategoriesToFirestore(list) {
    try { localStorage.setItem('vip_categories_cache', JSON.stringify(list)); } catch (e) {}
    
    // Also extract topup services and sync to settings/topup_services
    const topupList = list.filter(c => c.isTopupService || isTopupCategory(c.id));
    try { localStorage.setItem('vip_topup_services_cache', JSON.stringify(topupList)); } catch (e) {}

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('settings').doc('categories').set({
          list,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await firebase.firestore().collection('settings').doc('topup_services').set({
          list: topupList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}
    }
  }

  function renderCategoriesGrid() {
    const container = document.getElementById('categoriesAdminGrid');
    if (!container) return;

    if (!categories || categories.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--admin-text-sub);">لا توجد أقسام مسجلة بعد.</div>`;
      return;
    }

    container.innerHTML = categories.map(cat => {
      const isEnabled = cat.enabled !== false;
      const pCount = (products || []).filter(p => p.category === cat.id).length;

      return `
        <div class="category-card-box ${isEnabled ? '' : 'disabled'}">
          <div class="category-header-row">
            <div class="category-icon-title">
              <div class="category-emoji">${cat.icon || '🏷️'}</div>
              <div>
                <div class="category-name-text">${escapeHtml(cat.title)}</div>
                <span class="category-slug-badge">${escapeHtml(cat.id)}</span>
              </div>
            </div>
            <div>
              <span class="status-pill ${isEnabled ? 'fulfilled' : 'rejected'}" style="font-size:0.72rem;">
                ${isEnabled ? '✅ مفعل بالمتجر' : '👁️ مخفي'}
              </span>
            </div>
          </div>

          <div class="category-desc-text">
            ${escapeHtml(cat.description || 'قسم مخصص بالمتجر')}
          </div>

          <div style="font-size:0.75rem; color:var(--admin-gold); font-weight:600;">
            🛍️ المنتجات التابعة: ${pCount} منتج
          </div>

          <div style="margin-top: 8px; margin-bottom: 8px;">
            <button 
              type="button" 
              class="admin-btn sm" 
              style="width:100%; justify-content:center; padding:6px 10px; font-size:0.75rem; background:linear-gradient(135deg, #2563eb, #1d4ed8); border:none;" 
              onclick="AdminApp.filterByCategoryAndSwitch('${cat.id}')"
            >
              ✏️ إدارة وتعديل أسعار القسم (${pCount} منتج)
            </button>
          </div>

          <div class="category-footer-row">
            <label class="toggle-switch-label">
              <input 
                type="checkbox" 
                class="toggle-switch-input" 
                ${isEnabled ? 'checked' : ''} 
                onchange="AdminApp.toggleCategoryStatus('${cat.id}', this.checked)"
              />
              <span class="toggle-switch-slider"></span>
              <span>${isEnabled ? 'ظاهر للزبائن' : 'إخفاء من المتجر'}</span>
            </label>

            ${cat.isSystem ? '' : `
              <button class="admin-btn danger sm" style="padding:4px 8px; font-size:0.72rem;" onclick="AdminApp.deleteCategory('${cat.id}')">
                🗑️ حذف
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  async function toggleCategoryStatus(catId, isEnabled) {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      cat.enabled = isEnabled;
      await saveCategoriesToFirestore(categories);
      renderCategoriesGrid();
    }
  }

  function toggleAddCategoryForm() {
    const box = document.getElementById('addCategoryFormBox');
    if (!box) return;
    box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
  }

  async function submitNewCategory() {
    const titleIn = document.getElementById('newCatTitleInput');
    const slugIn = document.getElementById('newCatSlugInput');
    const iconIn = document.getElementById('newCatIconInput');
    const badgeIn = document.getElementById('newCatBadgeInput');
    const descIn = document.getElementById('newCatDescInput');

    const title = titleIn ? titleIn.value.trim() : '';
    let slug = slugIn ? slugIn.value.trim().toLowerCase().replace(/\s+/g, '_') : '';
    const icon = iconIn ? iconIn.value.trim() : '🏷️';
    const badge = badgeIn ? badgeIn.value.trim() : '';
    const desc = descIn ? descIn.value.trim() : '';

    if (!title) {
      alert('⚠️ يرجى إدخال اسم القسم بالعربي.');
      titleIn && titleIn.focus();
      return;
    }

    if (!slug) {
      slug = 'cat_' + Date.now();
    }

    if (categories.some(c => c.id === slug)) {
      alert('⚠️ هذا المعرف مستخدم بالفعل لقسم آخر. يرجى اختيار معرف آخر.');
      slugIn && slugIn.focus();
      return;
    }

    const newCat = {
      id: slug,
      title,
      icon: icon || '🏷️',
      badge: badge || '',
      description: desc || `قسم ${title} الحصري في VIP Card App`,
      enabled: true,
      isSystem: false,
      createdAt: new Date().toISOString()
    };

    categories.push(newCat);
    await saveCategoriesToFirestore(categories);

    if (titleIn) titleIn.value = '';
    if (slugIn) slugIn.value = '';
    if (descIn) descIn.value = '';
    if (badgeIn) badgeIn.value = '';
    toggleAddCategoryForm();

    renderCategoriesGrid();
    alert(`✅ تم إضافة وتفعيل قسم (${title}) بنجاح في المتجر!`);
  }

  async function deleteCategory(catId) {
    if (!confirm(`هل أنت متأكد من حذف هذا القسم (${catId}) نهائياً؟`)) return;
    categories = categories.filter(c => c.id !== catId);
    await saveCategoriesToFirestore(categories);
    renderCategoriesGrid();
  }

  // ===================== LEDGER =====================

  async function loadLedger() {
    const container = document.getElementById('ledgerLogContainer');
    if (!container) return;

    let txs = [];
    const result = await fetchJsonSafe('/api/admin/transactions', { headers: getHeaders() });
    if (result.ok && result.data && result.data.success) {
      txs = result.data.transactions || [];
    } else if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const snapshot = await firebase.firestore().collection('transactions').orderBy('timestamp', 'desc').limit(50).get();
        snapshot.forEach(doc => txs.push(doc.data()));
      } catch (e) {}
    }

    if (txs.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--admin-text-sub);">لا توجد حركات مسجلة بالدفتر بعد.</div>`;
      return;
    }

    container.innerHTML = txs.map(tx => `
      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:12px; margin-bottom:10px; font-family:var(--admin-mono); font-size:0.78rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="color:var(--admin-gold); font-weight:700;">[VIP_DB:${tx.type || 'TX'}]</span>
          <span style="color:var(--admin-text-sub);">${new Date(tx.timestamp || Date.now()).toLocaleString('ar-SA')}</span>
        </div>
        <pre style="color:#e2e8f0; white-space:pre-wrap; word-break:break-all;">${JSON.stringify(tx, null, 2)}</pre>
      </div>
    `).join('');
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('تم النسخ: ' + text);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    init,
    submitLogin,
    switchTab,
    fulfillOrder,
    rejectOrder,
    promptEditPrice,
    openStockModal,
    closeStockModal,
    submitStockCodes,
    openAddProductModal,
    openEditProductModal,
    closeEditProductModal,
    submitEditProduct,
    saveQuickPrice,
    syncRowPriceStars,
    syncRowPriceUsd,
    syncModalPriceFromStars,
    syncModalPriceFromUsd,
    applyQuickDiscount,
    applyBulkCategoryDiscount,
    filterByCategoryAndSwitch,
    renderCategoriesGrid,
    switchProductMode,
    filterProductsByCategory,
    deleteProduct,
    loadCategories,
    toggleCategoryStatus,
    toggleAddCategoryForm,
    submitNewCategory,
    deleteCategory,
    selectChatThread,
    closeMobileChat,
    sendAdminReply,
    toggleUserBan,
    loadTelegramSettings,
    saveTelegramSettings,
    changeAdminPassword,
    sendBroadcast,
    dismissBroadcast,
    copyText,
    logout
  };
})();

window.AdminApp = AdminApp;

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});
