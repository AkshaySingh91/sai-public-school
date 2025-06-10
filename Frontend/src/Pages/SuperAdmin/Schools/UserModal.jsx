import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { auth } from "../../../config/firebase";

export default function UserModal({ institute, onClose, onUserAdded }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        institutionType: institute?.type,
        institutionId: institute?.id,
    });
    const [role, setRole] = useState("");
    const [privilege, setPrivilege] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const roles = [
        { label: "Accountant", value: "accountant", icon: "💼" },
        { label: "Head Master", value: "head-master", icon: "👨‍💼" },
        { label: "Teacher", value: "teacher", icon: "👩‍🏫" },
    ];

    const privileges = [
        { label: "Read Only", value: "read", description: "Can view data only" },
        { label: "Read & Write", value: "both", description: "Can view and modify data" },
    ];

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 6) strength += 1;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        return strength;
    };

    const validateField = (name, value) => {
        const newErrors = { ...errors };

        switch (name) {
            case 'name':
                if (!value.trim()) {
                    newErrors.name = 'Name is required';
                } else if (value.trim().length < 3) {
                    newErrors.name = 'Name must be at least 3 characters';
                } else {
                    delete newErrors.name;
                }
                break;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value.trim()) {
                    newErrors.email = 'Email is required';
                } else if (!emailRegex.test(value)) {
                    newErrors.email = 'Please enter a valid email';
                } else {
                    delete newErrors.email;
                }
                break;
            case 'password':
                if (!value) {
                    newErrors.password = 'Password is required';
                } else if (value.length < 6) {
                    newErrors.password = 'Password must be at least 6 characters';
                } else {
                    delete newErrors.password;
                }
                break;
            case 'phone':
                if (value && !/\+91\d{10}/.test(value)) {
                    newErrors.phone = 'Please enter a valid phone number +91XXXXXXXXXX';
                } else {
                    delete newErrors.phone;
                }
                break;
        }

        setErrors(newErrors);
    };

    const handleInputChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
        validateField(name, value);

        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 1) return 'bg-red-500';
        if (passwordStrength <= 2) return 'bg-yellow-500';
        if (passwordStrength <= 3) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const getPasswordStrengthText = () => {
        if (passwordStrength <= 1) return 'Weak';
        if (passwordStrength <= 2) return 'Fair';
        if (passwordStrength <= 3) return 'Good';
        return 'Strong';
    };

    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated");
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validate all fields
        const fieldsToValidate = ['name', 'email', 'password', 'phone'];
        fieldsToValidate.forEach(field => validateField(field, formData[field]));

        if (Object.keys(errors).length > 0 || !role || !privilege) {
            if (!role) setErrors(prev => ({ ...prev, role: 'Please select a role' }));
            if (!privilege) setErrors(prev => ({ ...prev, privilege: 'Please select a privilege' }));
            setLoading(false);
            return;
        }

        try {
            // 1) Call backend route to create a User
            const userToken = await user.getIdToken();
            const url =
                import.meta.env.VITE_NODE_ENV === "Development"
                    ? `http://localhost:${import.meta.env.VITE_PORT}/api/superadmin/user/`
                    : `${import.meta.env.VITE_DOMAIN_PROD}/api/superadmin/user/`;

            // Build payload. Depending on institute type, add schoolCode or collegeCode
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim(),
                password: formData.password,
                institutionType: formData.institutionType,
                institutionId: formData.institutionId,
                role,
                privilege,
            };
            // add the code field for the front-end to send:
            if (formData.institutionType === "school") {
                payload.schoolCode = institute.Code;
            } else {
                payload.collegeCode = institute.Code;
            }
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to create User");
            }

            Swal.fire("Success!", "User created successfully.", "success");
            onUserAdded();
            onClose();
        } catch (error) {
            console.error("Error creating User:", error);
            let msg = error.message || "Failed to create User";

            // Friendly error parsing
            if (msg.includes("already registered")) {
                // keep that exact backend message
            } else if (msg.toLowerCase().includes("password")) {
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

    useEffect(() => {
        try {
            if ((institute.type !== "school" && institute.type !== "college") || !institute.id) {
                throw new Error("Incomplete Data: institute.type or institute.id is missing.");
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message || "Incomplete Data: institute.type or institute.id is missing.",
            })
        }
    }, [institute]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex justify-between items-center z-50">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Create a new user for {institute?.type === 'school' ? 'School' : 'College'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                            aria-label="Close modal"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <p className="block text-sm font-semibold text-gray-700">
                                Full Name <span className="text-red-500">*</span>
                            </p>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none ${errors.name
                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                                        }`}
                                    placeholder="Enter full name"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>
                            {errors.name && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-600 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.name}
                                </motion.p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <p className="block text-sm font-semibold text-gray-700">
                                Email Address <span className="text-red-500">*</span>
                            </p>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none ${errors.email
                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                                        }`}
                                    placeholder="Enter email address"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            {errors.email && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-600 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.email}
                                </motion.p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <p className="block text-sm font-semibold text-gray-700">
                                Initial Password <span className="text-red-500">*</span>
                            </p>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl transition-all duration-200 focus:outline-none ${errors.password
                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                                        }`}
                                    placeholder="Enter initial password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">
                                            {getPasswordStrengthText()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {errors.password && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-600 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.password}
                                </motion.p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <p className="block text-sm font-semibold text-gray-700">
                                Phone Number<span className="text-red-500">*</span>
                            </p>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none ${errors.phone
                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                                        }`}
                                    placeholder="Enter phone number"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                            </div>
                            {errors.phone && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-600 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.phone}
                                </motion.p>
                            )}
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">
                                Assign Role <span className="text-red-500">*</span>
                            </label>
                            <div className="grid gap-3">
                                {roles.map((r) => (
                                    <motion.label
                                        key={r.value}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${role === r.value
                                            ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={r.value}
                                            checked={role === r.value}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="sr-only"
                                        />
                                        <span className="text-2xl mr-3">{r.icon}</span>
                                        <span className="font-medium text-gray-700">{r.label}</span>
                                        {role === r.value && (
                                            <svg className="ml-auto w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </motion.label>
                                ))}
                            </div>
                            {errors.role && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-600 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.role}
                                </motion.p>
                            )}
                        </div>

                        {/* Privilege Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">
                                Assign Privilege <span className="text-red-500">*</span>
                            </label>
                            <div className="grid gap-3">
                                {privileges.map((p) => (
                                    <motion.label
                                        key={p.value}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${privilege === p.value
                                            ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="privilege"
                                            value={p.value}
                                            checked={privilege === p.value}
                                            onChange={(e) => setPrivilege(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-700">{p.label}</div>
                                            <div className="text-sm text-gray-500 mt-1">{p.description}</div>
                                        </div>
                                        {privilege === p.value && (
                                            <svg className="ml-auto w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </motion.label>
                                ))}
                            </div>
                            {errors.privilege && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-600 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.privilege}
                                </motion.p>
                            )}
                        </div>

                        {/* Hidden inputs for institution */}
                        <input
                            type="hidden"
                            name="institutionType"
                            value={formData.institutionType}
                        />
                        <input
                            type="hidden"
                            name="institutionId"
                            value={formData.institutionId}
                        />

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || Object.keys(errors).length > 0}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Create User
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}