// routes/settings.js
import express from 'express';
import admin from 'firebase-admin';
const router = express.Router();

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
        if (!req.user || !req.user.schoolCode) {
            return res.status(401).json({ error: "Unauthorized - School code missing" });
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
            .where('Code', '==', req.user.schoolCode)
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
        // Reset receipt counts if academic year changes
        // if (academicYear !== schoolData.academicYear) {
        //     updateData.tuitionReceiptCount = 0;
        //     updateData.busReceiptCount = 0;
        //     updateData.stockReceiptCount = 0;
        //     updateData.feeIdCount = 0;
        // }
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

export default router;