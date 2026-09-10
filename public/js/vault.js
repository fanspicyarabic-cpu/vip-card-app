/**
 * VIP Card App - Arabic Vault & Orders Controller
 */

const VaultModule = (function () {
  let userOrders = [];

  async function loadVault(userId) {
    const vaultList = document.getElementById('vaultList');
    if (!vaultList) return;

    // 1. Immediately load from localStorage cache for instant UI
    try {
      const localKey = `vip_user_vault_${userId}`;
      const cached = localStorage.getItem(localKey);
      if (cached) {
        userOrders = JSON.parse(cached);
        renderVault();
      }
    } catch (e) {}

    // 2. Try Server API with fast timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`/api/vault/${userId}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          userOrders = data.orders;
          try {
            localStorage.setItem(`vip_user_vault_${userId}`, JSON.stringify(userOrders));
          } catch (e) {}
          renderVault();
          return;
        }
      }
    } catch (err) {
      console.warn('Server vault fetch skipped or offline:', err.message);
    }

    // 3. Fallback to Firebase Firestore if available
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const snap = await firebase.firestore().collection('orders').where('userId', '==', String(userId)).get();
        if (!snap.empty) {
          const fbOrders = [];
          snap.forEach(doc => fbOrders.push({ id: doc.id, ...doc.data() }));
          fbOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          userOrders = fbOrders;
          try {
            localStorage.setItem(`vip_user_vault_${userId}`, JSON.stringify(userOrders));
          } catch (e) {}
          renderVault();
          return;
        }
      } catch (e) {}
    }

    // Render whatever was cached, or clean empty state
    renderVault();
  }

  function saveDirectOrder(order) {
    if (!order) return;
    // Prepend order if not already in list
    if (!userOrders.some(o => o.id === order.id)) {
      userOrders.unshift(order);
    }
    try {
      const key = `vip_user_vault_${order.userId}`;
      localStorage.setItem(key, JSON.stringify(userOrders));
    } catch (e) {}
    renderVault();
  }

  function renderVault() {
    const vaultList = document.getElementById('vaultList');
    if (!vaultList) return;

    if (userOrders.length === 0) {
      vaultList.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: #94a3b8; background: #141724; border-radius: 18px; border: 1px dashed rgba(255,255,255,0.1);">
          <div style="font-size: 38px; margin-bottom: 8px;">🔐</div>
          <h4 style="color: #fff; font-size: 1.05rem; margin-bottom: 4px;">الخزنة فارغة حالياً</h4>
          <p style="font-size: 0.8rem;">أي بطاقات أو شدات تشتريها ستظهر هنا فوراً مع الأكواد وحالة الشحن.</p>
        </div>
      `;
      return;
    }

    vaultList.innerHTML = userOrders.map(order => {
      const isAuto = order.type === 'AUTO_DELIVERY';
      const isFulfilled = order.status === 'FULFILLED';
      const isPending = order.status === 'PENDING';

      const dateStr = new Date(order.createdAt).toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let statusBadge = '';
      if (isFulfilled) {
        statusBadge = `<span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:3px 8px; font-size:0.72rem; font-weight:800;">✅ مكتمل</span>`;
      } else if (isPending) {
        statusBadge = `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:3px 8px; font-size:0.72rem; font-weight:800;">⏳ قيد التنفيذ</span>`;
      } else {
        statusBadge = `<span style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:3px 8px; font-size:0.72rem; font-weight:800;">❌ ملغي</span>`;
      }

      let contentSection = '';
      if (isAuto && order.deliveredItem) {
        contentSection = `
          <div style="margin-top: 10px;">
            <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">كود الشحن الرقمي / بيانات الحساب:</div>
            <div style="background: #0a0c12; border: 1px dashed rgba(234,179,8,0.4); border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); color: #fde047; font-size: 0.85rem; word-break: break-all;">
              <span id="code-${order.id}">${escapeHtml(order.deliveredItem)}</span>
              <button 
                onclick="VaultModule.copyCode('${order.id}')"
                style="background: rgba(234,179,8,0.18); border: 1px solid rgba(234,179,8,0.3); color: #fde047; font-family: var(--font-ar); font-weight: 800; font-size: 0.72rem; padding: 4px 10px; border-radius: 8px; cursor: pointer; flex-shrink: 0; margin-right: 8px;"
              >
                📋 نسخ
              </button>
            </div>
          </div>
        `;
      } else if (!isAuto) {
        contentSection = `
          <div style="margin-top: 10px; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 10px 12px; font-size: 0.8rem;">
            <div style="color: #cbd5e1;">معرف اللاعب (ID): <strong style="color: #fff; font-family: var(--font-mono);">${escapeHtml(order.targetPlayerId || 'غير محدد')}</strong></div>
            <div style="color: #facc15; font-size: 0.75rem; margin-top: 4px;">
              ${isFulfilled ? '✨ تم شحن الرصيد مباشرة إلى حسابك في اللعبة!' : '⚡ الطلب قيد المعالجة من فريق العمليات وسيصلك إشعار بالبوت.'}
            </div>
          </div>
        `;
      }

      return `
        <div style="background: #141724; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">${escapeHtml(order.productTitle || 'بطاقة رقمية')}</div>
              <div style="font-size: 0.72rem; color: #94a3b8;">${dateStr} • رقم الطلب #${order.id.slice(-6)}</div>
            </div>
            ${statusBadge}
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8;">
            المبلغ: <strong style="color: #facc15; font-family: var(--font-en);">⭐ ${order.starsPaid} Stars</strong>
          </div>
          ${contentSection}
        </div>
      `;
    }).join('');
  }

  function copyCode(orderId) {
    const el = document.getElementById(`code-${orderId}`);
    if (!el) return;

    navigator.clipboard.writeText(el.innerText).then(() => {
      if (window.AppModule) {
        window.AppModule.showToast('✅ تم نسخ الكود بنجاح!');
      }
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
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
    loadVault,
    saveDirectOrder,
    copyCode
  };
})();

window.VaultModule = VaultModule;
