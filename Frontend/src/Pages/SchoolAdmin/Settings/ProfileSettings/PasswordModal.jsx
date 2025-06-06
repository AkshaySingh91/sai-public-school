import { AlertCircle, Check, Eye, EyeOff, Loader, Shield, X } from 'lucide-react';
import React, { useState } from 'react'

function PasswordModal({
    passwordForm,
    localLoading,
    passwordVerified,
    passwordErrors,
    setShowPasswordModal,
    setPasswordVerified,
    setPasswordErrors,
    setPasswordForm,
    handlePasswordChange,
    handlePasswordVerify,
}) {
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    }); return (
        <>

            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                        <button
                            onClick={() => {
                                setShowPasswordModal(false);
                                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                setPasswordVerified(false);
                                setPasswordErrors({});
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {!passwordVerified ? (
                            <>
                                <PasswordField
                                    label="Current Password"
                                    value={passwordForm?.currentPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    show={showPasswords?.current}
                                    onToggleShow={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                    placeholder="Enter your current password"
                                />
                                <button
                                    onClick={handlePasswordVerify}
                                    disabled={!passwordForm.currentPassword || localLoading}
                                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {localLoading ? <Loader size={18} className="animate-spin" /> : <Shield size={18} />}
                                    {localLoading ? 'Verifying...' : 'Verify Current Password'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                                    <Check size={18} />
                                    <span className="text-sm font-medium">Current password verified</span>
                                </div>

                                <PasswordField
                                    label="New Password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    show={showPasswords.new}
                                    onToggleShow={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                    placeholder="Enter new password"
                                    error={passwordErrors.newPassword}
                                />

                                <PasswordField
                                    label="Confirm New Password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    show={showPasswords.confirm}
                                    onToggleShow={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    placeholder="Confirm new password"
                                    error={passwordErrors.confirmPassword}
                                />

                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-sm text-blue-800 font-medium mb-1">Password Requirements:</p>
                                    <ul className="text-xs text-blue-600 space-y-1">
                                        <li>• At least 8 characters long</li>
                                        <li>• Contains uppercase and lowercase letters</li>
                                        <li>• Contains at least one number</li>
                                        <li>• Contains at least one special character (!@#$%^&*)</li>
                                    </ul>
                                </div>

                                <button
                                    onClick={handlePasswordChange}
                                    disabled={!passwordForm.newPassword || !passwordForm.confirmPassword || localLoading}
                                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {localLoading ? <Loader size={18} className="animate-spin" /> : <Shield size={18} />}
                                    {localLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
const PasswordField = ({ label, value, onChange, show, onToggleShow, placeholder, error }) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3 pr-12 border ${error ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
            />
            <button
                type="button"
                onClick={onToggleShow}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
        {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
    </div>
);

export default PasswordModal
