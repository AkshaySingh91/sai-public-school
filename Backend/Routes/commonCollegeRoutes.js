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
const deleteR2Object = async (key) => {
    if (!key) return;

    try {
        const cleanKey = key.replace(/\.\.\//g, '').trim();
        if (!cleanKey) return;

        await r2.send(
            new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: cleanKey,
            })
        );
        console.log(`Deleted R2 object: ${cleanKey}`);
        return true;
    } catch (delErr) {
        if (delErr.name === 'NoSuchKey') {
            console.warn(`R2 object not found: ${key}`);
        } else if (delErr.name === 'SignatureDoesNotMatch') {
            console.error('R2 Credential Error:', delErr.message);
            throw new Error('Invalid cloud storage credentials');
        } else {
            console.error('R2 Deletion Error:', delErr);
            throw new Error(`Storage deletion failed: ${delErr.message}`);
        }
    }
};
/* college setting update*/
// /api/college/
router.get('/', async (req, res) => {
    if (!req.query.collegeCode) {
        return res.status(400).json({ error: "Missing Query parameter" });
    }
    const { collegeCode } = req.query;
    try {
        const snap = await admin
            .firestore()
            .collection("colleges")
            .where("Code", "==", collegeCode)
            .limit(1)
            .get();
        if (snap.empty) {
            return res.status(404).json({ error: "College not found" });
        }
        return res.json(snap.docs[0].data());
    } catch (err) {
        console.error("[GET /api/college] Error:", err);
        return res.status(500).json({ error: "Internal server error", details: err.message });
    }
});
// logo update section
// /api/college/logo/upload-url/:collegeId
router.get('/logo/upload-url/:collegeId', async (req, res) => {
    // check if requesting user have right privilege
    if (!req.user || req.user.privilege !== "both") {
        return res.status(400).json({ message: "User should have write  privilege" });
    }
    const { collegeId } = req.params;
    const collegeDoc = await admin.firestore().collection("colleges").doc(collegeId).get();
    if (!collegeDoc.exists) {
        return res.status(404).json({ message: "college not found" });
    }
    const { fileType, fileName } = req.query;
    try {
        // Generate unique key
        const fileExt = fileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `college/${collegeId}/logo-${timestamp}.${fileExt}`;

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
router.post('/logo/update/:collegeId/', async (req, res) => {
    try {
        if (!req.user || req.user.privilege !== "both") {
            return res.status(403).json({
                message: "User requires write privileges for this operation"
            });
        }
        const { collegeId } = req.params;
        const { newKey } = req.body;

        // Validation
        if (!newKey || typeof newKey !== 'string') {
            return res.status(400).json({ message: "Valid file path required" });
        }

        const collegeRef = admin.firestore().collection('colleges').doc(collegeId);
        const collegeSnap = await collegeRef.get();

        if (!collegeSnap.exists) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Clean input
        const cleanNewKey = newKey.replace(/\.\.\//g, '').trim();
        if (!cleanNewKey) {
            return res.status(400).json({ message: "Invalid file path format" });
        }

        const collegeData = collegeSnap.data();

        // Delete old logo if exists
        if (collegeData.logoImagePath) {
            try {
                await deleteR2Object(collegeData.logoImagePath);
            } catch (err) {
                // Special handling for credential errors
                if (err.message.includes('credentials')) {
                    return res.status(500).json({
                        error: 'Server configuration issue',
                        details: 'Storage credentials invalid'
                    });
                }
                console.warn('Old logo deletion warning:', err.message);
            }
        }

        // Update Firestore
        const logoImage = `${R2_BASE_URL}/${cleanNewKey}`;
        const updatedAt = new Date().toISOString();

        await collegeRef.update({
            logoImage,
            logoImagePath: cleanNewKey,
            updatedAt,
        });

        res.status(200).json({ logoImage, logoImagePath: cleanNewKey, updatedAt });

    } catch (err) {
        console.error('Logo update error:', err);
        res.status(500).json({
            error: 'Logo update failed',
            details: err.message
        });
    }
});
// basic info update section
// /api/college/basic?collegeId
router.put('/basic/:collegeId/', async (req, res) => {
    const { collegeId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ error: "User should have write  privilege" });
        }
        // check if college exists
        const collegeRef = admin.firestore().collection('colleges').doc(collegeId);
        const collegeSnap = await collegeRef.get();
        if (!collegeSnap.exists) {
            return res.status(404).json({ error: 'college not found.' });
        }
        const { collegeName, academicYear, email, mobile } = req.body;
        // validate
        const academicYearPattern = /^\d{2}-\d{2}$/;
        const mobilePattern = /^\d{10}$/;
        if (academicYear.trim() !== '' && !academicYearPattern.test(academicYear)) {
            return res.status(400).json({ error: "Invalid Academic Year, Please enter valid academic year: 24-25, 25-26, etc." })
        }
        if (mobile && mobile.trim() !== '' && !mobilePattern.test(mobile)) {
            return res.status(400).json({ error: "Invalid Mobile Number, Please enter a 10-digit mobile number" })
        }
        if (!(collegeName && collegeName.trim() !== '' && email && email.trim() !== '')) {
            return res.status(400).json({ error: "College & Email Name required" })
        }
        // Update Firestore
        await collegeRef.update({
            collegeName: collegeName.toLowerCase(), academicYear, email, mobile
        });
        res.status(200).json({
            collegeName, academicYear, email, mobile
        });
    } catch (err) {
        console.error('Error updating collge basic details', err);
        res.status(500).json({ error: 'Error updating collge basic details' });
    }
}
);
// /api/college/location?collegeId
router.put('/location/:collegeId/', async (req, res) => {
    const { collegeId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ error: "User should have write  privilege" });
        }
        // check if college exists
        const collegeRef = admin.firestore().collection('colleges').doc(collegeId);
        const collegeSnap = await collegeRef.get();
        if (!collegeSnap.exists) {
            return res.status(404).json({ error: 'college not found.' });
        }
        const { state, district, taluka, landmark, pincode } = req.body;
        // validate 
        if (!((state && state.trim() !== '') && (district && district.trim() !== '') && (taluka && taluka.trim() !== '') && (landmark && landmark.trim() !== '') && (pincode && pincode.trim() !== ''))) {
            return res.status(400).json({ error: "Incomplete Location details" })
        }
        // Update Firestore
        await collegeRef.update({
            location: {
                state: state.toLowerCase(),
                district: district.toLowerCase(),
                taluka: taluka.toLowerCase(),
                landmark: landmark.toLowerCase(),
                pincode: pincode.toLowerCase(),
            }
        });
        res.status(200).json({
            state, district, taluka, landmark, pincode
        });
    } catch (err) {
        console.error('Error updating collge location details::', err);
        res.status(500).json({ error: 'Error updating collge location details:' });
    }
}
);
// /api/college/academic?collegeId
router.put('/academic/:collegeId/', async (req, res) => {
    const { collegeId } = req.params;
    try {
        // Check if requesting user has right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ error: "User should have write privilege" });
        }
        // Check if college exists
        const collegeRef = admin.firestore().collection('colleges').doc(collegeId);
        const collegeSnap = await collegeRef.get();
        if (!collegeSnap.exists) {
            return res.status(404).json({ error: 'College not found.' });
        }
        const { feeIdCount, tuitionReceiptCount, courses } = req.body;
        console.log(courses)
        // Validate numeric fields
        if (
            (feeIdCount !== undefined && isNaN(Number(feeIdCount))) ||
            (tuitionReceiptCount !== undefined && isNaN(Number(tuitionReceiptCount)))
        ) {
            return res.status(400).json({
                error: "feeIdCount and tuitionReceiptCount should be numbers",
            });
        }

        // Validate courses array
        if (courses !== undefined && !Array.isArray(courses)) {
            return res.status(400).json({ error: "Courses should be an array" });
        }

        // Process courses array
        let processedCourses = [];
        if (Array.isArray(courses)) {
            // Validate each course object
            for (let i = 0; i < courses.length; i++) {
                const course = courses[i];
                if (course) {
                    // Validate required fields for course objects
                    if (!course.name) {
                        return res.status(400).json({
                            error: `Course at index ${i} must have name and code`
                        });
                    }
                    // Validate numeric fields
                    if (course.totalFees !== undefined && (isNaN(Number(course.totalFees)) || Number(course.totalFees) < 0)) {
                        return res.status(400).json({
                            error: `Course "${course.name}" has invalid totalFees`
                        });
                    }
                    if (course.duration !== undefined && (isNaN(Number(course.duration)) || Number(course.duration) <= 0)) {
                        return res.status(400).json({
                            error: `Course "${course.name}" has invalid duration`
                        });
                    }
                    // Validate duration type
                    const validDurationTypes = ['years', 'months', 'weeks'];
                    if (course.durationType && !validDurationTypes.includes(course.durationType)) {
                        return res.status(400).json({
                            error: `Course "${course.name}" has invalid durationType. Must be one of: ${validDurationTypes.join(', ')}`
                        });
                    }

                    // Process and clean the course object
                    processedCourses.push({
                        id: course.id || Date.now() + i,
                        name: course.name.trim(),
                        code: course.code,
                        totalFees: course.totalFees ? Number(course.totalFees) : 0,
                        duration: course.duration ? Number(course.duration) : 3,
                        durationType: course.durationType || 'years',
                        description: course.description,
                        eligibility: course.eligibility,
                        seats: course.seats
                    });
                } else {
                    return res.status(400).json({
                        error: `Course at index ${i} must be a string or object`
                    });
                }
            }
        }

        // Prepare update object
        const updateData = {};

        if (feeIdCount !== undefined) {
            updateData.feeIdCount = Number(feeIdCount);
        }

        if (tuitionReceiptCount !== undefined) {
            updateData.tuitionReceiptCount = Number(tuitionReceiptCount);
        }

        if (courses !== undefined) {
            updateData.courses = processedCourses;
        }

        // Update Firestore
        await collegeRef.update(updateData);

        const responseData = {
            feeIdCount: updateData.feeIdCount,
            tuitionReceiptCount: updateData.tuitionReceiptCount,
            courses: updateData.courses
        };

        res.status(200).json(responseData);

    } catch (err) {
        console.error('Error updating college academic details:', err);
        res.status(500).json({ error: 'Error updating college academic details' });
    }
});
// /api/college/additional?collegeId
router.put('/additional/:collegeId/', async (req, res) => {
    const { collegeId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ error: "User should have write  privilege" });
        }
        // check if college exists
        const collegeRef = admin.firestore().collection('colleges').doc(collegeId);
        const collegeSnap = await collegeRef.get();
        if (!collegeSnap.exists) {
            return res.status(404).json({ error: 'college not found.' });
        }
        const { collegeReceiptHeader } = req.body;
        // validate 
        if (collegeReceiptHeader && collegeReceiptHeader.trim() === '') {
            return res.status(400).json({
                error: "collegeReceiptHeader required",
            });
        }
        // Update Firestore
        await collegeRef.update({
            collegeReceiptHeader: collegeReceiptHeader.toLowerCase()
        });
        res.status(200).json({
            collegeReceiptHeader
        });
    } catch (err) {
        console.error('Error updating collge collegeReceiptHeader :', err);
        res.status(500).json({ error: 'Error updating collge collegeReceiptHeader :' });
    }
}
);
// /api/college/brand-color/collegeId
router.put('/brand-color/:collegeId', async (req, res) => {
    const { collegeId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ error: "User should have write  privilege" });
        }
        // check if college exists
        const collegeRef = admin.firestore().collection('colleges').doc(collegeId);
        const collegeSnap = await collegeRef.get();
        if (!collegeSnap.exists) {
            return res.status(404).json({ error: 'college not found.' });
        }
        const { brandColors } = req.body;
        console.log(req.body)
        // Basic validation
        const required = ['primary', 'accent', 'secondary', 'surface', 'text'];
        for (let key of required) {
            if (!brandColors?.[key]) {
                return res.status(400).json({ error: `${key} color is required` });
            }
        }
        await collegeRef.update({
            brandColors
        });
        res.status(200).json({
            brandColors
        });
    } catch (err) {
        console.error('Branding save error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/******* student routes *******/
// /api/college/student/avatar/upload-url/:studentId/:collegeId
router.get('/student/avatar/upload-url/:studentId/:collegeId', async (req, res) => {
    // check if requesting user have right privilege
    if (!req.user || req.user.privilege !== "both") {
        return res.status(400).json({ message: "User should have write  privilege" });
    }
    const { studentId, collegeId } = req.params;
    const studentDoc = await admin.firestore().collection("students").doc(studentId).get();
    if (!studentDoc.exists) {
        return res.status(404).json({ message: "Student not found" });
    }
    const collegeDoc = await admin.firestore().collection("colleges").doc(collegeId).get();
    if (!collegeDoc.exists) {
        return res.status(404).json({ message: "college not found" });
    }
    const { fileType, fileName } = req.query;
    try {
        // Generate unique key
        const fileExt = fileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `college/${collegeId}/students/${studentId}/${timestamp}.${fileExt}`;

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
router.delete('/student/avatar/:studentId/:collectionName', async (req, res) => {
    try {
        if (!req.user || req.user.privilege !== "both") {
            return res.status(403).json({
                message: "User requires write privileges for this operation"
            });
        }

        const { studentId, collectionName } = req.params;
        const { key } = req.body;

        // Validation
        if (!key || typeof key !== 'string') {
            return res.status(400).json({ message: "Valid file path required" });
        }

        // Verify document exists
        const docRef = admin.firestore().collection(collectionName).doc(studentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: `${collectionName} document not found` });
        }

        // Delete from R2
        try {
            await deleteR2Object(key);
        } catch (err) {
            // Handle credential errors specifically
            if (err.message.includes('credentials')) {
                return res.status(500).json({
                    error: 'Server configuration issue',
                    details: 'Storage credentials invalid'
                });
            }
            return res.status(500).json({
                error: 'Avatar deletion failed',
                details: err.message
            });
        }

        // Update Firestore
        await docRef.update({
            profileImage: null,
            profileImagePath: null,
            updatedAt: new Date().toISOString(),
        });

        return res.status(200).json({ message: 'Avatar removed successfully' });

    } catch (err) {
        console.error('Avatar deletion error:', err);
        return res.status(500).json({
            error: 'Avatar deletion failed',
            details: err.message
        });
    }
});
export default router;