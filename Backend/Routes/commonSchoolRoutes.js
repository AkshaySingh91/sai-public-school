import express from 'express';
import admin from 'firebase-admin';
const router = express.Router();
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
const BUCKET = process.env.CF_R2_BUCKET;
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const R2_BASE_URL = process.env.R2_BASE_URL || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new S3Client({
    region: 'auto', // R2 uses a single “auto” region
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
    },
});
// School routes
// /api/school
router.get('/', async (req, res) => {
    if (!req.query.schoolCode) {
        return res.status(400).json({ error: "Missing Query parameter" });
    }
    const { schoolCode } = req.query;
    try {
        const snap = await admin
            .firestore()
            .collection("schools")
            .where("Code", "==", schoolCode)
            .limit(1)
            .get();
        if (snap.empty) {
            return res.status(404).json({ error: "School not found" });
        }
        return res.json(snap.docs[0].data());
    } catch (err) {
        console.error("[GET /api/school] Error:", err);
        return res.status(500).json({ error: "Internal server error", details: err.message });
    }
});
// /api/school/:schoolId
router.put('/:schoolId', async (req, res) => {
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { schoolId } = req.params;
        const scholRef = admin.firestore().collection('schools').doc(schoolId);
        const schoolSnap = await scholRef.get();
        const data = schoolSnap.data();
        if (!schoolSnap.exists) {
            return res.status(404).json({ error: 'School not found.' });
        }
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized - User" });
        }
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
            mobile,
            email
        } = req.body;
        // Validate required request body fields
        if (!schoolName || !academicYear) {
            return res.status(400).json({ error: "School name and academic year are required" });
        }
        if (feeIdCount && isNaN(feeIdCount)) {
            return res.status(400).json({ error: "feeIdCount must be a number" });
        }
        if (tuitionReceiptCount && isNaN(tuitionReceiptCount)) {
            return res.status(400).json({ error: "tuitionReceiptCount must be a number" });
        }
        if (busReceiptCount && isNaN(busReceiptCount)) {
            return res.status(400).json({ error: "busReceiptCount must be a number" });
        }
        if (stockReceiptCount && isNaN(stockReceiptCount)) {
            return res.status(400).json({ error: "stockReceiptCount must be a number" });
        }
        const schoolQuery = await admin.firestore().collection('schools')
            .where('Code', '==', data.Code)
            .get();

        // Check if school exists
        if (schoolQuery.empty) {
            return res.status(404).json({ error: "School not found" });
        }

        const schoolDoc = schoolQuery.docs[0];
        // Prepare update data
        const updateData = {
            divisions: d,
            class: c,
            schoolName,
            location,
            academicYear,
            schoolReceiptHeader,
            busReceiptHeader,
            stockReceiptHeader,
            location: schoolLocation,
            feeIdCount: feeIdCount || 0,
            tuitionReceiptCount: tuitionReceiptCount || 0,
            busReceiptCount: busReceiptCount || 0,
            stockReceiptCount: stockReceiptCount || 0,
            mobile,
            email
        };
        await schoolDoc.ref.update(updateData);

        res.json({
            success: true,
            message: "School updated successfully",
            data: {
                schoolName,
                academicYear,
                updatedFields: Object.keys(updateData)
            }
        });
    } catch (error) {
        console.error("Error updating school:", error);
        // Handle Firestore errors specifically
        if (error.code === 5 || error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: "Document not found" });
        }
        if (error.code === 3 || error.code === 'INVALID_ARGUMENT') {
            return res.status(400).json({ error: "Invalid data provided" });
        }
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
});
// /api/school/logo/upload-url/:schoolId
router.get('/logo/upload-url/:schoolId', async (req, res) => {
    // check if requesting user have right privilege
    if (!req.user || req.user.privilege !== "both") {
        return res.status(400).json({ message: "User should have write  privilege" });
    }
    const { schoolId } = req.params;
    const schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
        return res.status(404).json({ message: "School not found" });
    }
    const { fileType, fileName } = req.query;
    try {
        // Generate unique key
        const fileExt = fileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `school/${schoolId}/logo-${timestamp}.${fileExt}`;

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
router.post('/logo/update/:schoolId/', async (req, res) => {
    const { schoolId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { newKey, oldKey } = req.body;
        if (!newKey) {
            return res.status(400).json({ message: "File path is required." });
        }

        const schoolRef = admin.firestore().collection('schools').doc(schoolId);
        const schoolSnap = await schoolRef.get();
        if (!schoolSnap.exists) {
            return res.status(404).json({ error: 'school not found.' });
        }
        const schoolData = schoolSnap.data();
        // Delete old avatar if one exists
        if (schoolData.logoImage && schoolData.logoImagePath) {
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
        // Build public URL
        const logoImage = `${R2_BASE_URL}/${newKey}`;
        const updatedAt = new Date().toISOString();
        // Update Firestore
        await schoolRef.update({
            logoImage,
            logoImagePath: newKey,
            updatedAt,
        });
        res.status(200).json({
            logoImage,
            logoImagePath: newKey,
            updatedAt,
        });
    } catch (err) {
        console.error('Error updating avatar:', err);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
}
);

// student routes
// /api/school/student/avatar/upload-url/:studentId/:schoolId
router.get('/student/avatar/upload-url/:studentId/:schoolId', async (req, res) => {
    // check if requesting user have right privilege
    if (!req.user || req.user.privilege !== "both") {
        return res.status(400).json({ message: "User should have write  privilege" });
    }
    const { studentId, schoolId } = req.params;
    const studentDoc = await admin.firestore().collection("students").doc(studentId).get();
    if (!studentDoc.exists) {
        return res.status(404).json({ message: "Student not found" });
    }
    const schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
        return res.status(404).json({ message: "School not found" });
    }
    const { fileType, fileName } = req.query;
    try {
        // Generate unique key
        const fileExt = fileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `school/${schoolId}/students/${studentId}/${timestamp}.${fileExt}`;

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
router.post('/student/avatar/update/:studentId/', async (req, res) => {
    const { studentId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { newKey, oldKey } = req.body;
        if (!newKey) {
            return res.status(400).json({ message: "File path is required." });
        }

        const studentRef = admin.firestore().collection('students').doc(studentId);
        const studentSnap = await studentRef.get();
        if (!studentSnap.exists) {
            return res.status(404).json({ error: 'student not found.' });
        }
        const studentData = studentSnap.data();
        // Delete old avatar if one exists
        if (studentData.profileImage && studentData.profileImagePath) {
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
        // Build public URL
        const avatarUrl = `${R2_BASE_URL}/${newKey}`;
        const updatedAt = new Date().toISOString();
        // Update Firestore
        await studentRef.update({
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
}
);
router.delete('/student/avatar/:studentId', async (req, res) => {
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { studentId } = req.params;
        const { key } = req.body;
        if (!key) {
            return res.status(400).json({ message: "File path required" });
        }
        // 1) Verify the student exists
        const studentRef = admin.firestore().collection('students').doc(studentId);
        const studentSnap = await studentRef.get();
        if (!studentSnap.exists) {
            return res.status(400).json({ message: "Student not found" });
        }
        // 3) Delete object from R2
        try {
            await r2.send(
                new DeleteObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                })
            );
        } catch (delErr) {
            // If the key wasn’t there, ignore. But log any other error.
            if (!delErr.name.includes('NoSuchKey')) {
                console.warn('Warning deleting old avatar:', delErr);
            }
        }
        // 3) Remove the metadata entry from Firestore array 
        const updatedAt = new Date().toISOString();
        // Update Firestore
        await studentRef.update({
            profileImage: null,
            profileImagePath: null,
            updatedAt,
        });
        // 4) Respond to client
        return res.status(200).json({ message: 'Avatar deleted successfully.' });
    } catch (err) {
        console.error('Error in DELETE /students/document/:studentId:', err);
        return res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
});
router.get('/student/document/upload-url/:studentId/:schoolId', async (req, res) => {
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { studentId, schoolId } = req.params;
        const studentDoc = await admin.firestore().collection("students").doc(studentId).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ message: "Student not found" });
        }
        const schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
        if (!schoolDoc.exists) {
            return res.status(404).json({ message: "School not found" });
        }
        const { fileType, orignalFileName, fileName } = req.query;
        // Generate unique key
        const fileExt = orignalFileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `school/${schoolId}/students/${studentId}/${fileName.trim()}-${timestamp}.${fileExt}`;

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
router.post('/student/document/update/:studentId', async (req, res) => {
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { studentId } = req.params;
        const { newKey, fileName, orignalFileName, fileType } = req.body;
        if (!newKey || !fileName || !orignalFileName) {
            return res.status(400).json({ message: "File path & File name is required." });
        }
        const studentRef = admin.firestore().collection('students').doc(studentId);
        const studentSnap = await studentRef.get();
        if (!studentSnap.exists) {
            return res.status(404).json({ error: 'Student not found.' });
        }
        const docUrl = `${R2_BASE_URL}/${newKey}`;
        // Prepare metadata and push into Firestore array
        const uploadedAt = new Date().toISOString();
        const documentData = {
            name: fileName.trim(),
            storagePath: newKey,
            url: docUrl,
            type: fileType,
            uploadedAt,
        };
        // Use the Admin SDK’s FieldValue.arrayUnion
        await studentRef.update({
            documents: admin.firestore.FieldValue.arrayUnion(documentData),
        });

        // Return success (and metadata) to client
        return res.status(200).json({
            message: 'Document uploaded successfully',
            metaData: documentData,
        });
    } catch (err) {
        console.error('Error in POST /student/document/update/:studentId:', {
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
router.delete('/student/document/:studentId', async (req, res) => {
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { studentId } = req.params;
        const { documentToDelete } = req.body;
        if (!documentToDelete.storagePath || !documentToDelete.name || !documentToDelete.url || !documentToDelete.type || !documentToDelete.uploadedAt || typeof documentToDelete.storagePath !== 'string') {
            return res.status(400).json({ error: 'storagePath is required in the body.' });
        }

        // 1) Verify the student exists
        const studentRef = admin.firestore().collection('students').doc(studentId);
        const studentSnap = await studentRef.get();
        if (!studentSnap.exists) {
            return res.status(400).json({ message: "Student not found" });
        }
        const studentData = studentSnap.data();
        const docsArray = Array.isArray(studentData.documents) ? studentData.documents : [];

        // 2) Find the exact metadata object in the array that matches storagePath
        const toRemove = docsArray.find(doc => doc.storagePath === documentToDelete.storagePath);
        if (!toRemove) {
            return res.status(404).json({ error: 'Document metadata not found in Firestore.' });
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
// employee routes for avatars
router.get('/employee/avatar/upload-url/:employeeId/:schoolId', async (req, res) => {
    // check if requesting user have right privilege
    if (!req.user || req.user.privilege !== "both") {
        return res.status(400).json({ message: "User should have write  privilege" });
    }
    const { employeeId, schoolId } = req.params;
    const employeeDoc = await admin.firestore().collection("Employees").doc(employeeId).get();
    if (!employeeDoc.exists) {
        return res.status(404).json({ message: "Employee not found" });
    }
    const schoolDoc = await admin.firestore().collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
        return res.status(404).json({ message: "School not found" });
    }
    const { fileType, fileName } = req.query;
    try {
        // Generate unique key
        const fileExt = fileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `school/${schoolId}/employees/${employeeId}/${timestamp}.${fileExt}`;

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
router.post('/employee/avatar/update/:employeeId/', async (req, res) => {
    const { employeeId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { newKey, oldKey } = req.body;
        if (!newKey) {
            return res.status(400).json({ message: "File path is required." });
        }

        const employeeRef = admin.firestore().collection('Employees').doc(employeeId);
        const employeeSnap = await employeeRef.get();
        if (!employeeSnap.exists) {
            return res.status(404).json({ error: 'Employee not found.' });
        }
        const employeeData = employeeSnap.data();
        // Delete old avatar if one exists
        if (employeeData.profileImage && employeeData.profileImagePath) {
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
        // Build public URL
        const avatarUrl = `${R2_BASE_URL}/${newKey}`;
        const updatedAt = new Date().toISOString();
        // Update Firestore
        await employeeRef.update({
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
}
);
router.delete('/employee/avatar/:employeeId', async (req, res) => {
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { employeeId } = req.params;
        const { key } = req.body;
        if (!key) {
            return res.status(400).json({ message: "File path required" });
        }
        // 1) Verify the student exists
        const employeeRef = admin.firestore().collection('Employees').doc(employeeId);
        const employeeSnap = await employeeRef.get();
        if (!employeeSnap.exists) {
            return res.status(400).json({ message: "Employee not found" });
        }
        // 3) Delete object from R2
        try {
            await r2.send(
                new DeleteObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                })
            );
        } catch (delErr) {
            // If the key wasn’t there, ignore. But log any other error.
            if (!delErr.name.includes('NoSuchKey')) {
                console.warn('Warning deleting old avatar:', delErr);
            }
        }
        // 3) Remove the metadata entry from Firestore array 
        const updatedAt = new Date().toISOString();
        // Update Firestore
        await employeeRef.update({
            profileImage: null,
            profileImagePath: null,
            updatedAt,
        });
        // 4) Respond to client
        return res.status(200).json({ message: 'Avatar deleted successfully.' });
    } catch (err) {
        console.error('Error in DELETE /students/document/:studentId:', err);
        return res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
});

export default router;
