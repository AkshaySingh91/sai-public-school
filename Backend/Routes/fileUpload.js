import { config } from 'dotenv';
config();
import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import admin from 'firebase-admin';

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

const Imageupload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter(req, file, cb) {
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
        }
        cb(null, true);
    },
});
const ImageAndFileupload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter(req, file, cb) {
        const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            return cb(new Error('Only PDF, JPG, PNG, and WEBP files are allowed'));
        }
        cb(null, true);
    },
});
router.post('/employee/avatar/:uid', Imageupload.single('avatar'),
    async (req, res) => {
        const { uid } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided.' });
        }
        try {
            // 1) Fetch employee doc
            const empRef = admin.firestore().collection('Employees').doc(uid);
            const empSnap = await empRef.get();
            if (!empSnap.exists) {
                return res.status(404).json({ error: 'Employee not found.' });
            }
            const empData = empSnap.data();

            // 2) Delete old avatar if one exists
            if (empData.avatar?.avatarImagePath) {
                const oldKey = empData.avatar.avatarImagePath;
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

            // 3) Upload new file to R2
            const fileExt =
                file.originalname.split('.').pop().toLowerCase() || 'png';
            const timestamp = Date.now();
            const newKey = `accountant/school/${req.user.uid}/employee/${uid}/${timestamp}.${fileExt}`;

            await r2.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: newKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    // Note: Cloudflare R2 ignores S3-style ACLs; public access is governed by the bucket’s “Public access” toggle.
                    // ACL: 'public-read',
                })
            );
            // 4) Build URL from R2_BASE_URL
            const avatarUrl = `${R2_BASE_URL}/${newKey}`;

            const updatedAt = new Date().toISOString();
            await empRef.update({
                avatar: {
                    avatarUrl,
                    avatarImagePath: newKey,
                    updatedAt,
                },
            });

            // 5) Return response
            return res.status(200).json({
                message: 'Avatar updated successfully',
                avatar: {
                    avatarUrl,
                    avatarImagePath: newKey,
                    updatedAt,
                },
            });
        } catch (err) {
            console.error('Error updating avatar:', {
                message: err.message,
                stack: err.stack,
                params: req.params,
                user: req.user.uid,
            });
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message,
            });
        }
    }
);
router.post('/students/avatar/:studentId', Imageupload.single('avatar'),
    async (req, res) => {
        const { studentId } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided.' });
        }
        try {
            // 1) Fetch employee doc
            const studentRef = admin.firestore().collection('students').doc(studentId);
            const studentSnap = await studentRef.get();
            if (!studentSnap.exists) {
                return res.status(404).json({ error: 'student not found.' });
            }
            const studentData = studentSnap.data();
            // 2) Delete old avatar if one exists
            if (studentData.avatar?.avatarImagePath) {
                const oldKey = studentData.avatar.avatarImagePath;
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

            // 3) Upload new file to R2
            const fileExt = file.originalname.split('.').pop().toLowerCase() || 'png';
            const timestamp = Date.now();
            const newKey = `accountant/school/${req.user.uid}/students/${studentId}/${timestamp}.${fileExt}`;

            await r2.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: newKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );
            // 4) Build URL from R2_BASE_URL
            const avatarUrl = `${R2_BASE_URL}/${newKey}`;
            const updatedAt = new Date().toISOString();
            await studentRef.update({
                avatar: {
                    avatarUrl,
                    avatarImagePath: newKey,
                    updatedAt,
                },
            });

            // 5) Return response
            return res.status(200).json({
                message: 'Avatar updated successfully',
                avatar: {
                    avatarUrl,
                    avatarImagePath: newKey,
                    updatedAt,
                },
            });
        } catch (err) {
            console.error('Error updating student avatar:', {
                message: err.message,
                stack: err.stack,
                params: req.params,
                user: req.user.uid,
            });
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message,
            });
        }
    }
);
router.post('/students/document/:studentId', ImageAndFileupload.single('file'),
    async (req, res) => {
        const { studentId } = req.params;
        const file = req.file;
        const { fileName } = req.body;

        // 0) Simple validation
        if (!file || !fileName?.trim()) {
            return res.status(400).json({ error: 'Please provide both a file and a document name.' });
        }

        try {
            // 1) Fetch the student doc from Firestore (Admin SDK)
            const studentRef = admin.firestore().collection('students').doc(studentId);
            const studentSnap = await studentRef.get();
            if (!studentSnap.exists) {
                return res.status(404).json({ error: 'Student not found.' });
            }

            // 2) Build a unique R2 key for this document
            const fileExt = file.originalname.split('.').pop().toLowerCase() || 'bin';
            const timestamp = Date.now();
            // If you have authentication middleware, req.user.uid should be the uploader's ID
            const uploaderId = req.user?.uid || 'unknownUploader';
            const newKey = `accountant/school/${uploaderId}/students/${studentId}/${fileName.trim()}-${timestamp}.${fileExt}`;

            // 3) Upload to R2
            await r2.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: newKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );

            // 4) Build a public‐facing URL
            const docUrl = `${R2_BASE_URL}/${newKey}`;

            // 5) Prepare metadata and push into Firestore array
            const uploadedAt = new Date().toISOString();
            const documentData = {
                name: fileName.trim(),
                storagePath: newKey,
                url: docUrl,
                type: file.mimetype,
                uploadedAt,
            };

            // Use the Admin SDK’s FieldValue.arrayUnion
            await studentRef.update({
                documents: admin.firestore.FieldValue.arrayUnion(documentData),
            });

            // 6) Return success (and metadata) to client
            return res.status(200).json({
                message: 'Document uploaded successfully',
                metaData: documentData,
            });
        } catch (err) {
            console.error('Error in POST /students/document/:studentId:', {
                message: err.message,
                stack: err.stack,
                params: req.params,
                user: req.user?.uid,
            });
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message,
            });
        }
    }
);

