// index.jsx
import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import StudentDocUpload from './Routes/StudentDocUpload.js';
import settingsRouter from './Routes/settings.js';

config();
const app = express();

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment
const isProduction = process.env.NODE_ENV === 'Production';
const PORT = process.env.PORT || 1000;

// CORS setup
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = isProduction
            ? [
                'https://tuljabhavanibss.in',
                'https://www.tuljabhavanibss.in'
            ]
            : ["http://localhost:5173"];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Debug logging
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    console.log(`[Headers]`, req.headers);
    next();
});

// Firebase Admin init inside async fn
async function initFirebase() {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    const raw = await fs.readFile(serviceAccountPath, 'utf-8');
    const cred = JSON.parse(raw);

    admin.initializeApp({
        credential: admin.credential.cert(cred)
    });
    console.log('✅ Firebase Admin initialized');
} 
// Routes
app.post('/api/superadmin/schools/create-accountant', async (req, res) => {
    const { name, email, password, phone, schoolCode } = req.body;
    if (!name || !email || !password || !schoolCode) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const userRec = await admin.auth().createUser({
            email, password, displayName: name,
            phoneNumber: phone || undefined,
        });
        await admin.firestore().collection('Users').doc(userRec.uid).set({
            name, email, phone: phone || null,
            schoolCode, role: 'accountant',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ uid: userRec.uid, message: 'Accountant created successfully' });
    } catch (err) {
        console.error('[Create Accountant Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// Mount protected admin routes
app.use(
    '/api/admin/student',
    StudentDocUpload
);
app.use(
    '/api/admin/settings',
    settingsRouter
);

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start
initFirebase()
    .then(() => {
        app.listen(PORT, () =>
            console.log(`🚀 Backend listening on port ${PORT}`)
        );
    })
    .catch(err => {
        console.error('[Startup Error]', err);
        process.exit(1);
    });