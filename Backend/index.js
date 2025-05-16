import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
config()

const app = express();
app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read JSON file manually
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccountRaw = await fs.readFile(serviceAccountPath, 'utf-8'); //type will be string
const serviceAccount = JSON.parse(serviceAccountRaw);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.storageBucket
});

const db = admin.firestore();
console.log(process.env.storageBucket)

// 1) Middleware to verify accountant role
const verifyAccountant = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userDoc = await admin.firestore().collection('Users').doc(decodedToken.uid).get();

        if (userDoc.data().role !== 'accountant') {
            return res.status(403).json({ error: "Forbidden" });
        }

        req.user = userDoc.data();
        req.user.uid = decodedToken.uid;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
};

// 2) Middleware to fetch the school and attach it to req.school
async function fetchSchool(req, res, next) {
    try {
        const snap = await admin
            .firestore()
            .collection("schools")
            .where("Code", "==", req.user.schoolCode)
            .limit(1)
            .get();

        if (snap.empty) {
            return res.status(404).json({ error: "School not found" });
        }

        req.school = snap.docs[0].data();
        next();
    } catch (err) {
        next(err);
    }
}


app.post('/superadmin/schools/create-accountant', async (req, res) => {
    const { name, email, password, phone, schoolCode } = req.body;

    if (!name || !email || !password || !schoolCode) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        // from here we will create user in firebase authentication & we get object where uid is present
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            phoneNumber: phone || undefined,
        });
        // based on that uid we will create document in firestore, so that when user loggend in based on uid is will easy to find he exist in users schema of not
        await db.collection('Users').doc(userRecord.uid).set({
            name,
            email,
            phone: phone || null,
            schoolCode,
            role: 'accountant',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ uid: userRecord.uid, message: 'Accountant created successfully' });
    } catch (err) {
        console.error('Error creating accountant:', err);
        res.status(500).json({ error: err.message });
    }
});
import StudentDocUpload from "./Routes/StudentDocUpload.js"
app.use("/admin/student", verifyAccountant, fetchSchool, StudentDocUpload)
import settingsRouter from './Routes/settings.js';
app.use('/admin/settings', verifyAccountant, fetchSchool, settingsRouter);

app.listen(5000, () => console.log('Backend listening on port 5000'));
