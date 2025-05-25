// routes/settings.js
import express from 'express';
import admin from 'firebase-admin';
import path from "path"
import { getStorageBucket } from '../utils/firebase.js';
const bucket = getStorageBucket();


const router = express.Router();
// Helper function to delete old files
const deleteOldFile = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        const filePath = decodeURIComponent(fileUrl.split('/o/')[1].split('?')[0]);
        const file = bucket.file(filePath);
        await file.delete();
    } catch (error) {
        console.error('Error deleting old file:', error);
    }
};
router.post('/upload-profile', async (req, res) => {
    try {
        if (!req.files?.profileImage) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const user = req.user;
        const file = req.files.profileImage;

        // Delete old image first
        const userDoc = await admin.firestore().collection('Users').doc(user.uid).get();
        await deleteOldFile(userDoc.data()?.profileUrl);

        // Upload new image
        const fileName = `profile/${user.uid}-${Date.now()}${path.extname(file.name)}`;
        const fileRef = bucket.file(fileName);

        await new Promise((resolve, reject) => {
            const stream = fileRef.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        uploadedBy: user.uid,
                        type: 'profile'
                    }
                }
            });

            stream.on('error', reject);
            stream.on('finish', resolve);
            stream.end(file.data);
        });

        // Get public URL
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });

        // Update Firestore
        await admin.firestore().collection('Users').doc(user.uid).update({
            profileUrl: url
        });

        res.json({ imageUrl: url });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

router.put('/profile', async (req, res) => {
    try {
        const { name, email, phone, profileUrl } = req.body;
        const updateData = {
            name: name || null,
            email: email || null,
            phone: phone || null,
            profileUrl: profileUrl || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await admin.firestore().collection('Users').doc(req.user.uid).update(updateData);
        res.status(200).json({ message: "Profile updated successfully" });
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

// School Logo Upload
router.post('/school/logo', async (req, res) => {
    try {
        if (!req.files?.logo) {
            return res.status(400).json({ error: 'No logo uploaded' });
        }

        const schoolCode = req.user.schoolCode;
        const file = req.files.logo;

        // Get school document
        const schoolQuery = await admin.firestore().collection('schools')
            .where('Code', '==', schoolCode)
            .get();

        const schoolDoc = schoolQuery.docs[0];

        // Delete old logo
        await deleteOldFile(schoolDoc.data()?.logoUrl);

        // Upload new logo
        const fileName = `schools/${schoolCode}/logo-${Date.now()}${path.extname(file.name)}`;
        const fileRef = bucket.file(fileName);

        await new Promise((resolve, reject) => {
            const stream = fileRef.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        schoolCode,
                        type: 'logo'
                    }
                }
            });

            stream.on('error', reject);
            stream.on('finish', resolve);
            stream.end(file.data);
        });

        // Get public URL
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });

        // Update Firestore
        await schoolDoc.ref.update({ logoUrl: url });
        res.json({ logoUrl: url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Profile Image
router.delete('/profile-image', async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection('Users').doc(req.user.uid).get();
        const profileUrl = userDoc.data()?.profileUrl;

        await deleteOldFile(profileUrl);

        await admin.firestore().collection('Users').doc(req.user.uid).update({
            profileUrl: admin.firestore.FieldValue.delete()
        });

        res.json({ message: "Profile image deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change password
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;
        // Important: Client must re-authenticate before calling this
        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });

        res.json({ message: "Password updated successfully" });
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
            busReceiptHeader,
            stockReceiptHeader,
            schoolLocation,
            feeIdCount,
            tuitionReceiptCount,
            busReceiptCount,
            stockReceiptCount,
        } = req.body;
        console.log(req.body)
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
            busReceiptHeader,
            stockReceiptHeader,
            // if academic year change than set receipt count to 0
            ...(academicYear !== schoolDoc.docs[0].data().academicYear ? { receiptCount: 0 } : {}),
            location: schoolLocation,
            feeIdCount,
            tuitionReceiptCount,
            busReceiptCount,
            stockReceiptCount,
        });
        console.log("object")
        res.json({ message: "School updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;