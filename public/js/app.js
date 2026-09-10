/**
 * VIP Card App - LikeCard-Style Arabic Controller
 * Features: Automatic User Capturing, In-App Announcement Banner,
 * Live Support Chat Integration, and Auto-Stocking Presentation
 */

const AppModule = (function () {
  let currentUser = { id: '999888777', first_name: 'VIP Member' };
  let allProducts = (typeof window !== 'undefined' && Array.isArray(window.VIP_CATALOG_PRODUCTS) && window.VIP_CATALOG_PRODUCTS.length > 0)
    ? JSON.parse(JSON.stringify(window.VIP_CATALOG_PRODUCTS))
    : [];
  let cart = [];
  let activeProduct = null;
  let activeCategory = null;
  let specialCategories = [];
  let topupServices = [];

  async function init() {
    // 1. Ensure master catalog is immediately loaded synchronously
    if ((!allProducts || allProducts.length === 0) && window.VIP_CATALOG_PRODUCTS && window.VIP_CATALOG_PRODUCTS.length > 0) {
      allProducts = JSON.parse(JSON.stringify(window.VIP_CATALOG_PRODUCTS));
    }

    // 2. Telegram WebApp initialization
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      if (tg.initDataUnsafe?.user) {
        currentUser = tg.initDataUnsafe.user;
        if (currentUser.username) {
          currentUser.username = currentUser.username.replace('@', '');
        }
      }
    }

    // Load cart from storage
    try {
      const savedCart = localStorage.getItem('vip_cart');
      if (savedCart) cart = JSON.parse(savedCart);
    } catch (e) {}

    updateCartUI();
    setupSearch();

    // 3. Non-blocking asynchronous tasks (run in background, UI is immediately interactive)
    captureUserVisit();
    updateUserHeader();
    loadAllProducts();
    loadSpecialCategories();
    loadTopupServices();
    checkActiveBroadcast();

    // 4. Init Currency System & Listen for manual currency changes
    if (window.CurrencyModule) {
      window.CurrencyModule.init();
      window.addEventListener('vip:currency-changed', () => {
        if (activeCategory) renderActiveCategoryPackages();
        if (activeProduct) {
          const priceEl = document.getElementById('checkoutProdPrice');
          if (priceEl && activeProduct) {
            const formatted = window.CurrencyModule.formatPrice(activeProduct.priceStars);
            const isConverted = window.CurrencyModule.getActiveCurrency() !== 'XTR';
            priceEl.innerHTML = isConverted
              ? `${formatted} <span style="font-size:0.85rem; color:#fde047; font-weight:normal;">(⭐ ${activeProduct.priceStars} نجوم)</span>`
              : `⭐ ${activeProduct.priceStars} نجوم تيليجرام (XTR)`;
          }
        }
        renderCartView();
      });
    }

    // 5. Init Vault
    if (window.VaultModule) {
      window.VaultModule.loadVault(currentUser.id);
    }

    // 6. Init Live Support Chat
    if (window.LiveChatModule) {
      window.LiveChatModule.init(currentUser);
    }
  }

  async function captureUserVisit() {
    if (!currentUser || !currentUser.id) return;
    const uid = String(currentUser.id);
    const now = new Date().toISOString();

    const userData = {
      userId: uid,
      username: currentUser.username || '',
      firstName: currentUser.first_name || 'VIP Member',
      languageCode: currentUser.language_code || 'ar',
      photoUrl: currentUser.photo_url || '',
      lastActive: now,
      isBanned: false
    };

    // 1. Direct Firebase Firestore capture
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const userRef = firebase.firestore().collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) {
          await userRef.set({
            ...userData,
            points: 0,
            totalOrders: 0,
            totalSpentStars: 0,
            joinedAt: now
          }, { merge: true });
        } else {
          await userRef.set({
            username: userData.username,
            firstName: userData.firstName,
            photoUrl: userData.photoUrl,
            lastActive: now
          }, { merge: true });
        }
      } catch (fbErr) {
        console.warn('Firestore user capture:', fbErr.message);
      }
    }

    // 2. Server API fallback if reachable
    try {
      await fetch('/api/user/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    } catch (e) {}
  }

  async function checkActiveBroadcast() {
    try {
      const res = await fetch('/api/broadcast/active');
      const data = await res.json();
      const banner = document.getElementById('inAppBroadcastBanner');
      const popupModal = document.getElementById('inAppBroadcastModal');

      if (data.success && data.broadcast) {
        const b = data.broadcast;
        const mode = b.displayMode || 'both';

        // 1. In-App Banner Display
        if ((mode === 'banner' || mode === 'both') && banner) {
          banner.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(234,179,8,0.2), rgba(202,138,4,0.1)); border: 1px solid rgba(234,179,8,0.4); border-radius: 18px; padding: 14px 16px; margin-bottom: 14px; position: relative;">
              <button onclick="AppModule.dismissBroadcastBanner()" style="position: absolute; left: 12px; top: 12px; background: rgba(255,255,255,0.1); border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.75rem;">✕</button>
              <div style="display: flex; gap: 10px; align-items: flex-start; padding-left: 20px;">
                <div style="font-size: 22px; flex-shrink: 0;">📢</div>
                <div style="flex: 1;">
                  <h4 style="font-size: 0.92rem; font-weight: 800; color: #fde047; margin-bottom: 3px;">${escapeHtml(b.title)}</h4>
                  <p style="font-size: 0.78rem; color: #cbd5e1; line-height: 1.4;">${escapeHtml(b.message)}</p>
                  ${b.buttonText && b.buttonUrl ? `
                    <a href="${escapeHtml(b.buttonUrl)}" target="_blank" class="btn-buy-package" style="display: inline-flex; margin-top: 8px; text-decoration: none; padding: 5px 12px; font-size: 0.75rem;">
                      <span>${escapeHtml(b.buttonText)}</span>
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
          banner.style.display = 'block';
        } else if (banner) {
          banner.style.display = 'none';
        }

        // 2. In-App Pop-up Modal Display (on app launch)
        if ((mode === 'popup' || mode === 'both') && popupModal) {
          const dismissedInSession = sessionStorage.getItem(`bc_dismissed_${b.id}`);
          if (!dismissedInSession) {
            const titleEl = document.getElementById('bcModalTitle');
            const msgEl = document.getElementById('bcModalMessage');
            const imgWrap = document.getElementById('bcModalImageContainer');
            const imgEl = document.getElementById('bcModalImg');
            const actionBtn = document.getElementById('bcModalActionBtn');
            const actionText = document.getElementById('bcModalActionText');

            if (titleEl) titleEl.innerText = b.title;
            if (msgEl) msgEl.innerText = b.message;

            if (b.imageUrl && imgWrap && imgEl) {
              imgEl.src = b.imageUrl;
              imgWrap.style.display = 'block';
            } else if (imgWrap) {
              imgWrap.style.display = 'none';
            }

            if (b.buttonText && b.buttonUrl && actionBtn && actionText) {
              actionBtn.href = b.buttonUrl;
              actionText.innerText = b.buttonText;
              actionBtn.style.display = 'inline-flex';
            } else if (actionBtn) {
              actionBtn.style.display = 'none';
            }

            popupModal.style.display = 'flex';
          }
        }

      } else {
        if (banner) banner.style.display = 'none';
        if (popupModal) popupModal.style.display = 'none';
      }
    } catch (e) {}
  }

  function dismissBroadcastBanner() {
    const banner = document.getElementById('inAppBroadcastBanner');
    if (banner) banner.style.display = 'none';
  }

  function closeBroadcastPopup() {
    const popupModal = document.getElementById('inAppBroadcastModal');
    if (popupModal) popupModal.style.display = 'none';
    fetch('/api/broadcast/active')
      .then(r => r.json())
      .then(data => {
        if (data.broadcast && data.broadcast.id) {
          sessionStorage.setItem(`bc_dismissed_${data.broadcast.id}`, 'true');
        }
      })
      .catch(() => {});
  }

  function updateLoyaltyUI(points) {
    const pts = Math.max(0, Number(points) || 0);

    const ptsEl = document.getElementById('userPointsDisplay');
    if (ptsEl) ptsEl.innerText = pts.toLocaleString('en-US');

    // Save to user storage
    try {
      localStorage.setItem(`vip_user_points_${currentUser.id}`, String(pts));
    } catch (e) {}

    let tierName = 'المستوى البرونزي';
    let tierIcon = '🥉';
    let nextTierName = 'المستوى الفضي 🥈';
    let progressPercent = 0;
    let hintText = 'اشتري بقيمة 100 نجمة للترقية';

    if (pts < 100) {
      tierName = 'المستوى البرونزي';
      tierIcon = '🥉';
      nextTierName = 'المستوى الفضي 🥈';
      progressPercent = Math.min(100, Math.round((pts / 100) * 100));
      hintText = `اشتري بقيمة ${100 - pts} نجمة للترقية`;
    } else if (pts < 500) {
      tierName = 'المستوى الفضي';
      tierIcon = '🥈';
      nextTierName = 'المستوى الذهبي ⭐️';
      progressPercent = Math.min(100, Math.round(((pts - 100) / 400) * 100));
      hintText = `اشتري بقيمة ${500 - pts} نجمة للترقية`;
    } else if (pts < 2000) {
      tierName = 'المستوى الذهبي';
      tierIcon = '⭐️';
      nextTierName = 'المستوى البلاتيني 💎';
      progressPercent = Math.min(100, Math.round(((pts - 500) / 1500) * 100));
      hintText = `اشتري بقيمة ${2000 - pts} نجمة للترقية`;
    } else if (pts < 5000) {
      tierName = 'المستوى البلاتيني';
      tierIcon = '💎';
      nextTierName = 'المستوى التيتانيوم 🏆';
      progressPercent = Math.min(100, Math.round(((pts - 2000) / 3000) * 100));
      hintText = `اشتري بقيمة ${5000 - pts} نجمة للترقية`;
    } else {
      tierName = 'المستوى التيتانيوم';
      tierIcon = '🏆';
      nextTierName = 'أعلى مستوى VIP 👑';
      progressPercent = 100;
      hintText = 'تهانينا! أنت في أعلى تصنيف للمستوى';
    }

    const badgeNameEl = document.getElementById('tierBadgeName');
    const badgeIconEl = document.getElementById('tierBadgeIcon');
    const progressFillEl = document.getElementById('tierProgressFill');
    const hintTextEl = document.getElementById('tierHintText');
    const targetBadgeEl = document.getElementById('tierTargetBadge');

    if (badgeNameEl) badgeNameEl.innerText = tierName;
    if (badgeIconEl) badgeIconEl.innerText = tierIcon;
    if (progressFillEl) progressFillEl.style.width = `${progressPercent}%`;
    if (hintTextEl) hintTextEl.innerText = hintText;
    if (targetBadgeEl) targetBadgeEl.innerText = nextTierName;
  }

  function updateStarsBalanceUI(stars) {
    const bal = Math.max(0, Number(stars) || 0);
    const headerBalEl = document.getElementById('userStarsDisplay');
    const accountBalEl = document.getElementById('accountStarsBalance');
    const accountPtsEl = document.getElementById('accountPointsBalance');
    const userPtsEl = document.getElementById('userPointsDisplay');

    if (headerBalEl) headerBalEl.innerText = bal.toLocaleString('en-US');
    if (accountBalEl) accountBalEl.innerText = bal.toLocaleString('en-US');
    if (accountPtsEl && userPtsEl) accountPtsEl.innerText = userPtsEl.innerText;

    try {
      localStorage.setItem(`vip_user_stars_${currentUser.id}`, String(bal));
    } catch (e) {}
  }

  async function updateUserHeader() {
    // 1. Profile Photo and Name from Telegram
    if (currentUser.photo_url) {
      const img = document.getElementById('userAvatarImg');
      const badge = document.getElementById('userAvatarBadge');
      const accountImg = document.getElementById('accountAvatarImg');
      const accountBadge = document.getElementById('accountAvatarBadge');

      if (img) {
        img.src = currentUser.photo_url;
        img.style.display = 'block';
        if (badge) badge.style.display = 'none';
      }
      if (accountImg) {
        accountImg.src = currentUser.photo_url;
        accountImg.style.display = 'block';
        if (accountBadge) accountBadge.style.display = 'none';
      }
    } else if (currentUser.first_name) {
      const text = document.getElementById('userAvatarText');
      if (text) text.innerText = currentUser.first_name.charAt(0).toUpperCase();
    }

    const nameDisplay = document.getElementById('userNameDisplay');
    if (nameDisplay) {
      nameDisplay.innerText = currentUser.first_name || 'عضو VIP';
    }
    const accountName = document.getElementById('accountName');
    if (accountName) {
      accountName.innerText = currentUser.first_name || 'عضو VIP';
    }
    const accountUid = document.getElementById('accountUserIdText');
    if (accountUid) {
      accountUid.innerText = `ID: ${currentUser.id || '999888777'}`;
    }

    // 2. Read points & stars balance from local cache
    let pts = 0;
    let starsBal = 0;
    try {
      const ptsKey = `vip_user_points_${currentUser.id}`;
      const savedPts = localStorage.getItem(ptsKey);
      if (savedPts !== null && savedPts !== '160264' && savedPts !== '161244') {
        pts = Math.max(0, parseInt(savedPts, 10) || 0);
      } else {
        localStorage.setItem(ptsKey, '0');
      }

      const starsKey = `vip_user_stars_${currentUser.id}`;
      const savedStars = localStorage.getItem(starsKey);
      if (savedStars !== null) {
        starsBal = Math.max(0, parseInt(savedStars, 10) || 0);
      }
    } catch (e) {}

    updateLoyaltyUI(pts);
    updateStarsBalanceUI(starsBal);

    // 3. Real-time Firebase Firestore listener for instant balance updates
    if (typeof firebase !== 'undefined' && firebase.firestore && currentUser.id) {
      try {
        firebase.firestore().collection('users').doc(String(currentUser.id)).onSnapshot(snap => {
          if (snap.exists && snap.data()) {
            const uData = snap.data();
            if (typeof uData.starsBalance === 'number') {
              updateStarsBalanceUI(uData.starsBalance);
            }
            if (typeof uData.points === 'number' && uData.points !== 160264) {
              updateLoyaltyUI(uData.points);
            }
            if (uData.isBanned) {
              const banOverlay = document.getElementById('bannedScreenOverlay');
              if (banOverlay) banOverlay.style.display = 'flex';
            }
          }
        }, () => {});
      } catch (e) {}
    }

    // 4. Server sync fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`/api/user/${currentUser.id}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const u = data.user;
          if (u.isBanned) {
            const banOverlay = document.getElementById('bannedScreenOverlay');
            if (banOverlay) banOverlay.style.display = 'flex';
            return;
          }
          if (typeof u.points === 'number' && u.points !== 160264) {
            updateLoyaltyUI(u.points);
          }
          if (typeof u.starsBalance === 'number') {
            updateStarsBalanceUI(u.starsBalance);
          }
        }
      }
    } catch (err) {}
  }

  // ===================== DIRECT STARS TOP-UP CONTROLLERS =====================

  function selectTopupAmount(amount) {
    triggerHaptic('light');
    const input = document.getElementById('inputCustomTopupStars');
    if (input) {
      input.value = amount;
    }
    // Highlight active chip
    document.querySelectorAll('.topup-chip-btn').forEach(btn => {
      if (btn.innerText.includes(amount.toLocaleString('en-US')) || btn.innerText.includes(String(amount))) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  async function applyUserStarsCredit(amount) {
    const currentSaved = parseInt(localStorage.getItem(`vip_user_stars_${currentUser.id}`) || '0', 10);
    const newBal = currentSaved + amount;
    updateStarsBalanceUI(newBal);

    const bonusPoints = Math.round(amount * 0.1);
    const currentPoints = parseInt(localStorage.getItem(`vip_user_points_${currentUser.id}`) || '0', 10);
    const newPoints = currentPoints + bonusPoints;
    updateLoyaltyUI(newPoints);

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection('users').doc(String(currentUser.id)).set({
          starsBalance: firebase.firestore.FieldValue.increment(amount),
          points: firebase.firestore.FieldValue.increment(bonusPoints),
          lastTopupAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore user topup sync error:', e);
      }
    }
  }

  async function submitStarsTopup() {
    triggerHaptic('medium');
    const input = document.getElementById('inputCustomTopupStars');
    const btn = document.getElementById('btnExecuteStarsTopup');
    const btnText = document.getElementById('topupBtnText');
    const amount = parseInt(input ? input.value : 0, 10);

    if (!amount || isNaN(amount) || amount < 1) {
      showToast('⚠️ يرجى إدخال كمية نجوم صالحة (حد أدنى 1 نجمة)');
      if (input) input.focus();
      return;
    }

    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = '⏳ جاري إنشاء الفاتورة...';

    let invoiceLink = null;

    // 1. Secure backend API request for Telegram Stars top-up invoice
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/account/create-topup-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: String(currentUser.id || '999888777'),
          starsAmount: amount
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.invoiceLink) {
          invoiceLink = data.invoiceLink;
        }
      }
    } catch (e) {
      console.warn('Backend topup invoice request error:', e.message);
    }


    try {
      // 1. If inside Telegram WebApp and invoiceLink is available:
      if (window.Telegram?.WebApp?.openInvoice && invoiceLink) {
        window.Telegram.WebApp.openInvoice(invoiceLink, async (status) => {
          if (status === 'paid') {
            triggerHaptic('notification');
            await applyUserStarsCredit(amount);
            showToast(`🎉 تم شحن رصيدك بنجاح بمقدار ${amount.toLocaleString('en-US')} نجمة!`);
            if (input) input.value = '';
          } else if (status === 'cancelled') {
            showToast('ℹ️ تم إلغاء عملية دفع الفاتورة');
          } else if (status === 'failed') {
            showToast('❌ تعذر إتمام الدفع بنجوم تيليجرام');
          }
          if (btn) btn.disabled = false;
          if (btnText) btnText.innerText = '⚡ شحن الفاتورة';
        });
        return;
      }

      // 2. If outside Telegram WebApp or in browser simulator:
      const proceed = confirm(`⭐ وضع المحاكاة والتجربة (خارج تيليجرام):\nهل تريد تأكيد محاكاة دفع فاتورة لشحن ${amount.toLocaleString('en-US')} نجمة في محفظتك؟`);
      if (proceed) {
        triggerHaptic('notification');
        await applyUserStarsCredit(amount);
        showToast(`🎉 تم شحن رصيدك بنجاح بمقدار ${amount.toLocaleString('en-US')} نجمة!`);
        if (input) input.value = '';
      }
    } catch (err) {
      showToast('❌ خطأ: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.innerText = '⚡ شحن الفاتورة';
    }
  }

  async function loadAllProducts() {
    // 1. Initialize Master Catalog Map with embedded products baseline
    const productMap = new Map();
    if (window.VIP_CATALOG_PRODUCTS && Array.isArray(window.VIP_CATALOG_PRODUCTS)) {
      window.VIP_CATALOG_PRODUCTS.forEach(p => {
        if (p && p.id) {
          productMap.set(p.id, { ...p });
        }
      });
    }

    // 2. Overlay live backend server products if available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/products', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          data.products.forEach(p => {
            if (p && p.id) {
              const base = productMap.get(p.id) || {};
              productMap.set(p.id, { ...base, ...p });
            }
          });
        }
      }
    } catch (err) {}

    // 3. Overlay direct Firebase Firestore products (custom prices saved by admin)
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const firestorePromise = firebase.firestore().collection('products').get();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
        const snapshot = await Promise.race([firestorePromise, timeoutPromise]);
        if (snapshot && !snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            if (id) {
              const base = productMap.get(id) || {};
              productMap.set(id, { ...base, ...data, id });
            }
          });
        }
      } catch (fbErr) {}
    }

    // 4. Overlay cached LocalStorage custom edits
    try {
      const cached = localStorage.getItem('vip_products_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (p && p.id) {
              const base = productMap.get(p.id) || {};
              productMap.set(p.id, { ...base, ...p });
            }
          });
        }
      }
    } catch (e) {}

    allProducts = Array.from(productMap.values());
    try { localStorage.setItem('vip_products_cache', JSON.stringify(allProducts)); } catch (e) {}

    if (activeCategory) renderActiveCategoryPackages();
  }

  // ===================== NAVIGATION & TABS =====================

  function switchTab(tabName) {
    triggerHaptic('light');

    document.querySelectorAll('.page-tab').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    const targetBtn = document.querySelector(`.nav-tab-btn[data-tab="${tabName}"]`);

    if (targetTab) targetTab.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');

    // VIP loyalty banner is visible only on home tab
    const vipBanner = document.getElementById('vipBanner');
    if (vipBanner) {
      vipBanner.style.display = (tabName === 'home') ? 'block' : 'none';
    }

    if (tabName === 'cart') {
      renderCartView();
      if (window.VaultModule) {
        window.VaultModule.loadVault(currentUser.id);
      }
    }
  }

  // ===================== DYNAMIC SPECIAL CATEGORIES =====================

  async function loadSpecialCategories() {
    let loaded = false;

    // 1. Try Firebase Firestore
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const doc = await firebase.firestore().collection('settings').doc('categories').get();
        if (doc.exists && doc.data() && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
          specialCategories = doc.data().list;
          loaded = true;
          try { localStorage.setItem('vip_categories_cache', JSON.stringify(specialCategories)); } catch (e) {}
        }
      } catch (e) {}
    }

    // 2. Try localStorage cache
    if (!loaded) {
      try {
        const cached = localStorage.getItem('vip_categories_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            specialCategories = parsed;
            loaded = true;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to master embedded defaults
    if (!loaded && window.VIP_DEFAULT_CATEGORIES && window.VIP_DEFAULT_CATEGORIES.length > 0) {
      specialCategories = JSON.parse(JSON.stringify(window.VIP_DEFAULT_CATEGORIES));
    }

    renderSpecialCategoriesGrid();
  }

  function renderSpecialCategoriesGrid() {
    const grid = document.getElementById('specialCategoriesGrid');
    const sec = document.getElementById('specialCategoriesSection');
    if (!grid) return;

    // Filter only enabled categories
    const activeCats = (specialCategories || []).filter(c => c.enabled !== false);

    if (activeCats.length === 0) {
      if (sec) sec.style.display = 'none';
      return;
    }

    if (sec) sec.style.display = 'block';

    const counter = document.getElementById('specialCatCounter');
    if (counter) {
      counter.innerText = `${activeCats.length} أقسام متاحة`;
    }

    grid.innerHTML = activeCats.map(cat => {
      return `
        <div class="special-cat-card" onclick="AppModule.openCategory('${escapeHtml(cat.id)}', '${escapeHtml(cat.title)}')">
          ${cat.badge ? `<span class="special-cat-badge">${escapeHtml(cat.badge)}</span>` : ''}
          <div class="special-cat-icon">${cat.icon || '🏷️'}</div>
          <div>
            <div class="special-cat-title">${escapeHtml(cat.title)}</div>
            <div class="special-cat-desc">${escapeHtml(cat.description || '')}</div>
          </div>
          <div class="special-cat-action">
            <span>تصفح العروض</span>
            <span class="arrow">◀</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===================== DYNAMIC ACCOUNT & APP TOPUP SERVICES =====================

  async function loadTopupServices() {
    let loaded = false;

    // 1. Try Firebase Firestore
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const doc = await firebase.firestore().collection('settings').doc('topup_services').get();
        if (doc.exists && doc.data() && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
          topupServices = doc.data().list;
          loaded = true;
          try { localStorage.setItem('vip_topup_services_cache', JSON.stringify(topupServices)); } catch (e) {}
        }
      } catch (e) {}
    }

    // 2. Try localStorage cache
    if (!loaded) {
      try {
        const cached = localStorage.getItem('vip_topup_services_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            topupServices = parsed;
            loaded = true;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to master embedded defaults
    if (!loaded && window.VIP_DEFAULT_TOPUP_SERVICES && window.VIP_DEFAULT_TOPUP_SERVICES.length > 0) {
      topupServices = JSON.parse(JSON.stringify(window.VIP_DEFAULT_TOPUP_SERVICES));
    }

    renderTopupServicesGrid();
  }

  function renderTopupServicesGrid() {
    const grid = document.getElementById('topupServicesGrid');
    const sec = document.getElementById('topupServicesSection');
    if (!grid) return;

    // Filter only enabled topup services
    const activeServices = (topupServices || []).filter(s => s.enabled !== false);

    if (activeServices.length === 0) {
      if (sec) sec.style.display = 'none';
      return;
    }

    if (sec) sec.style.display = 'block';

    const counter = document.getElementById('topupServicesCounter');
    if (counter) {
      counter.innerText = `${activeServices.length} خدمات شحن فوري بالمعرف`;
    }

    grid.innerHTML = activeServices.map(srv => {
      // Official Brand Logo from BrandAssets
      const logoHtml = window.BrandAssets ? window.BrandAssets.getLogoHtml(srv.id, srv.main_logo || null) : srv.icon || '⚡';
      return `
        <div class="special-cat-card" onclick="AppModule.openCategory('${escapeHtml(srv.id)}', '${escapeHtml(srv.title)}')">
          ${srv.badge ? `<span class="special-cat-badge">${escapeHtml(srv.badge)}</span>` : ''}
          <div class="special-cat-icon" style="display:flex; align-items:center; justify-content:center; width:44px; height:44px;">
            ${logoHtml}
          </div>
          <div>
            <div class="special-cat-title">${escapeHtml(srv.title)}</div>
            <div class="special-cat-desc">${escapeHtml(srv.description || '')}</div>
          </div>
          <div class="special-cat-action">
            <span>شحن الآن</span>
            <span class="arrow">◀</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===================== CATEGORY & PACKAGES MODAL =====================

  function openCategory(categoryKey, categoryTitle) {
    triggerHaptic('light');
    activeCategory = categoryKey;

    // Safety fallback: ensure allProducts is ready from embedded catalog if empty
    if ((!allProducts || allProducts.length === 0) && window.VIP_CATALOG_PRODUCTS && window.VIP_CATALOG_PRODUCTS.length > 0) {
      allProducts = JSON.parse(JSON.stringify(window.VIP_CATALOG_PRODUCTS));
    }

    const modal = document.getElementById('categoryPackagesModal');
    const titleEl = document.getElementById('sheetCategoryTitle');
    const subtitleEl = document.getElementById('sheetCategorySubtitle');

    if (titleEl) titleEl.innerText = categoryTitle;
    if (subtitleEl) subtitleEl.innerText = `اختر الباقة / الدولة المناسبة في ${categoryTitle}`;

    renderActiveCategoryPackages();

    if (modal) modal.classList.add('active');
  }

  function renderActiveCategoryPackages() {
    if (!activeCategory) return;
    const listEl = document.getElementById('categoryPackagesList');
    if (!listEl) return;

    let packages = allProducts.filter(p => p.category === activeCategory);

    // Fallback directly to embedded catalog if allProducts had missing category
    if (packages.length === 0 && window.VIP_CATALOG_PRODUCTS) {
      const fallback = window.VIP_CATALOG_PRODUCTS.filter(p => p.category === activeCategory);
      if (fallback.length > 0) {
        packages = fallback;
        fallback.forEach(f => {
          if (!allProducts.some(p => p.id === f.id)) allProducts.push(f);
        });
      }
    }

    if (packages.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
          قريباً: سيتم توفير باقات جديدة في هذا القسم!
        </div>
      `;
      return;
    }

    listEl.innerHTML = packages.map(p => {
      const isTopUp = p.type === 'DIRECT_TOPUP';
      const isOutOfStock = !isTopUp && p.inStock <= 0;
      const formattedPrice = window.CurrencyModule ? window.CurrencyModule.formatPrice(p.priceStars) : `⭐ ${p.priceStars} Stars`;
      const isConverted = window.CurrencyModule && window.CurrencyModule.getActiveCurrency() !== 'XTR';

      // Official Brand Logo & Flag Badge from BrandAssets
      const flagInfo = window.BrandAssets ? window.BrandAssets.getFlagBadge(p.region || '', p.title || '') : { flag: '🌐', label: 'عالمي' };
      const logoHtml = window.BrandAssets ? window.BrandAssets.getLogoHtml(p.category || activeCategory, p.main_logo || null) : '👑';

      return `
        <div class="package-item">
          <div class="package-brand-wrap">
            ${logoHtml}
            <div class="package-flag-badge" title="${flagInfo.label}">${p.flag_icon || flagInfo.flag}</div>
          </div>
          <div class="package-info">
            <h4>${escapeHtml(p.title)}</h4>
            <p>${escapeHtml(p.description)}</p>
            <div style="display: flex; gap: 6px; margin-top: 4px; align-items: center; flex-wrap: wrap;">
              <span style="font-size:0.7rem; background:rgba(255,255,255,0.08); color:#38bdf8; padding:2px 6px; border-radius:6px; font-weight:700;">${p.flag_icon || flagInfo.flag} ${escapeHtml(p.region || flagInfo.label)}</span>
              ${p.badge ? `<span style="font-size:0.7rem; color:#fde047; font-weight:700;">${escapeHtml(p.badge)}</span>` : ''}
            </div>
          </div>
          <div class="package-action">
            <div class="package-price">
              <div class="price-converted">${formattedPrice}</div>
              ${isConverted ? `<div class="price-stars-sub">⭐ ${p.priceStars} Stars</div>` : ''}
            </div>
            <button 
              class="btn-buy-package" 
              onclick="AppModule.openProductCheckout('${p.id}')"
              ${isOutOfStock ? 'disabled style="opacity:0.4"' : ''}
            >
              ${isOutOfStock ? 'نفذت الكمية' : isTopUp ? 'شحن فوري' : 'شراء الآن'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function closeCategoryModal() {
    const modal = document.getElementById('categoryPackagesModal');
    if (modal) modal.classList.remove('active');
  }

  // ===================== PRODUCT CHECKOUT MODAL =====================

  function openProductCheckout(productId) {
    triggerHaptic('light');
    const p = allProducts.find(item => item.id === productId);
    if (!p) return;
    activeProduct = p;

    closeCategoryModal();

    const modal = document.getElementById('productCheckoutModal');
    const brandWrap = document.getElementById('checkoutBrandLogoWrap');
    const titleEl = document.getElementById('checkoutProdTitle');
    const priceEl = document.getElementById('checkoutProdPrice');
    const descEl = document.getElementById('checkoutProdDesc');
    const dynamicInputs = document.getElementById('checkoutDynamicInputs');

    if (brandWrap && window.BrandAssets) {
      const flagInfo = window.BrandAssets.getFlagBadge(p.region || '', p.title || '');
      brandWrap.innerHTML = `
        <div class="package-brand-wrap" style="width:48px; height:48px; min-width:48px;">
          ${window.BrandAssets.getLogoHtml(p.category || activeCategory, p.main_logo || null)}
          <div class="package-flag-badge">${p.flag_icon || flagInfo.flag}</div>
        </div>
      `;
    }

    if (titleEl) titleEl.innerText = p.title;
    const formattedPrice = window.CurrencyModule ? window.CurrencyModule.formatPrice(p.priceStars) : `⭐ ${p.priceStars} Stars`;
    const isConverted = window.CurrencyModule && window.CurrencyModule.getActiveCurrency() !== 'XTR';
    if (priceEl) {
      priceEl.innerHTML = isConverted
        ? `${formattedPrice} <span style="font-size:0.85rem; color:#fde047; font-weight:normal;">(⭐ ${p.priceStars} نجوم تيليجرام)</span>`
        : `⭐ ${p.priceStars} نجوم تيليجرام (XTR)`;
    }
    if (descEl) descEl.innerText = p.description;

    if (p.requiresPlayerId) {
      let labelText = 'معرف الحساب أو الآيدي (ID) *';
      let hintText = '⚠️ يرجى التأكد من كتابة الرقم/الآيدي بدقة لتسليم الشحنة فورياً.';
      let extraNotice = '';

      if (p.category === 'telecom') {
        labelText = 'رقم الجوال المطلوب شحنه *';
      } else if (p.category === 'tg_premium') {
        labelText = 'يوزر حساب التليجرام المطلوب تفعيله (@username) *';
        hintText = '💡 أدخل يوزر التليجرام فقط مع علامة @ (مثال: @username) دون الحاجة لكلمة المرور.';
      } else if (p.category === 'tiktok_coins') {
        labelText = 'اسم مستخدم حساب تيك توك (@username) *';
        hintText = '💡 أدخل يوزر تيك توك وسوف تصلك العملات مباشرة لحسابك فور إتمام الدفع.';
        extraNotice = `<div style="background:rgba(234,179,8,0.15); border:1px solid rgba(234,179,8,0.35); border-radius:12px; padding:10px 14px; margin-bottom:12px; font-size:0.78rem; color:#fde047; font-weight:700;">🪙 شحن عملات تيك توك: الباقات تبدأ من 20$ كحد أدنى وحتى 200$.</div>`;
      } else if (p.category === 'bigo_live') {
        labelText = 'معرف الحساب بيجو لايف (Bigo ID) *';
        hintText = '💡 انسخ معرف Bigo ID الخاص بك من ملفك الشخصي داخل التطبيق.';
      } else if (p.category === 'likee') {
        labelText = 'معرف الحساب لايكي (Likee ID) *';
        hintText = '💡 أدخل الآيدي Likee ID الخاص بك للشحن المباشر.';
      }

      dynamicInputs.innerHTML = `
        ${extraNotice}
        <div style="margin-bottom: 12px;">
          <label style="display:block; font-size:0.8rem; font-weight:700; color:#fde047; margin-bottom:6px;">
            ${labelText}
          </label>
          <input 
            type="text" 
            id="inputTargetPlayerId" 
            placeholder="${escapeHtml(p.playerIdPlaceholder || 'أدخل رقم الحساب أو الآيدي أو اسم المستخدم')}"
            style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(234,179,8,0.4); border-radius:12px; padding:12px; color:#fff; font-family:var(--font-mono); font-size:0.95rem; outline:none;"
            required
          />
          <span style="font-size:0.72rem; color:#94a3b8; margin-top:4px; display:block;">
            ${hintText}
          </span>
        </div>
      `;
    } else {
      dynamicInputs.innerHTML = `
        <div style="background:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.25); border-radius:14px; padding:12px; margin-bottom:12px; font-size:0.8rem;">
          <div style="font-weight:800; color:#fff; margin-bottom:2px;">⚡ تسليم رقمي فوري</div>
          <div style="color:#cbd5e1;">سيتم إيداع كود البطاقة / بيانات الحساب مباشرة في خزنتك وإرسالها في محادثة البوت.</div>
        </div>
      `;
    }

    if (modal) modal.classList.add('active');
  }

  function closeCheckoutModal() {
    const modal = document.getElementById('productCheckoutModal');
    if (modal) modal.classList.remove('active');
    activeProduct = null;
  }

  async function executeStarsPayment() {
    if (!activeProduct) return;

    let targetPlayerId = null;
    if (activeProduct.requiresPlayerId) {
      const input = document.getElementById('inputTargetPlayerId');
      if (!input || !input.value.trim()) {
        showToast('⚠️ يرجى إدخال الآيدي / رقم الجوال أولاً!');
        if (input) input.focus();
        return;
      }
      targetPlayerId = input.value.trim();
    }

    const payBtn = document.getElementById('btnDirectPay');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<span>⏳ جاري إنشاء فاتورة النجوم...</span>`;
    }

    const isInsideTelegram = !!(window.Telegram?.WebApp && window.Telegram.WebApp.initData);

    // 1. Try local/cloud backend API (/api/create-stars-invoice)
    let invoiceLink = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/create-stars-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: activeProduct.id,
          userId: currentUser.id,
          targetPlayerId
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          showToast('⛔ تم حظر حسابك من الاستخدام.');
          const banOverlay = document.getElementById('bannedScreenOverlay');
          if (banOverlay) banOverlay.style.display = 'flex';
          closeCheckoutModal();
          return;
        }
        if (data.success && data.mode === 'TELEGRAM_STARS' && data.invoiceLink) {
          invoiceLink = data.invoiceLink;
        }
      }
    } catch (e) {
      console.warn('Backend stars invoice request error:', e.message);
    }


    // 3. Handle Payment via Telegram WebApp
    if (invoiceLink) {
      if (window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(invoiceLink, (status) => {
          if (status === 'paid') {
            fulfillOrderDirectly(activeProduct, targetPlayerId);
          } else if (status === 'cancelled') {
            showToast('⚠️ تم إلغاء عملية الشراء');
          } else {
            showToast('حدث خطأ أو تم رفض الدفع بالنجوم');
          }
          resetPayBtn();
        });
        return;
      } else if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(invoiceLink);
        resetPayBtn();
        return;
      } else {
        window.location.href = invoiceLink;
        resetPayBtn();
        return;
      }
    }

    // If inside Telegram but invoice link failed
    if (isInsideTelegram) {
      showToast('تعذر جلب فاتورة النجوم، يرجى المحاولة لاحقاً');
      resetPayBtn();
      return;
    }

    // 4. Outside Telegram (Browser Simulator Mode)
    const proceedMock = confirm(`⭐ وضع المتصفح (خارج تيليجرام):\nهل تريد محاكاة الدفع لشراء "${activeProduct.title}" بمبلغ ${activeProduct.priceStars} نجمة؟`);
    if (proceedMock) {
      fulfillOrderDirectly(activeProduct, targetPlayerId);
    }
    resetPayBtn();
  }

  function fulfillOrderDirectly(product, targetPlayerId) {
    const isAuto = product.type === 'AUTO_DELIVERY';
    const code = isAuto 
      ? `VIP-${product.id.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
      : null;

    const order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: String(currentUser.id),
      userName: currentUser.first_name || 'عضو VIP',
      productId: product.id,
      productTitle: product.title,
      starsPaid: product.priceStars,
      type: product.type,
      deliveredItem: code,
      targetPlayerId: targetPlayerId || 'N/A',
      status: isAuto ? 'FULFILLED' : 'PENDING',
      createdAt: new Date().toISOString()
    };

    // Save to VaultModule and LocalStorage
    if (window.VaultModule && typeof window.VaultModule.saveDirectOrder === 'function') {
      window.VaultModule.saveDirectOrder(order);
    } else {
      try {
        const key = `vip_user_vault_${currentUser.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift(order);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {}
    }

    // Save to Firebase Firestore if available
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        firebase.firestore().collection('orders').doc(order.id).set(order).catch(() => {});
        const userRef = firebase.firestore().collection('users').doc(String(currentUser.id));
        userRef.set({
          totalOrders: firebase.firestore.FieldValue.increment(1),
          totalSpentStars: firebase.firestore.FieldValue.increment(Number(product.priceStars || 0)),
          lastActive: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    // Sync with backend to dispatch instant Telegram notifications
    try {
      fetch('/api/mock-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          userId: currentUser.id,
          userName: currentUser.first_name,
          targetPlayerId
        })
      }).catch(() => {});
    } catch (e) {}

    // Add points & update loyalty tier
    try {
      const ptsKey = `vip_user_points_${currentUser.id}`;
      const savedPts = localStorage.getItem(ptsKey);
      const curPts = (savedPts !== null && savedPts !== '160264' && savedPts !== '161244')
        ? Math.max(0, parseInt(savedPts, 10) || 0)
        : 0;
      const newPts = curPts + Number(product.priceStars || 0);
      localStorage.setItem(ptsKey, String(newPts));
      updateLoyaltyUI(newPts);
    } catch (e) {}

    onPaymentCompleted(product, order);
  }

  function onPaymentCompleted(product, data = null) {
    triggerHaptic('success');
    closeCheckoutModal();
    showToast(`🎉 تم شراء ${product.title} بنجاح!`);
    updateUserHeader();

    setTimeout(() => {
      switchTab('cart');
    }, 500);
  }

  function resetPayBtn() {
    const payBtn = document.getElementById('btnDirectPay');
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = `<span>⭐ تأكيد ودفع بنجوم تيليجرام</span>`;
    }
  }

  // ===================== CART MANAGEMENT =====================

  function addToCartFromModal() {
    if (!activeProduct) return;
    let targetPlayerId = null;
    if (activeProduct.requiresPlayerId) {
      const input = document.getElementById('inputTargetPlayerId');
      if (input && input.value.trim()) {
        targetPlayerId = input.value.trim();
      }
    }

    cart.push({
      ...activeProduct,
      cartItemId: 'item_' + Date.now(),
      targetPlayerId
    });

    saveCart();
    closeCheckoutModal();
    triggerHaptic('light');
    showToast(`🛒 تمت إضافة ${activeProduct.title} إلى السلة!`);
  }

  function saveCart() {
    try {
      localStorage.setItem('vip_cart', JSON.stringify(cart));
    } catch (e) {}
    updateCartUI();
  }

  function updateCartUI() {
    const badge = document.getElementById('cartBadgeCounter');
    if (badge) {
      if (cart.length > 0) {
        badge.innerText = cart.length;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function renderCartView() {
    const container = document.getElementById('cartItemsContainer');
    const summaryBox = document.getElementById('cartSummaryBox');
    const totalEl = document.getElementById('cartTotalStars');
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <div style="font-size: 40px; margin-bottom: 8px;">🛒</div>
          <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 4px;">سلة المشتريات فارغة</h4>
          <p style="font-size: 0.8rem;">تصفح الأقسام والبطاقات وأضف باقاتك المفضلة هنا.</p>
        </div>
      `;
      if (summaryBox) summaryBox.style.display = 'none';
      return;
    }

    let totalStars = 0;
    container.innerHTML = cart.map((item, index) => {
      totalStars += item.priceStars;
      const formattedItemPrice = window.CurrencyModule ? window.CurrencyModule.formatPrice(item.priceStars) : `⭐ ${item.priceStars} Stars`;
      const isConverted = window.CurrencyModule && window.CurrencyModule.getActiveCurrency() !== 'XTR';

      return `
        <div class="package-item" style="margin-bottom: 8px;">
          <div class="package-info">
            <h4>${escapeHtml(item.title)}</h4>
            ${item.targetPlayerId ? `<div style="font-size:0.75rem; color:#fde047;">الآيدي / الرقم: ${escapeHtml(item.targetPlayerId)}</div>` : ''}
            <div style="font-family:var(--font-en); font-weight:800; color:#facc15; font-size:0.95rem; margin-top:2px;">
              ${formattedItemPrice} ${isConverted ? `<span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">(⭐ ${item.priceStars})</span>` : ''}
            </div>
          </div>
          <button class="sheet-close-btn" style="background:rgba(239,68,68,0.2); color:#ef4444;" onclick="AppModule.removeFromCart(${index})">
            ✕
          </button>
        </div>
      `;
    }).join('');

    const formattedTotal = window.CurrencyModule ? window.CurrencyModule.formatPrice(totalStars) : `⭐ ${totalStars} Stars`;
    const isConvertedTotal = window.CurrencyModule && window.CurrencyModule.getActiveCurrency() !== 'XTR';
    if (totalEl) {
      totalEl.innerHTML = isConvertedTotal
        ? `${formattedTotal} <span style="font-size:0.85rem; color:#fde047; font-weight:normal;">(⭐ ${totalStars} Stars)</span>`
        : `⭐ ${totalStars} Stars`;
    }
    if (summaryBox) summaryBox.style.display = 'block';
  }

  function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCartView();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCartView();
    showToast('تم إفراغ السلة.');
  }

  async function checkoutCart() {
    if (cart.length === 0) return;

    showToast('⏳ جاري تأكيد طلبات السلة...');
    for (const item of cart) {
      let handled = false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/mock-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.id,
            userId: currentUser.id,
            userName: currentUser.first_name,
            targetPlayerId: item.targetPlayerId
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.success) handled = true;
        }
      } catch (e) {}

      if (!handled) {
        fulfillOrderDirectly(item, item.targetPlayerId);
      }
    }

    clearCart();
    triggerHaptic('success');
    showToast('🎉 تم شراء جميع عناصر السلة بنجاح!');
    switchTab('cart');
  }

  // ===================== SEARCH =====================

  function setupSearch() {
    const input = document.getElementById('globalSearchInput');
    const resultsContainer = document.getElementById('searchResultsList');
    if (!input || !resultsContainer) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        resultsContainer.innerHTML = '';
        return;
      }

      const matches = allProducts.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        (p.categoryNameAr && p.categoryNameAr.toLowerCase().includes(q)) ||
        (p.region && p.region.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        resultsContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">لا توجد نتائج مطابقة لبحثك.</div>`;
        return;
      }

      resultsContainer.innerHTML = matches.map(p => `
        <div class="package-item" onclick="AppModule.openProductCheckout('${p.id}')">
          <div class="package-info">
            <h4>${escapeHtml(p.title)}</h4>
            <p>${escapeHtml(p.description)}</p>
          </div>
          <div class="package-action">
            <div class="package-price">⭐ ${p.priceStars}</div>
            <button class="btn-buy-package">شراء</button>
          </div>
        </div>
      `).join('');
    });
  }

  // ===================== MODALS & UTILS =====================

  function openLoyaltyModal() {
    triggerHaptic('light');
    const modal = document.getElementById('loyaltyPerksModal');
    if (modal) modal.classList.add('active');
  }

  function closeLoyaltyModal() {
    const modal = document.getElementById('loyaltyPerksModal');
    if (modal) modal.classList.remove('active');
  }

  function shareReferral() {
    const text = `🎁 انضم إلى تطبيق VIP Card App لشحن بطاقات باينانس، أبل، رايزر، وشدات ببجي بنجوم تيليجرام!`;
    const shareUrl = `https://t.me/share/url?url=https://t.me/VIPCardApp_Bot?start=ref_${currentUser.id}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }

  function triggerHaptic(type = 'light') {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'success') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    }
  }

  function showToast(msg) {
    let toast = document.getElementById('arVipToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'arVipToast';
      toast.className = 'ar-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
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
    switchTab,
    openCategory,
    closeCategoryModal,
    openProductCheckout,
    closeCheckoutModal,
    executeStarsPayment,
    addToCartFromModal,
    removeFromCart,
    clearCart,
    checkoutCart,
    openLoyaltyModal,
    closeLoyaltyModal,
    shareReferral,
    dismissBroadcastBanner,
    closeBroadcastPopup,
    loadSpecialCategories,
    loadTopupServices,
    renderTopupServicesGrid,
    selectTopupAmount,
    submitStarsTopup,
    updateStarsBalanceUI,
    showToast
  };
})();

window.AppModule = AppModule;

document.addEventListener('DOMContentLoaded', () => {
  AppModule.init();
});
