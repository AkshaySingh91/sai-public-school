import React, { useState } from "react";
import {
    Eye,
    EyeOff,
    Shield,
    Check,
    X,
    Loader,
    AlertCircle,
    Mail as EmailIcon
} from "lucide-react";

export default function EmailModal({
    emailForm,
    localEmailLoading,
    emailVerified,
    emailErrors,
    setShowEmailModal,
    setEmailVerified,
    setEmailErrors,
    setEmailForm,
    handleEmailVerify,
    handleEmailChange,
}) {
    const [showPasswords, setShowPasswords] = useState({ current: false });

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Change Email</h3>
                    <button
                        onClick={() => {
                            setShowEmailModal(false);
                            setEmailForm({ currentEmail: "", currentPassword: "", newEmail: "" });
                            setEmailVerified(false);
                            setEmailErrors({});
                        }}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {!emailVerified ? (
                        <>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Current Email
                                </label>
                                <input
                                    type="text"
                                    value={emailForm.currentEmail}
                                    readOnly
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? "text" : "password"}
                                        value={emailForm.currentPassword}
                                        onChange={(e) =>
                                            setEmailForm(prev => ({
                                                ...prev,
                                                currentPassword: e.target.value,
                                            }))
                                        }
                                        placeholder="Enter your current password"
                                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPasswords(prev => ({ current: !prev.current }))
                                        }
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* IMPORTANT NOTICE */}
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                <p className="text-yellow-800 font-medium text-sm flex items-start gap-2">
                                    <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={16} />
                                    You must verify your current email before changing it.
                                    Check your inbox for a verification link.
                                </p>
                            </div>

                            <button
                                onClick={handleEmailVerify}
                                disabled={!emailForm.currentPassword || localEmailLoading}
                                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {localEmailLoading ? (
                                    <Loader size={18} className="animate-spin" />
                                ) : (
                                    <Shield size={18} />
                                )}
                                {localEmailLoading ? "Verifying..." : "Verify Credentials"}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                                <Check size={18} />
                                <span className="text-sm font-medium">Credentials verified</span>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    New Email
                                </label>
                                <input
                                    type="email"
                                    value={emailForm.newEmail}
                                    onChange={(e) =>
                                        setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))
                                    }
                                    placeholder="Enter new email address"
                                    className={`w-full px-4 py-3 border ${emailErrors.newEmail ? "border-red-300" : "border-gray-200"
                                        } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200`}
                                />
                                {emailErrors.newEmail && (
                                    <p className="text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {emailErrors.newEmail}
                                    </p>
                                )}
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="text-blue-800 font-medium text-sm mb-1">What happens next:</p>
                                <ul className="text-blue-700 text-sm space-y-1">
                                    <li className="flex items-start gap-2">
                                        <span>•</span>
                                        <span>A verification link will be sent to your new email</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>•</span>
                                        <span>You must click the link to complete the change</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>•</span>
                                        <span>Your login email will be updated immediately</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={handleEmailChange}
                                disabled={!emailForm.newEmail || localEmailLoading}
                                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {localEmailLoading ? (
                                    <Loader size={18} className="animate-spin" />
                                ) : (
                                    <EmailIcon size={18} />
                                )}
                                {localEmailLoading ? "Sending..." : "Update Email Address"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}