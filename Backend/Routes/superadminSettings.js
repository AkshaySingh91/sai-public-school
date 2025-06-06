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
router.delete("/user/:", async (req, res) => {
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
router.post("/college", async (req, res) => {
    try {
        const {
            collegeName,
            Code: rawCode,
            location,
            academicYear,
            courses,
            departments,
            // header
            collegeReceiptHeader,
            feeIdCount,
            // receipt count
            tuitionReceiptCount,
            // contact
            mobile,
            email,
            paymentModes,
            feeTypes,
            studentsType,
            type,
        } = req.body;

        // Validate `collegeName`
        if (typeof collegeName !== "string" || collegeName.trim().length === 0) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'collegeName' (must be a non-empty string)." });
        }

        // Helper: check non-empty array of strings
        function isNonEmptyStringArray(arr) {
            return (
                Array.isArray(arr) &&
                arr.length > 0 &&
                arr.every((el) => typeof el === "string" && el.trim().length > 0)
            );
        }

        if (!isNonEmptyStringArray(courses)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'courses' (must be a non-empty array of strings)." });
        }
        if (!isNonEmptyStringArray(departments)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing 'departments' (must be a non-empty array of strings)." });
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

        // Generate random 6-character code
        function generateRandomCode() {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }

        // Determine final college code (uppercase). If none provided, auto-generate.
        let collegeCode = "";
        if (typeof rawCode === "string" && rawCode.trim().length > 0) {
            collegeCode = rawCode.trim();
        } else {
            let tries = 0;
            do {
                if (tries >= 5) {
                    return res
                        .status(500)
                        .json({ error: "Could not generate a unique college code. Try again later." });
                }
                collegeCode = generateRandomCode();
                tries++;
                const dupSnap = await admin
                    .firestore()
                    .collection("colleges")
                    .where("Code", "==", collegeCode)
                    .limit(1)
                    .get();
                if (dupSnap.empty) break;
            } while (true);
        }

        // Check case-insensitive uniqueness in "colleges"
        const existingQuery = admin
            .firestore()
            .collection("colleges")
            .where("Code", "==", collegeCode)
            .limit(1);
        const existingSnap = await existingQuery.get();
        if (!existingSnap.empty) {
            const existingData = existingSnap.docs[0].data();
            return res.status(400).json({
                error: `College "${existingData.collegeName}" with code "${collegeCode}" already exists.`,
            });
        }

        // Construct the new college document
        const newCollegeData = {
            collegeName: collegeName.trim(),
            Code: collegeCode,
            courses: courses.map((s) => s.trim()),
            departments: departments.map((s) => s.trim()),
            paymentModes: paymentModes.map((s) => s.trim()),
            feeTypes: feeTypes.map((s) => s.trim()),
            studentsType: studentsType.map((s) => s.trim()),
            accounts: [],
            location,
            academicYear,
            // headers
            collegeReceiptHeader,
            feeIdCount,
            // receipt counts
            tuitionReceiptCount,
            // contact
            mobile,
            email,
            type: "college",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Write to Firestore
        const docRef = await admin.firestore().collection("colleges").add(newCollegeData);

        return res.status(201).json({ success: true, id: docRef.id });
    } catch (error) {
        console.error("Error in POST api/superadmin/setting/college:", error);
        return res
            .status(500)
            .json({ error: error.message || "Internal server error while creating college." });
    }
});

// delete school rarely use
router.delete("/:collectionName/:instId", async (req, res) => {
    let { instId, collectionName } = req.params;
    if (collectionName?.toLowerCase() === "schools") {
        collectionName = "schools";
    } else if (collectionName?.toLowerCase() === "colleges") {
        collectionName = "colleges";
    } else {
        return res
            .status(400)
            .json({ success: false, error: "Invalid collection name." });
    }
    try {
        // 1) Read and delete the institution document
        const instRef = admin.firestore().collection(collectionName).doc(instId);
        const instSnap = await instRef.get();
        if (!instSnap.exists) {
            return res
                .status(404)
                .json({ success: false, error: `${collectionName} not found.` });
        }
        // 2. Delete the school document itself
        await instRef.delete();
        // 2) Query all users whose institutionId === instId
        const usersQuery = admin
            .firestore()
            .collection("Users")
            .where("institutionId", "==", instId);

        const usersSnapshot = await usersQuery.get();
        if (usersSnapshot.empty) {
            return res.json({
                success: true,
                message: `${collectionName} deleted. No associated users to delete.`,
            });
        }
        // 3) Batch-delete all matching Users docs from Firestore,
        //    and collect promises to delete Auth users by UID
        const batch = admin.firestore().batch();
        const deletionPromises = [];

        usersSnapshot.forEach((userDoc) => {
            const data = userDoc.data();
            const uidToDelete = data.uid || userDoc.id; // fallback to doc ID if no uid field
            // Queue Firestore doc deletion
            batch.delete(userDoc.ref);
            // Queue Auth user deletion
            if (uidToDelete) {
                deletionPromises.push(
                    admin
                        .auth()
                        .deleteUser(uidToDelete)
                        .catch((err) => {
                            console.error(
                                `Failed to delete Auth user (uid=${uidToDelete}):`,
                                err
                            );
                        })
                );
            }
        });
        // 4) Commit Firestore batch
        await batch.commit();
        // 5) Wait for all Auth deletions to finish
        await Promise.all(deletionPromises);
        return res.json({
            success: true,
            message: `${collectionName} and all associated users deleted.`,
        });

    } catch (error) {
        console.error("Error deleting school and accountants:", error);
        return res
            .status(500)
            .json({ success: false, error: error.message || "Internal error" });
    }
})


export default router;