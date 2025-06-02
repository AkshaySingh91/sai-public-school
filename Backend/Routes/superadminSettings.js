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
        const { name, email, phone, address, position, experience } = req.body;
        const updateData = {
            name, email, phone, address, position, experience,
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
        console.error("[GET /superadmin/school] Error:", err);
        return res.status(500).json({ error: "Internal server error", details: err.message });
    }
});
export default router;