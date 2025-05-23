// routes/settings.js
import express from 'express';
import admin from 'firebase-admin';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from "multer"
import path, { dirname } from "path"
import { fileURLToPath } from "url";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const assetsDir = path.join(__dirname, "..", "Assets");
        // ensure directory exists
        fs.mkdirSync(assetsDir, { recursive: true });
        cb(null, assetsDir);
    },
    filename(req, file, cb) {
        // e.g. "PuneTaluka.png"
        const ext = path.extname(file.originalname).toLowerCase();
        const taluka = req?.school?.location?.taluka ? req.school.location.taluka.replace(/\s+/g, "_") : "schoolLogo" + Math.floor((Math.random() * 1000));
        console.log(ext, taluka)
        cb(null, taluka + "-school-logo" + ext);
    },
});
const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2 MB
    },
    fileFilter(req, file, cb) {
        // only images
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed."));
        }
        cb(null, true);
    },
});

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


// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection('Users').doc(req.user.uid).get();
        res.json(userDoc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.put('/profile', async (req, res) => {
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
router.post('/change-password', async (req, res) => {
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
router.post('/upload-profile', async (req, res) => {
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
router.delete('/profile-image', async (req, res) => {
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
router.get('/school', async (req, res) => {
    try {
        res.json(req.school);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/school', async (req, res) => {
    try {
        const { schoolName,
            divisions: d,
            class: c,
            location,
            academicYear,
            schoolReceiptHeader,
            transportReceiptHeader,
            stockReceiptHeader,
            schoolLocation,
            feeIdCount,
            tuitionReceiptCount,
            busReceiptCount,
            stockReceiptCount,
        } = req.body;
        const schoolDoc = await admin.firestore().collection('schools')
            .where('Code', '==', req.user.schoolCode)
            .get();
        await schoolDoc.docs[0].ref.update({
            divisions: d,
            class: c,
            schoolName,
            location,
            academicYear,
            schoolReceiptHeader,
            transportReceiptHeader,
            stockReceiptHeader,
            // if academic year change than set receipt count to 0
            ...(academicYear !== schoolDoc.docs[0].data().academicYear ? { receiptCount: 0 } : {}),
            location: schoolLocation,
            feeIdCount,
            tuitionReceiptCount,
            busReceiptCount,
            stockReceiptCount,
        }); 
        res.json({ message: "School updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/school/logo', upload.single("logo"), async (req, res) => {
    try {
        // At this point multer has already written the file (overwriting existing)
        // If you need to do anything extra, you can:
        // – Move it somewhere else
        // – Update your Firestore record with the new filename/URL
        return res.json({
            message: "Logo uploaded successfully.",
            filename: req.file.filename,
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;