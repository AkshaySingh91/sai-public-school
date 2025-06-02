import { useState } from "react";

// it will take year like "24-25", className like "Nursery"
const AddStudentTypeForm = ({
    year,
    className,
    feeTypes,
    onAdd,
}) => {
    const [englishMedium, setEnglishMedium] = useState(true);
    const [admissionFee, setAdmissionFee] = useState("");
    const [tuitionFee, setTuitionFee] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!admissionFee || !tuitionFee) {
            setError("Please fill in both fee fields");
            return;
        }

        const admissionValue = Number(admissionFee);
        const tuitionValue = Number(tuitionFee);

        if (isNaN(admissionValue) || admissionValue < 0) {
            setError("Admission Fee must be a valid positive number");
            return;
        }

        if (isNaN(tuitionValue) || tuitionValue < 0) {
            setError("Tuition Fee must be a valid positive number");
            return;
        }

        setError("");
        setIsSubmitting(true);

        try {
            // Create fee structures for all student types based on the selected medium
            const baseFeeStructure = {
                AdmissionFee: admissionValue,
                TuitionFee: tuitionValue
            };
            // this will add or update class fee structure
            onAdd(
                year,
                className,
                "DS",
                baseFeeStructure,
                englishMedium
            );

            // Add DSS student type (half tuition fee)
            onAdd(
                year,
                className,
                "DSS",
                {
                    AdmissionFee: admissionValue,
                    TuitionFee: Math.round(tuitionValue / 2)
                },
                englishMedium
            );

            // Add DSR student type (only admission fee)
            onAdd(
                year,
                className,
                "DSR",
                {
                    AdmissionFee: 0,
                    TuitionFee: 0
                },
                englishMedium
            );

            // Reset form
            setAdmissionFee("");
            setTuitionFee("");
        } catch (err) {
            setError("Failed to add fees. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-purple-100">
                <h3 className="text-lg font-semibold text-purple-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Add Fee Structure for {className}
                </h3>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Medium Selection */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-medium text-purple-700 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                </svg>
                                Select Medium
                            </h4>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => setEnglishMedium(true)}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${englishMedium
                                        ? 'border-purple-600 bg-purple-50 shadow-sm'
                                        : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                >
                                    <div className={`h-5 w-5 rounded-full border-2 mb-3 flex items-center justify-center ${englishMedium
                                        ? 'border-purple-600 bg-purple-600'
                                        : 'border-gray-300'
                                        }`}>
                                        {englishMedium && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`font-medium ${englishMedium ? 'text-purple-700' : 'text-gray-700'}`}>
                                        English Medium
                                    </span>
                                    <span className="text-sm mt-1 text-gray-500">
                                        For English curriculum classes
                                    </span>
                                </button>

                                <button
                                    onClick={() => setEnglishMedium(false)}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${!englishMedium
                                        ? 'border-purple-600 bg-purple-50 shadow-sm'
                                        : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                >
                                    <div className={`h-5 w-5 rounded-full border-2 mb-3 flex items-center justify-center ${!englishMedium
                                        ? 'border-purple-600 bg-purple-600'
                                        : 'border-gray-300'
                                        }`}>
                                        {!englishMedium && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`font-medium ${!englishMedium ? 'text-purple-700' : 'text-gray-700'}`}>
                                        Semi-English Medium
                                    </span>
                                    <span className="text-sm mt-1 text-gray-500">
                                        For regional language classes
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                            <h4 className="font-medium text-purple-700 mb-3 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                How Fees Are Calculated
                            </h4>
                            <ul className="space-y-3">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                                        <span className="text-xs font-semibold text-purple-700">DS</span>
                                    </div>
                                    <p className="ml-3 text-sm text-gray-700">
                                        <span className="font-medium">Full Admission Fee + Full Tuition Fee</span>
                                    </p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                                        <span className="text-xs font-semibold text-purple-700">DSS</span>
                                    </div>
                                    <p className="ml-3 text-sm text-gray-700">
                                        <span className="font-medium">Full Admission Fee + Half Tuition Fee</span> (automatically calculated)
                                    </p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                                        <span className="text-xs font-semibold text-purple-700">DSR</span>
                                    </div>
                                    <p className="ml-3 text-sm text-gray-700">
                                        <span className="font-medium">No Fee</span> (automatically set to ₹0)
                                    </p>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column - Fee Inputs */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-medium text-purple-700 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                                Enter Fee Details
                            </h4>

                            <div className="space-y-5">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admission Fee (₹)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">₹</span>
                                        </div>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={admissionFee}
                                            onChange={(e) => setAdmissionFee(e.target.value)}
                                            className="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-0"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tuition Fee (₹)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">₹</span>
                                        </div>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={tuitionFee}
                                            onChange={(e) => setTuitionFee(e.target.value)}
                                            className="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-0"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-red-700 text-sm">{error}</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                            <h4 className="font-medium text-green-800 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                What You'll Create
                            </h4>
                            <p className="text-sm text-green-700">
                                It will add fee structures for all student types in <span className="font-semibold">{englishMedium ? "English" : "Semi-English"}</span> medium class:
                            </p>
                            <div className="mt-3 grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-green-100 shadow-xs text-center">
                                    <div className="text-xs font-medium text-gray-500">DS</div>
                                    <div className="font-semibold text-green-700 mt-1">
                                        ₹{admissionFee || "0"} + ₹{tuitionFee || "0"}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-green-100 shadow-xs text-center">
                                    <div className="text-xs font-medium text-gray-500">DSS</div>
                                    <div className="font-semibold text-green-700 mt-1">
                                        ₹{admissionFee || "0"} + ₹{tuitionFee ? Math.round(tuitionFee / 2) : "0"}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-green-100 shadow-xs text-center">
                                    <div className="text-xs font-medium text-gray-500">DSR</div>
                                    <div className="font-semibold text-green-700 mt-1">
                                        ₹0
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`px-6 py-3 rounded-xl font-medium flex items-center ${isSubmitting
                            ? 'bg-purple-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md'
                            } text-white transition-all`}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                </svg>
                                Add Fees for {englishMedium ? "English" : "Semi-English"} Medium
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default AddStudentTypeForm