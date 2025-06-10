import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import Swal from "sweetalert2";
import { useAuth } from '../../../../contexts/AuthContext';
import { useInstitution } from "../../../../contexts/InstitutionContext"
import { auth, db } from '../../../../config/firebase'; // Ensure auth is imported correctly
import { doc, getDoc } from "firebase/firestore";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const CollegeSettings = ({ college, setCollege }) => {
    // this college is use to get the college id
    const { school: c, refresh } = useInstitution();
    const { userData, currentUser } = useAuth();

    const [collegeName, setCollegeName] = useState(college.collegeName || "");
    const [academicYear, setAcademicYear] = useState(college.academicYear || "");
    const [collegeLocation, setCollegeLocation] = useState(college.location || {});
    const [courses, setCourses] = useState(college?.courses?.length ? college.courses.reduce((acc, c) => (acc + `${c}, `), "").trim() : "")

    const [collegeReceiptHeader, setCollegeReceiptHeader] = useState(college.collegeReceiptHeader || "")
    const [tuitionReceiptCount, settuitionReceiptCount] = useState(college.tuitionReceiptCount || 0)
    const [feeIdCount, setFeeIdCount] = useState(college.feeIdCount || 0)
    const [collegeEmail, setCollegeEmail] = useState(college.email || "")
    const [collegeMobile, setCollegeMobile] = useState(college.mobile || "")
    // file upload
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const [uploading, setUploading] = useState(false);

    const validateFile = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Only JPG, PNG, and WEBP images are allowed');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit');
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        const validPattern = /^(\s*[^,\s][^,]*\s*)(,\s*[^,\s][^,]*\s*)*$/;
        const academicYearPattern = /^\d{2}-\d{2}$/;
        const mobilePattern = /^\d{10}$/;

        if (courses.trim() !== '' && !validPattern.test(courses)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid input',
                text: 'Please enter comma-separated values like: B.com, BSc, etc.'
            });
        }
        if (academicYear.trim() !== '' && !academicYearPattern.test(academicYear)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid input',
                text: 'Please enter valid academic year: 24-25,25-26, etc.'
            });
        }
        if (collegeMobile && collegeMobile.trim() !== '' && !mobilePattern.test(collegeMobile)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid input',
                text: 'Please enter valid college mobile: 1234567890.'
            });
        }

        const coursesArr = courses
            .split(',')
            .filter(s => s.trim())
            .map(s => s.trim());

        const updatedCollege = {
            ...college,
            collegeName,
            courses: coursesArr,
            academicYear,
            location: collegeLocation,
            feeIdCount,
            collegeReceiptHeader,
            tuitionReceiptCount,
            email: collegeEmail,
            mobile: collegeMobile,
        };

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
            title: 'Saving college details…',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        try {
            // 1) Update the college details
            const resDetails = await
                fetch(VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/college/${c.id}` : `${VITE_DOMAIN_PROD}/api/college/${c.id}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${userToken}`
                        },
                        body: JSON.stringify(updatedCollege)
                    });

            if (!resDetails.ok) {
                const errorData = await resDetails.json();
                throw new Error(errorData.error || 'Failed to update college details');
            }
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'college details have been updated successfully.'
            });
            refresh()
        } catch (err) {
            // Replace the loading modal with an error modal
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: err.message
            });
        }
    };

    const handleCourses = (e) => {
        e.preventDefault();
        if (e.target.value.trim()) {
            setCourses(e.target.value.trim())
        }
    }
    const handleLogoUpload = async (file) => {
        if (!file) return;

        try {
            setUploading(true);
            validateFile(file);

            const userToken = await currentUser.getIdToken();
            const formData = new FormData();
            formData.append('schoolLogo', file);
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
            const url = VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/admin/college/logo/${c.id}` : `${VITE_DOMAIN_PROD}/api/admin/college/logo/${c.id}`

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
            const { metaData } = uploadResult;

            setCollege(prev => ({
                ...prev,
                logoImage: metaData.logoImage,
                logoImagePath: metaData.logoImagePath
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
            setUploading(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
            {/* college Name Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            college Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            value={collegeName || ''}
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setCollegeName()
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            placeholder="Enter college name"
                            required
                        />
                    </div>

                    {/* Academic Year */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Academic Year <span className="text-red-500">*</span>
                        </label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            value={academicYear || ''}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            placeholder="e.g., 2023-2024"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Location Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">college Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State <span className="text-red-500">*</span></label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            value={collegeLocation.state || ''}
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setCollegeLocation({ ...collegeLocation, state: e.target.value })
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">District <span className="text-red-500">*</span></label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setCollegeLocation({ ...collegeLocation, district: e.target.value })
                                }
                            }}
                            value={collegeLocation.district || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Taluka <span className="text-red-500">*</span></label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setCollegeLocation({ ...collegeLocation, taluka: e.target.value })
                                }
                            }}
                            value={collegeLocation.taluka || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Landmark <span className="text-red-500">*</span></label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setCollegeLocation({ ...collegeLocation, landmark: e.target.value })
                                }
                            }}
                            value={collegeLocation.landmark || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PinCode <span className="text-red-500">*</span></label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setCollegeLocation({ ...collegeLocation, pincode: e.target.value })
                                }
                            }}
                            value={collegeLocation.pincode || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Structure</h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last student FeeId
                        </label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="number"
                            value={feeIdCount}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            onChange={(e) => {
                                setFeeIdCount(Number.parseInt(e.target.value.trim()));
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Total tuition Receipt Count
                            </label>
                            <input
                                disabled={userData.privilege?.toLowerCase() === "read"}
                                type="number"
                                value={tuitionReceiptCount}
                                onChange={(e) => {
                                    settuitionReceiptCount(Number.parseInt(e.target.value.trim()))
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            college Code
                        </label>
                        <input
                            type="text"
                            disabled
                            value={college.Code || 0}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize capitalize"
                        />
                    </div>
                    {/* courses */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            All Courses (comma separated, in order)
                        </label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            value={courses}
                            onChange={handleCourses}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize capitalize"
                            placeholder="e.g., B.Sc, B.Ed, etc"
                        />
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Information</h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Header for <span className='font-bold'>college Receipt</span>
                        </label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            value={collegeReceiptHeader}
                            onChange={(e) => {
                                if (e.target.value.trim() !== "") {
                                    setCollegeReceiptHeader(e.target.value)
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            placeholder="college receipt header "
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            College Email
                        </label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            value={collegeEmail}
                            onChange={(e) => {
                                setCollegeEmail(e.target.value)
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            placeholder="eg; demo@gmail.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            College Mobile
                        </label>
                        <input
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            type="text"
                            value={collegeMobile}
                            onChange={(e) => {
                                setCollegeMobile(e.target.value)
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all capitalize"
                            placeholder="eg; 9822841280"
                        />
                    </div>
                </div>
            </div>

            {/* Logo Upload */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">college Branding</h2>
                <div className="flex flex-col items-start gap-6">
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-3">College Logo</label>
                        <div className="flex items-center gap-6">
                            <div className={`relative ${!college.logoImage ? 'bg-gray-50' : ''} border-2 border-dashed border-gray-300 rounded-xl p-4 w-32 h-32 flex items-center justify-center transition-colors hover:border-purple-500`}>
                                {college.logoImage ? (
                                    <img src={college.logoImage} className="w-full h-full object-contain" alt="college Logo" />
                                ) : (
                                    <div className="text-center">
                                        <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                                        <span className="text-xs text-gray-500">Upload Logo</span>
                                    </div>
                                )}
                                <input
                                    disabled={userData.privilege?.toLowerCase() === "read"}
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => handleLogoUpload(e.target.files[0])}
                                    accept="image/*"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">
                                    Recommended size: 200x200px
                                    <br />
                                    Supported formats: PNG, JPG, SVG
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            {
                userData.privilege?.toLowerCase() === "both" &&
                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium text-sm"
                    >
                        Save college Details
                    </button>
                </div>
            }
        </form>
    );
};

export default CollegeSettings