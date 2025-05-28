import admin from 'firebase-admin';
import { config } from 'dotenv';

config(); // Load environment variables

function initializeFirebase() {
  try {
    // Environment-based configuration
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    };

    if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
      throw new Error('Missing Firebase environment variables');
    }

    // Initialize Firebase
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      storageBucket: firebaseConfig.storageBucket
    });

    // Verify connection
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    
    console.log('✅ Firebase Admin initialized successfully');
    console.log(`📦 Storage bucket: ${admin.storage().bucket().name}`);

    return {
      auth: admin.auth(),
      firestore: admin.firestore(),
      storage: admin.storage(),
      admin
    };

  } catch (error) {
    console.error('🔥 Failed to initialize Firebase:', error);
    process.exit(1);
  }
}

export const { auth, firestore, storage} = initializeFirebase();