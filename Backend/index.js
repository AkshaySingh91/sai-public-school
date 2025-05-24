import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initFirebase } from './utils/firebase.js';
import StudentDocUpload from './Routes/studentDocUpload.js';
import settingsRouter from './Routes/settings.js';
import admin from 'firebase-admin';

config();
const app = express();
const PORT = process.env.PORT || 1000;

// Enable CORS
const isProduction = process.env.NODE_ENV === 'Production';
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
app.use(express.json());

// Mount routes
app.post('/api/superadmin/schools/create-accountant', async (req, res) => {
    try { 
        const { name, email, password, phone, schoolCode } = req.body;
        if (!name || !email || !password || !schoolCode) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const userRec = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            phoneNumber: phone || undefined,
        });
        await admin.firestore().collection('Users').doc(userRec.uid).set({
            name, email, phone: phone || null,
            schoolCode, role: 'accountant',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ uid: userRec.uid, message: 'Accountant created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
app.use('/api/admin/student', StudentDocUpload);
app.use('/api/admin/settings', settingsRouter);

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize Firebase then start server
initFirebase()
    .then(() => app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`)))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });