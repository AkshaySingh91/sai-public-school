import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initFirebase } from './utils/firebase.js'; 
import fileUpload from 'express-fileupload';
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
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds maximum allowed limit'
}));

// Initialize Firebase then start server 
initFirebase()
    .then(() => {
        // Now import routes that depend on Firebase
        import('./Routes/studentDocUpload.js').then(StudentDocUpload => {
            import('./Routes/settings.js').then(settingsRouter => {

                // Setup routes after initialization
                app.use('/api/admin/student', verifyAccountant, fetchSchool, StudentDocUpload.default);
                app.use('/api/admin/settings', verifyAccountant, fetchSchool, settingsRouter.default);

                // Start server
                app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
            });
        });
    })
    .catch(err => {
        console.error('Firebase initialization failed:', err);
        process.exit(1);
    });

// Auth middleware
async function verifyAccountant(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header required in the form “Bearer <token>”' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const userSnap = await admin.firestore().collection('Users').doc(decoded.uid).get();

        if (!userSnap.exists || userSnap.data().role !== 'accountant') {
            return res.status(403).json({ error: 'Forbidden: not an accountant' });
        }

        req.user = { uid: decoded.uid, ...userSnap.data() };
        next();
    } catch (err) {
        console.error('[Auth Error]', err);
        res.status(401).json({ error: 'Authentication failed', details: err.message });
    }
}

// School lookup middleware
async function fetchSchool(req, res, next) {
    try {
        const snap = await admin
            .firestore()
            .collection('schools')
            .where('Code', '==', req.user.schoolCode)
            .limit(1)
            .get();

        if (snap.empty) {
            return res.status(404).json({ error: 'School not found' });
        }
        req.school = snap.docs[0].data();
        next();
    } catch (err) {
        next(err);
    }
}

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
// Global error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal server error' });
});



/*
    listen 80;
    listen [::]:80;
    server_name tuljabhavanibss.in www.tuljabhavanibss.in;
    return 301 https://tuljabhavanibss.in$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tuljabhavanibss.in www.tuljabhavanibss.in;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/tuljabhavanibss.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tuljabhavanibss.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Frontend Configuration
    root /var/www/projects/saiPublicSchool/Frontend/dist;
    index index.html;

    # Client-side routing for SPA
    location / {
        try_files $uri $uri/ /index.html;

        # Cache control for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|avif)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Proxy Configuration
    location /api/ {
        proxy_pass http://localhost:1000;
        proxy_http_version 1.1;

        # Essential headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Authorization $http_authorization;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # CORS headers for API
        add_header 'Access-Control-Allow-Origin' "$http_origin" always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        # Handle preflight requests
        if ($request_method = OPTIONS) {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # Timeouts
        proxy_connect_timeout 75s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
    }

    # Static files (if needed)
    location /files/ {
        alias /var/www/projects/exp/;
        autoindex off;
        expires 1d;
        add_header Cache-Control "public";

        # Security for file access
        location ~* \.php$ {
            deny all;
        }
    }

    # Security: Block hidden files
    location ~ /\.(?!well-known) {
        deny all;
        access_log off;
        log_not_found off;
    }

    # SSL stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
}

*/