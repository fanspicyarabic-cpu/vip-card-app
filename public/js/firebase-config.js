/**
 * VIP Card App - Firebase SDK Configuration
 * Project: VIP Card App (vipcardapp-app)
 * Used across VIP Card App Mini App (index.html) & Admin Dashboard (admin.html)
 */

const firebaseConfig = {
  apiKey: "AIzaSyD4e1HCzmkYsTlSjkgSwSven5UWRQzrw6o",
  authDomain: "vipcardapp-app.firebaseapp.com",
  projectId: "vipcardapp-app",
  storageBucket: "vipcardapp-app.firebasestorage.app",
  messagingSenderId: "666717588401",
  appId: "1:666717588401:web:b729243fd8023cdd6e0b90",
  databaseURL: "https://vipcardapp-app-default-rtdb.firebaseio.com"
};

// Expose globally for both Storefront & Admin Panel
window.firebaseConfig = firebaseConfig;

// Client-side Firebase App initialization
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('[Firebase] VIP Card App initialized successfully for project:', firebaseConfig.projectId);
  } catch (e) {
    console.warn('[Firebase] Initialization notice:', e.message);
  }
}
