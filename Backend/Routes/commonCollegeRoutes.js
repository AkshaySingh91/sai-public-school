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
    const { collegeId } = req.params;
    try {
        // check if requesting user have right privilege
        if (!req.user || req.user.privilege !== "both") {
            return res.status(400).json({ message: "User should have write  privilege" });
        }
        const { newKey, oldKey } = req.body;
        if (!newKey) {
            return res.status(400).json({ message: "File path is required." });
        }

        const collegeRef = admin.firestore().collection('colleges').doc(collegeId);
        const collegeSnap = await collegeRef.get();
        if (!collegeSnap.exists) {
            return res.status(404).json({ error: 'college not found.' });
        }
        const collegeData = collegeSnap.data();
        // Delete old avatar if one exists
        if (collegeData.logoImage && collegeData.logoImagePath) {
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
        await collegeRef.update({
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
        const { feeIdCount, tuitionReceiptCount, courses } = req.body;
        // validate 
        if (
            (feeIdCount && isNaN(Number(feeIdCount))) ||
            (tuitionReceiptCount && isNaN(Number(tuitionReceiptCount)))
        ) {
            return res.status(400).json({
                error: "feeIdCount and tuitionReceiptCount should be numbers",
            });
        }
        if (courses && !Array.isArray(courses)) {
            return res.status(400).json({ error: "Courses should be an array" });
        }
        const coursesArray = Array.isArray(courses)
            ? courses.map(course => course.toLowerCase())
            : [];
        // Update Firestore
        await collegeRef.update({
            feeIdCount: Number(feeIdCount),
            tuitionReceiptCount: Number(tuitionReceiptCount),
            courses: coursesArray
        });
        res.status(200).json({
            feeIdCount: Number(feeIdCount),
            tuitionReceiptCount: Number(tuitionReceiptCount),
            courses: coursesArray
        });
    } catch (err) {
        console.error('Error updating collge academic details:', err);
        res.status(500).json({ error: 'Error updating collge academic details:' });
    }
}
);
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
export default router;