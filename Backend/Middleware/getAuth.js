// Auth middleware
import admin from "firebase-admin"

async function verifyAccountant(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header required in the form “Bearer <token>”' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const userSnap = await admin.firestore().collection('Users').doc(decoded.uid).get();

        if (!userSnap.exists) {
            return res.status(403).json({ error: 'Forbidden: not an valid user' });
        }
        req.user = { uid: decoded.uid, ...userSnap.data() };
        next();
    } catch (err) {
        console.error('[Auth Error]', err);
        res.status(401).json({ error: 'Authentication failed', details: err.message });
    }
}

// School lookup middleware
async function fetchInstiute(req, res, next) {
    try {
        if (req.user && req.user.role !== "superadmin") {
            let collection = "", code = "";
            if (req.user.institutionType?.toLowerCase() === 'school') {
                collection = "schools";
                code = req.user.schoolCode;
            } else if (req.user.institutionType?.toLowerCase() === 'college') {
                collection = "colleges"
                code = req.user.collegeCode;
            } else {
                throw new Error("Institute type not recognized");
            }
            const snap = await admin
                .firestore()
                .collection(collection)
                .where('Code', '==', code)
                .limit(1)
                .get();
            if (snap.empty) {
                return res.status(404).json({ error: `${req.user.institutionType} not found` });
            }
            if (req.user.institutionType?.toLowerCase() === 'school') {
                req.school = snap.docs[0].data();
            } else if (req.user.institutionType?.toLowerCase() === 'college') {
                req.college = snap.docs[0].data();
            }
        }
        next();
    } catch (err) {
        next(err);
    }
}

export { verifyAccountant, fetchInstiute };