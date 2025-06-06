// src/Pages/SuperAdmin/Schools/UserModal.jsx
import React, { useState } from "react";
import { auth } from "../../../config/firebase";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const UserModal = ({ isOpen, school, onClose, onUserAdded }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        schoolCode: school?.Code || ""
    });
    const [loading, setLoading] = useState(false);
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated");
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const userToken = await user.getIdToken();

        try {
            // 1) Call backend route to create an accountant
            const url = VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/superadmin/settings/accountants/` : `${VITE_DOMAIN_PROD}/api/superadmin/settings/accountants/`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone.trim(),
                    password: formData.password,
                    schoolCode: school.Code,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create accountant");
            }

            Swal.fire("Success!", "Accountant created successfully", "success");
            onUserAdded();
            onClose();
        } catch (error) {
            console.error("Error creating accountant:", error);
            let msg = error.message || "Failed to create accountant";

            // If backend says email already exists (400 with error text)
            if (msg.includes("already registered")) {
                // We show that message directly
            } else if (msg.includes("password")) {
                msg = "Password should be at least 6 characters.";
            }

            Swal.fire({
                icon: "error",
                title: "Error",
                text: msg,
                showConfirmButton: false,
                timer: 3000,
            });
        } finally {
            setLoading(false);
        }
    };


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

export default UserModal;