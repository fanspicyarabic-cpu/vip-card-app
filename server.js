/**
 * VIP Card App - Main Server with Live Chat, Dynamic Telegram Settings,
 * Auto-Stocking, User Retention & Broadcast System
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const channelDb = require('./db/channel-db');
const firebaseSync = require('./db/firebase-sync');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBAPP_URL = (process.env.WEBAPP_URL && process.env.WEBAPP_URL.startsWith('https://'))
  ? process.env.WEBAPP_URL
  : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://vip-card-app.vercel.app');
let ADMIN_SECRET_KEY = channelDb.state.settings.adminSecretKey || process.env.ADMIN_SECRET_KEY || 'vipadmin2026';


app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// DOMAIN & SUBDOMAIN ROUTING CONSISTENCY
// Storefront: vipcardapp.com -> index.html
// Admin Panel: vipcardapp.com/admin OR admin.vipcardapp.com -> admin.html
// -------------------------------------------------------------
app.use((req, res, next) => {
  const host = (req.headers['x-forwarded-host'] || req.headers['host'] || req.hostname || '').toLowerCase();
  if (host.startsWith('admin.') && (req.path === '/' || req.path === '/index.html')) {
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }
  next();
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// TELEGRAF BOT DYNAMIC RUNTIME INSTANCE
// -------------------------------------------------------------
let bot = null;

// Firestore REST Sync Helpers for Instant Cloud State
const FIRESTORE_KEY = 'AIzaSyD4e1HCzmkYsTlSjkgSwSven5UWRQzrw6o';
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/vipcardapp-app/databases/(default)/documents';

async function syncUserToFirestore(u) {
  if (!u || !u.userId) return;
  try {
    const uid = String(u.userId);
    const body = {
      fields: {
        userId: { stringValue: uid },
        username: { stringValue: u.username || '' },
        firstName: { stringValue: u.firstName || 'VIP Member' },
        languageCode: { stringValue: u.languageCode || 'ar' },
        points: { integerValue: String(u.points || 0) },
        starsBalance: { integerValue: String(u.starsBalance || 0) },
        isBanned: { booleanValue: Boolean(u.isBanned) },
        joinedAt: { stringValue: u.joinedAt || new Date().toISOString() },
        lastActive: { stringValue: new Date().toISOString() }
      }
    };
    await fetch(`${FIRESTORE_BASE}/users/${uid}?key=${FIRESTORE_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {}
}

async function syncOrderToFirestore(order) {
  if (!order || !order.id) return;
  try {
    const oid = String(order.id);
    const body = {
      fields: {
        id: { stringValue: oid },
        userId: { stringValue: String(order.userId || '') },
        userName: { stringValue: String(order.userName || 'عضو VIP') },
        productId: { stringValue: String(order.productId || '') },
        productTitle: { stringValue: String(order.productTitle || 'خدمة رقمية') },
        starsPaid: { integerValue: String(order.starsPaid || 0) },
        type: { stringValue: String(order.type || 'AUTO_DELIVERY') },
        status: { stringValue: String(order.status || 'PENDING') },
        deliveredItem: { stringValue: String(order.deliveredItem || '') },
        targetPlayerId: { stringValue: String(order.targetPlayerId || '') },
        createdAt: { stringValue: String(order.createdAt || new Date().toISOString()) }
      }
    };
    await fetch(`${FIRESTORE_BASE}/orders/${oid}?key=${FIRESTORE_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {}
}

async function syncLoginLogToFirestore(log) {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const body = {
      fields: {
        id: { stringValue: logId },
        userId: { stringValue: String(log.userId || '') },
        userName: { stringValue: String(log.userName || 'VIP Member') },
        username: { stringValue: String(log.username || '') },
        type: { stringValue: String(log.type || 'BOT_START') },
        timestamp: { stringValue: new Date().toISOString() },
        source: { stringValue: String(log.source || 'Telegram Bot') }
      }
    };
    await fetch(`${FIRESTORE_BASE}/login_logs/${logId}?key=${FIRESTORE_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {}
}

// -------------------------------------------------------------
// TELEGRAM NOTIFICATIONS & BOT HELPERS
// -------------------------------------------------------------
function escapeHtmlTg(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getWelcomeMarkup() {
  const storeUrl = (typeof WEBAPP_URL === 'string' && WEBAPP_URL.startsWith('https://'))
    ? WEBAPP_URL
    : 'https://vip-card-app.vercel.app';

  const buttons = [
    [Markup.button.webApp('🛍️ فتح المتجر الإلكتروني', storeUrl)],
    [
      Markup.button.callback('⚡ شحن الرصيد', 'btn_topup_info'),
      Markup.button.callback('📦 سجل طلباتي', 'btn_orders_info')
    ],
    [
      Markup.button.callback('👑 مميزات العضوية والولاء', 'btn_loyalty_info'),
      Markup.button.callback('💬 الدعم الفني المباشر', 'btn_support_info')
    ]
  ];

  return Markup.inlineKeyboard(buttons);
}

// Function to send admin notification for orders (Direct Top-up and Auto-delivery)
async function sendAdminOrderNotification(order, details = {}) {
  if (!bot) return;
  const ordersChannel = channelDb.state.settings.ordersChannelId || process.env.ADMIN_QUEUE_CHANNEL_ID;
  if (!ordersChannel) return;

  const isAuto = order.type === 'AUTO_DELIVERY';
  const icon = isAuto ? '💳' : '⚡';
  const typeText = isAuto ? 'تسليم كود فوري (تلقائي)' : 'شحن مباشر بمعرف اللاعب (ID)';
  const statusEmoji = order.status === 'FULFILLED' ? '✅ مكتمل' : '⏳ قيد الانتظار والتنفيذ';

  let msg = `🛒 <b>طلب شراء جديد - VIP Card App</b>\n\n`;
  msg += `📦 <b>رقم الطلب:</b> <code>${escapeHtmlTg(order.id)}</code>\n`;
  msg += `${icon} <b>المنتج / الخدمة:</b> ${escapeHtmlTg(order.productTitle || 'بطاقة رقمية')}\n`;
  msg += `⭐ <b>المبلغ المدفوع:</b> <code>${order.starsPaid || 0}</code> Stars\n`;
  msg += `📋 <b>نوع الخدمة:</b> ${typeText}\n`;
  msg += `📊 <b>حالة الطلب:</b> ${statusEmoji}\n`;
  
  if (order.targetPlayerId && order.targetPlayerId !== 'N/A') {
    msg += `🆔 <b>آيدي اللاعب / الحساب:</b> <code>${escapeHtmlTg(order.targetPlayerId)}</code>\n`;
  }
  if (order.deliveredItem) {
    msg += `🔑 <b>كود البطاقة:</b> <code>${escapeHtmlTg(order.deliveredItem)}</code>\n`;
  }

  const uName = details.userName || order.userName || 'عضو VIP';
  const uId = details.userId || order.userId || 'N/A';
  const uUsername = details.username ? `@${escapeHtmlTg(details.username)}` : (order.username ? `@${escapeHtmlTg(order.username)}` : 'غير متوفر');
  msg += `\n👤 <b>بيانات العميل:</b>\n`;
  msg += `• الاسم: ${escapeHtmlTg(uName)}\n`;
  msg += `• اليوزر: ${uUsername}\n`;
  msg += `• المعرف (ID): <code>${escapeHtmlTg(uId)}</code>\n`;
  msg += `⏰ <b>الوقت:</b> ${new Date().toLocaleString('ar-EG', { timeZone: 'UTC' })} (UTC)`;

  try {
    await bot.telegram.sendMessage(ordersChannel, msg, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn('[Telegram Notifications] Admin order dispatch warning:', err.message);
  }
}

// Function to send admin notification for Account Top-up (Recharges)
async function sendAdminTopupNotification(topup) {
  if (!bot) return;
  const ordersChannel = channelDb.state.settings.ordersChannelId || process.env.ADMIN_QUEUE_CHANNEL_ID;
  if (!ordersChannel) return;

  const uName = topup.userName || 'عضو VIP';
  const uId = topup.userId || 'N/A';
  const uUsername = topup.username ? `@${escapeHtmlTg(topup.username)}` : 'غير متوفر';

  let msg = `💰 <b>عملية شحن رصيد جديدة - VIP Card App</b>\n\n`;
  msg += `⭐ <b>المبلغ المشحون:</b> <code>+${Number(topup.amount || 0).toLocaleString('en-US')}</code> Stars\n`;
  if (topup.newBalance !== undefined) {
    msg += `💼 <b>الرصيد الإجمالي الجديد:</b> <code>${Number(topup.newBalance || 0).toLocaleString('en-US')}</code> Stars\n`;
  }
  if (topup.bonusPoints) {
    msg += `🎁 <b>نقاط الولاء المكتسبة:</b> +${Number(topup.bonusPoints || 0)} نقطة\n`;
  }
  msg += `💳 <b>طريقة الإيداع:</b> ${escapeHtmlTg(topup.method || 'Telegram Stars')}\n`;
  
  msg += `\n👤 <b>بيانات العميل:</b>\n`;
  msg += `• الاسم: ${escapeHtmlTg(uName)}\n`;
  msg += `• اليوزر: ${uUsername}\n`;
  msg += `• المعرف (ID): <code>${escapeHtmlTg(uId)}</code>\n`;
  msg += `⏰ <b>الوقت:</b> ${new Date().toLocaleString('ar-EG', { timeZone: 'UTC' })} (UTC)`;

  try {
    await bot.telegram.sendMessage(ordersChannel, msg, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn('[Telegram Notifications] Admin topup dispatch warning:', err.message);
  }
}

// Function to send admin notification for Live Support Messages
async function sendAdminSupportNotification(chat) {
  if (!bot) return;
  const ordersChannel = channelDb.state.settings.ordersChannelId || process.env.ADMIN_QUEUE_CHANNEL_ID;
  if (!ordersChannel) return;

  let msg = `💬 <b>رسالة دعم فني جديدة - VIP Card App</b>\n\n`;
  msg += `👤 <b>المرسل:</b> ${escapeHtmlTg(chat.userName || 'عضو')} (<code>${escapeHtmlTg(chat.userId)}</code>)\n`;
  if (chat.orderRef) {
    msg += `📦 <b>رقم الطلب المرتبط:</b> <code>${escapeHtmlTg(chat.orderRef)}</code>\n`;
  }
  msg += `📝 <b>الرسالة:</b>\n${escapeHtmlTg(chat.text)}\n`;
  msg += `\n⏰ <b>الوقت:</b> ${new Date().toLocaleString('ar-EG', { timeZone: 'UTC' })} (UTC)`;

  try {
    await bot.telegram.sendMessage(ordersChannel, msg, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn('[Telegram Notifications] Admin support dispatch warning:', err.message);
  }
}

// Reliable check if user already registered (memory + Firestore) to prevent repeat notifications
async function isExistingUser(userId) {
  if (!userId) return false;
  const uid = String(userId);
  if (channelDb.state.users && channelDb.state.users[uid]) {
    return true;
  }
  try {
    const res = await fetch(`${FIRESTORE_BASE}/users/${uid}?key=${FIRESTORE_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.fields) {
        channelDb.state.users[uid] = {
          userId: uid,
          username: data.fields.username?.stringValue || '',
          firstName: data.fields.firstName?.stringValue || 'VIP Member',
          languageCode: data.fields.languageCode?.stringValue || 'ar',
          points: Number(data.fields.points?.integerValue || 0),
          starsBalance: Number(data.fields.starsBalance?.integerValue || 0),
          isBanned: Boolean(data.fields.isBanned?.booleanValue || false),
          joinedAt: data.fields.joinedAt?.stringValue || new Date().toISOString()
        };
        return true;
      }
    }
  } catch (err) {}
  return false;
}

// Function to send admin notification for NEW User Join only (never repeated on re-entry)
async function sendAdminUserLoginNotification(user, isNew = false) {
  if (!isNew) return; // Do not send notification on re-entry!
  if (!bot) return;
  const ordersChannel = channelDb.state.settings.ordersChannelId || process.env.ADMIN_QUEUE_CHANNEL_ID || '-1004487020026';
  if (!ordersChannel) return;

  const uName = user.firstName || user.first_name || 'عضو VIP';
  const uId = user.userId || user.id || 'N/A';
  const uUsername = user.username ? `@${escapeHtmlTg(user.username)}` : 'غير متوفر';

  const msg = `🎉 <b>مستخدم جديد انضم للبوت!</b>\n\n` +
    `👤 <b>الاسم:</b> ${escapeHtmlTg(uName)}\n` +
    `🔗 <b>اليوزر:</b> ${uUsername}\n` +
    `🆔 <b>الآيدي (ID):</b> <code>${escapeHtmlTg(uId)}</code>\n` +
    `🌐 <b>اللغة:</b> ${user.languageCode || user.language_code || 'ar'}\n` +
    `⏰ <b>تاريخ الانضمام:</b> ${new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })}\n\n` +
    `💾 <i>تم توثيق وحفظ بيانات المستخدم في قاعدة البيانات</i>`;

  try {
    await bot.telegram.sendMessage(ordersChannel, msg, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn('[Telegram Notifications] Admin user login dispatch warning:', err.message);
  }
}



// Function to notify customer directly on Telegram
async function sendCustomerOrderNotification(userId, order) {
  if (!bot || !userId || isNaN(Number(userId))) return;
  
  const isAuto = order.type === 'AUTO_DELIVERY';
  let msg = '';

  if (isAuto && order.deliveredItem) {
    msg = `🎉 <b>VIP Card App - تم تسليم طلبك بنجاح!</b>\n\n` +
      `📦 <b>المنتج:</b> ${escapeHtmlTg(order.productTitle || 'بطاقة رقمية')}\n` +
      `⭐ <b>المبلغ:</b> ${order.starsPaid || 0} Stars\n` +
      `🧾 <b>رقم الطلب:</b> <code>${escapeHtmlTg(order.id)}</code>\n\n` +
      `🔑 <b>كود البطاقة:</b> <code>${escapeHtmlTg(order.deliveredItem)}</code>\n\n` +
      `<i>تم حفظ الكود أيضاً في خزنتك الرقمية وسجل المشتريات داخل التطبيق.</i>`;
  } else {
    msg = `🎉 <b>VIP Card App - تم استلام طلبك بنجاح!</b>\n\n` +
      `🎮 <b>الخدمة:</b> ${escapeHtmlTg(order.productTitle || 'شحن مباشر')}\n` +
      `🆔 <b>الآيدي:</b> <code>${escapeHtmlTg(order.targetPlayerId || 'N/A')}</code>\n` +
      `⭐ <b>المبلغ:</b> ${order.starsPaid || 0} Stars\n` +
      `🧾 <b>رقم الطلب:</b> <code>${escapeHtmlTg(order.id)}</code>\n\n` +
      `⏳ <b>الحالة:</b> قيد التنفيذ والمتابعة الفورية من قبل فريق العمل.`;
  }

  try {
    await bot.telegram.sendMessage(userId, msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🛍️ فتح المتجر والخزنة', (typeof WEBAPP_URL === 'string' && WEBAPP_URL.startsWith('https://')) ? WEBAPP_URL : 'https://vip-card-app.vercel.app')]
      ])
    });
  } catch (err) {

    // Customer might not have initiated bot chat
  }
}

function setupBot(token) {
  const currentToken = token || channelDb.state.settings.botToken || process.env.BOT_TOKEN || '8758269664:AAGvPI_tphAXSc6iQopIKXg_qOF3zDtNXy4';

  if (currentToken && currentToken !== 'your_telegram_bot_token_here') {
    try {
      if (bot) {
        try { bot.stop(); } catch (e) {}
      }

      bot = new Telegraf(currentToken);
      channelDb.init(
        bot.telegram,
        channelDb.state.settings.storageChannelId || process.env.PRIVATE_DB_CHANNEL_ID || '-1004468909578',
        channelDb.state.settings.ordersChannelId || process.env.ADMIN_QUEUE_CHANNEL_ID || '-1004487020026'
      );

      // Welcome Message Builder
      const sendWelcomeMessage = async (ctx) => {
        const user = ctx.from;
        const exists = await isExistingUser(user.id);
        const isNew = !exists;

        const captured = channelDb.captureUser({
          userId: user.id,
          username: user.username,
          firstName: user.first_name,
          languageCode: user.language_code
        });

        // Sync immediately to Firestore so user appears in admin dashboard
        syncUserToFirestore(captured || {
          userId: user.id,
          username: user.username,
          firstName: user.first_name,
          languageCode: user.language_code
        });

        // Send login/entry notification to Admin Telegram Channel ONLY if new user
        if (isNew) {
          sendAdminUserLoginNotification(user, true);
        }

        // Record persistent entry log in Firestore
        syncLoginLogToFirestore({
          userId: user.id,
          userName: user.first_name || 'VIP Member',
          username: user.username || '',
          type: isNew ? 'USER_JOIN' : 'BOT_START',
          source: 'Telegram Bot'
        });

        const dbUser = channelDb.getUser(user.id);
        if (dbUser && dbUser.isBanned) {
          return ctx.reply('⛔ عذراً، تم حظر حسابك من استخدام VIP Card App.');
        }

        const points = Number((dbUser && dbUser.points) || 0);
        let tierName = 'المستوى البرونزي 🥉';
        if (points >= 5000) tierName = 'المستوى التيتانيوم 🏆';
        else if (points >= 2000) tierName = 'المستوى البلاتيني 💎';
        else if (points >= 500) tierName = 'المستوى الذهبي ⭐️';
        else if (points >= 100) tierName = 'المستوى الفضي 🥈';

        const welcomeHtml = 
`👑 <b>أهلاً بك في VIP Card App!</b>
متجر البطاقات الرقمية والشحن الفوري

⚡ شحن فوري باستخدام نجوم تيليجرام (Telegram Stars - XTR)
💳 باقات باينانس، أبل، جوجل بلاي، زين، STC، وبطاقات لايك كارد
🎯 شحن مباشر لشدات ببجي بمعرف اللاعب

✨ رصيد نقاطك: ${points.toLocaleString('en-US')} نقطة
🏆 مستوى العضوية: ${tierName}`;

        await ctx.reply(welcomeHtml, {
          parse_mode: 'HTML',
          ...getWelcomeMarkup()
        });
      };

      // Bot /start handler
      bot.start(async (ctx) => {
        try {
          await sendWelcomeMessage(ctx);
        } catch (err) {
          console.warn('Bot /start error:', err.message);
          try {
            const fallbackText = 
`👑 <b>أهلاً بك في VIP Card App!</b>
متجر البطاقات الرقمية والشحن الفوري

⚡ شحن فوري باستخدام نجوم تيليجرام (Telegram Stars - XTR)
💳 باقات باينانس، أبل، جوجل بلاي، زين، STC، وبطاقات لايك كارد
🎯 شحن مباشر لشدات ببجي بمعرف اللاعب

✨ رصيد نقاطك: 0 نقطة
🏆 مستوى العضوية: المستوى البرونزي 🥉`;
            await ctx.reply(fallbackText, {
              parse_mode: 'HTML',
              ...getWelcomeMarkup()
            });
          } catch (e) {
            try {
              await ctx.reply('👑 أهلاً بك في VIP Card App!\nمتجر البطاقات الرقمية والشحن الفوري\nhttps://vip-card-app.vercel.app');
            } catch (e2) {}
          }
        }
      });


      // Quick Command Handlers
      bot.command(['shop', 'store', 'app'], async (ctx) => {
        await sendWelcomeMessage(ctx);
      });

      bot.command(['topup', 'charge', 'stars'], async (ctx) => {
        const user = channelDb.getUser(ctx.from.id);
        const stars = Number((user && user.starsBalance) || 0);
        await ctx.reply(
          `⚡ <b>شحن رصيد النجوم (Telegram Stars)</b>\n\n` +
          `💰 رصيدك الحالي: <code>${stars.toLocaleString('en-US')}</code> ⭐\n\n` +
          `لشحن رصيدك بالنجوم فورياً، افتح المتجر واضغط على أيقونة المحفظة أو زر "شحن الرصيد".`,
          {
            parse_mode: 'HTML',
            ...getWelcomeMarkup()
          }
        );
      });

      bot.command(['orders', 'vault'], async (ctx) => {
        const orders = channelDb.getOrders(ctx.from.id);
        if (!orders || orders.length === 0) {
          return ctx.reply('📦 لا توجد طلبات سابقة في سجلك حتى الآن. تسوق الآن عبر المتجر!', {
            ...getWelcomeMarkup()
          });
        }
        let listText = `📦 <b>آخر طلباتك في VIP Card App:</b>\n\n`;
        orders.slice(0, 5).forEach((o, i) => {
          const status = o.status === 'FULFILLED' ? '✅ مكتمل' : '⏳ قيد التنفيذ';
          listText += `${i + 1}. <b>${escapeHtmlTg(o.productTitle)}</b>\n`;
          listText += `   ⭐ ${o.starsPaid} Stars | ${status}\n`;
          if (o.deliveredItem) listText += `   🔑 الكود: <code>${escapeHtmlTg(o.deliveredItem)}</code>\n`;
          listText += `   🧾 المعرف: <code>${escapeHtmlTg(o.id)}</code>\n\n`;
        });
        await ctx.reply(listText, { parse_mode: 'HTML', ...getWelcomeMarkup() });
      });

      bot.command(['help', 'support'], async (ctx) => {
        await ctx.reply(
          `💬 <b>الدعم الفني والمساعدة - VIP Card App</b>\n\n` +
          `إذا كان لديك أي استفسار أو واجهتك أي مشكلة في طلبك، يمكنك التواصل معنا مباشرة من خلال نافذة الدعم المباشر داخل المتجر أو مراسلتنا هنا.`,
          { parse_mode: 'HTML', ...getWelcomeMarkup() }
        );
      });

      // Inline Keyboard Action Callbacks
      bot.action('btn_topup_info', async (ctx) => {
        await ctx.answerCbQuery();
        const user = channelDb.getUser(ctx.from.id);
        const stars = Number((user && user.starsBalance) || 0);
        await ctx.reply(
          `⚡ <b>شحن محفظة VIP Card App</b>\n\n` +
          `⭐ رصيد حسابك الحالي: <b>${stars.toLocaleString('en-US')} نجمة</b>\n\n` +
          `يمكنك إيداع وشحن أي كمية من النجوم مباشرة واستخدامها للشراء فوراً وبدون انتظار عبر فتح المتجر.`,
          { parse_mode: 'HTML', ...getWelcomeMarkup() }
        );
      });

      bot.action('btn_orders_info', async (ctx) => {
        await ctx.answerCbQuery();
        const orders = channelDb.getOrders(ctx.from.id);
        if (!orders || orders.length === 0) {
          return ctx.reply('📦 لا توجد لديك طلبات سابقة حتى الآن. يمكنك استعراض المنتجات والشراء فوراً من المتجر:', {
            ...getWelcomeMarkup()
          });
        }
        let listText = `📦 <b>سجل مشترياتك وخزنتك الرقمية:</b>\n\n`;
        orders.slice(0, 5).forEach((o, i) => {
          const status = o.status === 'FULFILLED' ? '✅ مكتمل' : '⏳ قيد التنفيذ';
          listText += `${i + 1}. <b>${escapeHtmlTg(o.productTitle)}</b>\n`;
          listText += `   ⭐ ${o.starsPaid} Stars | ${status}\n`;
          if (o.deliveredItem) listText += `   🔑 الكود: <code>${escapeHtmlTg(o.deliveredItem)}</code>\n`;
          listText += `\n`;
        });
        await ctx.reply(listText, { parse_mode: 'HTML', ...getWelcomeMarkup() });
      });

      bot.action('btn_loyalty_info', async (ctx) => {
        await ctx.answerCbQuery();
        const dbUser = channelDb.getUser(ctx.from.id);
        const points = Number((dbUser && dbUser.points) || 0);
        await ctx.reply(
          `👑 <b>برنامج مكافآت VIP Card App</b>\n\n` +
          `🎁 رصيد نقاطك: <b>${points.toLocaleString('en-US')} نقطة</b>\n\n` +
          `• تحصل على <b>2x نقاط</b> مع كل عملية شراء بطاقة.\n` +
          `• تحصل على <b>10% نقاط إضافية</b> عند شحن رصيد النجوم.\n` +
          `• النقاط ترفع مستوى عضويتك وتمنحك خصومات وهدايا حصرية!`,
          { parse_mode: 'HTML', ...getWelcomeMarkup() }
        );
      });

      bot.action('btn_support_info', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply(
          `💬 <b>الدعم الفني VIP Card App</b>\n\n` +
          `فريق الدعم الفني جاهز لمساعدتك على مدار الساعة.\n` +
          `تستطيع فتح تذكرة محادثة مباشرة وسريعة من داخل المتجر الإلكتروني.`,
          { parse_mode: 'HTML', ...getWelcomeMarkup() }
        );
      });

      // Stars Handlers
      bot.on('pre_checkout_query', async (ctx) => {
        console.log(`[Stars Invoice] Received pre_checkout_query from user ${ctx.from.id}, query ID: ${ctx.preCheckoutQuery.id}`);
        try {
          if (channelDb.isUserBanned(ctx.from.id)) {
            return await ctx.answerPreCheckoutQuery(false, 'عذراً، تم حظر حسابك من استخدام التطبيق.').catch(() => {});
          }
          await ctx.answerPreCheckoutQuery(true);
          console.log(`[Stars Invoice] Successfully approved pre_checkout_query for user ${ctx.from.id}`);
        } catch (err) {
          console.warn('[Stars Invoice] pre_checkout_query approval warning:', err.message);
          try {
            await ctx.answerPreCheckoutQuery(true);
          } catch (e) {}
        }
      });

      bot.on('successful_payment', async (ctx) => {
        try {
          const userId = ctx.from.id.toString();
          const payment = ctx.message.successful_payment;
          console.log(`[Stars Payment] Successful payment received from ${userId}: ${payment.total_amount} XTR`);

          // Ensure user is captured immediately so getUser never returns null
          channelDb.captureUser({
            userId,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            languageCode: ctx.from.language_code
          });

          let payload = {};
          try {
            payload = JSON.parse(payment.invoice_payload);
          } catch (e) {
            payload = { p: 'unknown' };
          }

          // Handle Direct Account Stars Top-up
          if (payload.type === 'ACCOUNT_TOPUP' || payload.t === 'TOPUP') {
            const starsAmount = Number(payload.amount || payload.a || payment.total_amount);
            const bonusPts = Math.round(starsAmount * 0.1);
            await channelDb.addStarsBalance(userId, starsAmount, 'TELEGRAM_STARS_DEPOSIT');
            await channelDb.addPoints(userId, bonusPts, 'TOPUP_BONUS');
            
            const updatedUser = channelDb.getUser(userId) || { points: bonusPts, starsBalance: starsAmount };
            await syncUserToFirestore({
              userId,
              username: ctx.from.username || '',
              firstName: ctx.from.first_name || 'VIP Member',
              points: updatedUser.points || 0,
              starsBalance: updatedUser.starsBalance || 0
            });

            await channelDb.logTransaction({
              app: 'VIP Card App',
              type: 'ACCOUNT_TOPUP',
              userId,
              userName: ctx.from.username || ctx.from.first_name,
              stars: starsAmount,
              chargeId: payment.telegram_payment_charge_id
            });

            // 1. Notify Admin Channel of New Top-Up
            sendAdminTopupNotification({
              userId,
              userName: ctx.from.first_name || 'VIP Member',
              username: ctx.from.username || '',
              amount: starsAmount,
              newBalance: updatedUser.starsBalance || 0,
              bonusPoints: bonusPts,
              method: 'Telegram Stars (XTR)'
            });

            // 2. Reply to Customer
            await ctx.reply(
              `🎉 <b>VIP Card App - تم شحن الرصيد بنجاح!</b>\n\n` +
              `⭐ <b>المبلغ المودع:</b> +${starsAmount.toLocaleString('en-US')} نجمة\n` +
              `💰 <b>رصيد حسابك الحالي:</b> ${(updatedUser.starsBalance || 0).toLocaleString('en-US')} نجمة\n` +
              `🎁 <b>نقاط ولاء مضافة:</b> +${bonusPts} نقطة\n\n` +
              `<i>يمكنك الآن استخدام رصيدك لشراء أي بطاقة أو شدات من داخل المتجر.</i>`,
              {
                parse_mode: 'HTML',
                ...getWelcomeMarkup()
              }
            );
            return;
          }

          const prodId = payload.p || payload.productId;
          const targetPlayerId = payload.t || payload.targetPlayerId || '';
          const product = channelDb.getProduct(prodId);
          const productTitle = product ? product.title : 'بطاقة رقمية';
          const starsPaid = payment.total_amount;
          const isAuto = product ? (product.type === 'AUTO_DELIVERY') : !targetPlayerId;

          await channelDb.logTransaction({
            app: 'VIP Card App',
            type: 'STARS_PAYMENT',
            userId,
            userName: ctx.from.username || ctx.from.first_name,
            stars: starsPaid,
            productId: prodId,
            productTitle,
            chargeId: payment.telegram_payment_charge_id
          });

          await channelDb.addPoints(userId, starsPaid * 2, 'PURCHASE_REWARD');

          if (isAuto) {
            const code = (await channelDb.popStockCode(prodId)) || 'VIP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
            const order = await channelDb.createOrder({
              userId,
              userName: ctx.from.username || ctx.from.first_name,
              productId: prodId,
              productTitle,
              starsPaid,
              type: 'AUTO_DELIVERY',
              deliveredItem: code,
              status: 'FULFILLED'
            });

            // Sync order to Firestore
            syncOrderToFirestore(order);

            // 1. Notify Admin Orders Channel
            sendAdminOrderNotification(order, {
              userId,
              userName: ctx.from.first_name || 'عضو VIP',
              username: ctx.from.username || ''
            });

            // 2. Reply to Customer
            await ctx.reply(
              `🎉 <b>VIP Card App - تم الدفع بنجاح!</b>\n\n` +
              `📦 <b>المنتج:</b> ${escapeHtmlTg(productTitle)}\n` +
              `⭐ <b>المبلغ:</b> ${starsPaid} Stars\n` +
              `🧾 <b>رقم الطلب:</b> <code>${escapeHtmlTg(order.id)}</code>\n\n` +
              `🔑 <b>كود البطاقة:</b> <code>${escapeHtmlTg(code)}</code>\n\n` +
              `<i>تم حفظ الكود أيضاً في سلة مشترياتك وخزنتك الرقمية بالتطبيق.</i>`,
              {
                parse_mode: 'HTML',
                ...getWelcomeMarkup()
              }
            );
          } else {
            const order = await channelDb.createOrder({
              userId,
              userName: ctx.from.username || ctx.from.first_name,
              productId: prodId,
              productTitle,
              starsPaid,
              type: 'DIRECT_TOPUP',
              targetPlayerId: targetPlayerId || 'N/A',
              status: 'PENDING'
            });

            // Sync order to Firestore
            syncOrderToFirestore(order);

            // 1. Notify Admin Orders Channel
            sendAdminOrderNotification(order, {
              userId,
              userName: ctx.from.first_name || 'عضو VIP',
              username: ctx.from.username || ''
            });

            // 2. Reply to Customer
            await ctx.reply(
              `🎉 <b>تم تأكيد طلبك بنجاح!</b>\n\n` +
              `🎮 <b>الخدمة:</b> ${escapeHtmlTg(productTitle)}\n` +
              `🆔 <b>الآيدي:</b> <code>${escapeHtmlTg(targetPlayerId)}</code>\n` +
              `🧾 <b>رقم الطلب:</b> <code>${escapeHtmlTg(order.id)}</code>\n\n` +
              `⏳ <b>الحالة:</b> قيد التنفيذ، سيتم الشحن المباشر لحسابك فوراً.`,
              {
                parse_mode: 'HTML',
                ...getWelcomeMarkup()
              }
            );
          }

          // Sync user update to Firestore
          syncUserToFirestore({
            userId,
            username: ctx.from.username || '',
            firstName: ctx.from.first_name || 'VIP Member',
            points: (channelDb.getUser(userId)?.points || 0)
          });
        } catch (paymentErr) {
          console.error('[Stars Payment] Critical error processing payment:', paymentErr);
        }
      });

      // Fallback message handler to greet users on any plain text message
      bot.on('message', async (ctx) => {
        if (ctx.message.successful_payment) return;
        try {
          await sendWelcomeMessage(ctx);
        } catch (e) {}
      });

      // Define createWebhookCallback helper for Telegraf
      bot.createWebhookCallback = (path) => bot.webhookCallback(path || '/api/webhook');

      console.log('⚡ Telegraf bot initialized successfully (Serverless Webhook mode)!');
    } catch (err) {
      console.warn('Bot setup info:', err.message);
    }
  } else {
    channelDb.init(null, null, null);
  }
}

// Initial bot setup
setupBot();

// -------------------------------------------------------------
// TELEGRAM WEBHOOK ENDPOINT (SERVERLESS)
// -------------------------------------------------------------
app.post('/api/webhook', async (req, res) => {
  if (!bot) {
    return res.status(503).json({ ok: false, error: 'Bot runtime not initialized' });
  }
  try {
    await bot.handleUpdate(req.body, res);
    if (!res.headersSent) {
      res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.warn('[Webhook] Error handling update:', err.message);
    if (!res.headersSent) {
      res.status(200).json({ ok: true, error: err.message });
    }
  }
});

app.get('/api/webhook', (req, res) => {
  res.json({ ok: true, message: 'VIP Card App Telegram Webhook endpoint is active and listening.' });
});


// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// 1. Get Products Catalog (with Auto-Stocking flags)
app.get('/api/products', (req, res) => {
  const category = req.query.category;
  const products = channelDb.getProducts(category);
  res.json({ success: true, products });
});

// 2. Get Single Product
app.get('/api/products/:id', (req, res) => {
  const product = channelDb.getProduct(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  res.json({ success: true, product });
});

// 3. User Capturing & Profile
app.post('/api/user/capture', async (req, res) => {
  const { userId, username, firstName, languageCode } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

  const exists = await isExistingUser(userId);
  const isNew = !exists;
  const user = channelDb.captureUser({ userId, username, firstName, languageCode });
  syncUserToFirestore(user);
  if (isNew) {
    sendAdminUserLoginNotification(user, true);
  }
  syncLoginLogToFirestore({
    userId,
    userName: firstName || 'VIP Member',
    username: username || '',
    type: isNew ? 'USER_JOIN' : 'WEBAPP_OPEN',
    source: 'Mini App'
  });
  res.json({ success: true, user });
});


app.get('/api/user/:userId', (req, res) => {
  const user = channelDb.getUser(req.params.userId);
  res.json({ success: true, user });
});

// 4. Create Telegram Stars Invoice Link (with Auto-Stocking & Ban Checks)
app.post('/api/create-stars-invoice', async (req, res) => {
  try {
    const { productId, userId, targetPlayerId } = req.body;

    if (channelDb.isUserBanned(userId)) {
      return res.status(403).json({ success: false, error: 'تم حظر حسابك من الاستخدام.' });
    }

    const product = channelDb.getProduct(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    // Auto-Stock validation for codes
    if (product.type === 'AUTO_DELIVERY' && product.inStock <= 0) {
      return res.status(400).json({ success: false, error: 'عذراً، نفذت كمية هذا الكارت مؤقتاً.' });
    }

    const payload = JSON.stringify({
      p: product.id,
      t: targetPlayerId ? String(targetPlayerId).substring(0, 32) : '',
      u: String(userId || 'guest')
    });

    if (bot) {
      try {
        const invoiceLink = await bot.telegram.createInvoiceLink({
          title: product.title,
          description: product.description.substring(0, 250),
          payload,
          provider_token: '',
          currency: 'XTR',
          prices: [{ label: product.title, amount: product.priceStars }]
        });

        return res.json({ success: true, mode: 'TELEGRAM_STARS', invoiceLink, product });
      } catch (err) {
        console.warn('createInvoiceLink fallback:', err.message);
      }
    }

    res.json({ success: true, mode: 'SIMULATOR', product, payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.1 Create Telegram Stars Invoice for Account Top-Up
app.post('/api/account/create-topup-invoice', async (req, res) => {
  try {
    const { userId, starsAmount } = req.body;
    const amount = parseInt(starsAmount, 10);
    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال قيمة صحيحة للنجوم (حد أدنى 1 نجمة).' });
    }

    const uid = String(userId || '999888777');
    if (channelDb.isUserBanned(uid)) {
      return res.status(403).json({ success: false, error: 'تم حظر حسابك من الاستخدام.' });
    }

    const payload = JSON.stringify({
      type: 'ACCOUNT_TOPUP',
      t: 'TOPUP',
      u: uid,
      amount: amount
    });

    if (bot) {
      try {
        const invoiceLink = await bot.telegram.createInvoiceLink({
          title: `شحن رصيد حساب VIP (${amount.toLocaleString('en-US')} ⭐)`,
          description: `إيداع فوري لرصيد ${amount.toLocaleString('en-US')} نجمة في حسابك ومحفظتك بتطبيق VIP Card App.`,
          payload,
          provider_token: '',
          currency: 'XTR',
          prices: [{ label: `شحن ${amount} نجمة`, amount }]
        });

        return res.json({ success: true, mode: 'TELEGRAM_STARS', invoiceLink, amount });
      } catch (err) {
        console.warn('createInvoiceLink topup error:', err.message);
      }
    }

    res.json({ success: true, mode: 'SIMULATOR', amount, payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.2 Mock / Browser Top-up Simulation
app.post('/api/account/mock-topup', async (req, res) => {
  try {
    const { userId, userName, starsAmount } = req.body;
    const amount = parseInt(starsAmount, 10);
    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({ success: false, error: 'قيمة غير صالحة' });
    }

    const uid = String(userId || '999888777');
    if (channelDb.isUserBanned(uid)) {
      return res.status(403).json({ success: false, error: 'تم حظر حسابك.' });
    }

    const bonusPts = Math.round(amount * 0.1);
    await channelDb.addStarsBalance(uid, amount, 'SIMULATED_TOPUP');
    await channelDb.addPoints(uid, bonusPts, 'SIMULATED_TOPUP_BONUS');
    const user = channelDb.getUser(uid);

    await syncUserToFirestore({
      userId: uid,
      username: userName || user.username || '',
      firstName: user.firstName || 'VIP Member',
      points: user.points || 0,
      starsBalance: user.starsBalance || 0
    });

    // Notify Admin Channel of Top-Up
    sendAdminTopupNotification({
      userId: uid,
      userName: userName || user.firstName || 'VIP Member',
      username: user.username || '',
      amount,
      newBalance: user.starsBalance || 0,
      bonusPoints: bonusPts,
      method: 'إيداع المحفظة المباشر'
    });

    res.json({
      success: true,
      starsBalance: user.starsBalance || 0,
      points: user.points || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.3 Get User Stars & Points Balance
app.get('/api/user/:userId/balance', (req, res) => {
  const user = channelDb.getUser(req.params.userId);
  res.json({
    success: true,
    starsBalance: user.starsBalance || 0,
    points: user.points || 0,
    isBanned: Boolean(user.isBanned)
  });
});

// 5. Checkout / Purchase
app.post('/api/mock-checkout', async (req, res) => {
  try {
    const { productId, userId, userName, targetPlayerId } = req.body;

    if (channelDb.isUserBanned(userId)) {
      return res.status(403).json({ success: false, error: 'تم حظر حسابك من الاستخدام.' });
    }

    const product = channelDb.getProduct(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const uid = String(userId || '999888777');
    const uName = userName || 'VIP Customer';
    const existingUser = channelDb.getUser(uid);

    // Auto-Stock validation for codes
    if (product.type === 'AUTO_DELIVERY') {
      let code = await channelDb.popStockCode(product.id);
      if (!code) {
        return res.status(400).json({ success: false, error: 'عذراً، نفذت كمية هذا الكارت من المخزون.' });
      }

      await channelDb.addPoints(uid, product.priceStars * 2, 'PURCHASE_REWARD');
      await channelDb.logTransaction({
        app: 'VIP Card App',
        type: 'STARS_PURCHASE',
        userId: uid,
        userName: uName,
        stars: product.priceStars,
        productId: product.id,
        productTitle: product.title
      });

      const order = await channelDb.createOrder({
        userId: uid,
        userName: uName,
        productId: product.id,
        productTitle: product.title,
        starsPaid: product.priceStars,
        type: 'AUTO_DELIVERY',
        deliveredItem: code,
        status: 'FULFILLED'
      });

      // Sync order to Firestore
      syncOrderToFirestore(order);

      // Notify Admin Orders Channel & Customer
      sendAdminOrderNotification(order, {
        userId: uid,
        userName: uName,
        username: (existingUser && existingUser.username) || ''
      });
      sendCustomerOrderNotification(uid, order);

      return res.json({ success: true, order, deliveredItem: code });
    } else {
      // Direct Top-up (Always unlimited)
      await channelDb.addPoints(uid, product.priceStars * 2, 'PURCHASE_REWARD');
      await channelDb.logTransaction({
        app: 'VIP Card App',
        type: 'DIRECT_TOPUP_PURCHASE',
        userId: uid,
        userName: uName,
        stars: product.priceStars,
        productId: product.id,
        productTitle: product.title
      });

      const order = await channelDb.createOrder({
        userId: uid,
        userName: uName,
        productId: product.id,
        productTitle: product.title,
        starsPaid: product.priceStars,
        type: 'DIRECT_TOPUP',
        targetPlayerId: targetPlayerId || '519283741',
        status: 'PENDING'
      });

      // Sync order to Firestore
      syncOrderToFirestore(order);

      // Notify Admin Orders Channel & Customer
      sendAdminOrderNotification(order, {
        userId: uid,
        userName: uName,
        username: (existingUser && existingUser.username) || ''
      });
      sendCustomerOrderNotification(uid, order);

      return res.json({ success: true, order });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. User Vault
app.get('/api/vault/:userId', (req, res) => {
  const orders = channelDb.getOrders(req.params.userId);
  res.json({ success: true, orders });
});

// 7. Active In-App Broadcast / Announcement
app.get('/api/broadcast/active', (req, res) => {
  const active = channelDb.getActiveBroadcast();
  res.json({ success: true, broadcast: active });
});

app.post('/api/broadcast/dismiss', (req, res) => {
  channelDb.dismissActiveBroadcast();
  res.json({ success: true });
});

// -------------------------------------------------------------
// LIVE SUPPORT CHAT API
// -------------------------------------------------------------
app.get('/api/chat/messages', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  const messages = channelDb.getChatMessages(userId);
  res.json({ success: true, messages });
});

app.post('/api/chat/messages', async (req, res) => {
  const { userId, userName, sender, text, attachmentUrl, orderRef } = req.body;
  if (!userId || !text) return res.status(400).json({ success: false, error: 'userId and text required' });

  const msg = await channelDb.saveChatMessage({
    userId,
    userName,
    sender: sender || 'user',
    text,
    attachmentUrl,
    orderRef
  });

  if (sender === 'admin' && bot) {
    try {
      await bot.telegram.sendMessage(
        userId,
        `💬 <b>رد من الدعم الفني - VIP Card App:</b>\n\n${escapeHtmlTg(text)}`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {}
  } else if (sender !== 'admin') {
    // Notify Admin Channel about incoming customer chat
    sendAdminSupportNotification(msg);
  }

  res.json({ success: true, message: msg });
});

// -------------------------------------------------------------
// IP GEOLOCATION & VISITOR COUNTRY API
// -------------------------------------------------------------
app.get('/api/geo', (req, res) => {
  const country = req.headers['cf-ipcountry'] || 
                  req.headers['x-country-code'] || 
                  req.headers['x-client-geo-country'] ||
                  'US';
  const ip = req.headers['cf-connecting-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.socket.remoteAddress;
  res.json({ success: true, country: country.toUpperCase(), ip });
});

// -------------------------------------------------------------
// ADMIN CONTROL PANEL API & AUTHENTICATION
// -------------------------------------------------------------
function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.query.key;
  if (authHeader === ADMIN_SECRET_KEY || authHeader === `Bearer ${ADMIN_SECRET_KEY}`) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Unauthorized admin access' });
}

// Admin Login POST Endpoint
app.post('/api/admin/login', (req, res) => {
  const { key } = req.body || {};
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ success: false, error: 'يرجى إدخال المفتاح السري' });
  }

  const trimmedKey = key.trim();
  if (trimmedKey === ADMIN_SECRET_KEY) {
    const sessionToken = Buffer.from(`${ADMIN_SECRET_KEY}:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      token: ADMIN_SECRET_KEY,
      authToken: sessionToken,
      message: 'تم تسجيل الدخول بنجاح'
    });
  }

  return res.status(401).json({ 
    success: false, 
    error: 'المفتاح السري غير صحيح' 
  });
});

// Admin Stats
app.get('/api/admin/stats', adminAuth, (req, res) => {
  res.json({ success: true, stats: channelDb.getStats() });
});

// Admin Dynamic Telegram Settings (Get & Live Update)
app.get('/api/admin/settings', adminAuth, (req, res) => {
  res.json({ success: true, settings: channelDb.getSettings() });
});

app.post('/api/admin/settings', adminAuth, async (req, res) => {
  const { botToken, ordersChannelId, storageChannelId } = req.body;
  const saved = await channelDb.saveSettings({ botToken, ordersChannelId, storageChannelId });

  // Dynamically re-bind bot if botToken changed
  if (botToken) {
    setupBot(botToken);
  } else if (bot) {
    channelDb.init(bot.telegram, storageChannelId, ordersChannelId);
  }

  res.json({
    success: true,
    message: 'تم حفظ وتطبيق إعدادات تيليجرام فورياً بدون إعادة تشغيل السيرفر!',
    settings: saved
  });
});

// Admin Change Secret Key & Invalidate Default Password
app.post('/api/admin/change-password', (req, res) => {
  const { newKey } = req.body || {};
  if (!newKey || typeof newKey !== 'string' || newKey.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'المفتاح السري قصير جداً (4 أحرف على الأقل)' });
  }

  ADMIN_SECRET_KEY = newKey.trim();
  channelDb.state.settings.adminSecretKey = ADMIN_SECRET_KEY;
  channelDb._saveToDisk();

  res.json({
    success: true,
    message: 'تم تحديث المفتاح السري للخادم بنجاح وحظر المفتاح الافتراضي (vipadmin2026) نهائياً'
  });
});

// Admin Broadcasting System (Send Broadcast to all users & set active in-app banner)
app.post('/api/admin/broadcast', adminAuth, async (req, res) => {
  const { title, message, imageUrl, buttonText, buttonUrl, displayMode } = req.body;
  if (!title || !message) {
    return res.status(400).json({ success: false, error: 'العنوان ونص الرسالة مطلوبان.' });
  }

  const allUsers = channelDb.getUsers();
  let dispatchedCount = 0;

  // Send via bot to all users if bot is active
  if (bot) {
    const extra = {};
    if (buttonText && buttonUrl) {
      extra.reply_markup = {
        inline_keyboard: [[{ text: buttonText, url: buttonUrl }]]
      };
    }

    for (const u of allUsers) {
      try {
        if (imageUrl) {
          await bot.telegram.sendPhoto(u.userId, imageUrl, {
            caption: `📢 *${title}*\n\n${message}`,
            parse_mode: 'Markdown',
            ...extra
          });
        } else {
          await bot.telegram.sendMessage(
            u.userId,
            `📢 *${title}*\n\n${message}`,
            { parse_mode: 'Markdown', ...extra }
          );
        }
        dispatchedCount++;
      } catch (err) {
        // Continue to next user if user blocked bot
      }
    }
  } else {
    dispatchedCount = allUsers.length;
  }

  const broadcastRecord = await channelDb.saveBroadcast({
    title,
    message,
    imageUrl,
    buttonText,
    buttonUrl,
    displayMode: displayMode || 'both',
    recipientsCount: dispatchedCount
  });

  res.json({
    success: true,
    message: `تم إرسال الإذاعة بنجاح إلى ${dispatchedCount} مستخدم وتفعيل الإعلان بداخل التطبيق!`,
    broadcast: broadcastRecord
  });
});

// Admin Dynamic Product Update (Title, Slug/ID, Category, Price, Type, Badge, Description)
app.post('/api/admin/products/update', adminAuth, async (req, res) => {
  const { productId, originalId, newId, id, slug, title, priceStars, price, category, categoryNameAr, description, badge, type, icon, region } = req.body;
  const targetOrigId = productId || originalId;
  const targetNewId = newId || id || slug;
  const targetPrice = priceStars !== undefined ? priceStars : price;

  if (!targetOrigId) {
    return res.status(400).json({ success: false, error: 'معرف المنتج الأصلي مطلوب.' });
  }

  // 1. Update in Channel DB / Local Ledger
  const result = await channelDb.updateProduct({
    originalId: targetOrigId,
    newId: targetNewId,
    title,
    priceStars: targetPrice,
    category,
    categoryNameAr,
    description,
    badge,
    type,
    icon,
    region
  });

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  const updatedProduct = result.product;

  // 2. Sync with Firebase (Firestore / Realtime Database)
  const fbResult = await firebaseSync.syncProductToFirebase({
    title: updatedProduct.title,
    slug: updatedProduct.id,
    priceStars: updatedProduct.priceStars,
    category: updatedProduct.category,
    categoryNameAr: updatedProduct.categoryNameAr,
    type: updatedProduct.type,
    badge: updatedProduct.badge,
    description: updatedProduct.description,
    icon: updatedProduct.icon,
    originalSlug: targetOrigId !== updatedProduct.id ? targetOrigId : null
  });

  res.json({
    success: true,
    message: 'تم تحديث بيانات المنتج (الاسم، السعر، القسم، الوصف، الشارة) بنجاح!',
    product: updatedProduct,
    firebase: fbResult
  });
});

// Admin Dynamic Product Upsert (Create or Update Product)
app.post('/api/admin/products/upsert', adminAuth, async (req, res) => {
  const { productId, originalId, newId, id, slug, title, priceStars, price, category, categoryNameAr, description, badge, type, icon, region } = req.body;
  const targetOrigId = originalId || productId;
  const targetId = id || slug || newId || targetOrigId;
  const targetPrice = priceStars !== undefined ? priceStars : price;

  const result = await channelDb.upsertProduct({
    originalId: targetOrigId,
    id: targetId,
    title,
    priceStars: targetPrice,
    category,
    categoryNameAr,
    description,
    badge,
    type,
    icon,
    region
  });

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  const savedProduct = result.product;

  const fbResult = await firebaseSync.syncProductToFirebase({
    title: savedProduct.title,
    slug: savedProduct.id,
    priceStars: savedProduct.priceStars,
    category: savedProduct.category,
    categoryNameAr: savedProduct.categoryNameAr,
    type: savedProduct.type,
    badge: savedProduct.badge,
    description: savedProduct.description,
    icon: savedProduct.icon,
    originalSlug: targetOrigId && targetOrigId !== savedProduct.id ? targetOrigId : null
  });

  res.json({
    success: true,
    message: 'تم حفظ وتحديث بيانات المنتج في المتجر وسحابة Firebase بنجاح!',
    product: savedProduct,
    firebase: fbResult
  });
});

// Admin Dynamic Price Update (Legacy / Quick Update)
app.post('/api/admin/update-price', adminAuth, async (req, res) => {
  const { productId, newStarsPrice, title, newId } = req.body;
  if (!productId || newStarsPrice === undefined) {
    return res.status(400).json({ success: false, error: 'productId and newStarsPrice required' });
  }
  
  const targetProduct = channelDb.getProduct(productId);
  const result = await channelDb.updateProduct({
    originalId: productId,
    newId: newId || productId,
    title: title || (targetProduct ? targetProduct.title : ''),
    priceStars: newStarsPrice
  });

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  await firebaseSync.syncProductToFirebase({
    title: result.product.title,
    slug: result.product.id,
    priceStars: result.product.priceStars,
    originalSlug: productId !== result.product.id ? productId : null
  });

  res.json({ success: true, product: result.product });
});

// Admin User Ban System
app.post('/api/admin/ban-user', adminAuth, async (req, res) => {
  const { telegramId, isBanned } = req.body;
  if (!telegramId) return res.status(400).json({ success: false, error: 'telegramId is required' });
  const user = await channelDb.banUser(telegramId, isBanned);
  res.json({ success: true, user });
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  res.json({ success: true, users: channelDb.getUsers() });
});

// Admin Live Chat Threads
app.get('/api/admin/chat-threads', adminAuth, (req, res) => {
  res.json({ success: true, threads: channelDb.getChatThreads() });
});

app.post('/api/admin/chat-read', adminAuth, async (req, res) => {
  const { userId } = req.body;
  if (userId) await channelDb.markThreadReadByAdmin(userId);
  res.json({ success: true });
});

// Admin Orders Queue
app.get('/api/admin/orders', adminAuth, (req, res) => {
  res.json({ success: true, orders: channelDb.getOrders() });
});

app.post('/api/admin/orders/:orderId/fulfill', adminAuth, async (req, res) => {
  const { note } = req.body;
  const order = await channelDb.updateOrderStatus(req.params.orderId, 'FULFILLED', note || 'Fulfilled via Admin Panel');
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  if (bot && order.userId) {
    try {
      await bot.telegram.sendMessage(
        order.userId,
        `✅ *تم شحن طلبك بنجاح!*\n\nالخدمة: ${order.productTitle}\nالآيدي: \`${order.targetPlayerId}\``,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }
  res.json({ success: true, order });
});

app.post('/api/admin/orders/:orderId/reject', adminAuth, async (req, res) => {
  const { note } = req.body;
  const order = await channelDb.updateOrderStatus(req.params.orderId, 'REJECTED', note || 'Rejected');
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  res.json({ success: true, order });
});

// Admin Products CRUD
app.post('/api/admin/products', adminAuth, async (req, res) => {
  const saved = await channelDb.saveProduct(req.body);
  res.json({ success: true, product: saved });
});

app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
  await channelDb.deleteProduct(req.params.id);
  res.json({ success: true, message: 'Product removed' });
});

// Admin Stock Codes (Bulk deposit auto-stocking)
app.post('/api/admin/stock', adminAuth, async (req, res) => {
  const { productId, codes } = req.body;
  const count = await channelDb.addStockCodes(productId, codes);
  res.json({ success: true, newStockCount: count });
});

// Admin Ledger
app.get('/api/admin/transactions', adminAuth, (req, res) => {
  res.json({ success: true, transactions: channelDb.getTransactions() });
});

// Fallback HTML Router
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Start Server (Only when executed directly locally, not when imported as serverless function)
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`👑 VIP CARD APP running on http://localhost:${PORT}`);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[Safety] Unhandled Rejection:', reason?.message || reason);
});

module.exports = app;


