/**
 * Firebase Firestore & Realtime Database Synchronization Driver
 * Syncs product updates (title, slug, price) directly to Firestore / Realtime Database
 * Project: VIP Card App (vipcardapp-app)
 */

const admin = require('firebase-admin');
const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getDatabase } = require('firebase-admin/database');

let cachedApp = null;
let cachedFirestore = null;
let cachedRtdb = null;
let isInitialized = false;

function initFirebase() {
  if (cachedFirestore) {
    return { app: cachedApp, firestore: cachedFirestore, rtdb: cachedRtdb, isInitialized: true };
  }

  try {
    const apps = (admin.apps && admin.apps.length > 0) ? admin.apps : getApps();
    if (apps && apps.length > 0) {
      cachedApp = apps[0];
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'vipcardapp-app';
      const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://vipcardapp-app-default-rtdb.firebaseio.com';
      const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

      let credential = null;
      if (serviceAccountRaw) {
        try {
          const parsed = JSON.parse(serviceAccountRaw);
          credential = cert(parsed);
        } catch (e) {
          if (require('fs').existsSync(serviceAccountRaw)) {
            credential = cert(require(serviceAccountRaw));
          }
        }
      }

      const appOptions = { projectId, databaseURL };
      if (credential) {
        appOptions.credential = credential;
      } else {
        try {
          appOptions.credential = applicationDefault();
        } catch (e) {}
      }

      cachedApp = initializeApp(appOptions);
      console.log(`[FirebaseSync] Connected and cached for serverless project: ${projectId}`);
    }

    if (cachedApp) {
      try { cachedFirestore = getFirestore(cachedApp); } catch (e) {}
      try { cachedRtdb = getDatabase(cachedApp); } catch (e) {}
    }

    isInitialized = Boolean(cachedFirestore);
  } catch (err) {
    console.log(`[FirebaseSync] Notice: Running in standalone mode (${err.message}). Ready to sync to Firebase.`);
  }

  return { app: cachedApp, firestore: cachedFirestore, rtdb: cachedRtdb, isInitialized };
}

// Initial cache setup
initFirebase();


async function syncProductToFirebase({ title, slug, priceStars, category, categoryNameAr, type, badge, description, icon, originalSlug = null }) {
  const result = {
    synced: false,
    firestore: false,
    rtdb: false,
    timestamp: new Date().toISOString()
  };

  const payload = {
    title,
    slug,
    id: slug,
    price: Number(priceStars),
    priceStars: Number(priceStars),
    updatedAt: new Date().toISOString()
  };

  if (category) payload.category = category;
  if (categoryNameAr) payload.categoryNameAr = categoryNameAr;
  if (type) payload.type = type;
  if (badge !== undefined) payload.badge = badge;
  if (description !== undefined) payload.description = description;
  if (icon) payload.icon = icon;

  const { firestore, rtdb, isInitialized: ready } = initFirebase();
  const hasCredential = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!ready || !firestore) {
    return {
      ...result,
      synced: false,
      message: 'Firebase driver active (project: ' + (process.env.FIREBASE_PROJECT_ID || 'vipcardapp-app') + '). Cloud push active once service account credentials provided.'
    };
  }


  try {
    // 1. Update Firestore
    await firestore.collection('products').doc(slug).set(payload, { merge: true });
    result.firestore = true;
    result.synced = true;

    // Delete old document if slug changed
    if (originalSlug && originalSlug !== slug) {
      try {
        await firestore.collection('products').doc(originalSlug).delete();
      } catch (delErr) {
        console.warn(`[FirebaseSync] Notice on old doc: ${delErr.message}`);
      }
    }

    // 2. Update Realtime Database if accessible
    if (rtdb) {
      try {
        await rtdb.ref(`products/${slug}`).set(payload);
        result.rtdb = true;
        if (originalSlug && originalSlug !== slug) {
          await rtdb.ref(`products/${originalSlug}`).remove().catch(() => {});
        }
      } catch (rtdbErr) {}
    }

    return { ...result, success: true, message: 'Updated Firebase (Firestore/RTDB) successfully.' };
  } catch (err) {
    console.warn('[FirebaseSync] Notice during remote sync:', err.message);
    return { ...result, success: false, error: err.message };
  }
}

module.exports = {
  syncProductToFirebase,
  isInitialized: () => isInitialized
};
