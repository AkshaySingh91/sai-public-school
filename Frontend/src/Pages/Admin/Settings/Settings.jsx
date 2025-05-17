import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { User, School, Upload, Trash2 } from 'lucide-react';
import { auth } from '../../../config/firebase'
import Swal from "sweetalert2"
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

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
                    fetch('http://localhost:5000/admin/settings/profile', {
                        headers: {
                            'Authorization': `Bearer ${userToken}`
                        }
                    }),
                    fetch('http://localhost:5000/admin/settings/school', {
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
            const response = await fetch('http://localhost:5000/admin/settings/profile', {
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

            const response = await fetch('http://localhost:5000/admin/settings/upload-profile', {
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
    const { userData } = useAuth();
    const [logoFile, setLogoFile] = useState(null);
    const [div, setDiv] = useState(school?.divisions?.length ? school.divisions.reduce((acc, c) => (acc + `${c}, `), "").trim() : "")
    const [logoUrl, setLogoUrl] = useState(false);
    const [classes, setClasses] = useState(school?.class?.length ? school.class.reduce((acc, c) => (acc + `${c}, `), "").trim() : "")
    const [academicYear, setAcademicYear] = useState(school.academicYear);

    const checkIfClassFeeStructurePresent = async (newClass) => {
        try {
            const fsRef = doc(db, "feeStructures", userData.schoolCode);
            const fsSnap = await getDoc(fsRef);
            if (!fsSnap.exists()) {
                console.error("Fee structure document not found");
                return false
            }

            const structures = fsSnap.data().structures || [];
            let yearStructure = false;

            // Fallback to latest available structure if target year not found
            if (!yearStructure && structures.length > 0) {
                // Sort structures by academic year in descending order
                const sortedStructures = [...structures].sort((a, b) => {
                    // Extract starting year from academic year format "YY-YY"
                    const getStartYear = (year) => {
                        const [start] = year?.split("-") || ["00"];
                        return parseInt(start) || 0;
                    };

                    return getStartYear(b.year) - getStartYear(a.year);
                });

                yearStructure = sortedStructures[0];
                console.warn(
                    `Using latest available structure for ${yearStructure.year}`
                );
            }

            if (!yearStructure) {
                console.warn("No fee structures available");
                return false;
            }

            const classStructure = yearStructure.classes?.find(
                (c) => c.name?.trim().toLowerCase() === newClass.trim().toLowerCase()
            );

            if (!classStructure) {
                console.warn(`No fee structure found for class ${newClass}`);
                return false
            }
            return true;
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message
            })
            return false;
        }
    }
    const handleSubmit = async (e) => {
        e.preventDefault();

        const validPattern = /^(\s*[^,\s][^,]*\s*)(,\s*[^,\s][^,]*\s*)*$/;
        const academicYearPattern = /^\d{2}-\d{2}$/;
        if (div.trim() !== '' && !validPattern.test(div)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid input',
                text: 'Please enter comma-separated values like: A, B, C, etc.'
            });
        }
        if (classes.trim() !== '' && !validPattern.test(classes)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid input',
                text: 'Please enter comma-separated values like: Nursery, JRKG, 1st, 2nd, 3rd, etc.'
            });
        }
        if (academicYear.trim() !== '' && !academicYearPattern.test(academicYear)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid input',
                text: 'Please enter valid academic year: 24-25,25-26, etc.'
            });
        }

        const divisionArr = div
            .split(',')
            .filter(s => s.trim())
            .map(s => s.trim());
        const classArr = classes
            .split(',')
            .filter(s => s.trim())
            .map(s => s.trim());

        const results = await Promise.all(
            classArr.map(c => checkIfClassFeeStructurePresent(c))
        );
        const isClassPresentInFeeStructure = results.every(result => result === true);
        if (!isClassPresentInFeeStructure) {
            return Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Class not present in fee structure. Please add class in fee structure first.'
            });
        }
        const updatedSchool = { ...school, divisions: divisionArr, class: classArr, academicYear };

        let userToken;
        try {
            userToken = await auth.currentUser.getIdToken();
        } catch (err) {
            return Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Could not get user token. Please log in again.'
            });
        }
        Swal.fire({
            title: 'Saving school details…',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        try {
            // 1) Update the school details
            const resDetails = await fetch('http://localhost:5000/admin/settings/school', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify(updatedSchool)
            });

            if (!resDetails.ok) {
                const errorData = await resDetails.json();
                throw new Error(errorData.error || 'Failed to update school details');
            }

            // 2) If there's a new logo, upload it
            if (logoFile) {
                const formData = new FormData();
                formData.append('logo', logoFile);

                const resLogo = await fetch('http://localhost:5000/admin/settings/school/logo', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${userToken}`
                    },
                    body: formData
                });

                if (!resLogo.ok) {
                    const errorData = await resLogo.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to upload logo');
                }
            }

            // If we reach here, everything succeeded
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'School details have been updated successfully.'
            });

        } catch (err) {
            // Replace the loading modal with an error modal
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: err.message
            });
        }
    };

    const handleDiv = (e) => {
        e.preventDefault();
        if (e.target.value.trim()) {
            setDiv(e.target.value.trim())
        }
    }
    const handleClasses = (e) => {
        e.preventDefault();
        if (e.target.value.trim()) {
            setClasses(e.target.value.trim())
        }
    }
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoUrl(reader.result);
            };
            reader.readAsDataURL(file);
            setLogoFile(e.target.files[0])
        }
    }
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
            <div className="school-academic-year">
                <label className="block text-sm font-medium text-gray-700 mb-1">School Academic Year</label>
                <input
                    type="text"
                    value={academicYear || ''}
                    onChange={(e) => setAcademicYear(e.target.value)}
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
            <div className="update-div">
                <label className="block text-sm font-medium text-gray-700 mb-1">All Divisions</label>
                <input type="text"
                    value={div}
                    onChange={handleDiv}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>
            <div className="update-div">
                <label className="block text-sm font-medium text-gray-700 mb-1">All Classes, this should be in order eg; SRKG, 1st, 2nd</label>

                <input type="text"
                    value={classes}
                    onChange={handleClasses}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Logo</label>
                <div className="flex items-center gap-4">
                    {logoUrl ? (
                        <img src={logoUrl} className="w-20 h-20 object-contain" alt="School Logo" />
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
                                onChange={handleLogoUpload}
                                accept="image/*"
                                disabled={false}
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