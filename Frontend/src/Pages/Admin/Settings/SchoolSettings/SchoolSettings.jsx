import React, { useState, useEffect } from 'react';
import { School, Upload, Loader } from 'lucide-react';
import Swal from "sweetalert2";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { auth } from '../../../../config/firebase';

const SchoolSettings = ({ school, setSchool }) => {
    const { userData } = useAuth();
    const [logoFile, setLogoFile] = useState(null);
    const [div, setDiv] = useState(school?.divisions?.length ? school.divisions.reduce((acc, c) => (acc + `${c}, `), "").trim() : "")
    const [logoUrl, setLogoUrl] = useState(false);
    const [classes, setClasses] = useState(school?.class?.length ? school.class.reduce((acc, c) => (acc + `${c}, `), "").trim() : "")
    const [academicYear, setAcademicYear] = useState(school.academicYear);

    const [schoolReceiptHeader, setSchoolReceiptHeader] = useState(school.schoolReceiptHeader || "")
    const [transportReceiptHeader, setTransportReceiptHeader] = useState(school.transportReceiptHeader || "")
    const [stockReceiptHeader, setStockReceiptHeader] = useState(school.stockReceiptHeader || "")

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
        const updatedSchool = { ...school, divisions: divisionArr, class: classArr, academicYear, schoolReceiptHeader, transportReceiptHeader, stockReceiptHeader };

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
                            value={school.schoolName || ''}
                            onChange={(e) => setSchool({ ...school, schoolName: e.target.value })}
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
                            value={school?.location?.state || ''}
                            onChange={(e) => setSchool({ ...school, location: { ...location, state: e.target.value } })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">District <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={school?.location?.district || ''}
                            onChange={(e) => setSchool({ ...school, location: { ...location, district: e.target.value } })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Taluka <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={school?.location?.taluka || ''}
                            onChange={(e) => setSchool({ ...school, location: { ...location, taluka: e.target.value } })}
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
                            Total Recipt Count
                        </label>
                        <input
                            type="text"
                            disabled
                            value={school?.receiptCount || 0}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            School Code
                        </label>
                        <input
                            type="text"
                            disabled
                            value={school?.Code || 0}
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
                            value={transportReceiptHeader}
                            onChange={(e) => {
                                if (e.target.value.trim() !== "") {
                                    setTransportReceiptHeader(e.target.value)
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
                </div>
            </div>

            {/* Logo Upload */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">School Branding</h2>
                <div className="flex flex-col items-start gap-6">
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-3">School Logo</label>
                        <div className="flex items-center gap-6">
                            <div className={`relative ${!logoUrl ? 'bg-gray-50' : ''} border-2 border-dashed border-gray-300 rounded-xl p-4 w-32 h-32 flex items-center justify-center transition-colors hover:border-purple-500`}>
                                {logoUrl ? (
                                    <img src={logoUrl} className="w-full h-full object-contain" alt="School Logo" />
                                ) : (
                                    <div className="text-center">
                                        <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                                        <span className="text-xs text-gray-500">Upload Logo</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleLogoUpload}
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