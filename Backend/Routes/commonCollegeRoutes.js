import express from 'express';
import admin from 'firebase-admin';
const router = express.Router();

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


export default router;