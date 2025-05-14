import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { User, School, Upload, Trash2 } from 'lucide-react';
import { auth } from '../../../config/firebase'

const Settings = () => {
    const { currentUser, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState({});
    const [school, setSchool] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get the authenticated user
                const user = auth.currentUser;
                console.log({ user })
                if (!user) {
                    throw new Error('User not authenticated');
                }

                const userToken = await user.getIdToken();

                const [profileRes, schoolRes] = await Promise.all([
                    fetch('http://localhost:5000/api/settings/profile', {
                        headers: {
                            'Authorization': `Bearer ${userToken}`
                        }
                    }),
                    fetch('http://localhost:5000/api/settings/school', {
                        headers: {
                            'Authorization': `Bearer ${userToken}`
                        }
                    })
                ]);

                // Handle HTTP errors
                if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
                if (!schoolRes.ok) throw new Error(`School fetch failed: ${schoolRes.status}`);

                const profileData = await profileRes.json();
                const schoolData = await schoolRes.json();

                setProfile(profileData);
                setSchool(schoolData);
            } catch (err) {
                console.error('Fetch error:', err);
                setError(err.message || 'Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const userToken = await auth.currentUser.getIdToken();
            const response = await fetch('http://localhost:5000/api/settings/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(profile)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedProfile = await response.json();
            updateUser(updatedProfile);
        } catch (err) {
            setError('Failed to update profile');
        }
    };

    const handleImageUpload = async (file) => {
        try {
            const userToken = await auth.currentUser.getIdToken();
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/settings/upload-profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            setProfile(prev => ({ ...prev, profileImage: data.imageUrl }));
        } catch (err) {
            setError('Failed to upload image');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-red-600">{error}</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex gap-4 mb-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'profile'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500'
                        }`}
                >
                    <User size={18} /> Profile Settings
                </button>
                <button
                    onClick={() => setActiveTab('school')}
                    className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'school'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500'
                        }`}
                >
                    <School size={18} /> School Settings
                </button>
            </div>

            {activeTab === 'profile' ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-1/3">
                            <div className="relative group">
                                {profile.profileImage ? (
                                    <img
                                        src={profile.profileImage}
                                        className="w-32 h-32 rounded-full object-cover mx-auto"
                                        alt="Profile"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                                        <User size={48} className="text-purple-600" />
                                    </div>
                                )}
                                <div className="flex gap-2 justify-center mt-4">
                                    <label className="cursor-pointer px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200">
                                        <Upload size={16} className="mr-2 inline" />
                                        Upload
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => handleImageUpload(e.target.files[0])}
                                            accept="image/*"
                                        />
                                    </label>
                                    {profile.profileImage && (
                                        <button
                                            onClick={() => handleImageDelete()}
                                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                        >
                                            <Trash2 size={16} className="mr-2 inline" />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={profile.name || ''}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={profile.email || ''}
                                    disabled
                                    className="w-full p-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={profile.phone || ''}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <SchoolSettings school={school} setSchool={setSchool} />
                </div>
            )}
        </div>
    );
};

const SchoolSettings = ({ school, setSchool }) => {
    const [logoFile, setLogoFile] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userToken = await auth.currentUser.getIdToken();

            // Update school details
            const response = await fetch('http://localhost:5000/api/settings/school', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(school)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update school details');
            }

            const updatedSchool = await response.json();
            setSchool(updatedSchool);

            // Handle logo upload if needed
            if (logoFile) {
                const formData = new FormData();
                formData.append('logo', logoFile);

                const uploadResponse = await fetch('/api/settings/school/logo', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload logo');
                }

                const { logoUrl } = await uploadResponse.json();
                setSchool(prev => ({ ...prev, logoURL: logoUrl }));
            }

            // Show success feedback
            alert('School details updated successfully!');
        } catch (err) {
            console.error('Update error:', err);
            alert(err.message || 'An error occurred during update');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input
                    type="text"
                    value={school.schoolName || ''}
                    onChange={(e) => setSchool({ ...school, schoolName: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>
            <div>
                <h2>School location</h2>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                    type="text"
                    value={school?.location?.state || ''}
                    onChange={(e) => setSchool({ ...school, location: { ...location, state: e.target.value } })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                />
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <input
                    type="text"
                    value={school?.location?.district || ''}
                    onChange={(e) => setSchool({ ...school, location: { ...location, district: e.target.value } })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                />
                <label className="block text-sm font-medium text-gray-700 mb-1">Taluka</label>
                <input
                    type="text"
                    value={school?.location?.taluka || ''}
                    onChange={(e) => setSchool({ ...school, location: { ...location, taluka: e.target.value } })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Logo</label>
                <div className="flex items-center gap-4">
                    {school.logoURL ? (
                        <img src={school.logoURL} className="w-20 h-20 object-contain" alt="School Logo" />
                    ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <School size={32} className="text-gray-400" />
                        </div>
                    )}
                    <div>
                        <label className="cursor-pointer px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200">
                            <Upload size={16} className="mr-2 inline" />
                            Upload Logo
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setLogoFile(e.target.files[0])}
                                accept="image/*"
                                disabled={true}
                            />
                        </label>
                    </div>
                </div>
            </div>
            <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
                Save School Details
            </button>
        </form>
    );
};

export default Settings;