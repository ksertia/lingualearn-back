const admin = require('firebase-admin');

let firebaseApp = null;

function getFirebase() {
  if (firebaseApp) return firebaseApp;

  const projectId     = process.env.FIREBASE_PROJECT_ID;
  const clientEmail   = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey    = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Variables manquantes — push notifications désactivées.');
    return null;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  console.log('[Firebase] Initialisé avec succès.');
  return firebaseApp;
}

async function sendPushNotification({ tokens, title, body, data = {} }) {
  const app = getFirebase();
  if (!app || !tokens || tokens.length === 0) return null;

  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    tokens,
  };

  try {
    const result = await admin.messaging().sendEachForMulticast(message);
    return result;
  } catch (err) {
    console.error('[Firebase] Erreur push:', err.message);
    return null;
  }
}

module.exports = { getFirebase, sendPushNotification };