router.delete('/students/document/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { documentToDelete } = req.body;
    if (!documentToDelete.storagePath || !documentToDelete.name || !documentToDelete.url || !documentToDelete.type || !documentToDelete.uploadedAt || typeof documentToDelete.storagePath !== 'string') {
        return res.status(400).json({ error: 'storagePath is required in the body.' });
    }

    try {
        // 1) Verify the student exists
        const studentRef = admin.firestore().collection('students').doc(studentId);
        const studentSnap = await studentRef.get();
        const studentData = studentSnap.data();
        const docsArray = Array.isArray(studentData.documents) ? studentData.documents : [];

        // 2) Find the exact metadata object in the array that matches storagePath
        const toRemove = docsArray.find(doc => doc.storagePath === documentToDelete.storagePath);
        if (!toRemove) {
            return res.status(404).json({ error: 'Document metadata not found in Firestore.' });
        }
        if (!studentSnap.exists) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        // 3) Delete object from R2
        await r2.send(
            new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: documentToDelete.storagePath,
            })
        );
        // 3) Remove the metadata entry from Firestore array 
        await studentRef.update({
            documents: admin.firestore.FieldValue.arrayRemove(toRemove),
        });

        // 4) Respond to client
        return res.status(200).json({ message: 'Document deleted successfully.' });
    } catch (err) {
        console.error('Error in DELETE /students/document/:studentId:', err);
        return res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
});
// school admin avatar upload
router.post('/avatar/:adminUid', Imageupload.single('avatar'),
    async (req, res) => {
        const { adminUid } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided.' });
        }
        try {
            // 1) Fetch Accountant doc
            const adminRef = admin.firestore().collection('Users').doc(adminUid);
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
            // 3) Upload new file to R2
            const fileExt = file.originalname.split('.').pop().toLowerCase() || 'png';
            const timestamp = Date.now();
            const newKey = `accountant/school/${req.user.uid}/profile-${timestamp}.${fileExt}`;

            await r2.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: newKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );
            // 4) Build URL from R2_BASE_URL
            const profileUrl = `${R2_BASE_URL}/${newKey}`;
            const updatedAt = new Date().toISOString();
            await adminRef.update({
                profileImage: profileUrl,
                profileImagePath: newKey,
                updatedAt,
            });

            // 5) Return response
            return res.status(200).json({
                message: 'Avatar updated successfully',
                avatar: {
                    profileImage: profileUrl,
                    profileImagePath: newKey,
                    updatedAt,
                },
            });
        } catch (err) {
            console.error('Error updating school accountant avatar:', {
                message: err.message,
                stack: err.stack,
                params: req.params,
                user: req.user.uid,
            });
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message,
            });
        }
    }
);
router.delete('/avatar/:adminUid', async (req, res) => {
    const { adminUid } = req.params;
    try {
        // 1) Fetch Accountant doc
        const adminRef = admin.firestore().collection('Users').doc(adminUid);
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
        console.error(`Error in DELETE /accountant/school/${adminUid}/`, err);
        return res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
});
router.post('/logo/:schoolId', Imageupload.single('schoolLogo'),
    async (req, res) => {
        const { schoolId } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided.' });
        }
        try {
            // 1) Fetch Accountant doc
            const schoolRef = admin.firestore().collection('schools').doc(schoolId);
            const schoolSnap = await schoolRef.get();
            if (!schoolSnap.exists) {
                return res.status(404).json({ error: 'School not found.' });
            }
            const schoolData = schoolSnap.data();
            // 2) Delete old avatar if one exists
            if (schoolData.logoUrl && schoolData.logoImagePath) {
                const oldKey = schoolData.logoImagePath;
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
            // 3) Upload new file to R2
            const fileExt = file.originalname.split('.').pop().toLowerCase() || 'png';
            const timestamp = Date.now();
            const newKey = `accountant/school/${req.user.uid}/logo-${timestamp}.${fileExt}`;

            await r2.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: newKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );
            // 4) Build URL from R2_BASE_URL
            const logoUrl = `${R2_BASE_URL}/${newKey}`;
            const updatedAt = new Date().toISOString();
            await schoolRef.update({
                logoUrl,
                logoImagePath : newKey,
                updatedAt,
            });

            // 5) Return response
            return res.status(200).json({
                message: 'Logo updated successfully',
                metaData: {
                    logoUrl,
                    logoImagePath : newKey,
                    updatedAt,
                },
            });
        } catch (err) {
            console.error('Error updating school Logo:', {
                message: err.message,
                stack: err.stack,
                params: req.params,
                user: req.user.uid,
            });
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message,
            });
        }
    }
);
export default router;
