/**
 * VIP Card App - Telegram Webhook Activator for Vercel
 * Usage:
 *   node scripts/set-webhook.js https://your-project.vercel.app
 * Or set WEBAPP_URL in .env and run:
 *   node scripts/set-webhook.js
 */

require('dotenv').config();
const https = require('https');

const botToken = process.env.BOT_TOKEN || process.argv[3];
let projectUrl = process.argv[2] || process.env.WEBAPP_URL || process.env.VERCEL_URL;

if (!botToken || botToken === 'your_telegram_bot_token_here') {
  console.error('❌ خطأ: يرجى تحديد BOT_TOKEN في ملف .env أو تمريره كمعامل.');
  process.exit(1);
}

if (!projectUrl) {
  console.error('❌ خطأ: يرجى تحديد رابط المشروع في Vercel.');
  console.log('طريقة الاستخدام: node scripts/set-webhook.js https://your-app.vercel.app');
  process.exit(1);
}

// Ensure proper HTTPS URL format
if (!projectUrl.startsWith('http://') && !projectUrl.startsWith('https://')) {
  projectUrl = 'https://' + projectUrl;
}
projectUrl = projectUrl.replace(/\/+$/, '');

const webhookUrl = `${projectUrl}/api/webhook`;

console.log('========================================================');
console.log('⚡ تفعيل تيليجرام ويب هوك (Telegram Webhook Activation)');
console.log('========================================================');
console.log(`🤖 توكن البوت: ${botToken.substring(0, 10)}...`);
console.log(`🌐 مسار الويب هوك المستهدف: ${webhookUrl}`);
console.log('--------------------------------------------------------');

function makeRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getWebhookInfo() {
  return new Promise((resolve, reject) => {
    https.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function activate() {
  try {
    const setRes = await makeRequest(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      drop_pending_updates: false,
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment']
    });

    if (setRes.ok) {
      console.log('✅ تم تفعيل الويب هوك بنجاح على سيرفرات تيليجرام!');
      console.log(`📝 رسالة تيليجرام: ${setRes.description || 'Webhook was set'}`);
    } else {
      console.error('❌ تعذر تفعيل الويب هوك:', setRes.description || setRes);
    }

    console.log('--------------------------------------------------------');
    console.log('🔍 جاري التحقق من حالة الويب هوك الحالية...');
    const info = await getWebhookInfo();
    if (info.ok && info.result) {
      console.log(`📍 الرابط المسجل: ${info.result.url}`);
      console.log(`⏳ التحديثات المعلقة: ${info.result.pending_update_count}`);
      if (info.result.last_error_message) {
        console.warn(`⚠️ آخر خطأ مسجل: ${info.result.last_error_message}`);
      } else {
        console.log('✨ حالة الاتصال: ممتاز وجاهز لاستقبال التحديثات 24/7 دون أي أخطاء.');
      }
    }
    console.log('========================================================');
  } catch (err) {
    console.error('❌ حدث خطأ أثناء الاتصال بتيليجرام:', err.message);
  }
}

activate();
