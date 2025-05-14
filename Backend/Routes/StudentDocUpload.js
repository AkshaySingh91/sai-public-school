import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

const router = express.Router();

// Multer config
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// R2 client
const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});
const BUCKET = process.env.R2_BUCKET;

router.post('/upload', upload.single('document'), async (req, res) => {
    const { studentId, docType } = req.body;
    if (!studentId || !docType || !req.file) return res.status(400).json({ message: 'Missing fields' });

    const studentRef = admin.firestore().collection('students').doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) return res.status(404).json({ message: 'Student not found' });

    const ext = req.file.originalname.split('.').pop();
    const key = `students/${studentId}/documents/${uuidv4()}.${ext}`;

    try {
        // Upload to R2
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }));

        const url = `${process.env.R2_PUBLIC_URL}/${key}`;
        const newDoc = {
            type: docType,
            url,
            fileName: req.file.originalname,
            uploadedAt: new Date().toISOString(),
            storageKey: key
        };

        await studentRef.update({ documents: admin.firestore.FieldValue.arrayUnion(newDoc) });
        res.json({ document: newDoc });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload error' });
    }
});

router.post('/delete', async (req, res) => {
    const { studentId, document } = req.body;
    if (!studentId || !document?.storageKey) return res.status(400).json({ message: 'Missing fields' });

    const studentRef = admin.firestore().collection('students').doc(studentId);
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: document.storageKey }));
        await studentRef.update({ documents: admin.firestore.FieldValue.arrayRemove(document) });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Deletion error' });
    }
});

export default router;