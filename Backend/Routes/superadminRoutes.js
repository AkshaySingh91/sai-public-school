import express from 'express';
import admin from 'firebase-admin';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const router = express.Router();

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
// /api/superadmin/avatar/upload-url/:adminId
router.get('/avatar/upload-url/:superAdminId', async (req, res) => {
    // check if requesting user have right privilege
    if (!req.user || req.user.privilege !== "both") {
        return res.status(400).json({ message: "User should have write  privilege" });
    }

    try {
        const { superAdminId } = req.params;
        const { fileType, fileName } = req.query;
        const superAdminRef = admin.firestore().collection('Users').doc(superAdminId);
        const superAdminSnap = await superAdminRef.get();
        const superAdminData = superAdminSnap.data();
        if (!superAdminSnap.exists) {
            return res.status(404).json({ error: 'Superadmin not found.' });
        }
        if (superAdminData.role !== "superadmin") {
            return res.status(404).json({ error: 'Role is not a Superadmin.' });
        }
        // Generate unique key
        const fileExt = fileName.split('.').pop().toLowerCase() || 'png';
        const timestamp = Date.now();
        const newKey = `superadmin/avatar-${timestamp}.${fileExt}`;

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
// api/superadmin/avatar/update
router.post('/avatar/update/:superAdminId', async (req, res) => {
    // check if requesting user have right privilege
    if (!req.user || req.user.privilege !== "both") {
        return res.status(400).json({ message: "User should have write  privilege" });
    }

    const { superAdminId } = req.params;
    const { newKey, oldKey } = req.body;
    try {
        const superAdminRef = admin.firestore().collection('Users').doc(superAdminId);
        // Delete old avatar if exists
        if (oldKey) {
            try {
                await r2.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET,
                        Key: oldKey,
                    })
                );
            } catch (delErr) {
                if (!delErr.name.includes('NoSuchKey')) {
                    console.warn('Error deleting old avatar:', delErr);
                }
            }
        }
        // Build public URL
        const avatarImage = `${R2_BASE_URL}/${newKey}`;
        const updatedAt = new Date().toISOString();
        // Update Firestore
        await superAdminRef.update({
            profileImage: avatarImage,
            profileImagePath: newKey,
            updatedAt,
        });
        res.status(200).json({
            profileImage: avatarImage,
            profileImagePath: newKey,
            updatedAt,
        });
    } catch (err) {
        console.error('Error updating avatar:', err);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
});
router.delete('/avatar/:superAdminId', async (req, res) => {
    const { superAdminId } = req.params;
    try {
        // 1) Fetch Accountant doc
        const superAdminRef = admin.firestore().collection('Users').doc(superAdminId);
        const superAdminSnap = await superAdminRef.get();
        if (!superAdminSnap.exists) {
            return res.status(404).json({ error: 'Superadmin not found.' });
        }
        const superAdminData = superAdminSnap.data();
        // 2) Delete old avatar if one exists
        if (superAdminData.profileImage && superAdminData.profileImagePath) {
            const oldKey = superAdminData.profileImagePath;
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
        await superAdminRef.update({
            profileImage: null,
            profileImagePath: null,
            updatedAt: new Date().toISOString(),
        });

        // 4) Respond to client
        return res.status(200).json({ message: 'Accountant Avatar deleted successfully.' });
    } catch (err) {
        console.error(`Error in DELETE /api/admin/avatar/${superAdminId}/`, err);
        return res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
});

//school & user create or delete  
// superadmin create new accountant for existing or new school
router.post("/user", async (req, res) => {
    const { name, email, phone, password, institutionType, institutionId, role, privilege, schoolCode, collegeCode, } = req.body;
    // 1) Basic presence 
    if (!name || !email || !password || !institutionType || !institutionId || !role || !privilege) {
        return res.status(400).json({
            success: false,
            error: "Missing required fields. Required: name, email, password, institutionType, institutionId, role, privilege.",
        });
    }
    if (typeof name !== "string" || name.trim().length === 0) {
        return res
            .status(400)
            .json({ success: false, error: "Invalid 'name' field." });
    }
    if (typeof email !== "string" || !email.includes("@")) {
        return res
            .status(400)
            .json({ success: false, error: "Invalid 'email' field." });
    }
    if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
            success: false,
            error: "Password must be at least 6 characters long.",
        });
    }
    if (
        institutionType !== "school" &&
        institutionType !== "college"
    ) {
        return res
            .status(400)
            .json({ success: false, error: "institutionType must be 'school' or 'college'." });
    }
    if (typeof institutionId !== "string" || institutionId.trim().length === 0) {
        return res
            .status(400)
            .json({ success: false, error: "Invalid 'institutionId' field." });
    }
    if (typeof role !== "string" || role.trim().length === 0) {
        return res
            .status(400)
            .json({ success: false, error: "Invalid 'role' field." });
    }
    if (privilege !== "read" && privilege !== "both") {
        return res
            .status(400)
            .json({ success: false, error: "Invalid 'privilege' field." });
    }
    if (institutionType === "school" && (!schoolCode || typeof schoolCode !== "string")) {
        return res.status(400).json({
            success: false,
            error: "Missing or invalid 'schoolCode' for a school user.",
        });
    }
    if (institutionType === "college" && (!collegeCode || typeof collegeCode !== "string")) {
        return res.status(400).json({
            success: false,
            error: "Missing or invalid 'collegeCode' for a college user.",
        });
    }

    try {
        // 2) Verify institution exists (in Firestore)
        const instCollection = institutionType === "school" ? "schools" : "colleges";
        const instDoc = await admin
            .firestore()
            .collection(instCollection)
            .doc(institutionId)
            .get();
        if (!instDoc.exists) {
            return res.status(404).json({
                success: false,
                error: `${institutionType} with ID '${institutionId}' not found.`,
            });
        }

        // 3) Check if email already exists in Firestore Users
        const emailQuery = admin
            .firestore()
            .collection("Users")
            .where("email", "==", email.trim().toLowerCase())
            .limit(1);
        const emailSnapshot = await emailQuery.get();
        if (!emailSnapshot.empty) {
            const existingData = emailSnapshot.docs[0].data();
            const existingCode =
                existingData.institutionType === "school"
                    ? existingData.schoolCode
                    : existingData.collegeCode;
            let existingName = "another institution";
            // Look up that institution's name for a better message
            if (existingCode) {
                const instQuery2 = admin
                    .firestore()
                    .collection(instCollection)
                    .where("Code", "==", existingCode)
                    .limit(1);
                const instSnap = await instQuery2.get();
                if (!instSnap.empty) {
                    existingName =
                        instSnap.docs[0].data()[
                        institutionType === "school" ? "schoolName" : "collegeName"
                        ] || existingName;
                }
            }
            return res.status(400).json({
                success: false,
                error: `This email is already registered at "${existingName}".`,
            });
        }

        // 4) Check if email already exists in Firebase Auth
        try {
            await admin.auth().getUserByEmail(email.trim().toLowerCase());
            // If no error, user exists in Auth already
            return res.status(400).json({
                success: false,
                error: "This email is already in use in Authentication.",
            });
        } catch (authErr) {
            // If authErr.code === "auth/user-not-found", it's okay to proceed
            if (authErr.code !== "auth/user-not-found") {
                console.error("Error checking Auth email:", authErr);
                return res
                    .status(500)
                    .json({ success: false, error: "Error verifying email in Auth." });
            }
        }

        // 5) Create Firebase Auth user (superadmin session is unaffected)
        const userRecord = await admin.auth().createUser({
            email: email.trim().toLowerCase(),
            password: password,
            displayName: name.trim(),
            phoneNumber: phone ? phone.trim() : undefined,
        });
        const newUid = userRecord.uid;

        // 6) Write Firestore document under /Users/{newUid}
        const userDocRef = admin.firestore().collection("Users").doc(newUid);
        const userDocData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : "",
            role: role.toLowerCase(),
            privilege: privilege.toLowerCase(),
            institutionType,
            institutionId,
            uid: newUid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Add either schoolCode or collegeCode to Firestore doc
        if (institutionType === "school") {
            userDocData.schoolCode = schoolCode;
        } else {
            userDocData.collegeCode = collegeCode;
        }

        await userDocRef.set(userDocData);

        // 7) Return success
        return res.status(201).json({ success: true, uid: newUid });
    } catch (error) {
        console.error("Error in POST /api/superadmin/user:", error);
        // If Auth user was created but Firestore write failed, clean up:
        if (
            error.code &&
            typeof error.code === "string" &&
            error.code.startsWith("auth/")
        ) {
            // If password or email error, send 400
            return res.status(400).json({ success: false, error: error.message });
        }
        // Otherwise, a server error—attempt to delete the created Auth user if present
        if (error.message && error.message.includes("createUser")) {
            // no-op: createUser failed
        } else if (error.message && error.message.includes("Firestore")) {
            // Firestore write failed after createUser
            // Attempt cleanup:
            try {
                const newlyCreatedUid = error.uid; // if you included in error
                if (newlyCreatedUid) await admin.auth().deleteUser(newlyCreatedUid);
            } catch (cleanupErr) {
                console.error("Error cleaning up after Firestore failure:", cleanupErr);
            }
        }
        return res
            .status(500)
            .json({ success: false, error: "Internal server error." });
    }
});
// superadmin will delete user from specific school
router.delete("/user/:institutionId/:userId", async (req, res) => {
    const { institutionId, userId } = req.params;
    if (!userId || !institutionId) {
        return res.status(400).json({ error: "Missing userId or institutionId in request." });
    }
    try {
        // 1) Delete Firestore document
        const userDocRef = admin.firestore().collection("Users").doc(userId);
        const userSnapshot = await userDocRef.get();
        if (!userSnapshot.exists) {
            return res.status(404).json({ error: "User not found in Firestore." });
        }
        // Optionally verify that this user truly belongs to that institutionId:
        const data = userSnapshot.data();
        if (data.institutionId !== institutionId) {
            return res.status(403).json({ error: "User does not belong to this institution." });
        }
        await userDocRef.delete();

        // 2) Delete the Firebase Auth user
        await admin.auth().deleteUser(userId);

        return res.json({ success: true, message: "User deleted." });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ success: false, error: error.message || "Internal error" });
    }
});
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
// college create  
router.post("/college", async (req, res) => {
    try {
        const {
            // basic
            Code: rawCode,
            collegeName,
            mobile,
            email,
            academicYear,
            
            location,
            courses,
            departments,
            collegeReceiptHeader,
            feeIdCount,
            tuitionReceiptCount,
            paymentModes,
            feeTypes,
            studentsType,
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
// delete school or college rarely use
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

export default router