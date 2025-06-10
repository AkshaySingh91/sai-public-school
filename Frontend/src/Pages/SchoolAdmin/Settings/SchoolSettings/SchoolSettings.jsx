import React, { useState, useEffect } from 'react';
import { School, Upload, Loader, Instagram, UserSearch } from 'lucide-react';
import Swal from "sweetalert2";
import { useAuth } from '../../../../contexts/AuthContext';
import { useInstitution } from "../../../../contexts/InstitutionContext"
import { auth, db } from '../../../../config/firebase'; // Ensure auth is imported correctly
import { doc, getDoc } from "firebase/firestore";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const SchoolSettings = ({ school, setSchool }) => {
    // this school is use to get the school id
    const { school: s } = useInstitution();
    const { userData, currentUser } = useAuth();
    const { refresh } = useInstitution();
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
            const fsRef = doc(db, "feeStructures", s.Code);
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
                fetch(VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/school/${s.id}` : `${VITE_DOMAIN_PROD}/api/school/${s.id}`,
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

            const oldKey = school.logoImagePath || null;
            const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/school/logo/upload-url/${s.id}?fileType=${file.type}&fileName=${file.name}`
                : `${VITE_DOMAIN_PROD}/api/school/logo/upload-url/${s.id}?fileType=${file.type}&fileName=${file.name}`;

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
                ? `http://localhost:${VITE_PORT}/api/school/logo/update/${s.id}`
                : `${VITE_DOMAIN_PROD}/api/school/logo/update/${s.id}`;
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
            setSchool(prev => ({ ...prev, logoImage, logoImagePath, updatedAt }));

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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                                disabled={userData.privilege?.toLowerCase() === "read"}
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
                                disabled={userData.privilege?.toLowerCase() === "read"}
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
                                disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            disabled={userData.privilege?.toLowerCase() === "read"}
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
                            <div className={`relative ${!school.logoImage ? 'bg-gray-50' : ''} border-2 border-dashed border-gray-300 rounded-xl p-4 w-32 h-32 flex items-center justify-center transition-colors hover:border-purple-500`}>
                                {school.logoImage && school.logoImagePath ? (
                                    <img src={school.logoImage} className="w-full h-full object-contain" alt="School Logo" />
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
                        Save School Details
                    </button>
                </div>
            }
        </form>
    );
};

export default SchoolSettings