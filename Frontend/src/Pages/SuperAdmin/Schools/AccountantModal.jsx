// src/Pages/SuperAdmin/Schools/AccountantModal.jsx
import React, { useState } from "react";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db , auth } from "../../../config/firebase";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";

const AccountantModal = ({ isOpen, school, onClose, onAccountantAdded }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        schoolCode: school?.Code || ""
    });
    console.log(school)
    const [loading, setLoading] = useState(false);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Check if email exists in Firestore
            const emailQuery = query(collection(db, "Users"), where("email", "==", formData.email));
            const emailSnapshot = await getDocs(emailQuery);

            if (!emailSnapshot.empty) {
                const existingUser = emailSnapshot.docs[0].data();
                const schoolQuery = query(collection(db, "schools"), where("Code", "==", existingUser.schoolCode));
                const schoolSnapshot = await getDocs(schoolQuery);
                const schoolName = schoolSnapshot.docs[0]?.data().schoolName || "another school";

                Swal.fire({
                    icon: "error",
                    title: "Accountant Exists",
                    html: `This email is already registered at <strong>${schoolName}</strong>!`,
                });
                return;
            }
            // Create Firebase Authentication user
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            const firebaseUser = userCredential.user;

            try {
                // Create Firestore document with UID as document ID
                await setDoc(doc(db, "Users", firebaseUser.uid), {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    schoolCode: school.Code,
                    role: "accountant",
                    createdAt: new Date(),
                    uid: firebaseUser.uid
                });

                Swal.fire("Success!", "Accountant created successfully", "success");
                onAccountantAdded();
                onClose();
            } catch (firestoreError) {
                // Rollback Firebase auth creation if Firestore fails
                await deleteUser(firebaseUser);
                throw firestoreError;
            }
        } catch (error) {
            console.error("Error creating accountant:", error);
            let errorMessage = "Failed to create accountant";

            if (error.code === "auth/email-already-in-use") {
                errorMessage = "This email is already registered in our system";
            } else if (error.code === "auth/weak-password") {
                errorMessage = "Password should be at least 6 characters";
            }

            Swal.fire({
                icon: "error",
                title: "Error",
                text: errorMessage,
                showConfirmButton: false,
                timer: 3000
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ y: 50 }}
                        animate={{ y: 0 }}
                        exit={{ y: -50 }}
                        className="bg-white rounded-xl p-6 w-full max-w-md"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Add Accountant</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Initial Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
                                >
                                    {loading ? "creating..." : "Create Accountant"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AccountantModal;