import { useState, useEffect } from 'react';
import {
    User, Book, Phone, ArrowLeft,
    FileText, Upload
} from 'lucide-react';
import ProfileCard from './ProfileCard';
import PersonalTab from './PersonalTab';
import FamilyTab from './FamilyTab';
import ContactTab from './ContactTab';
import AcademicTab from './AcademicTab';
import OtherDetailTab from './OtherDetailTab';
import DocumentSelectTab from './DocumentSelectTab';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from "../../../config/firebase.js";
import { collection, deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { useInstitution } from "../../../contexts/InstitutionContext.jsx"
import Swal from "sweetalert2"
import { useAuth } from '../../../contexts/AuthContext.jsx';

const AppliedStudentDetails = () => {
    const { currentUser } = useAuth();
    const { studentId } = useParams();
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { school: college } = useInstitution()
    const [studentData, setStudentData] = useState({
        collegeCode: "demo_college",
        fName: "Arjun",
        middleName: "Kumar",
        surname: "Sharma",
        motherName: "Sunita Sharma",
        gender: "Male",
        dateOfBirth: "2004-03-15",
        nationality: "Indian",
        category: "General",
        religion: "Hindu",
        caste: "Brahmin",
        subCaste: "Sharma",
        placeOfBirth: "Mumbai",
        address: "123, Green Valley Society, Andheri West, Mumbai",
        pinCode: "400058",
        fatherInfo: {
            name: "Rajesh Sharma",
            qualification: "MBA",
            occupation: "Business Manager",
            officeAddress: "Corporate Office, BKC, Mumbai",
            officePhone: "+91-22-12345678",
            phone: "+91-9876543210",
            email: "rajesh.sharma@email.com"
        },
        motherInfo: {
            name: "Sunita Sharma",
            qualification: "B.Com",
            occupation: "Homemaker",
            officeAddress: "",
            officePhone: "",
            phone: "+91-9876543211",
            email: "sunita.sharma@email.com"
        },
        guardianName: "Rajesh Sharma",
        guardianRelation: "Father",
        relativeContactNo: "+91-9876543212",
        annualIncome: "800000",
        collegeCommunicationMobileNo: ["+91-9876543210", "+91-9876543211"],
        aadharNo: "1234-5678-9012",
        aadharLinkedMobileNo: "+91-9876543210",
        email: "arjun.sharma@email.com",
        isHandicap: true,
        handicapDetails: {
            nature: ""
        },
        bloodGroup: "B+",
        studentWhatsAppNo: "+91-9876543210",
        schoolHistory: [{
            "10": {
                stream: "Science",
                seatNo: "12345",
                university: "Maharashtra Board",
                monthAndYear: "March 2020",
                schoolName: "St. Xavier's High School",
                obtainedMarks: "456",
                totalMarks: "500",
                percentage: "91.2"
            },
            "12": {
                stream: "Science",
                seatNo: "67890",
                university: "Maharashtra Board",
                monthAndYear: "March 2022",
                collegeName: "St. Xavier's College",
                obtainedMarks: "485",
                totalMarks: "500",
                percentage: "97.0"
            },
            "UG": {
                stream: "Computer Science",
                seatNo: "CS2022001",
                university: "Mumbai University",
                monthAndYear: "May 2024",
                collegeName: "KJSCE",
                obtainedMarks: "8.5",
                totalMarks: "10",
                percentage: "85.0"
            }
        }],
        isAllDocSubmited: true,
        methodOfBed: ["English", "Mathematics"],
        medium: "English",
        course: "b.ed",
        updatedAt: "2024-06-12T14:30:00Z",
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        profileImagePath: "/college/:id/students/:studentId/..",
        studentCurrentYear: 1,//1st, 2nd
        courseStartYear: 2024, // get from college.academicYear
        courseEndYear: 2026,// plus 3 years
    });
    const [activeTab, setActiveTab] = useState('personal');
    const [documentStatus, setDocumentStatus] = useState({});

    useEffect(() => {
        const fetchStudentDetails = async () => {
            setLoading(true);
            try {
                const studentDoc = await getDoc(doc(db, "appliedCollegeStudents", studentId));
                if (studentDoc.exists()) {
                    const studentData = {
                        id: studentDoc.id,
                        courseStartYear: 2024, // get from college.academicYear
                        courseEndYear: 2026,// plus 3 years
                        ...studentDoc.data(),
                    };
                    if (studentData.collegeCode !== college.Code) {
                        setStudentData(null);
                        setError("Student not found or unauthorized access"); // Set error state
                        return null; // Return null instead of JSX
                    }
                    setStudentData(studentData);

                    return studentData;
                } else {
                    // setStudentData(null);
                    setError("Student not found");
                    return null;
                }
            } catch (error) {
                setStudentData(null);
                setError(error.message);
                Swal.fire("Error", error.message, "error");
                return null;
            } finally {
                setLoading(false);
            }
        }
        fetchStudentDetails()
    }, [])

    // Document lists based on course
    const documentLists = {
        "b.ed": [
            "CET Application Form",
            "CET Score Card",
            "Domicile Certificate (Original)",
            "Caste Certificate (Original)",
            "Caste Validity Certificate (Original)",
            "Non-Creamy Layer Certificate",
            "EWS Certificate (Original)",
            "10th Marksheet (Original)",
            "12th Marksheet (Original)",
            "UG Conversion Form (If on Grade System)",
            "PG Conversion Form (If on Grade System)",
            "Photo",
            "Student Signature"
        ],
        "d.ed": [
            "10th Marksheet",
            "10th Board Certificate",
            "12th Marksheet",
            "School LC",
            "Domicile Certificate",
            "Aadhar Card",
            "Caste Certificate",
            "Non-Creamy Layer Certificate",
            "Passport Photos (4 count)",
            "Mail ID"
        ]
    };


    const handleInputChange = (field, value, nestedField = null, arrayIndex = null) => {
        setStudentData(prev => {
            const newData = { ...prev };

            if (nestedField && arrayIndex !== null) {
                newData[field][arrayIndex][nestedField] = value;
            } else if (nestedField) {
                newData[field][nestedField] = value;
            } else {
                newData[field] = value;
            }

            return newData;
        });
    };

    const handleDocumentCheck = (docName, checked) => {
        setDocumentStatus(prev => ({
            ...prev,
            [docName]: checked
        }));
    };


    // Helper functions
    const generateStudentId = () => {
        const year = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `STU-${year}-${random}`;
    };

    const generateEnrollmentNumber = (collegeCode) => {
        const code = collegeCode.substring(0, 3).toUpperCase();
        const year = new Date().getFullYear();
        const random = Math.floor(10000 + Math.random() * 90000);
        return `${code}/${year}/${random}`;
    };


    // validation & convertions
    const validateStudentData = (data) => {
        const errors = [];

        // Required fields validation
        const requiredFields = [
            'collegeCode', 'fName', 'surname', 'gender', 'dateOfBirth', 'category',
            'placeOfBirth', 'address', 'fatherInfo', 'motherInfo', 'annualIncome',
            'aadharNo', 'studentWhatsAppNo', 'course', 'profileImage'
        ];

        requiredFields.forEach(field => {
            if (!data[field]) {
                errors.push(`${field.replace(/([A-Z])/g, ' $1').toUpperCase()} is required`);
            }
        });

        // Nested objects validation
        if (data.fatherInfo && !data.fatherInfo.name) {
            errors.push('FATHER NAME is required');
        }

        if (data.motherInfo && !data.motherInfo.name) {
            errors.push('MOTHER NAME is required');
        }

        // Format validations
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Invalid email format');
        }

        if (data.pinCode && !/^\d{6}$/.test(data.pinCode)) {
            errors.push('PIN code must be 6 digits');
        }

        if (data.dateOfBirth) {
            const dob = new Date(data.dateOfBirth);
            if (isNaN(dob)) {
                errors.push('Invalid Date of Birth');
            } else {
                const age = (Date.now() - dob.getTime()) / (3.15576e10);
                if (age < 3) errors.push('Student must be at least 3 years old');
            }
        }

        if (data.aadharNo && !/^\d{12}$/.test(data.aadharNo.replace(/\D/g, ''))) {
            errors.push('Aadhar must be 12 digits');
        }

        if (data.studentWhatsAppNo && !/^(\+\d{1,3}[- ]?)?\d{10}$/.test(data.studentWhatsAppNo)) {
            errors.push('Invalid WhatsApp number');
        }

        if (data.annualIncome) {
            const income = parseFloat(data.annualIncome);
            if (isNaN(income)) errors.push('Annual income must be a number');
            if (income < 0) errors.push('Annual income cannot be negative');
        }

        if (data.isHandicap && (!data.handicapDetails || !data.handicapDetails.nature.trim())) {
            errors.push('Handicap nature is required');
        }

        // Phone number validations
        const validatePhone = (phone, fieldName) => {
            if (phone && !/^(\+\d{1,3}[- ]?)?\d{10}$/.test(phone)) {
                errors.push(`Invalid ${fieldName} phone number`);
            }
        };

        if (data.fatherInfo) validatePhone(data.fatherInfo.phone, 'father');
        if (data.motherInfo) validatePhone(data.motherInfo.phone, 'mother');
        if (data.relativeContactNo) validatePhone(data.relativeContactNo, 'relative');

        return errors;
    };
    // Deep conversion to lowercase
    const convertToLowercase = (obj) => {
        if (typeof obj === 'string') return obj.toLowerCase();
        if (Array.isArray(obj)) return obj.map(item => convertToLowercase(item));
        if (typeof obj === 'object' && obj !== null) {
            return Object.keys(obj).reduce((acc, key) => {
                acc[key] = convertToLowercase(obj[key]);
                return acc;
            }, {});
        }
        return obj;
    };
    // main functions
    const handleApprove = async () => {
        try {
            // 1. Normalize and validate student data
            const normalizedData = {
                ...studentData,
                fName: studentData.fName.trim(),
                middleName: studentData.middleName.trim(),
                surname: studentData.surname.trim(),
                motherName: studentData.motherName.trim(),
                email: studentData.email.trim(),
                aadharNo: studentData.aadharNo.replace(/\s+/g, ''),
                pinCode: studentData.pinCode.trim(),
                address: studentData.address.trim(),
                placeOfBirth: studentData.placeOfBirth.trim(),
            };

            // Validate student data
            const validationErrors = validateStudentData(normalizedData);

            // Additional approval-specific checks
            if (!studentData.isAllDocSubmited) {
                validationErrors.push('All documents must be submitted for approval');
            }

            if (validationErrors.length > 0) {
                return Swal.fire({
                    icon: 'error',
                    title: 'Cannot Approve Student',
                    html: `<div class="text-left">
                    <p>Validation errors:</p>
                    <ul class="list-disc pl-5">${validationErrors.map(e => `<li>${e}</li>`).join('')}</ul>
                </div>`,
                });
            }

            // 2. Confirmation dialog
            const { isConfirmed } = await Swal.fire({
                title: 'Approve Student',
                html: `<div class="text-left">
                <p>Approve <strong>${studentData.fName} ${studentData.surname}</strong>?</p>
                <p class="mt-2">This will:</p>
                <ul class="list-disc pl-5">
                    <li>Move student to approved students</li>
                    <li>Generate permanent student ID</li>
                    <li>Remove from applications</li>
                </ul>
            </div>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Confirm Approval',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#3085d6',
            });

            if (!isConfirmed) return;

            // 3. Show loading
            Swal.fire({
                title: 'Approving Student...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            // 4. Prepare approved student data
            const approvedStudentData = {
                ...convertToLowercase(normalizedData),
                approvedAt: new Date().toISOString(),
                admissionDate: new Date().toISOString(),
                status: 'active',
                enrollmentNumber: generateEnrollmentNumber(studentData.collegeCode),
            };

            // 5. Firestore operations (atomic transaction)
            const batch = writeBatch(db);

            // Add to collegeStudents collection
            const newStudentRef = doc(collection(db, 'collegeStudents'));
            batch.set(newStudentRef, approvedStudentData);

            // Remove from appliedCollegeStudents
            const applicationRef = doc(db, 'appliedCollegeStudents', studentId);
            batch.delete(applicationRef);

            await batch.commit();

            // 6. Success message
            Swal.fire({
                icon: 'success',
                title: 'Student Approved!',
                html: `<div class="text-left">
                <p><strong>${studentData.fName} ${studentData.surname}</strong> is now an active student!</p>
                <p class="mt-2">Student ID: <strong>${approvedStudentData.studentId}</strong></p>
                <p>Enrollment No: <strong>${approvedStudentData.enrollmentNumber}</strong></p>
            </div>`,
            });

            // 7. Navigate to student list
            // navigate('/college/students');

        } catch (error) {
            console.error('Approval Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Approval Failed',
                html: `<div class="text-left">
                <p>${error.message || 'An unexpected error occurred'}</p>
                <p class="mt-2 text-sm">Please try again or contact support</p>
            </div>`,
            });
        }
    };
    const handleReject = async () => {
        try {
            // Confirmation dialog
            const { isConfirmed } = await Swal.fire({
                title: 'Reject Student',
                html: `<div class="text-left">
                        <p>Are you sure you want to reject <strong>${studentData.fName} ${studentData.surname}</strong>?</p>
                        <p class="mt-2 text-red-600 font-bold">This action cannot be undone!</p>
                        <p>This will:</p>
                        <ul class="list-disc pl-5">
                        <li>Permanently delete student profile</li>
                        <li>Remove profile image</li>
                        <li>Delete all application data</li>
                        </ul>
                    </div>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Reject',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#d33',
            });

            if (!isConfirmed) return;

            // Show loading
            Swal.fire({
                title: 'Processing Rejection...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            // Delete profile image if exists
            if (studentData.profileImagePath) {
                const userToken = await currentUser.getIdToken();
                // send collectionName as appliedCollegeStudents because we can also delete from  main collection also 
                const deleteEndpoint = import.meta.env.VITE_NODE_ENV === "Development"
                    ? `http://localhost:${import.meta.env.VITE_PORT}/api/college/student/avatar/${studentId}/appliedCollegeStudents`
                    : `${import.meta.env.VITE_DOMAIN_PROD}/api/college/student/avatar/${studentId}/appliedCollegeStudents`;

                const response = await fetch(deleteEndpoint, {
                    method: "DELETE",
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + userToken
                    },
                    body: JSON.stringify({ key: studentData.profileImagePath })
                });

                if (!response.ok) {
                    throw new Error('Failed to delete profile image');
                }
            }
            // return
            // Delete from Firestore
            await deleteDoc(doc(db, 'appliedCollegeStudents', studentId));
            // Success
            Swal.fire({
                icon: 'success',
                title: 'Student Rejected!',
                text: 'Application has been permanently removed',
            });
            // Navigate to applications list
            // navigate('/college/applications');

        } catch (error) {
            console.error('Rejection Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Rejection Failed',
                text: error.message || 'An unexpected error occurred during rejection',
            });
        }
    };
    const handleSave = async () => {
        // Normalize data
        const normalizedData = {
            ...studentData,
            fName: studentData.fName.trim(),
            middleName: studentData.middleName.trim(),
            surname: studentData.surname.trim(),
            motherName: studentData.motherName.trim(),
            email: studentData.email.trim(),
            aadharNo: studentData.aadharNo.replace(/\s+/g, ''),
            pinCode: studentData.pinCode.trim(),
            address: studentData.address.trim(),
            placeOfBirth: studentData.placeOfBirth.trim(),
        };

        // Validate data
        const validationErrors = validateStudentData(normalizedData);
        console.log(validationErrors)
        if (validationErrors.length > 0) {
            return Swal.fire({
                icon: 'error',
                title: 'Validation Failed',
                html: `<ul>${validationErrors.map(err => `<li>${err}</li>`).join('')}</ul>`,
            });
        }

        // Convert to lowercase
        const dataToSave = convertToLowercase(normalizedData);
        dataToSave.updatedAt = new Date().toISOString();

        // Confirmation
        const { isConfirmed } = await Swal.fire({
            title: 'Confirm Save',
            text: 'Are you sure you want to save changes?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Save',
            cancelButtonText: 'Cancel',
        });

        if (!isConfirmed) return;

        // Save to Firestore
        try {
            Swal.fire({
                title: 'Saving...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            if (dataToSave.collegeCode !== college.Code.toLowerCase()) {
                throw new Error('College code authorization failed');
            }

            await setDoc(
                doc(db, 'appliedCollegeStudents', studentId),
                dataToSave,
                { merge: true }
            );

            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'Student data updated successfully',
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: error.message || 'An unexpected error occurred',
            });
        }
    };

    const tabs = [
        { id: 'personal', label: 'Personal Info', icon: User },
        { id: 'family', label: 'Family Info', icon: User },
        { id: 'contact', label: 'Contact Info', icon: Phone },
        { id: 'academic', label: 'Academic Info', icon: Book },
        { id: 'other', label: 'Other Details', icon: FileText },
        { id: 'documents', label: 'Documents', icon: Upload }
    ];

    return (<>
        {
            loading ? <StudentDetailsLoader /> : (
                <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <button className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-green-800">Student Application Review</h1>
                                <p className="text-green-600">Review and manage student admission application</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Left Profile Card */}
                            <ProfileCard
                                studentData={studentData}
                                handleSave={handleSave}
                                handleApprove={handleApprove}
                                handleReject={handleReject}
                            />

                            {/* Right Tabbed Content */}
                            <div className="lg:col-span-3">
                                <div className="bg-white rounded-xl shadow-sm border border-green-100">
                                    {/* Tab Headers */}
                                    <div className="border-b border-green-100">
                                        <nav className="flex space-x-8 px-6">
                                            {tabs.map((tab) => {
                                                const Icon = tab.icon;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setActiveTab(tab.id)}
                                                        className={`whitespace-nowrap flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                                            ? 'border-green-500 text-green-600'
                                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        {tab.label}
                                                    </button>
                                                );
                                            })}
                                        </nav>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="p-6">
                                        {/* Personal Info Tab */}
                                        {activeTab === 'personal' && (
                                            <PersonalTab
                                                studentData={studentData}
                                                handleInputChange={handleInputChange}
                                            />
                                        )}

                                        {/* Family Info Tab */}
                                        {activeTab === 'family' && (
                                            <FamilyTab
                                                studentData={studentData}
                                                handleInputChange={handleInputChange}
                                            />
                                        )}

                                        {/* Contact Info Tab */}
                                        {activeTab === 'contact' && (
                                            <ContactTab
                                                studentData={studentData}
                                                handleInputChange={handleInputChange}
                                            />
                                        )}

                                        {/* Academic Info Tab */}
                                        {activeTab === 'academic' && (
                                            <AcademicTab
                                                studentData={studentData}
                                                handleInputChange={handleInputChange}
                                            />
                                        )}

                                        {/* Other Details Tab */}
                                        {activeTab === 'other' && (
                                            <OtherDetailTab
                                                studentData={studentData}
                                                handleInputChange={handleInputChange}
                                            />
                                        )}

                                        {/* Documents Tab */}
                                        {activeTab === 'documents' && (
                                            <DocumentSelectTab
                                                studentData={studentData}
                                                documentLists={documentLists}
                                                documentStatus={documentStatus}
                                                handleDocumentCheck={handleDocumentCheck}
                                                handleInputChange={handleInputChange}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    </>)
}
function StudentDetailsLoader() {
    return (
        <div className="animate-pulse p-6">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Card Skeleton */}
                <div className="w-full md:w-72 lg:w-80 space-y-4">
                    <div className="bg-[#E1EEBC] rounded-full w-32 h-32 mx-auto"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-[#E1EEBC] rounded w-3/4 mx-auto"></div>
                        <div className="h-3 bg-[#E1EEBC] rounded w-1/2 mx-auto"></div>
                        <div className="h-8 bg-[#E1EEBC] rounded-lg w-full mt-4"></div>
                        <div className="h-8 bg-[#E1EEBC] rounded-lg w-full"></div>
                    </div>
                </div>

                {/* Details Skeleton */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Info Section */}
                    <div className="col-span-2 space-y-4">
                        <div className="h-5 bg-[#E1EEBC] rounded w-1/4 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="h-4 bg-[#E1EEBC] rounded w-1/5"></div>
                                    <div className="h-4 bg-[#E1EEBC] rounded w-3/5"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Academic Info Section */}
                    <div className="space-y-4">
                        <div className="h-5 bg-[#E1EEBC] rounded w-1/4 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="h-4 bg-[#E1EEBC] rounded w-1/3"></div>
                                    <div className="h-4 bg-[#E1EEBC] rounded w-2/3"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Family Info Section */}
                    <div className="space-y-4">
                        <div className="h-5 bg-[#E1EEBC] rounded w-1/4 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="h-4 bg-[#E1EEBC] rounded w-1/3"></div>
                                    <div className="h-4 bg-[#E1EEBC] rounded w-2/3"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default AppliedStudentDetails