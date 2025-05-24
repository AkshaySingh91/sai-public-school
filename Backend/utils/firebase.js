// utils/firebase.js
import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export async function initFirebase() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serviceAccountPath = path.join(__dirname, '..', process.env.SERVICE_ACCOUNT_PATH);
    const raw = await fs.readFile(serviceAccountPath, 'utf-8');
    const cred = JSON.parse(raw);

    admin.initializeApp({ credential: admin.credential.cert(cred) });
    console.log('✅ Firebase Admin initialized');
}