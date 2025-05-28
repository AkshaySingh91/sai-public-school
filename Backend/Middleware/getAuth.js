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

        if (!userSnap.exists || userSnap.data().role !== 'accountant') {
            return res.status(403).json({ error: 'Forbidden: not an accountant' });
        }

        req.user = { uid: decoded.uid, ...userSnap.data() };
        next();
    } catch (err) {
        console.error('[Auth Error]', err);
        res.status(401).json({ error: 'Authentication failed', details: err.message });
    }
}

// School lookup middleware
async function fetchSchool(req, res, next) {
    try {
        const snap = await admin
            .firestore()
            .collection('schools')
            .where('Code', '==', req.user.schoolCode)
            .limit(1)
            .get();

        if (snap.empty) {
            return res.status(404).json({ error: 'School not found' });
        }
        req.school = snap.docs[0].data();
        next();
    } catch (err) {
        next(err);
    }
}

export { verifyAccountant, fetchSchool };