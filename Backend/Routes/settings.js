// routes/settings.js
import express from 'express';
import admin from 'firebase-admin';
const router = express.Router();

router.get('/profile', async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection('Users').doc(req.user.uid).get();
        console.log(userDoc.data())
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

// School routes
router.get('/school', async (req, res) => {
    try {
        res.json(req.school);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/school/:schoolId', async (req, res) => {
    try {
        const { schoolId } = req.params;
        console.log(schoolId)
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
        const schoolData = schoolDoc.data();
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
// college route
router.get('/college', async (req, res) => {
    if (!req.query.collegeCode) {
        return res.status(400).json({ error: "Missing Query parameter" });
    }
    const { collegeCode } = req.query;
    console.log({ collegeCode })
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
        console.error("[GET /superadmin/school] Error:", err);
        return res.status(500).json({ error: "Internal server error", details: err.message });
    }
});

export default router;