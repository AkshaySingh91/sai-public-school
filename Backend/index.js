import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { auth, firestore, storage } from './utils/firebase.js' // initilize firebase before proceding to any route
import { verifyAccountant, fetchInstiute } from './Middleware/getAuth.js';

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

const initializeApp = async () => {
    try {
        app.use(configureCORS());
        app.use(express.json({ limit: '10mb' }));

        // Import routes after Firebase initialization 
        const { default: commonSchoolRoutes } = await import('./Routes/commonSchoolRoutes.js');
        const { default: commonCollegeRoutes } = await import('./Routes/commonCollegeRoutes.js');
        const { default: adminRoutes } = await import('./Routes/adminRoutes.js'); // for profile 
        const { default: superadminRoutes } = await import('./Routes/superadminRoutes.js'); // for profile 

        app.use('/api/school', verifyAccountant, commonSchoolRoutes);
        app.use('/api/college', verifyAccountant, commonCollegeRoutes);
        app.use('/api/admin', verifyAccountant, adminRoutes);
        app.use('/api/superadmin', verifyAccountant, superadminRoutes);

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