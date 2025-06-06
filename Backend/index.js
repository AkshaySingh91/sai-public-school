import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { auth, firestore, storage } from './utils/firebase.js' // initilize firebase before proceding to any route
import { verifyAccountant, fetchSchool } from './Middleware/getAuth.js';

config();
const app = express();
const PORT = process.env.PORT || 1000;

// Configure CORS
const configureCORS = () => {
    const isProduction = process.env.NODE_ENV === 'Production';
    const allowedOrigins = isProduction
        ? ['https://tuljabhavanibss.in', 'https://www.tuljabhavanibss.in']
        : ['http://localhost:5173'];

    return cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type'],
        credentials: true
    });
};
// Configure file upload 

const initializeApp = async () => {
    try {
        // Apply middleware
        app.use(configureCORS());
app.use(express.json({ limit: '10mb' }));

        // Import routes after Firebase initialization
        const { default: settingsRouter } = await import('./Routes/settings.js');
        const { default: superadminSettings } = await import('./Routes/superadminSettings.js');
        const { default: fileUpload } = await import('./Routes/fileUpload.js');

        // Apply routes
        app.use('/api/admin/school', verifyAccountant, fileUpload);
        app.use('/api/admin/settings', verifyAccountant, fetchSchool, settingsRouter);
        app.use('/api/superadmin/settings', verifyAccountant, superadminSettings);

        // Superadmin route
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
        // Error handling
        app.use((err, req, res, next) => {
            console.error('[Server Error]', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
        });

    } catch (error) {
        console.error('💥 Failed to initialize application:', error);
        process.exit(1);
    }
};

initializeApp();  