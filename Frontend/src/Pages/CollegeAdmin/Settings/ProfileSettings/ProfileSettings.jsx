import "../../../../index.css"
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
const VITE_R2_BASE_URL = import.meta.env.VITE_R2_BASE_URL;

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
    const handleImageUpload = async (file) => {
        if (!file) return;
        try {
            setLocalLoading(true);
            validateFile(file);
            const userToken = await currentUser.getIdToken();
            const oldKey = profile?.profileImagePath || null;

            // 1. Get pre-signed URL from backend
            const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/admin/school/avatar/upload-url/${currentUser.uid}?fileType=${file.type}&fileName=${file.name}`
                : `${VITE_DOMAIN_PROD}/api/admin/school/avatar/upload-url/${currentUser.uid}?fileType=${file.type}&fileName=${file.name}`;
            const urlResponse = await fetch(uploadUrlEndpoint, {
                headers: { Authorization: 'Bearer ' + userToken }
            });

            if (!urlResponse.ok) {
                throw new Error('Failed to get upload URL');
            }

            const { signedUrl, key: newKey } = await urlResponse.json();

            // 2. Show progress dialog
            Swal.fire({
                title: 'Uploading...',
                html: `
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div id="upload-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
                <div class="mt-2 text-sm">
                    <span id="uploaded-size">0KB</span> / 
                    <span id="total-size">${(file.size / 1024).toFixed(1)}KB</span>
                </div>
                <div class="mt-1" id="upload-percent">0% Complete</div>
            `,
                showConfirmButton: false,
                allowOutsideClick: false
            });

            // 3. Upload directly to R2
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signedUrl);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        const uploadedKB = (event.loaded / 1024).toFixed(1);
                        const totalKB = (event.total / 1024).toFixed(1);

                        document.getElementById('upload-bar').style.width = `${percent}%`;
                        document.getElementById('upload-percent').innerText = `${percent}% Complete`;
                        document.getElementById('uploaded-size').innerText = `${uploadedKB}KB`;
                        document.getElementById('total-size').innerText = `${totalKB}KB`;
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) resolve();
                    else reject(new Error(`Upload failed with status ${xhr.status}`));
                };

                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(file);
            });

            // 4. Update Firestore and delete old avatar
            const updateEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/admin/school/avatar/update/${currentUser.uid}`
                : `${VITE_DOMAIN_PROD}/api/admin/school/avatar/update/${currentUser.uid}`;

            const updateResponse = await fetch(updateEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + userToken
                },
                body: JSON.stringify({ newKey, oldKey })
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update profile');
            }

            // Update local state
            const avatarUrl = `${VITE_R2_BASE_URL}/${newKey}`;
            setProfile(prev => ({
                ...prev,
                profileImage: avatarUrl,
                profileImagePath: newKey
            }));

            Swal.fire({
                icon: 'success',
                title: 'Upload Successful!',
                text: 'Profile image updated',
                timer: 1500
            });

        } catch (err) {
            console.error('Upload Error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: err.message
            });
        } finally {
            setLocalLoading(false);
        }
    };

    const handleDeleteImage = async () => {
        try {
            setLocalLoading(true);
            const oldKey = profile?.profileImagePath || null;

            if (!oldKey) {
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
            const url = VITE_NODE_ENV === "Development"
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
                throw new Error('Failed to delete image');
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
            Swal.fire('Error', err.message || 'Could not delete image', 'error');
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
            <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-6 capitalize">
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
                            <label className="cursor-pointer text-green-600 hover:text-green-700">
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

                    <div className="text-center md:text-left capitalize">
                        <h1 className="text-2xl font-bold">{profile.name || "-"}</h1>
                        <p className="text-white/90 capitalize">{profile.position || profile.role || ""}</p>
                        <p className="text-white/80 text-sm">{profile?.department || "College"} • {profile?.employeeId || ""}</p>
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
                                ? 'border-green-500 text-green-600'
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
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
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
                        className="px-8 py-3  text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
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
                className={`w-full px-4 py-3 ${Icon ? 'pl-10' : ''} border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
            />
        </div>
    </div>
);


// Password field component

export default ProfileSettings;

