import React, { useState, useEffect } from 'react';
import { Upload, Plus, Edit, Trash, Save, AlertCircle, Palette, RefreshCw } from 'lucide-react';
import Swal from "sweetalert2";
import { useAuth } from '../../../../contexts/AuthContext';
import { useInstitution } from "../../../../contexts/InstitutionContext";
import { auth, db } from '../../../../config/firebase';
import { useTheme } from '../../../../contexts/ThemeContext';
import AdmissionQR from "./AdmissionQR"

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const CollegeSettings = ({ college, setCollege }) => {
    const { school: c, refresh } = useInstitution();
    const { userData, currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('basic');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    // State for each section
    const [basicInfo, setBasicInfo] = useState({
        collegeName: college.collegeName || "",
        academicYear: college.academicYear || "",
        email: college.email || "",
        mobile: college.mobile || ""
    });

    const [location, setLocation] = useState({
        state: college.location?.state || "",
        district: college.location?.district || "",
        taluka: college.location?.taluka || "",
        landmark: college.location?.landmark || "",
        pincode: college.location?.pincode || ""
    });

    const [academicSettings, setAcademicSettings] = useState({
        feeIdCount: college.feeIdCount || 0,
        tuitionReceiptCount: college.tuitionReceiptCount || 0,
        courses: college.courses || []
    });

    const [additionalInfo, setAdditionalInfo] = useState({
        collegeReceiptHeader: college.collegeReceiptHeader || ""
    });
    const [brandColors, setBrandColors] = useState(college.brandColors || {
        primary: "#1e40af",
        secondary: "#374151",
        accent: "#059669",
        surface: "#f8fafc",
        text: "#1f2937"
    });
    const { applyTheme } = useTheme()
    const [newCourse, setNewCourse] = useState("");
    const [editingCourse, setEditingCourse] = useState(null);
    const [uploading, setUploading] = useState(false);

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    useEffect(() => {
        // Update state when college prop changes
        setBasicInfo({
            collegeName: college.collegeName || "",
            academicYear: college.academicYear || "",
            email: college.email || "",
            mobile: college.mobile || ""
        });

        setLocation({
            state: college.location?.state || "",
            district: college.location?.district || "",
            taluka: college.location?.taluka || "",
            landmark: college.location?.landmark || "",
            pincode: college.location?.pincode || ""
        });

        setAcademicSettings({
            feeIdCount: college.feeIdCount || 0,
            tuitionReceiptCount: college.tuitionReceiptCount || 0,
            courses: college.courses || []
        });

        setAdditionalInfo({
            collegeReceiptHeader: college.collegeReceiptHeader || ""
        });
    }, [college]);

    const validateFile = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Only JPG, PNG, and WEBP images are allowed');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit');
        }
    };

    const saveSection = async (section, data) => {
        setSaving(true);
        let userToken;
        try {
            userToken = await auth.currentUser.getIdToken();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Could not get user token. Please log in again.'
            });
            setSaving(false);
            return;
        }

        try {
            const endpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/college/${section}/${c.id}`
                : `${VITE_DOMAIN_PROD}/api/college/${section}/${c.id}`;
            console.log(endpoint)
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update college details');
            }

            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'Changes have been updated successfully.',
                timer: 1500,
                showConfirmButton: false
            });
            // Refresh college data
            refresh();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: err.message
            });
        } finally {
            setSaving(false);
        }
    };

    // Section handlers
    const handleSaveBasicInfo = (e) => {
        e.preventDefault();
        // Validation
        const academicYearPattern = /^\d{2}-\d{2}$/;
        const mobilePattern = /^\d{10}$/;

        if (basicInfo.academicYear.trim() !== '' && !academicYearPattern.test(basicInfo.academicYear)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid Academic Year',
                text: 'Please enter valid academic year: 24-25, 25-26, etc.'
            });
        }

        if (basicInfo.mobile && basicInfo.mobile.trim() !== '' && !mobilePattern.test(basicInfo.mobile)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Please enter a 10-digit mobile number.'
            });
        }

        saveSection('basic', basicInfo);
    };

    const handleSaveLocation = (e) => {
        e.preventDefault();

        // Validate required fields
        if (!location.state || !location.district || !location.taluka || !location.landmark || !location.pincode) {
            return Swal.fire({
                icon: 'error',
                title: 'Missing Information',
                text: 'Please fill all location fields.'
            });
        }

        saveSection('location', location);
    };

    const handleSaveAcademic = (e) => {
        e.preventDefault();

        // Validate courses
        if (academicSettings.courses.length === 0) {
            return Swal.fire({
                icon: 'error',
                title: 'No Courses',
                text: 'Please add at least one course.'
            });
        }

        saveSection('academic', academicSettings);
    };

    const handleSaveAdditional = (e) => {
        e.preventDefault();
        saveSection('additional', additionalInfo);
    };
    const handleSaveBrandColors = async () => {
        setSaving(true);

        try {
            const userToken = await auth.currentUser.getIdToken();
            const endpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/college/brand-color/${c.id}`
                : `${VITE_DOMAIN_PROD}/api/college/brand-color/${c.id}`;

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify({ brandColors })
            });

            if (!res.ok) throw new Error('Failed to save brand colors');

            // Update local state and apply theme immediately
            setCollege(prev => ({
                ...prev,
                brandColors
            }));

            // Apply theme to CSS variables immediately
            applyTheme(brandColors);

            Swal.fire({
                icon: 'success',
                title: 'Brand Colors Updated!',
                text: 'Theme applied successfully',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: error.message
            });
        } finally {
            setSaving(false);
        }
    };
    // Course management
    const handleAddCourse = () => {
        if (!newCourse.trim()) return;

        setAcademicSettings(prev => ({
            ...prev,
            courses: [...prev.courses, newCourse.trim()]
        }));
        setNewCourse("");
    };

    const handleEditCourse = (index) => {
        setEditingCourse(index);
        setNewCourse(academicSettings.courses[index]);
    };

    const handleSaveCourseEdit = () => {
        if (!newCourse.trim() || editingCourse === null) return;

        const updatedCourses = [...academicSettings.courses];
        updatedCourses[editingCourse] = newCourse.trim();

        setAcademicSettings(prev => ({
            ...prev,
            courses: updatedCourses
        }));

        setEditingCourse(null);
        setNewCourse("");
    };

    const handleDeleteCourse = (index) => {
        Swal.fire({
            title: 'Delete Course?',
            text: `Are you sure you want to delete "${academicSettings.courses[index]}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                setAcademicSettings(prev => ({
                    ...prev,
                    courses: prev.courses.filter((_, i) => i !== index)
                }));
            }
        });
    };

    // Logo upload
    const handleLogoUpload = async (file) => {
        if (!file) return;
        let uploadBarModal;
        try {
            setUploading(true);
            // 1. Show a spinner while we request the signed URL
            uploadBarModal = Swal.fire({
                title: 'Preparing upload…',
                html: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
            });

            const userToken = await currentUser.getIdToken();
            validateFile(file);

            const oldKey = c.logoImagePath || null;
            const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/college/logo/upload-url/${c.id}?fileType=${file.type}&fileName=${file.name}`
                : `${VITE_DOMAIN_PROD}/api/college/logo/upload-url/${c.id}?fileType=${file.type}&fileName=${file.name}`;

            const urlResponse = await fetch(uploadUrlEndpoint, {
                headers: { Authorization: 'Bearer ' + userToken }
            });

            if (!urlResponse.ok) {
                throw new Error('Failed to get upload URL');
            }

            const { signedUrl, key: newKey } = await urlResponse.json();

            // 2. Close the spinner modal and open the progress‐bar modal
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
            // 3. Perform the actual PUT upload with progress
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signedUrl);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (!event.lengthComputable) return;
                    const percent = Math.round((event.loaded / event.total) * 100);
                    document.getElementById('upload-bar').style.width = `${percent}%`;
                    document.getElementById('upload-percent').innerText = `${percent}% Complete`;
                    document.getElementById('uploaded-size').innerText = `${(event.loaded / 1024).toFixed(1)}KB`;
                };

                xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`)));
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(file);
            });

            // 4. Update Firestore & cleanup
            const updateEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/college/logo/update/${c.id}`
                : `${VITE_DOMAIN_PROD}/api/college/logo/update/${c.id}`;
            const response = await fetch(updateEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + userToken
                },
                body: JSON.stringify({ newKey, oldKey })
            });
            if (!response.ok) throw new Error('Failed to update profile');
            const { logoImage, logoImagePath, updatedAt } = await response.json();
            setCollege(prev => ({ ...prev, logoImage, logoImagePath, updatedAt }));

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
            setUploading(false);
        }
    };

    // Tab navigation
    const tabs = [
        { id: 'admissionQR', label: 'Admission QR' },
        { id: 'basic', label: 'Basic Information' },
        { id: 'location', label: 'Location' },
        { id: 'academic', label: 'Academic Structure' },
        { id: 'additional', label: 'Additional Info' },
        { id: 'branding', label: 'Branding' }
    ];

    // extra
    // Professional color presets for college management
    const colorPresets = [
        {
            name: "Corporate Blue",
            colors: {
                primary: "#1e40af", // Blue-700
                secondary: "#374151", // Gray-700
                accent: "#059669", // Emerald-600
                surface: "#f8fafc", // Slate-50
                text: "#1f2937" // Gray-800
            }
        },
        {
            name: "Academic Green",
            colors: {
                primary: "#047857", // Emerald-700
                secondary: "#4b5563", // Gray-600
                accent: "#dc2626", // Red-600
                surface: "#f0fdf4", // Green-50
                text: "#1f2937"
            }
        },
        {
            name: "Professional Navy",
            colors: {
                primary: "#1e3a8a", // Blue-800
                secondary: "#6b7280", // Gray-500
                accent: "#f59e0b", // Amber-500
                surface: "#f1f5f9", // Slate-100
                text: "#0f172a" // Slate-900
            }
        },
        {
            name: "Modern Teal",
            colors: {
                primary: "#0f766e", // Teal-700
                secondary: "#374151", // Gray-700
                accent: "#dc2626", // Red-600
                surface: "#f0fdfa", // Teal-50
                text: "#1f2937"
            }
        },
        {
            name: "Executive Dark",
            colors: {
                primary: "#0369a1", // Sky-700
                secondary: "#1f2937", // Gray-800
                accent: "#ea580c", // Orange-600
                surface: "#f9fafb", // Gray-50
                text: "#111827" // Gray-900
            }
        }
    ];
    const applyPreset = (preset) => {
        setBrandColors(preset.colors);
    };

    return (
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex overflow-x-auto py-2 px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                                ? 'text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {/* Basic Information Tab */}
                {activeTab === 'admissionQR' && (
                    <AdmissionQR />
                )}
                {activeTab === 'basic' && (
                    <>
                        <form onSubmit={handleSaveBasicInfo} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        College Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        disabled={userData.privilege?.toLowerCase() === "read"}
                                        type="text"
                                        value={basicInfo.collegeName}
                                        onChange={(e) => setBasicInfo({ ...basicInfo, collegeName: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                        placeholder="Enter college name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Academic Year <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        disabled={userData.privilege?.toLowerCase() === "read"}
                                        type="text"
                                        value={basicInfo.academicYear}
                                        onChange={(e) => setBasicInfo({ ...basicInfo, academicYear: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                        placeholder="e.g., 24-25"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        College Email
                                    </label>
                                    <input
                                        disabled={userData.privilege?.toLowerCase() === "read"}
                                        type="email"
                                        value={basicInfo.email}
                                        onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                        placeholder="contact@college.edu"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        College Mobile
                                    </label>
                                    <input
                                        disabled={userData.privilege?.toLowerCase() === "read"}
                                        type="tel"
                                        value={basicInfo.mobile}
                                        onChange={(e) => setBasicInfo({ ...basicInfo, mobile: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                        placeholder="9822841280"
                                        pattern="\d{10}"
                                    />
                                </div>
                            </div>

                            {userData.privilege?.toLowerCase() === "both" && (
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium text-sm flex items-center"
                                    >
                                        <Save size={18} className="mr-2" />
                                        {saving ? 'Saving...' : 'Save Basic Info'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </>)}
                {/* Location Tab */}
                {activeTab === 'location' && (
                    <form onSubmit={handleSaveLocation} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    State <span className="text-red-500">*</span>
                                </label>
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="text"
                                    value={location.state}
                                    onChange={(e) => setLocation({ ...location, state: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    District <span className="text-red-500">*</span>
                                </label>
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="text"
                                    value={location.district}
                                    onChange={(e) => setLocation({ ...location, district: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Taluka <span className="text-red-500">*</span>
                                </label>
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="text"
                                    value={location.taluka}
                                    onChange={(e) => setLocation({ ...location, taluka: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Landmark <span className="text-red-500">*</span>
                                </label>
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="text"
                                    value={location.landmark}
                                    onChange={(e) => setLocation({ ...location, landmark: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Pincode <span className="text-red-500">*</span>
                                </label>
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="text"
                                    value={location.pincode}
                                    onChange={(e) => setLocation({ ...location, pincode: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {userData.privilege?.toLowerCase() === "both" && (
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium text-sm flex items-center"
                                >
                                    <Save size={18} className="mr-2" />
                                    {saving ? 'Saving...' : 'Save Location'}
                                </button>
                            </div>
                        )}
                    </form>
                )}

                {/* Academic Structure Tab */}
                {activeTab === 'academic' && (
                    <form onSubmit={handleSaveAcademic} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Student Fee ID
                                </label>
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="number"
                                    min={0}
                                    value={academicSettings.feeIdCount}
                                    onChange={(e) => setAcademicSettings({
                                        ...academicSettings,
                                        feeIdCount: parseInt(e.target.value) || 0
                                    })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tuition Receipt Count
                                </label>
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="number"
                                    min={0}
                                    value={academicSettings.tuitionReceiptCount}
                                    onChange={(e) => setAcademicSettings({
                                        ...academicSettings,
                                        tuitionReceiptCount: parseInt(e.target.value) || 0
                                    })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    College Code
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={college.Code || "N/A"}
                                    className="w-full px-4 py-3 border border-gray-300 bg-gray-50 rounded-lg"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col ">
                                        <div className="flex">
                                            <p className="text-sm font-medium text-gray-700">
                                                Offered Courses
                                            </p>
                                            <div className='flex px-3 gap-1'>
                                                <AlertCircle className='w-3 h-3 text-red-600 my-auto ' />
                                                <span className='text-xs font-medium text-gray-500 leading-0 my-auto'>
                                                    Based on courses admission form will alter.
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">After edit or delete click on "save academic details"</p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {academicSettings.courses.length} courses
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {academicSettings.courses.map((course, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="font-medium uppercase">{course}</span>
                                            {userData.privilege?.toLowerCase() !== "read" && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditCourse(index)}
                                                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-full"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCourse(index)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-full"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex mt-4">
                                        <input
                                            disabled={userData.privilege?.toLowerCase() === "read"}
                                            type="text"
                                            value={newCourse}
                                            onChange={(e) => setNewCourse(e.target.value)}
                                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            placeholder={editingCourse !== null ? "Edit course name" : "Add new course"}
                                        />
                                        <button
                                            type="button"
                                            disabled={userData.privilege?.toLowerCase() === "read" || !newCourse.trim()}
                                            onClick={editingCourse !== null ? handleSaveCourseEdit : handleAddCourse}
                                            className="px-4 bg-purple-600 text-black rounded-r-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center"
                                        >
                                            {editingCourse !== null ? "Save" : <Plus size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {userData.privilege?.toLowerCase() === "both" && (
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium text-sm flex items-center"
                                >
                                    <Save size={18} className="mr-2" />
                                    {saving ? 'Saving...' : 'Save Academic Settings'}
                                </button>
                            </div>
                        )}
                    </form>
                )}

                {/* Additional Info Tab */}
                {activeTab === 'additional' && (
                    <form onSubmit={handleSaveAdditional} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Receipt Header Text
                            </label>
                            <textarea
                                disabled={userData.privilege?.toLowerCase() === "read"}
                                value={additionalInfo.collegeReceiptHeader}
                                onChange={(e) => setAdditionalInfo({
                                    ...additionalInfo,
                                    collegeReceiptHeader: e.target.value
                                })}
                                rows="3"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                placeholder="Enter header text for receipts"
                            ></textarea>
                            <p className="mt-1 text-sm text-gray-500">
                                This text will appear at the top of all college receipts
                            </p>
                        </div>

                        {userData.privilege?.toLowerCase() === "both" && (
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium text-sm flex items-center"
                                >
                                    <Save size={18} className="mr-2" />
                                    {saving ? 'Saving...' : 'Save Additional Info'}
                                </button>
                            </div>
                        )}
                    </form>
                )}

                {/* Branding Tab */}
                {activeTab === 'branding' && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-start gap-6">
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-3">College Logo</label>
                                <div className="flex items-center gap-6">
                                    <div className={`relative ${!college.logoImage ? 'bg-gray-50' : ''} border-2 border-dashed border-gray-300 rounded-xl p-4 w-32 h-32 flex items-center justify-center transition-colors hover:border-purple-500`}>
                                        {college.logoImage && college.logoImagePath ? (
                                            <img
                                                src={college.logoImage}
                                                className="w-full h-full object-contain"
                                                alt="College Logo"
                                            />
                                        ) : (
                                            <div className="text-center">
                                                <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                                                <span className="text-xs text-gray-500">Upload Logo</span>
                                            </div>
                                        )}
                                        <input
                                            disabled={userData.privilege?.toLowerCase() === "read" || uploading}
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => handleLogoUpload(e.target.files[0])}
                                            accept="image/*"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">
                                            Recommended size: 200x200px<br />
                                            Max file size: 5MB<br />
                                            Formats: PNG, JPG, WEBP
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-gray-200">
                            <div className="flex items-center mb-4">
                                <Palette className="w-5 h-5 text-primary mr-2" />
                                <h3 className="text-lg font-semibold text-text">Brand Colors & Theme</h3>
                            </div>

                            {/* Color Presets */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-secondary mb-3">Quick Presets</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {colorPresets.map((preset, index) => (
                                        <div
                                            key={index}
                                            className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors"
                                            onClick={() => applyPreset(preset)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-text">{preset.name}</span>
                                                <div className="flex space-x-1">
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-white shadow-sm"
                                                        style={{ backgroundColor: preset.colors.primary }}
                                                    />
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-white shadow-sm"
                                                        style={{ backgroundColor: preset.colors.accent }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Color Pickers */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-secondary mb-3">Custom Colors</h4>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {Object.keys(brandColors).map((colorType) => (
                                        <div key={colorType} className="flex flex-col items-center">
                                            <label className="block text-xs font-medium text-secondary mb-2 capitalize">
                                                {colorType}
                                            </label>

                                            <div className="relative">
                                                <div
                                                    className="w-16 h-16 rounded-xl border-2 border-white shadow-lg cursor-pointer hover:scale-105 transition-transform"
                                                    style={{ backgroundColor: brandColors[colorType] }}
                                                    onClick={() => document.getElementById(`${colorType}-picker`).click()}
                                                />

                                                <input
                                                    id={`${colorType}-picker`}
                                                    type="color"
                                                    value={brandColors[colorType]}
                                                    onChange={(e) => setBrandColors(prev => ({
                                                        ...prev,
                                                        [colorType]: e.target.value
                                                    }))}
                                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </div>

                                            <span className="mt-2 text-xs text-secondary font-mono">
                                                {brandColors[colorType]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview Section */}
                            <div className="mb-6 p-4 bg-surface rounded-lg border">
                                <h4 className="text-sm font-medium text-secondary mb-3">Theme Preview</h4>
                                <div className="space-y-3">
                                    <div className="flex space-x-3">
                                        <button className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium">
                                            Primary Button
                                        </button>
                                        <button className="px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium">
                                            Accent Button
                                        </button>
                                        <button className="px-4 py-2 bg-secondary text-black rounded-lg text-sm font-medium">
                                            Secondary Button
                                        </button>
                                    </div>
                                    <div className="p-3 bg-surface border rounded-lg">
                                        <p className="text-text font-medium">Sample Text Content</p>
                                        <p className="text-secondary text-sm">This is how your theme will look across the application.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveBrandColors}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium text-sm flex items-center"
                                >
                                    {saving ? (
                                        <RefreshCw size={18} className="mr-2 animate-spin" />
                                    ) : (
                                        <Save size={18} className="mr-2" />
                                    )}
                                    {saving ? 'Applying Theme...' : 'Save & Apply Theme'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollegeSettings;