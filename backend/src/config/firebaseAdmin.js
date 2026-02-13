import admin from 'firebase-admin';

let initialized = false;

export const initializeFirebaseAdmin = () => {
  if (initialized || admin.apps.length) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials are missing. Auth-protected routes will fail until configured.');
    return admin;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });

  initialized = true;
  return admin;
};

export const getFirestore = () => {
  initializeFirebaseAdmin();
  return admin.firestore();
};

export default admin;
