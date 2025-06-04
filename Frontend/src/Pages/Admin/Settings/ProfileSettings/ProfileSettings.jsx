import React, { useState } from 'react';
import { Upload, Trash2, Loader, User } from 'lucide-react';
import Swal from "sweetalert2";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth, db } from '../../../../config/firebase'; // Ensure auth is imported correctly
import { getStorage, ref, deleteObject } from "firebase/storage";
import { doc, writeBatch, } from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext"
import { Camera, Mail, Phone, MapPin, Calendar, Building2, GraduationCap, Shield, X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import PasswordModal from './PasswordModal';


const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const ProfileSettings = ({ profile, setProfile, handleProfileUpdate }) => {
    const [localLoading, setLocalLoading] = useState(false);
    const { currentUser } = useAuth();
    const storage = getStorage();
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const [activeTab, setActiveTab] = useState('personal')
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordVerified, setPasswordVerified] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});

    const validateFile = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Only JPG, PNG, and WEBP images are allowed');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit');
        }
    };
    const handleDeleteImage = async () => {
        try {
            setLocalLoading(true);

            if (!profile?.profileImagePath) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Image Found',
                    text: 'There is no profile image to delete',
                });
                return;
            }

            // Confirm deletion
            const result = await Swal.fire({
                title: 'Delete Image?',
                text: "This action cannot be undone!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
            });

            if (!result.isConfirmed) return;

            const userToken = await currentUser.getIdToken();
            const url =
                VITE_NODE_ENV === 'Development'
                    ? `http://localhost:${VITE_PORT}/api/admin/school/avatar/${currentUser.uid}`
                    : `${VITE_DOMAIN_PROD}/api/admin/school/avatar/${currentUser.uid}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + userToken,
                },
            });

            if (!response.ok) {
                const errorJson = await response.json().catch(() => ({}));
                throw new Error(errorJson.error || 'Failed to delete document');
            }
            // Update local state
            setProfile(prev => ({
                ...prev,
                profileImage: null,
                profileImagePath: null
            }));

            Swal.fire({
                icon: 'success',
                title: 'Image Deleted!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            console.error('Delete error:', err);
            Swal.fire('Error', err.message || 'Could not delete document', 'error');
        } finally {
            setLocalLoading(false);
        }
    };

    const handleImageUpload = async (file) => {
        if (!file) return;
        try {
            setLocalLoading(true);
            validateFile(file);
            const userToken = await currentUser.getIdToken();
            const formData = new FormData();
            formData.append('avatar', file);
            // Show progress dialog
            Swal.fire({
                title: 'Uploading Document...',
                html: 'Please wait while we process your file.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });
            // Use XMLHttpRequest to track upload progress and get back the JSON
            const url = VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/admin/school/avatar/${currentUser.uid}` : `${VITE_DOMAIN_PROD}/api/admin/school/avatar/${currentUser.uid}`

            const uploadResult = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url);
                xhr.setRequestHeader('Authorization', 'Bearer ' + userToken);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        const bar = document.getElementById('upload-bar');
                        const pctText = document.getElementById('upload-percent');
                        if (bar) bar.style.width = `${percent}%`;
                        if (pctText) pctText.innerText = `${percent}% Complete`;
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const json = JSON.parse(xhr.responseText);
                            resolve(json);
                        } catch (parseErr) {
                            reject(new Error('Invalid JSON from server'));
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(formData);
            });
            Swal.close();
            const { avatar } = uploadResult;

            // Update local state
            setProfile(prev => ({
                ...prev,
                profileImage: avatar.profileImage,
                profileImagePath: avatar.profileImagePath
            }));

            Swal.fire({
                icon: 'success',
                title: 'Profile Image Updated!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            console.error('Upload Error:', err);

            // Handle specific storage errors
            let errorMessage = err.message;
            if (err.code === 'storage/canceled') {
                errorMessage = 'Upload was canceled';
            } else if (err.code === 'storage/retry-limit-exceeded') {
                errorMessage = 'Upload failed after multiple attempts';
            }

            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                html: `<div class="text-red-600">${errorMessage}</div>`,
            });
        } finally {
            setLocalLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLocalLoading(true);
            await handleProfileUpdate();
            Swal.fire({
                icon: 'success',
                title: 'Profile Updated!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: err.message || 'Failed to update profile'
            });
        } finally {
            setLocalLoading(false);
        }
    };

    // for password update
    const handlePasswordVerify = async () => {
        try {
            setLocalLoading(true);
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
            await reauthenticateWithCredential(user, credential);
            setPasswordVerified(true);
            Swal.fire({
                icon: 'success',
                title: 'Password Verified!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Verification Failed',
                text: err.message || 'Current password is incorrect'
            });
        } finally {
            setLocalLoading(false);
        }
    };
    // Password validation
    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/\d/.test(password)) errors.push('One number');
        if (!/[!@#$%^&*]/.test(password)) errors.push('One special character');
        return errors;
    };
    const handlePasswordChange = async () => {
        const errors = {};

        if (!passwordForm.newPassword) {
            errors.newPassword = 'New password is required';
        } else {
            const validationErrors = validatePassword(passwordForm.newPassword);
            if (validationErrors.length > 0) {
                errors.newPassword = validationErrors.join(', ');
            }
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        setPasswordErrors(errors);
        if (Object.keys(errors).length === 0) {
            setLocalLoading(true);
            try {
                const user = auth.currentUser;
                await updatePassword(user, passwordForm.newPassword);
                Swal.fire({
                    icon: 'success',
                    title: 'Password Updated!',
                    showConfirmButton: false,
                    timer: 1500
                });
                // Reset fields
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordVerified(false);
                setPasswordErrors({});
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: err.message || 'Failed to update password'
                });
            } finally {
                setLocalLoading(false);
                setShowPasswordModal(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        }
    };
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-lg">
                            {profile.profileImage ? (
                                <img
                                    src={profile.profileImage}
                                    className="w-full h-full object-cover"
                                    alt="Profile"
                                />
                            ) : (
                                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                    <User size={32} className="text-white" />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                            <label className="cursor-pointer text-purple-600 hover:text-purple-700">
                                <Camera size={16} />
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e.target.files[0])}
                                    accept="image/*"
                                    disabled={localLoading}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-bold">{profile.name || "-"}</h1>
                        <p className="text-white/90">{profile.position || "Clerk"}</p>
                        <p className="text-white/80 text-sm">{profile?.department || "School"} • {profile?.employeeId || "EmployeeId"}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                    {[
                        { id: 'personal', label: 'Personal Info' },
                        { id: 'professional', label: 'Professional' },
                        { id: 'security', label: 'Security' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? 'border-purple-500 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6">
                {activeTab === 'personal' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <FormField
                                label="Full Name"
                                value={profile.name}
                                onChange={e => setProfile({ ...profile, name: e.target.value })}
                                required
                                icon={User}
                            />

                            <FormField
                                label="Email Address"
                                value={profile.email}
                                type="email"
                                disabled
                                icon={Mail}
                            />

                            <FormField
                                label="Phone Number"
                                value={profile.phone}
                                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                type="tel"
                                icon={Phone}
                            />
                        </div>
                        <FormField
                            label="Address"
                            value={profile.address}
                            onChange={e => setProfile({ ...profile, address: e.target.value })}
                            icon={MapPin}
                        />
                    </div>
                )}

                {activeTab === 'professional' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <FormField
                                label="Position"
                                value={profile.position}
                                onChange={e => setProfile({ ...profile, position: e.target.value })}
                                icon={Building2}
                            />

                            <FormField
                                label="Department"
                                value={profile.department}
                                onChange={e => setProfile({ ...profile, department: e.target.value })}
                                icon={Building2}
                            />

                            <FormField
                                label="Employee ID"
                                value={profile.employeeId}
                                disabled
                                icon={Shield}
                            />

                            <FormField
                                label="Date of Joining"
                                value={profile.dateOfJoining}
                                type="date"
                                onChange={e => setProfile({ ...profile, dateOfJoining: e.target.value })}
                                icon={Calendar}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>

                        <div className="bg-gray-50 rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">Password</h3>
                                    <p className="text-sm text-gray-600">Last changed 30 days ago</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(true)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    <Shield size={16} />
                                    Change Password
                                </button>
                            </div>
                        </div>

                        {profile.profileImage && (
                            <div className="bg-gray-50 rounded-lg p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">Profile Image</h3>
                                        <p className="text-sm text-gray-600">Manage your profile picture</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDeleteImage}
                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                                        disabled={localLoading}
                                    >
                                        <Trash2 size={16} />
                                        Remove Image
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Save Button */}
                <div className="mt-8 flex justify-end">
                    <button
                        type="submit"
                        className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
                        disabled={localLoading}
                    >
                        {localLoading ? (
                            <Loader size={20} className="animate-spin" />
                        ) : (
                            <Check size={20} />
                        )}
                        {localLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            {showPasswordModal &&
                <PasswordModal
                    passwordForm={passwordForm}
                    localLoading={localLoading}
                    passwordVerified={passwordVerified}
                    passwordErrors={passwordErrors}
                    setShowPasswordModal={setShowPasswordModal}
                    setPasswordVerified={setPasswordVerified}
                    setPasswordErrors={setPasswordErrors}
                    setPasswordForm={setPasswordForm}
                    handlePasswordChange={handlePasswordChange}
                    handlePasswordVerify={handlePasswordVerify}
                />}
        </div>
    );
};


// Form field component
const FormField = ({ label, value, onChange, type = 'text', disabled = false, required = false, placeholder, icon: Icon }) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {Icon && (
                <Icon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                className={`w-full px-4 py-3 ${Icon ? 'pl-10' : ''} border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
            />
        </div>
    </div>
);


// Password field component

export default ProfileSettings;

