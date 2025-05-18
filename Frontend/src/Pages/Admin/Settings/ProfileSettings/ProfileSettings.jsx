import React, { useState } from 'react';
import { Upload, Trash2, Loader, User } from 'lucide-react';
import Swal from "sweetalert2";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth } from '../../../../config/firebase'; // Ensure auth is imported correctly

const ProfileSettings = ({ profile, setProfile, handleProfileUpdate, onImageUpload, loading }) => {
    const [localLoading, setLocalLoading] = useState(false);
    const [changePassword, setChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordVerified, setPasswordVerified] = useState(false);

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

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLocalLoading(true);
            await onImageUpload(file);
            Swal.fire({
                icon: 'success',
                title: 'Image Updated!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: err.message || 'Failed to upload image'
            });
        } finally {
            setLocalLoading(false);
        }
    };

    const handlePasswordVerify = async () => {
        try {
            setLocalLoading(true);
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
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

    const handleChangePassword = async () => {
        try {
            setLocalLoading(true);
            const user = auth.currentUser;
            await updatePassword(user, newPassword);
            Swal.fire({
                icon: 'success',
                title: 'Password Updated!',
                showConfirmButton: false,
                timer: 1500
            });
            // Reset fields
            setChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setPasswordVerified(false);
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: err.message || 'Failed to update password'
            });
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3">
                    <div className="relative group">
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-purple-100">
                            {profile.profileImage ? (
                                <img
                                    src={profile.profileImage}
                                    className="w-full h-full object-cover"
                                    alt="Profile"
                                />
                            ) : (
                                <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                                    <User size={48} className="text-purple-600" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 justify-center mt-4">
                            <label className="cursor-pointer px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors">
                                {localLoading ? (
                                    <Loader size={16} className="animate-spin mr-2 inline" />
                                ) : (
                                    <Upload size={16} className="mr-2 inline" />
                                )}
                                Upload
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    disabled={localLoading}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 space-y-4">
                    <FormField
                        label="Name"
                        value={profile.name || ''}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        required
                    />

                    <FormField
                        label="Email"
                        value={profile.email || ''}
                        type="email"
                        disabled
                    />

                    <FormField
                        label="Phone"
                        value={profile.phone || ''}
                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                        type="tel"
                    />

                    <button
                        type="submit"
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                        disabled={localLoading}
                    >
                        {localLoading ? (
                            <Loader size={20} className="animate-spin mr-2" />
                        ) : 'Save Changes'}
                    </button>

                    {/* Change Password Section */}
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={() => setChangePassword(!changePassword)}
                            className="text-blue-600 hover:underline"
                        >
                            {changePassword ? "Cancel Password Change" : "Change Password"}
                        </button>

                        {changePassword && (
                            <div className="mt-4 space-y-3">
                                {!passwordVerified && (
                                    <>
                                        <FormField
                                            label="Current Password"
                                            value={currentPassword}
                                            type="password"
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePasswordVerify}
                                            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                                            disabled={localLoading}
                                        >
                                            {localLoading ? <Loader size={16} className="animate-spin inline" /> : "Verify Password"}
                                        </button>
                                    </>
                                )}

                                {passwordVerified && (
                                    <>
                                        <FormField
                                            label="New Password"
                                            value={newPassword}
                                            type="password"
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleChangePassword}
                                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                            disabled={localLoading}
                                        >
                                            {localLoading ? <Loader size={16} className="animate-spin inline" /> : "Update Password"}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

const FormField = ({ label, value, onChange, type = 'text', required, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            className={`w-full p-2 border rounded-lg focus:ring-2 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-purple-500'
                }`}
            required={required}
            disabled={disabled}
        />
    </div>
);

export default ProfileSettings;

