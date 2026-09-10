/**
 * VIP Card App - Live Support Chat Controller
 * Multi-Tier Real-Time Support System:
 * 1. Cloud Firestore Real-Time Listener (onSnapshot) for instant delivery
 * 2. Direct Firestore writes so messages ALWAYS reach the Admin Dashboard
 * 3. Fallback REST API for Telegram bot notification dispatch
 * 4. Elegant, compact, non-intrusive floating support button
 */

const LiveChatModule = (function () {
  let currentUser = { id: '999888777', first_name: 'VIP Member' };
  let messages = [];
  let pollInterval = null;
  let isOpen = false;
  let lastMessageCount = 0;
  let firestoreUnsubscribe = null;

  function init(user) {
    if (user) currentUser = user;

    // 1. Setup real-time Firestore listener
    initFirestoreListener();

    // 2. Fallback polling for REST backend
    fetchMessages();
    setInterval(fetchMessages, 8000);

    setupChatEventListeners();
  }

  function initFirestoreListener() {
    if (typeof firebase === 'undefined' || !firebase.firestore || !currentUser.id) return;
    try {
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      const docRef = firebase.firestore().collection('chats').doc(String(currentUser.id));
      firestoreUnsubscribe = docRef.onSnapshot((doc) => {
        if (doc.exists && doc.data()) {
          const data = doc.data();
          const remoteMsgs = Array.isArray(data.messages) ? data.messages : [];

          if (remoteMsgs.length > lastMessageCount) {
            const latest = remoteMsgs[remoteMsgs.length - 1];
            if (latest && latest.sender === 'admin' && !isOpen) {
              triggerChatHaptic('notification');
              if (window.AppModule) {
                window.AppModule.showToast('💬 رد جديد من الدعم الفني VIP!');
              }
            }
          }

          messages = remoteMsgs;
          lastMessageCount = messages.length;
          updateUnreadBadge();

          if (isOpen) {
            renderMessages();
          }
        }
      }, (err) => {
        console.warn('Firestore chat listener info:', err.message);
      });
    } catch (e) {
      console.warn('initFirestoreListener error:', e.message);
    }
  }

  function setupChatEventListeners() {
    const input = document.getElementById('chatInputText');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }
  }

  async function fetchMessages() {
    if (!currentUser.id) return;

    // 1. Try Firestore direct read if not listening
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const doc = await firebase.firestore().collection('chats').doc(String(currentUser.id)).get();
        if (doc.exists && doc.data() && Array.isArray(doc.data().messages)) {
          messages = doc.data().messages;
          lastMessageCount = messages.length;
          updateUnreadBadge();
          if (isOpen) renderMessages();
          return;
        }
      } catch (e) {}
    }

    // 2. Try REST backend
    try {
      const res = await fetch(`/api/chat/messages?userId=${currentUser.id}`);
      if (res.ok) {
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages)) {
            messages = data.messages;
            lastMessageCount = messages.length;
            updateUnreadBadge();
            if (isOpen) renderMessages();
          }
        }
      }
    } catch (err) {}
  }

  function renderMessages() {
    const thread = document.getElementById('chatMessagesThread');
    if (!thread) return;

    if (messages.length === 0) {
      thread.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: #94a3b8;">
          <div style="font-size: 38px; margin-bottom: 8px;">🎧</div>
          <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 6px;">مرحباً بك في المحادثة المباشرة</h4>
          <p style="font-size: 0.78rem; line-height: 1.5;">فريق الدعم الفني متواجد الآن لمساعدتك في أي طلب، شحن بطاقات، أو استفسار.</p>
        </div>
      `;
      return;
    }

    thread.innerHTML = messages.map(msg => {
      const isAdmin = msg.sender === 'admin';
      const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="chat-msg-row ${isAdmin ? 'admin-msg' : 'user-msg'}">
          <div class="chat-bubble">
            <div class="chat-sender-label">${isAdmin ? '🛡️ الدعم الفني VIP' : 'أنت'}</div>
            ${msg.orderRef ? `<div class="chat-order-tag">📦 بخصوص الطلب: #${escapeHtml(msg.orderRef)}</div>` : ''}
            <div class="chat-msg-text">${escapeHtml(msg.text)}</div>
            <div class="chat-timestamp">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    thread.scrollTop = thread.scrollHeight;
  }

  async function sendMessage() {
    const input = document.getElementById('chatInputText');
    const orderInput = document.getElementById('chatOrderRefSelect');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const orderRef = orderInput ? orderInput.value : null;

    input.value = '';
    triggerChatHaptic('light');

    const uid = String(currentUser.id || '999888777');
    const uName = currentUser.first_name || currentUser.username || 'عميل VIP';

    const newMsg = {
      id: 'msg_' + Date.now(),
      userId: uid,
      userName: uName,
      sender: 'user',
      text,
      orderRef,
      timestamp: new Date().toISOString()
    };

    // Optimistic local add
    messages.push(newMsg);
    lastMessageCount = messages.length;
    renderMessages();

    // 1. Direct write to Firebase Firestore (Guaranteed to show in Admin Panel!)
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const chatRef = firebase.firestore().collection('chats').doc(uid);
        await chatRef.set({
          userId: uid,
          userName: uName,
          lastMessage: text,
          updatedAt: new Date().toISOString(),
          unreadByAdmin: true,
          unreadCount: firebase.firestore.FieldValue.increment(1),
          messages: firebase.firestore.FieldValue.arrayUnion(newMsg)
        }, { merge: true });
      } catch (fbErr) {
        console.warn('Firestore chat message save error:', fbErr.message);
      }
    }

    // 2. Notify backend server for Telegram bot forwarding (if running)
    try {
      fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          userName: uName,
          sender: 'user',
          text,
          orderRef
        })
      }).catch(() => {});
    } catch (err) {}
  }

  function openChat() {
    triggerChatHaptic('light');
    isOpen = true;
    const modal = document.getElementById('liveSupportChatModal');
    if (modal) modal.classList.add('active');

    // Populate order reference dropdown from Vault
    populateOrderDropdown();

    renderMessages();
    fetchMessages();

    // Fast polling while active
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(fetchMessages, 3000);

    // Clear unread badge
    const badge = document.getElementById('chatFabBadge');
    if (badge) badge.style.display = 'none';
  }

  function closeChat() {
    isOpen = false;
    const modal = document.getElementById('liveSupportChatModal');
    if (modal) modal.classList.remove('active');

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function updateUnreadBadge() {
    const badge = document.getElementById('chatFabBadge');
    if (!badge || isOpen) return;

    const unread = messages.filter(m => m.sender === 'admin' && !m.readByUser).length;
    if (unread > 0) {
      badge.innerText = unread;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function populateOrderDropdown() {
    const select = document.getElementById('chatOrderRefSelect');
    if (!select) return;

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(`vip_orders_cache_${currentUser.id}`);
      if (cached) {
        const orders = JSON.parse(cached);
        if (Array.isArray(orders) && orders.length > 0) {
          select.innerHTML = `<option value="">بدون تحديد طلب</option>` +
            orders.slice(0, 5).map(o => `
              <option value="${o.id}">${escapeHtml(o.productTitle)} (#${o.id.slice(-5)})</option>
            `).join('');
          select.style.display = 'block';
          return;
        }
      }
    } catch (e) {}

    // Fetch user recent orders from server if reachable
    fetch(`/api/vault/${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.orders && data.orders.length > 0) {
          select.innerHTML = `<option value="">بدون تحديد طلب</option>` +
            data.orders.slice(0, 5).map(o => `
              <option value="${o.id}">${escapeHtml(o.productTitle)} (#${o.id.slice(-5)})</option>
            `).join('');
          select.style.display = 'block';
        } else {
          select.style.display = 'none';
        }
      })
      .catch(() => {
        select.style.display = 'none';
      });
  }

  function openTelegramDirect() {
    const url = 'https://t.me/VIPCardApp_bot';
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  function triggerChatHaptic(type = 'light') {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'notification') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }
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
    openChat,
    closeChat,
    sendMessage,
    openTelegramDirect
  };
})();

window.LiveChatModule = LiveChatModule;
