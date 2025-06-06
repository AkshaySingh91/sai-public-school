import { useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { auth } from "../../../config/firebase";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

export default function CollegeModal({ onClose, onCollegeAdded }) {
    const [formData, setFormData] = useState({
        collegeName: "",
        Code: "",
        location: {
            state: "Maharashtra",
            district: "",
            taluka: "",
            landmark: "",
            pincode: ""
        },
        paymentModes: ["Cash", "Online", "Cheque"],
        feeTypes: ["AdmissionFee", "TuitionFee"],
        academicYear: "25-26",
        courses: "B.A,B.Sc,B.Com,BBA,BCA,BAF,BFM",
        departments: "Science,Commerce,Arts,Management",
        studentsType: "Regular,Part-Time,Distance",
        collegeReceiptHeader: "Sai Public College",
        feeIdCount: 0,
        tuitionReceiptCount: 0,
        mobile: "",
        email: "",
        type: "college"
    });
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState("basic");

    const parseArrayInput = (str) =>
        str.split(",").map((item) => item.trim()).filter(Boolean);

    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated");
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userToken = await user.getIdToken();

        const { value: accept } = await Swal.fire({
            title: "Confirm College Creation",
            html: `<p>You're about to create a new college with:</p>
             <ul class="text-left mt-2">
               <li>Name: <strong>${formData.collegeName}</strong></li>
               <li>Code: <strong>${formData.Code || "Auto-generated"}</strong></li>
               <li>Courses: ${parseArrayInput(formData.courses).length}</li>
             </ul>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Confirm Creation"
        });

        if (!accept) return;

        setLoading(true);
        try {
            const url = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/superadmin/settings/college/`
                : `${VITE_DOMAIN_PROD}/api/superadmin/settings/college/`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    Code: formData.Code,
                    collegeName: formData.collegeName,
                    location: formData.location,
                    academicYear: formData.academicYear,
                    collegeReceiptHeader: formData.collegeReceiptHeader,
                    paymentModes: parseArrayInput(formData.paymentModes.join(",")),
                    feeTypes: parseArrayInput(formData.feeTypes.join(",")),
                    courses: parseArrayInput(formData.courses),
                    departments: parseArrayInput(formData.departments),
                    studentsType: parseArrayInput(formData.studentsType),
                    feeIdCount: 0,
                    tuitionReceiptCount: 0,
                    mobile: formData.mobile,
                    email: formData.email,
                    type: "college"
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to create college");
            }

            await Swal.fire({
                icon: "success",
                title: "College Created!",
                text: `“${formData.collegeName}” has been successfully registered.`,
                timer: 2000,
                showConfirmButton: false
            });
            onCollegeAdded();
            onClose();
        } catch (error) {
            console.error("Error creating college:", error);
            Swal.fire({
                icon: "error",
                title: "Creation Failed",
                text: error.message || "Failed to create college"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 w-full max-w-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">New College Configuration</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-transform hover:rotate-90"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex gap-4 mb-6 border-b">
                    <button
                        className={`px-4 py-2 ${activeSection === "basic" ? "border-b-2 border-indigo-600" : ""}`}
                        onClick={() => setActiveSection("basic")}
                    >
                        Basic Info
                    </button>
                    <button
                        className={`px-4 py-2 ${activeSection === "academic" ? "border-b-2 border-indigo-600" : ""}`}
                        onClick={() => setActiveSection("academic")}
                    >
                        Academic Setup
                    </button>
                    <button
                        className={`px-4 py-2 ${activeSection === "financial" ? "border-b-2 border-indigo-600" : ""}`}
                        onClick={() => setActiveSection("financial")}
                    >
                        Financial Settings
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    {activeSection === "basic" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    College Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.collegeName}
                                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                                    className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    College Code
                                    <span className="text-gray-500 ml-2">(auto-generated if empty)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.Code}
                                    onChange={(e) => setFormData({ ...formData, Code: e.target.value })}
                                    className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. SPC-2024"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Location Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">State *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.location.state}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, state: e.target.value }
                                                })
                                            }
                                            className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">District *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.location.district}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, district: e.target.value }
                                                })
                                            }
                                            className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">Taluka *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.location.taluka}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, taluka: e.target.value }
                                                })
                                            }
                                            className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Academic Setup */}
                    {activeSection === "academic" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Academic Year *
                                    <span className="text-gray-500 ml-2">(format: YYYY-YYYY)</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    pattern="\d{4}-\d{4}"
                                    value={formData.academicYear}
                                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                                    className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Courses *
                                    <span className="text-gray-500 ml-2">(comma separated)</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.courses}
                                    onChange={(e) => setFormData({ ...formData, courses: e.target.value })}
                                    className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Departments *
                                    <span className="text-gray-500 ml-2">(comma separated)</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.departments}
                                    onChange={(e) => setFormData({ ...formData, departments: e.target.value })}
                                    className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Student Types *
                                    <span className="text-gray-500 ml-2">(comma separated)</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.studentsType}
                                    onChange={(e) => setFormData({ ...formData, studentsType: e.target.value })}
                                    className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Financial Settings */}
                    {activeSection === "financial" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Methods *
                                    <span className="text-gray-500 ml-2">(comma separated)</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.paymentModes}
                                    onChange={(e) =>
                                        setFormData({ ...formData, paymentModes: e.target.value.split(",") })
                                    }
                                    className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Receipt Headers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">College Receipt</label>
                                        <input
                                            type="text"
                                            value={formData.collegeReceiptHeader}
                                            onChange={(e) =>
                                                setFormData({ ...formData, collegeReceiptHeader: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Receipt Count</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">Tuition Receipt</label>
                                        <input
                                            type="number"
                                            value={formData.tuitionReceiptCount}
                                            onChange={(e) =>
                                                setFormData({ ...formData, tuitionReceiptCount: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-8">
                        <div className="flex gap-2">
                            {activeSection !== "basic" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActiveSection((prev) => {
                                            const sections = ["basic", "academic", "financial"];
                                            return sections[sections.indexOf(prev) - 1];
                                        })
                                    }
                                    className="px-6 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                                >
                                    ← Previous
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {activeSection !== "financial" ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActiveSection((prev) => {
                                            const sections = ["basic", "academic", "financial"];
                                            return sections[sections.indexOf(prev) + 1];
                                        })
                                    }
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? "Creating College..." : "Complete Setup"}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
