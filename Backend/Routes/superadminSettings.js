import express from 'express';
import admin from 'firebase-admin';
const router = express.Router();

// superadmin profile get & put operation
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

// superadmin school info  
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
// superadmin will delete accountant from specific school
router.delete("/accountants/:accountantId", async (req, res) => {
    const { accountantId } = req.params;
    const { uid } = req.body;
    if (!uid) {
        return res.status(400).json({ error: "Missing 'uid' in request body." });
    }
    try {
        // 1. Delete Firestore document
        const userDoc = await admin.firestore().collection('Users').doc(accountantId).delete();
        // 2. Delete the Auth user
        await admin.auth().deleteUser(uid);

        return res.json({ success: true, message: "Accountant deleted." });
    } catch (error) {
        console.error("Error deleting accountant:", error);
        return res
            .status(500)
            .json({ success: false, error: error.message || "Internal error" });
    }
});
// superadmin create new accountant for exsisting or new school
router.post("/accountants", async (req, res) => {
    if (!(req.body.name && req.body.email && req.body.phone && req.body.password && req.body.schoolCode)) {
        return res.status(400).json({
            success: false,
            error: `Incompleted field".`,
        });
    }
    const { name, email, phone, password, schoolCode } = req.body;
    try {
        // Check if email already exists in Firestore "Users"
        const emailQuery = admin
            .firestore()
            .collection("Users")
            .where("email", "==", email)
            .limit(1);
        const emailSnapshot = await emailQuery.get();
        if (!emailSnapshot.empty) {
            // Already registered somewhere
            const userData = emailSnapshot.docs[0].data();
            const existingSchoolCode = userData.schoolCode;
            // Optionally look up the schoolName for a nicer message:
            let schoolName = "another school";
            if (existingSchoolCode) {
                const schoolQuery = admin
                    .firestore()
                    .collection("schools")
                    .where("Code", "==", existingSchoolCode)
                    .limit(1);
                const schoolSnap = await schoolQuery.get();
                if (!schoolSnap.empty) {
                    schoolName = schoolSnap.docs[0].data().schoolName || schoolName;
                }
            }
            return res.status(400).json({
                success: false,
                error: `This email is already registered at "${schoolName}".`,
            });
        }

        // 2) Create the Auth user (so superadmin session is unaffected)
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name,
            phoneNumber: phone,
        });

        const newUid = userRecord.uid;

        // 3) Write Firestore document under Users/{uid}
        const userDocRef = admin
            .firestore()
            .collection("Users").doc(newUid);
        await userDocRef.set({
            name: name,
            email: email,
            phone: phone,
            schoolCode: schoolCode,
            role: "accountant",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            uid: newUid,
        });

        // 4) Return success
        return res.status(201).json({ success: true, uid: newUid });
    } catch (error) {
        console.error("Error in POST /accountants:", error);
        // Clean up if Auth user was created but Firestore write failed:
        if (error.errorInfo && error.errorInfo.code === "auth/email-already-exists") {
            return res.status(400).json({ success: false, error: "Email already in use" });
        }
        return res.status(500).json({ success: false, error: error.message || "Internal error" });
    }
}
);
router.post("/school", async (req, res) => {
    try {
        const {
            schoolName,
            Code: rawCode,
            location,
            academicYear,
            class: classes,
            divisions,
            // header
            schoolReceiptHeader,
            busReceiptHeader,
            stockReceiptHeader,
            feeIdCount,
            // receipt count
            tuitionReceiptCount,
            busReceiptCount,
            stockReceiptCount,
            // contact
            mobile,
            email,
            paymentModes,
            feeTypes,
            studentsType,
        } = req.body;

        // Validate `schoolName`
        if (typeof schoolName !== "string" || schoolName.trim().length === 0) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'schoolName' (must be a non-empty string)." });
        }

        // Validate that each of the following is a non-empty array of strings
        function isNonEmptyStringArray(arr) {
            return (
                Array.isArray(arr) &&
                arr.length > 0 &&
                arr.every((el) => typeof el === "string" && el.trim().length > 0)
            );
        }

        if (!isNonEmptyStringArray(classes)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'class' (must be a non-empty array of strings)." });
        }
        if (!isNonEmptyStringArray(divisions)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'divisions' (must be a non-empty array of strings)." });
        }
        if (!isNonEmptyStringArray(paymentModes)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'paymentModes' (must be a non-empty array of strings)." });
        }
        if (!isNonEmptyStringArray(feeTypes)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'feeTypes' (must be a non-empty array of strings)." });
        }
        if (!isNonEmptyStringArray(studentsType)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'studentsType' (must be a non-empty array of strings)." });
        }
        function generateRandomCode() {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }
        // 2) Determine final school code (uppercase). If none provided, auto-generate.
        let schoolCode = "";
        if (typeof rawCode === "string" && rawCode.trim().length > 0) {
            schoolCode = rawCode.trim();
        } else {
            // Auto-generate until it’s unique
            let tries = 0;
            do {
                if (tries >= 5) {
                    return res
                        .status(500)
                        .json({ error: "Could not generate a unique school code. Try again later." });
                }
                schoolCode = generateRandomCode();
                tries++;
                const dupSnap = await admin
                    .firestore()
                    .collection("schools")
                    .where("Code", "==", schoolCode)
                    .limit(1)
                    .get();
                if (dupSnap.empty) break;
            } while (true);
        }

        // 3) Check case-insensitive uniqueness by querying uppercase Code
        const existingQuery = admin
            .firestore()
            .collection("schools")
            .where("Code", "==", schoolCode)
            .limit(1);
        const existingSnap = await existingQuery.get();
        if (!existingSnap.empty) {
            // If found, return 400 + error with existing school’s name & code
            const existingData = existingSnap.docs[0].data();
            return res.status(400).json({
                error: `School "${existingData.schoolName}" with code "${schoolCode}" already exists.`,
            });
        }

        // 4) Construct the new school document
        const newSchoolData = {
            schoolName: schoolName.trim(),
            Code: schoolCode,
            class: classes.map((s) => s.trim()),
            divisions: divisions.map((s) => s.trim()),
            paymentModes: paymentModes.map((s) => s.trim()),
            feeTypes: feeTypes.map((s) => s.trim()),
            studentsType: studentsType.map((s) => s.trim()),
            accounts: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            location,
            academicYear,
            // header
            schoolReceiptHeader,
            busReceiptHeader,
            stockReceiptHeader,
            feeIdCount,
            // receipt count
            tuitionReceiptCount,
            busReceiptCount,
            stockReceiptCount,
            // contact
            mobile,
            email,
        };

        // 5) Write to Firestore
        const docRef = await admin.firestore().collection("schools").add(newSchoolData);

        return res.status(201).json({ success: true, id: docRef.id });
    } catch (error) {
        console.error("Error in POST /api/schools:", error);
        return res
            .status(500)
            .json({ error: error.message || "Internal server error while creating school." });
    }
});
// delete school rarely use
router.delete("/schools/:schoolId", async (req, res) => {
    const { schoolId } = req.params;
    try {
        // 1. Read the school document to extract its schoolCode
        const schoolRef = admin.firestore().collection("schools").doc(schoolId);
        const schoolSnap = await schoolRef.get();
        if (!schoolSnap.exists) {
            return res
                .status(404)
                .json({ success: false, error: "School not found." });
        }

        const schoolData = schoolSnap.data();
        const schoolCode = schoolData.Code;
        if (!schoolCode) {
            return res
                .status(400)
                .json({ success: false, error: "schoolCode is missing." });
        } 
        // 2. Delete the school document itself
        await schoolRef.delete();

        // 3. Query all accountants for that school
        const accountantsQuery = admin
            .firestore()
            .collection("Users")
            .where("schoolCode", "==", schoolCode)
            .where("role", "==", "accountant");

        const accountantSnapshot = await accountantsQuery.get();
        if (accountantSnapshot.empty) {
            // No accountants found; we can return immediately
            return res.json({
                success: true,
                message:
                    "School deleted. No associated accountants were found to delete.",
            });
        }

        // 4. For Firestore, we’ll batch‐delete all the document refs
        const batch = admin.firestore().batch();
        const deletionPromises = [];

        accountantSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const uidToDelete = data.uid || docSnap.id;
            // a) Queue Firestore document deletion
            batch.delete(docSnap.ref);

            // b) Schedule Auth user deletion
            if (uidToDelete) {
                deletionPromises.push(admin.auth().deleteUser(uidToDelete).catch((err) => {
                    // Catch per‐user errors so one failure doesn’t block the entire list
                    console.error(
                        `Failed to delete Auth user (uid=${uidToDelete}):`,
                        err
                    );
                }));
            }
        });
        // 5. Commit Firestore batch (delete all matched accountant docs)
        await batch.commit();
        // 6. Wait for all Auth‐deletion promises to resolve
        await Promise.all(deletionPromises);
        return res.json({
            success: true,
            message:
                "School and all associated accountants (Firestore + Auth) have been deleted.",
        });
    } catch (error) {
        console.error("Error deleting school and accountants:", error);
        return res
            .status(500)
            .json({ success: false, error: error.message || "Internal error" });
    }
})


export default router;