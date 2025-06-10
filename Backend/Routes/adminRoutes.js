import { config } from 'dotenv';
import express from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import admin from 'firebase-admin';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
config();

const BUCKET = process.env.CF_R2_BUCKET;
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const R2_BASE_URL = process.env.R2_BASE_URL || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const router = express.Router();
const r2 = new S3Client({
    region: 'auto', // R2 uses a single “auto” region
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
    },
});
// /api/admin/profile/
router.get('/profile', async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection('Users').doc(req.user.uid).get();
        res.json(userDoc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/profile', async (req, res) => {
    try {
        const { name, email, phone, address, position, department, dateOfJoining, } = req.body;
        const updateData = {
            name, email, phone, address, position, department, dateOfJoining,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await admin.firestore().collection('Users').doc(req.user.uid).update(updateData);
        res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// accountant avatar upload
// /api/admin/avatar/upload-url/:adminId
router.get('/avatar/upload-url/:adminId/:schoolId', async (req, res) => {
    // check if requesting user have right privilege 
    try {
        const { adminId, schoolId } = req.params;
        const { fileType, fileName } = req.query;
        const adminRef = admin.firestore().collection('Users').doc(adminId);
        const adminSnap = await adminRef.get();
        if (!adminSnap.exists) {
            return res.status(404).json({ error: 'School Accountant not found.' });
        }
        const scholRef = admin.firestore().collection('schools').doc(schoolId);
        const schoolSnap = await scholRef.get();
        if (!schoolSnap.exists) {
            return res.status(404).json({ error: 'School not found.' });
        }
        // Generate unique key
        const fileExt = fileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `school/${schoolId}/${adminId}/avatar-${timestamp}.${fileExt}`;

        // Create pre-signed URL
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: newKey,
            ContentType: fileType,
        });

        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 600 }); // 10 minutes

        res.status(200).json({
            signedUrl,
            key: newKey
        });
    } catch (err) {
        console.error('Error generating pre-signed URL:', err);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
router.post('/avatar/update/:adminId', async (req, res) => {
    const { adminId } = req.params;
    const { newKey, oldKey } = req.body;
    try {
        const adminRef = admin.firestore().collection('Users').doc(adminId);
        // Delete old avatar if exists
        if (oldKey) {
            try {
                await r2.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET,
                        Key: oldKey,
                    })
                );
            } catch (delErr) {
                if (!delErr.name.includes('NoSuchKey')) {
                    console.warn('Error deleting old avatar:', delErr);
                }
            }
        }
        // Build public URL
        const avatarUrl = `${R2_BASE_URL}/${newKey}`;
        const updatedAt = new Date().toISOString();
        // Update Firestore
        await adminRef.update({
            profileImage: avatarUrl,
            profileImagePath: newKey,
            updatedAt,
        });
        res.status(200).json({
            profileImage: avatarUrl,
            profileImagePath: newKey,
            updatedAt,
        });
    } catch (err) {
        console.error('Error updating avatar:', err);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
});
router.delete('/avatar/:adminId', async (req, res) => {
    const { adminId } = req.params;
    try {
        // 1) Fetch Accountant doc
        const adminRef = admin.firestore().collection('Users').doc(adminId);
        const adminSnap = await adminRef.get();
        if (!adminSnap.exists) {
            return res.status(404).json({ error: 'School Accountant not found.' });
        }
        const adminData = adminSnap.data();
        // 2) Delete old avatar if one exists
        if (adminData.profileImage && adminData.profileImagePath) {
            const oldKey = adminData.profileImagePath;
            try {
                await r2.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET,
                        Key: oldKey,
                    })
                );
            } catch (delErr) {
                // If the key wasn’t there, ignore. But log any other error.
                if (!delErr.name.includes('NoSuchKey')) {
                    console.warn('Warning deleting old avatar:', delErr);
                }
            }
        }
        await adminRef.update({
            profileImage: null,
            profileImagePath: null,
            updatedAt: new Date().toISOString(),
        });

        // 4) Respond to client
        return res.status(200).json({ message: 'Accountant Avatar deleted successfully.' });
    } catch (err) {
        console.error(`Error in DELETE /api/admin/avatar/${adminId}/`, err);
        return res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
});

export default router;