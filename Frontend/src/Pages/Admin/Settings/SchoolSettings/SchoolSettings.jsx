import React, { useState, useEffect } from 'react';
import { School, Upload, Loader, Instagram, UserSearch } from 'lucide-react';
import Swal from "sweetalert2";
import { useAuth } from '../../../../contexts/AuthContext';
import { useSchool } from "../../../../contexts/SchoolContext"
import { auth, db } from '../../../../config/firebase'; // Ensure auth is imported correctly
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, writeBatch, getDoc } from "firebase/firestore";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const SchoolSettings = ({ school, setSchool }) => {
    // this school is use to get the school id
    const { school: s } = useSchool();

    const { userData, currentUser } = useAuth();
    const { refresh } = useSchool();
    const [schoolName, setSchoolName] = useState(school.schoolName || "");
    const [academicYear, setAcademicYear] = useState(school.academicYear || "");
    const [schoolLocation, setSchoolLocation] = useState(school.location || {});
    const [div, setDiv] = useState(school?.divisions?.length ? school.divisions.reduce((acc, c) => (acc + `${c}, `), "").trim() : "")
    const [classes, setClasses] = useState(school?.class?.length ? school.class.reduce((acc, c) => (acc + `${c}, `), "").trim() : "")

    const [feeIdCount, setFeeIdCount] = useState(school.feeIdCount || 0)
    const [schoolReceiptHeader, setSchoolReceiptHeader] = useState(school.schoolReceiptHeader || "")
    const [busReceiptHeader, setbusReceiptHeader] = useState(school.busReceiptHeader || "")
    const [stockReceiptHeader, setStockReceiptHeader] = useState(school.stockReceiptHeader || "")
    const [tuitionReceiptCount, settuitionReceiptCount] = useState(school.tuitionReceiptCount || 0)
    const [busReceiptCount, setBusReceiptCount] = useState(school.busReceiptCount || 0)
    const [stockReceiptCount, setStockReceiptCount] = useState(school.stockReceiptCount || 0)
    const [schoolEmail, setSchoolEmail] = useState(school.email || "")
    const [schoolMobile, setSchoolMobile] = useState(school.mobile || "")
    // file upload
    const storage = getStorage();
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
        const mobilePattern = /^\d{10}$/;

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
        if (schoolMobile && schoolMobile.trim() !== '' && !mobilePattern.test(schoolMobile)) {
            return Swal.fire({
                icon: 'error',
                title: 'Invalid input',
                text: 'Please enter valid school mobile: 1234567890.'
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
        const updatedSchool = {
            ...school,
            divisions: divisionArr,
            class: classArr,
            schoolName,
            academicYear,
            schoolLocation,
            feeIdCount,
            schoolReceiptHeader,
            busReceiptHeader,
            stockReceiptHeader,
            tuitionReceiptCount,
            busReceiptCount,
            stockReceiptCount,
            email: schoolEmail,
            mobile: schoolMobile,
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
            title: 'Saving school details…',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        try {
            // 1) Update the school details
            const resDetails = await
                fetch(VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/admin/settings/school` : `${VITE_DOMAIN_PROD}/api/admin/settings/school`,
                    {
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
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'School details have been updated successfully.'
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
    const handleLogoUpload = async (file) => {
        if (!file) return;

        try {
            setUploading(true);
            validateFile(file);

            const timestamp = Date.now();
            const fileExt = file.name.split('.').pop();
            const newFileName = `admin/${currentUser.uid}/${timestamp}.${fileExt}`;
            const storageRef = ref(storage, newFileName);
            // Show progress dialog
            let progressDialog;
            const showProgress = (progress) => {
                progressDialog = Swal.fire({
                    title: 'Uploading...',
                    html: `<div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%"></div>
              </div>
              <div class="mt-2">${Math.round(progress)}% Complete</div>`,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                });
            };

            // Handle existing image deletion
            let oldImageDeleted = false;
            if (school.logoUrl) {
                try {
                    await deleteObject(ref(storage, school.logoImagePath));
                    oldImageDeleted = true;
                } catch (deleteErr) {
                    console.warn('Old image deletion warning:', deleteErr);
                    if (deleteErr.code !== 'storage/object-not-found') throw deleteErr;
                }
            }

            // Upload with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    showProgress(progress);
                },
                (error) => {
                    Swal.close();
                    throw error;
                }
            );

            await uploadTask;
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            // Atomic Firestore update
            const batch = writeBatch(db);
            const userRef = doc(db, 'schools', s.id);
            batch.update(userRef, {
                logoUrl: downloadURL,
                logoImagePath: newFileName,
                updatedAt: new Date().toISOString()
            });

            await batch.commit();

            // Update local state
            setSchool(prev => ({
                ...prev,
                logoUrl: downloadURL,
                logoImagePath: newFileName
            }));

            Swal.fire({
                icon: 'success',
                title: 'Logo Image Updated!',
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
            {/* School Name Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            School Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={schoolName || ''}
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setSchoolName()
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="Enter school name"
                            required
                        />
                    </div>

                    {/* Academic Year */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Academic Year <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={academicYear || ''}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="e.g., 2023-2024"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Location Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">School Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={schoolLocation.state || ''}
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setSchoolLocation({ ...schoolLocation, state: e.target.value })
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">District <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setSchoolLocation({ ...schoolLocation, district: e.target.value })
                                }
                            }}
                            value={schoolLocation.district || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Taluka <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setSchoolLocation({ ...schoolLocation, taluka: e.target.value })
                                }
                            }}
                            value={schoolLocation.taluka || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Landmark <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setSchoolLocation({ ...schoolLocation, landmark: e.target.value })
                                }
                            }}
                            value={schoolLocation.landmark || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PinCode <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            onChange={(e) => {
                                if (e.target.value.trim() !== '') {
                                    setSchoolLocation({ ...schoolLocation, pincode: e.target.value })
                                }
                            }}
                            value={schoolLocation.pincode || ''}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Classes & Divisions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Structure</h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            All Divisions (comma separated)
                        </label>
                        <input
                            type="text"
                            value={div}
                            onChange={handleDiv}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="e.g., A, B, C, D"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            All Classes (comma separated, in order)
                        </label>
                        <input
                            type="text"
                            value={classes}
                            onChange={handleClasses}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="e.g., SRKG, 1st, 2nd, 3rd"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last student FeeId
                        </label>
                        <input
                            type="number"
                            value={feeIdCount}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                                type="number"
                                value={tuitionReceiptCount}
                                onChange={(e) => {
                                    settuitionReceiptCount(Number.parseInt(e.target.value.trim()))
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Total Bus Receipt Count
                            </label>
                            <input
                                type="number"
                                value={busReceiptCount}
                                onChange={(e) => {
                                    setBusReceiptCount(Number.parseInt(e.target.value.trim()))
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Total Stock Receipt Count
                            </label>
                            <input
                                type="number"
                                value={stockReceiptCount}
                                onChange={(e) => {
                                    setStockReceiptCount(Number.parseInt(e.target.value.trim()))
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            School Code
                        </label>
                        <input
                            type="text"
                            disabled
                            value={school.Code || 0}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        />
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Information</h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Header for <span className='font-bold'>School Receipt</span>
                        </label>
                        <input
                            type="text"
                            value={schoolReceiptHeader}
                            onChange={(e) => {
                                if (e.target.value.trim() !== "") {
                                    setSchoolReceiptHeader(e.target.value)
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="school receipt header "
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Header for <span className='font-bold'>Transport Receipt</span>
                        </label>
                        <input
                            type="text"
                            value={busReceiptHeader}
                            onChange={(e) => {
                                if (e.target.value.trim() !== "") {
                                    setbusReceiptHeader(e.target.value)
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="transport receipt header"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Header for <span className='font-bold'>Stock Receipt</span>
                        </label>
                        <input
                            type="text"
                            value={stockReceiptHeader}
                            onChange={(e) => {
                                if (e.target.value.trim() !== "") {
                                    setStockReceiptHeader(e.target.value)
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="stock receipt header"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            School Email
                        </label>
                        <input
                            type="text"
                            value={schoolEmail}
                            onChange={(e) => {
                                setSchoolEmail(e.target.value)
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="eg; demo@gmail.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            School Mobile
                        </label>
                        <input
                            type="text"
                            value={schoolMobile}
                            onChange={(e) => {
                                setSchoolMobile(e.target.value)
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            placeholder="eg; 9822841280"
                        />
                    </div>
                </div>
            </div>

            {/* Logo Upload */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">School Branding</h2>
                <div className="flex flex-col items-start gap-6">
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-3">School Logo</label>
                        <div className="flex items-center gap-6">
                            <div className={`relative ${!school.logoUrl ? 'bg-gray-50' : ''} border-2 border-dashed border-gray-300 rounded-xl p-4 w-32 h-32 flex items-center justify-center transition-colors hover:border-purple-500`}>
                                {school.logoUrl ? (
                                    <img src={school.logoUrl} className="w-full h-full object-contain" alt="School Logo" />
                                ) : (
                                    <div className="text-center">
                                        <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                                        <span className="text-xs text-gray-500">Upload Logo</span>
                                    </div>
                                )}
                                <input
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
            <div className="flex justify-end">
                <button
                    type="submit"
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all font-medium text-sm"
                >
                    Save School Details
                </button>
            </div>
        </form>
    );
};

export default SchoolSettings