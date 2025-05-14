// routes/settings.js
import express from 'express';
import admin from 'firebase-admin';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

// Configure R2 client
const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

// Middleware to verify accountant role
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

// Get user profile
router.get('/profile', verifyAccountant, async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection('Users').doc(req.user.uid).get();
        res.json(userDoc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.put('/profile', verifyAccountant, async (req, res) => {
    try {
        const { name, phone } = req.body;
        await admin.firestore().collection('Users').doc(req.user.uid).update({
            name,
            phone: phone || null
        });
        res.json({ message: "Profile updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change password
router.post('/change-password', verifyAccountant, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await admin.auth().getUser(req.user.uid);

        // Verify current password
        // Note: You'll need to implement proper password verification
        // This might require Firebase Auth custom tokens or re-authentication
        // This is a simplified example

        await admin.auth().updateUser(req.user.uid, { password: newPassword });
        res.json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload profile image
router.post('/upload-profile', verifyAccountant, async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        const image = req.files.image;
        const key = `profile/${req.user.uid}/${Date.now()}_${image.name}`;

        await r2Client.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: image.data,
            ContentType: image.mimetype
        }));

        const imageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
        await admin.firestore().collection('Users').doc(req.user.uid).update({
            profileImage: imageUrl
        });

        res.json({ imageUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete profile image
router.delete('/profile-image', verifyAccountant, async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection('Users').doc(req.user.uid).get();
        const imageUrl = userDoc.data().profileImage;

        if (imageUrl) {
            const key = imageUrl.split(`${process.env.R2_PUBLIC_URL}/`)[1];
            await r2Client.send(new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: key
            }));
        }

        await admin.firestore().collection('Users').doc(req.user.uid).update({
            profileImage: admin.firestore.FieldValue.delete()
        });

        res.json({ message: "Profile image deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// School routes
router.get('/school', verifyAccountant, async (req, res) => {
    try {
        const schoolDoc = await admin.firestore().collection('schools')
            .where('Code', '==', req.user.schoolCode)
            .get();
        if (schoolDoc.empty) return res.status(404).json({ error: "School not found" });

        res.json(schoolDoc.docs[0].data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/school', verifyAccountant, async (req, res) => {
    try {
        const { schoolName, location } = req.body;
        console.log(schoolName, location)
        console.log(req.user)
        const schoolDoc = await admin.firestore().collection('schools')
            .where('Code', '==', req.user.schoolCode)
            .get();

        if (schoolDoc.empty) return res.status(404).json({ error: "School not found" });

        await schoolDoc.docs[0].ref.update({ schoolName, location });
        res.json({ message: "School updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;