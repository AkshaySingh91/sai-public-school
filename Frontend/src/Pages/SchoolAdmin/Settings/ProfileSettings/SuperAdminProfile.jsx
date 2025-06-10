import { useState } from 'react';
import { Trash2, Loader, User } from 'lucide-react';
import Swal from "sweetalert2";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword, updateEmail, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../../../config/firebase'; // Ensure auth is imported correctly 
import { useAuth } from "../../../../contexts/AuthContext"
import { Camera, Mail, Phone, MapPin, Calendar, Building2, Shield, X, Check } from 'lucide-react';
import PasswordModal from './PasswordModal';
import EmailModal from './EmailModal';
import { useInstitution } from '../../../../contexts/InstitutionContext';

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const SuperAdminProfile = ({ profile, setProfile, handleProfileUpdate }) => {
    const [localLoading, setLocalLoading] = useState(false);
    const { currentUser } = useAuth();
    const { school } = useInstitution();
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const [activeTab, setActiveTab] = useState('personal')
    // for password change
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordVerified, setPasswordVerified] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    // for email change
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailForm, setEmailForm] = useState({
        currentEmail: "",
        currentPassword: "",
        newEmail: "",
    });
    const [emailVerified, setEmailVerified] = useState(false);
    const [emailErrors, setEmailErrors] = useState({});
    const [localEmailLoading, setLocalEmailLoading] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const openProfilePhotoModal = () => {
        setIsProfileModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeProfilePhotoModal = () => {
        setIsProfileModalOpen(false);
        document.body.style.overflow = 'unset';
    };

    const validateFile = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Only JPG, PNG, and WEBP images are allowed');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit');
        }
    };
    // for updating profile image  
    const handleImageUpload = async (file) => {
        if (!file) return;

        try {
            setLocalLoading(true);

            //  1. Spinner while getting URL 
            Swal.fire({
                title: 'Preparing upload…',
                html: `
                <div class="flex justify-center py-4">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
            });

            validateFile(file);
            const userToken = await currentUser.getIdToken();
            const oldKey = profile?.profileImagePath || null;

            const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/superadmin/avatar/upload-url/${currentUser.uid}?fileType=${file.type}&fileName=${file.name}`
                : `${VITE_DOMAIN_PROD}/api/superadmin/avatar/upload-url/${currentUser.uid}?fileType=${file.type}&fileName=${file.name}`;

            const urlResponse = await fetch(uploadUrlEndpoint, {
                headers: { Authorization: 'Bearer ' + userToken }
            });
            if (!urlResponse.ok) {
                throw new Error('Failed to get upload URL');
            }
            const { signedUrl, key: newKey } = await urlResponse.json();
            // 2. Progress bar during actual upload 
            Swal.close();
            Swal.fire({
                title: 'Uploading…',
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

            //  Upload to R2 with progress 
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signedUrl);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (e) => {
                    if (!e.lengthComputable) return;
                    const percent = Math.round((e.loaded / e.total) * 100);
                    document.getElementById('upload-bar').style.width = `${percent}%`;
                    document.getElementById('upload-percent').innerText = `${percent}% Complete`;
                    document.getElementById('uploaded-size').innerText = `${(e.loaded / 1024).toFixed(1)}KB`;
                };

                xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(file);
            });

            //  Finalize: update profile & close 
            const updateEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/superadmin/avatar/update/${currentUser.uid}`
                : `${VITE_DOMAIN_PROD}/api/superadmin/avatar/update/${currentUser.uid}`;

            const updateResponse = await fetch(updateEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + userToken
                },
                body: JSON.stringify({ newKey, oldKey })
            });
            if (!updateResponse.ok) throw new Error('Failed to update profile');

            const { profileImage, profileImagePath, updatedAt } = await updateResponse.json();
            setProfile(prev => ({ ...prev, profileImage, profileImagePath, updatedAt }));

            Swal.fire({
                icon: 'success',
                title: 'Upload Successful!',
                timer: 1500,
                showConfirmButton: false
            });
        }
        catch (err) {
            console.error('Upload Error:', err);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: err.message
            });
        }
        finally {
            setLocalLoading(false);
        }
    };
    const handleDeleteImage = async () => {
        try {
            // 1. Check if there’s an image to delete
            const oldKey = profile?.profileImagePath || null;
            if (!oldKey) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'No Image Found',
                    text: 'There is no profile image to delete',
                });
            }

            // 2. Ask the user to confirm
            const result = await Swal.fire({
                title: 'Delete Image?',
                text: "This action cannot be undone!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
            });
            if (!result.isConfirmed) return;

            setLocalLoading(true);

            // 3. Show spinner while deleting
            Swal.fire({
                title: 'Deleting image…',
                html: `
        <div class="flex justify-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      `,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
            });

            // 4. Perform the DELETE call
            const userToken = await currentUser.getIdToken();
            const url = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/superadmin/avatar/${currentUser.uid}`
                : `${VITE_DOMAIN_PROD}/api/superadmin/avatar/${currentUser.uid}`;

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

            // 5. Update local state
            setProfile(prev => ({
                ...prev,
                profileImage: null,
                profileImagePath: null
            }));

            // 6. Show success
            Swal.fire({
                icon: 'success',
                title: 'Image Deleted!',
                timer: 1500,
                showConfirmButton: false
            });
        }
        catch (err) {
            console.error('Delete error:', err);
            Swal.close();  // ensure the spinner modal is closed
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Could not delete image',
            });
        }
        finally {
            setLocalLoading(false);
        }
    };

    // for updating profile data
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
    // for email 
    const handleEmailVerify = async () => {
        try {
            setLocalEmailLoading(true);
            const user = auth.currentUser;

            // Check if current email matches
            if (user.email !== emailForm.currentEmail) {
                throw new Error("Current email does not match logged-in user");
            }

            // Reauthenticate user
            const credential = EmailAuthProvider.credential(
                emailForm.currentEmail,
                emailForm.currentPassword
            );
            await reauthenticateWithCredential(user, credential);

            // Check if current email is verified
            if (!user.emailVerified) {
                // Send verification to CURRENT email first
                await sendEmailVerification(user);
                throw new Error("current-email-not-verified");
            }

            setEmailVerified(true);
            Swal.fire({
                icon: "success",
                title: "Credentials Verified!",
                text: "You may now enter your new email address.",
                showConfirmButton: false,
                timer: 1500,
            });
        } catch (err) {
            if (err.message === "current-email-not-verified") {
                Swal.fire({
                    icon: "warning",
                    title: "Verify Current Email First",
                    html: `We've sent a verification link to <b>${emailForm.currentEmail}</b>. 
                       Please verify your current email before changing it.`,
                    showConfirmButton: true,
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Verification Failed",
                    text: err.message || "Current email/password is incorrect",
                });
            }
        } finally {
            setLocalEmailLoading(false);
        }
    };
    const handleEmailChange = async () => {
        const errors = {};
        if (!emailForm.newEmail) {
            errors.newEmail = "New email is required";
        } else if (!validateEmail(emailForm.newEmail)) {
            errors.newEmail = "Invalid email format";
        }
        setEmailErrors(errors);

        if (Object.keys(errors).length) return;

        try {
            setLocalEmailLoading(true);
            const user = auth.currentUser;

            // Check if current email is verified
            if (!user.emailVerified) {
                throw new Error("Please verify your current email first");
            }

            await updateEmail(user, emailForm.newEmail);
            await sendEmailVerification(user);

            Swal.fire({
                icon: "success",
                title: "Check Your New Email!",
                html: `We've sent a verification link to <b>${emailForm.newEmail}</b>. 
                   Please verify your new email to complete the update.`,
                showConfirmButton: true,
            });

            // Reset state
            setEmailForm({ currentEmail: "", currentPassword: "", newEmail: "" });
            setEmailVerified(false);
            setEmailErrors({});
            setShowEmailModal(false);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Update Failed",
                text: err.message || "Unable to update email",
            });
        } finally {
            setLocalEmailLoading(false);
        }
    };

    // Validate email format (simple regex)
    const validateEmail = (email) => {
        const re =
            /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        return re.test(email);
    };
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative group">
                        <div
                            className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:border-white/40 hover:shadow-xl hover:scale-105 z-10"
                            onClick={openProfilePhotoModal}
                        >
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
                                disabled={true}
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
                                label="Experience"
                                value={profile.experience || ""}
                                type="date"
                                onChange={e => setProfile({ ...profile, experience: e.target.value })}
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
                        <div className="bg-gray-50 rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">Email</h3>
                                    <p className="text-sm text-gray-600">
                                        Currently: {auth.currentUser?.email || "Not set"}
                                    </p>
                                </div>
                                {/* <button
                                    type="button"
                                    onClick={() => {
                                        setShowEmailModal(true);
                                        setEmailForm({
                                            currentEmail: auth.currentUser?.email || "",
                                            currentPassword: "",
                                            newEmail: "",
                                        });
                                        setEmailVerified(false);
                                        setEmailErrors({});
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                >
                                    <Mail size={16} />
                                    Change Email
                                </button> */}
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
            {showEmailModal && (
                <EmailModal
                    emailForm={emailForm}
                    localLoading={localEmailLoading}
                    emailVerified={emailVerified}
                    emailErrors={emailErrors}
                    setShowEmailModal={setShowEmailModal}
                    setEmailVerified={setEmailVerified}
                    setEmailErrors={setEmailErrors}
                    setEmailForm={setEmailForm}
                    handleEmailVerify={handleEmailVerify}
                    handleEmailChange={handleEmailChange}
                />
            )}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute rounded-md bg-clip-padding backdrop-filter  border border-gray-100  inset-0 z-10 flex items-center justify-center px-4 sm:px-6 md:px-8 backdrop-blur-sm "
                        onClick={closeProfilePhotoModal}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative z-50 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300 ">
                        {/* Close Button */}
                        <button
                            onClick={closeProfilePhotoModal}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200 hover:scale-110"
                        >
                            <X size={20} />
                        </button>

                        {/* Profile Photo */}
                        <div className="flex flex-col items-center">
                            <div className="relative mb-6">
                                {/* Photo Container */}
                                <div className="relative w-96 h-96 rounded-full overflow-hidden border-2 border-white/30 shadow-xl">
                                    {profile.profileImage ? (
                                        <img
                                            src={profile.profileImage}
                                            className="w-full h-full object-cover"
                                            alt="Profile"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                            <User size={64} className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Shine Effect */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
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

export default SuperAdminProfile;

