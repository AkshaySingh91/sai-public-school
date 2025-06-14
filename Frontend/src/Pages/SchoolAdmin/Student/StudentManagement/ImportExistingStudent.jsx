import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useInstitution } from '../../../../contexts/InstitutionContext';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';
import { InputField } from '../InputField';
import { SelectField } from '../SelectField';
import { read, utils } from 'xlsx';
import TableLoader from "../../../../components/TableLoader";
import { User, Upload, TriangleAlert } from 'lucide-react';


export default function ImportExistingStudent() {
    const { school } = useInstitution();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [importResults, setImportResults] = useState(null);
    const fileInputRef = useRef(null);

    const [inputData, setInputData] = useState({
        fname: '',
        sname: '',
        fatherName: '',
        motherName: '',
        DOB: '',
        sex: '',
        saral: '',
        aadhar: '',
        feeID: '',
        fatherMobile: '',
        motherMobile: '',
        class: '',
        div: '',
        address: '',
        lastYearBalanceFee: 0,
        lastYearDiscount: 0,
        tuitionFee: 0,
        tuitionFeesDiscount: 0,
        tuitionPaidFee: 0,
        busFee: 0,
        busFeeDiscount: 0,
        busFeePaid: 0,
        Ayear: '',
        busStop: '',
        busNoPlate: '',
        status: '',
        email: '',
        caste: '',
        subCaste: '',
        nationality: 'Indian',
        category: '',
        religion: '',
        type: '',
        grNo: "",
        penNo: "",
    });

    useEffect(() => {
        if (school) setLoading(false);
    }, [school]);


    // track validation errors
    const [errors, setErrors] = useState({});
    // Add these state variables at the top
    const [currentStudent, setCurrentStudent] = useState('');
    const [failedStudents, setFailedStudents] = useState([]);

    // Update validate function to match Excel headers
    const validate = (data) => {
        const errs = {};
        const required = [
            "Fname", "Sname", "Sex",
            "FatherName", "FatherMobile",
            "Class", "Division", "Ayear", "Type",
            "FeeID", "Status",
            "TuitionFee", "TuitionPaidFee",
            "BusFee", "BusFeePaid"
        ];

        // Add validation for numeric fields
        const numericFields = [
            "TuitionFee", "TuitionFeesDiscount", "TuitionPaidFee",
            "BusFee", "BusDiscount", "BusFeePaid",
            "LastYearBalanceFee"
        ];

        required.forEach(field => {
            if (!data[field]?.toString().trim()) {
                errs[field] = `${field} is required`;
            }
        });

        numericFields.forEach(field => {
            if (data[field] && (isNaN(data[field]) || data[field] < 0)) {
                errs[field] = `${field} must be a valid number`;
            }
        });
        console.log(errs)

        return errs;
    };
    const createTransaction = (feeType, paid, discount, feeAmount, Ayear) => {
        const accounts = school.accounts || [];

        return {
            academicYear: Ayear,
            account: accounts.length > 0 ? `${accounts[0].AccountNo} (${accounts[0].Branch})` : 'Cash',
            amount: Number(paid),
            date: new Date().toISOString().split('T')[0],
            feeType,
            historicalSnapshot: {
                applicableDiscount: Number(discount),
                feeCategory: feeType.replace('Fee', ''),
                initialFee: Number(feeAmount),
                previousPayments: 0,
                remainingBefore: Number(feeAmount - discount),
                remainingAfter: Number(feeAmount - paid),
                transactionDate: new Date().toISOString()
            },
            paymentMode: 'CASH',
            receiptId: `${feeType.replace('Fee', '')}-${nanoid(6).toUpperCase()}`,
            remark: 'Imported from Old system',
            status: 'completed',
            timestamp: new Date().toISOString()
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // 1. trim all string fields
        const trimmed = Object.fromEntries(
            Object.entries(inputData).map(([k, v]) =>
                typeof v === "string" ? [k, v.trim()] : [k, v]
            )
        );
        // 2. validate
        const validationErrors = validate(trimmed);
        setErrors(validationErrors);
        // 3. if errors exist, stop here
        if (Object.keys(validationErrors).length > 0) {
            return;
        }
        // 4. now we know validation passed — flip submitting and proceed
        setSubmitting(true);
        try {
            // Create transactions
            const transactions = [];

            if (inputData.tuitionPaidFee > 0) {
                transactions.push(createTransaction(
                    'TutionFee',
                    inputData.tuitionPaidFee || 0,
                    inputData.tuitionFeesDiscount || 0,
                    inputData.tuitionFee || 0,
                    inputData.Ayear || "24-25"
                ));
            }

            if (inputData.busFeePaid > 0) {
                transactions.push(createTransaction(
                    'BusFee',
                    inputData.busFeePaid || 0,
                    inputData.busFeeDiscount || 0,
                    inputData.busFee || 0,
                    inputData.Ayear || "24-25"
                ));
            }

            // Build student object
            const studentData = {
                // Personal Info
                fname: inputData.fname?.toLowerCase() || "",
                fatherName: inputData.fatherName?.toLowerCase() || "",
                lname: inputData.sname?.toLowerCase() || "",
                dob: inputData.DOB.split('-').reverse().join('-'),
                gender: inputData.sex === 'M' ? 'male' : 'female', // normalized
                motherName: inputData.motherName?.toLowerCase() || "",
                fatherMobile: String(inputData.fatherMobile),
                motherMobile: String(inputData.motherMobile),
                address: inputData.address?.toLowerCase() || "",

                // Academic Info
                class: inputData.class?.toLowerCase() || "",
                div: inputData.div?.toLowerCase() || "",
                academicYear: inputData.Ayear?.toLowerCase() || "",
                status: inputData.status?.toLowerCase() || "",
                type: inputData.type?.toLowerCase() || "",

                // Fee Details
                feeId: inputData.feeID,
                allFee: {
                    lastYearBalanceFee: Number(inputData.lastYearBalanceFee),
                    lastYearBusFee: 0,
                    lastYearDiscount: 0,
                    lastYearBusFeeDiscount: 0,
                    // this year 
                    tuitionFees: {
                        AdmissionFee: 1000,
                        tuitionFee: Number(inputData.tuitionFee) >= 1000 ? Number(inputData.tuitionFee) - 1000 : 0,
                        total: (Number(inputData.tuitionFee) || 0)
                    },
                    tuitionFeesDiscount: Number(inputData.tuitionFeesDiscount),
                    busFee: Number(inputData.busFee),
                    busFeeDiscount: Number(inputData.busFeeDiscount),
                    messFee: 0,
                    hostelFee: 0,
                },

                // Additional Fields (normalized)
                busNoPlate: inputData.busNoPlate?.toLowerCase() || "",
                busStop: inputData.busStop?.toLowerCase() || "",
                email: inputData.email?.toLowerCase() || "",
                caste: inputData.caste?.toLowerCase() || "",
                subCaste: inputData.subCaste?.toLowerCase() || "",
                nationality: inputData.nationality?.toLowerCase() || "",
                category: inputData.category?.toLowerCase() || "",
                religion: inputData.religion?.toLowerCase() || "",
                aadharNo: inputData.aadhar,
                saralId: inputData.saral,
                grNo: inputData.grNo,
                penNo: inputData.penNo,
                transactions,

                // System Fields
                schoolCode: school.Code,
                createdAt: new Date(),
            };

            // Add to Firestore
            await addDoc(collection(db, 'students'), studentData);

            // // Update receipt counter
            // if (transactions.length > 0) {
            //     const schoolsRef = collection(db, 'schools');
            //     const q = query(schoolsRef, where("Code", "==", school.Code));
            //     const querySnapshot = await getDocs(q);
            //     if (!querySnapshot.empty) {
            //         await updateDoc(doc(db, 'schools', querySnapshot.docs[0].id), {
            //             tuitionReceiptCount: school.tuitionReceiptCount + transactions.length
            //         });
            //     }
            // }

            Swal.fire('Success!', 'Student imported successfully', 'success');
            navigate('/school/students');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };
    // Update handleBulkUpload function
    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setProcessing(true);
        setImportResults(null);
        setProgress(0);
        setFailedStudents([]);
        // Reset input value so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
        }
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                // Update the header extraction code
                const headers = [];
                const range = utils.decode_range(worksheet['!ref']);

                // First pass to find the last column with data
                let lastColWithData = 0;
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell = worksheet[utils.encode_cell({ c: C, r: 0 })];
                    if (cell && cell.v.toString().trim()) {
                        lastColWithData = C;
                    }
                }
                // Second pass to collect headers up to last column with data
                for (let C = range.s.c; C <= lastColWithData; ++C) {
                    const cell = worksheet[utils.encode_cell({ c: C, r: 0 })];
                    const header = cell ? cell.v.toString().trim() : null;

                    if (header) {
                        headers.push(header);
                    } else {
                        console.warn(`Empty header found at column ${C + 1}, skipping`);
                    }
                }
                const jsonData = utils.sheet_to_json(worksheet);
                // Validate Data
                const results = jsonData.map(row => {
                    const errors = validate(row);
                    return { ...row, errors };
                });

                const validStudents = results.filter(r => Object.keys(r.errors).length === 0);
                const invalidStudents = results.filter(r => Object.keys(r.errors).length > 0);
                setTotalStudents(validStudents.length);

                if (validStudents.length === 0) {
                    setImportResults(invalidStudents);
                    // return;
                }
                // Process Students
                if (validStudents.length) {
                    Swal.fire({
                        title: 'Processing Students',
                        html: `
                        <div class="text-center">
                            <div class="progress-container mb-4">
                                <div class="text-sm text-gray-600">Processing ${progress}/${validStudents.length}</div>
                                <div class="text-xs text-purple-600">${currentStudent}</div>
                            </div>
                        </div>
                    `,
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => Swal.showLoading()
                    });
                }

                const errors = [];

                for (let i = 0; i < validStudents.length; i++) {
                    try {
                        const student = validStudents[i];
                        setCurrentStudent(`${student.Fname} ${student.Sname} (FeeID: ${student.FeeID})`);

                        await processStudent(student);
                        setProgress(i + 1);

                        // Update progress in modal
                        Swal.getHtmlContainer().querySelector('.progress-container').innerHTML = `
                        <div class="text-sm text-gray-600">Processing ${i + 1}/${validStudents.length}</div>
                        <div class="text-xs text-purple-600">${student.Fname} ${student.Sname} (FeeID: ${student.FeeID})</div>
                    `;
                    } catch (error) {
                        errors.push({
                            ...validStudents[i],
                            errors: { system: error.message }
                        });
                    }
                }

                setProcessing(false);
                const allErrors = [...errors, ...invalidStudents];
                setFailedStudents(allErrors);

                // Show final results
                Swal.fire({
                    title: 'Processing Complete',
                    html: `
        <div class="text-center">
            <p class="text-lg">Successfully processed ${validStudents.length - errors.length}/${validStudents.length} students</p>
            ${allErrors.length > 0 ? `
                <p class="text-red-600 mt-2">${allErrors.length} students failed</p>
                <button id="downloadErrors" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Download Failed Entries
                </button>
            ` : ''}
        </div>
    `,
                    willOpen: () => {
                        if (allErrors.length > 0) {
                            setTimeout(() => {
                                document.getElementById('downloadErrors').addEventListener('click', () => {
                                    generateErrorCSV(allErrors, headers); // Pass headers here
                                });
                            }, 100);
                        }
                    }
                });

            } catch (error) {
                Swal.fire('Error', error.message, 'error');
                setProcessing(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };
    // Add this function for generating error CSV
    const generateErrorCSV = (failedStudents, headers) => {
        if (!failedStudents || failedStudents.length === 0) {
            console.error('No failed students to download');
            return;
        }
        try {
            // Add Errors column to headers
            const csvHeaders = [...headers, 'Errors'];
            const csvContent = [
                csvHeaders.join(','), // Header row
                ...failedStudents.map(student => {
                    const row = csvHeaders.map(header => {
                        if (header === 'Errors') {
                            return Object.values(student.errors || {}).join(', ');
                        }

                        // Handle nested properties and missing values
                        const value = student[header] ?? '';
                        return `"${String(value).replace(/"/g, '""')}"`;
                    });
                    return row.join(',');
                })
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', 'failed_students.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error generating CSV:', error);
            Swal.fire('Error', 'Failed to generate error file', 'error');
        }
    };

    // Generic Student Processor
    const processStudent = async (studentData) => {
        const transactions = [];
        // check if stu has done any transaction than only process that transaction
        // subtract disctount from tuition & bus fee 
        if (studentData["TuitionPaidFee"] > 0) {
            transactions.push(createTransaction(
                'TuitionFee',
                studentData["TuitionPaidFee"] || 0,
                studentData["TuitionFeesDiscount"] || 0,
                (studentData["TuitionFee"] || 0) - (studentData["TuitionFeesDiscount"] || 0),
                studentData["Ayear"] || "24-25",
            ));
        }
        if (studentData["BusFeePaid"] > 0) {
            transactions.push(createTransaction(
                'BusFee',
                studentData["BusFeePaid"] || 0,
                studentData["BusDiscount"] || 0,
                (studentData["BusFee"] || 0) - (studentData["BusDiscount"] || 0),
                studentData["Ayear"] || "24-25",
            ));
        }
        // we have studentData["TuitionFee"] & we have to calculate AdmissionFee, but student may be new or current, if new than only AdmissionFee will be there, if current than AdmissionFee will 0
        // if stu is DSR no addmission fee, 
        const admissionFee = studentData["Status"]?.toString()?.toLowerCase()?.trim() == "new" ?
            (Number(studentData["TuitionFee"] - Number(studentData["TuitionFeesDiscount"]) > 1000 ? 1000 : 0)) :
            0;
        const tuitionFee = studentData["Status"]?.toString()?.toLowerCase()?.trim() == "new" ?
            (Number(studentData["TuitionFee"] - Number(studentData["TuitionFeesDiscount"]) > 1000 ?
                (Number(studentData["TuitionFee"]) - Number(studentData["TuitionFeesDiscount"]) - 1000) :
                (Number(studentData["TuitionFee"]) - Number(studentData["TuitionFeesDiscount"])))) :
            (Number(studentData["TuitionFee"]) - Number(studentData["TuitionFeesDiscount"]));

        // main code
        const allFee = {
            lastYearBalanceFee: Number(studentData["LastYearBalanceFee"]),
            lastYearDiscount: 0,
            lastYearBusFee: 0,
            lastYearBusFeeDiscount: 0,
            tuitionFees: {
                AdmissionFee: admissionFee,
                tuitionFee,
                total: admissionFee + tuitionFee
            },
            tuitionFeesDiscount: Number(studentData["TuitionFeesDiscount"]),
            busFee: Number(studentData["BusFee"]) - Number(studentData["BusDiscount"]),// busFee - busDiscount
            busFeeDiscount: Number(studentData["BusDiscount"]),
            messFee: 0,
            hostelFee: 0,
        };
        const studentDoc = {
            schoolCode: school.Code,
            createdAt: new Date(),
            // Personal info (normalized)
            fname: (studentData["Fname"] || "").toString().toLowerCase(),
            lname: (studentData["Sname"] || "").toString().toLowerCase(),
            fatherName: (studentData["FatherName"] || "").toString().toLowerCase(),
            motherName: (studentData["MotherName"] || "").toString().toLowerCase(),
            fatherMobile: studentData["FatherMobile"] || "",
            motherMobile: studentData["MotherMobile"] || "",
            dob: studentData["DOB"] ? studentData.DOB.split('-').reverse().join('-') : '',
            gender: studentData["Sex"] === 'M' ? 'male' : 'female',
            address: (studentData["Address"] || "").toString().toLowerCase(),

            // Fee info
            allFee,
            feeId: studentData["FeeID"],

            // Academic (normalized)
            academicYear: (studentData["Ayear"] || school.academicYear || "").toString().toLowerCase(),
            class: (studentData["Class"] || "").toString().toLowerCase(),
            div: (studentData["Division"] || "").toString().toLowerCase(),
            busStop: (studentData["BusStop"] || "").toString().toLowerCase(),
            busNoPlate: (studentData["BusNoPlate"] || "").toString().toLowerCase(),
            type: (studentData["Type"] || "").toString().toLowerCase(),

            // Additional (normalized)
            addharNo: studentData["Aadhar"] || "",
            grNo: studentData["GrNo"] || "",
            nationality: (studentData["Nationality"] || "").toString().toLowerCase(),
            penNo: studentData["PenNo"] || "",
            religion: (studentData["Religion"] || "").toString().toLowerCase(),
            saralId: studentData["Saral"] || "",
            status: (studentData["Status"] || "").toString().toLowerCase(),
            caste: (studentData["Caste"] || "").toString().toLowerCase(),
            category: (studentData["Category"] || "").toString().toLowerCase(),

            // Transaction info
            transactions
        };
        await addDoc(collection(db, 'students'), studentDoc);
    };

    if (loading) return <TableLoader />
    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => setShowExcelModal(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                >
                    <Upload className="w-5 h-5" />
                    Bulk Upload Excel
                </button>
            </div>
            {/* Single Student Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-2xl mb-4">
                        <User className="w-8 h-8 text-purple-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Import Student</h2>
                    <p className="text-gray-600">Fill in the student details below</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Error Summary */}
                    {Object.keys(errors).length > 0 && (
                        <div className="md:col-span-2 bg-red-100 border border-red-400 text-red-700 p-4 rounded">
                            <p className="font-semibold">Please fix the following errors:</p>
                            <ul className="list-disc list-inside">
                                {Object.entries(errors).map(([field, msg]) => (
                                    <li key={field}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Personal Information */}
                    {<div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 text-purple-600">Personal Information</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            <InputField label="First Name *" value={inputData.fname} onChange={e => setInputData({ ...inputData, fname: e.target.value })} />
                            <InputField label="Last Name *" value={inputData.sname} onChange={e => setInputData({ ...inputData, sname: e.target.value })} />
                            <InputField label="DOB (DD-MM-YYYY) *" value={inputData.DOB} pattern="\d{2}-\d{2}-\d{4}" onChange={e => setInputData({ ...inputData, DOB: e.target.value })} />
                            <SelectField label="Gender *" options={["Male", "Female", "Other"]} value={inputData.sex} onChange={e => setInputData({ ...inputData, sex: e.target.value })} />
                            <InputField label="Father's Name *" value={inputData.fatherName} onChange={e => setInputData({ ...inputData, fatherName: e.target.value })} />
                            <InputField label="Mother's Name" value={inputData.motherName} onChange={e => setInputData({ ...inputData, motherName: e.target.value })} />
                            <InputField label="Father's Mobile *" type="tel" value={inputData.fatherMobile} onChange={e => setInputData({ ...inputData, fatherMobile: e.target.value })} />
                            <InputField label="Mother's Mobile" type="tel" value={inputData.motherMobile} onChange={e => setInputData({ ...inputData, motherMobile: e.target.value })} />
                            <InputField label="Caste" value={inputData.caste} onChange={e => setInputData({ ...inputData, caste: e.target.value })} />
                            <InputField label="Sub Caste" value={inputData.subCaste} onChange={e => setInputData({ ...inputData, subCaste: e.target.value })} />
                            <InputField label="Religion" value={inputData.religion} onChange={e => setInputData({ ...inputData, religion: e.target.value })} />
                            <InputField label="Category" value={inputData.category} onChange={e => setInputData({ ...inputData, category: e.target.value })} />
                            <InputField label="Email *" type="email" value={inputData.email} onChange={e => setInputData({ ...inputData, email: e.target.value })} />
                        </div>
                    </div>}

                    {/* Address */}
                    {<div className="md:col-span-2">
                        <InputField label="Address *" value={inputData.address} onChange={e => setInputData({ ...inputData, address: e.target.value })} />
                    </div>}

                    {/* Academic Information */}
                    {<div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 text-purple-600">Academic Information</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            <SelectField
                                label="Class *"
                                options={school.class}
                                value={inputData.class}
                                onChange={e => setInputData({ ...inputData, class: e.target.value })}
                            />
                            <SelectField
                                label="Division *"
                                options={school.divisions}
                                value={inputData.div}
                                onChange={e => setInputData({ ...inputData, div: e.target.value })}
                            />
                            <InputField
                                label="Academic Year *"
                                value={inputData.Ayear}
                                onChange={e => setInputData({ ...inputData, Ayear: e.target.value })}
                            />
                            <SelectField
                                label="Student Type *"
                                options={['DSS', 'DSR', 'DS']}
                                value={inputData.type}
                                onChange={e => setInputData({ ...inputData, type: e.target.value })}
                            />
                            <InputField
                                label="Bus No Plate"
                                value={inputData.busNoPlate}
                                onChange={e => setInputData({ ...inputData, busNoPlate: e.target.value })}
                            />
                            <InputField
                                label="Bus Stop"
                                value={inputData.busStop}
                                onChange={e => setInputData({ ...inputData, busStop: e.target.value })}
                            />
                            <InputField
                                label="Fee ID *"
                                value={inputData.feeID}
                                onChange={e => setInputData({ ...inputData, feeID: e.target.value })}
                            />
                            <SelectField
                                label="Status *"
                                options={['inactive', 'current', 'new']}
                                value={inputData.status}
                                onChange={e => setInputData({ ...inputData, status: e.target.value })}
                            />
                        </div>
                    </div>
                    }
                    {/* Fee Information */}
                    {<div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 text-purple-600">Fee Information</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            <InputField label="Tuition Fee *" type="number" value={inputData.tuitionFee} onChange={e => setInputData({ ...inputData, tuitionFee: e.target.value })} />
                            <InputField label="Tuition Discount" type="number" value={inputData.tuitionFeesDiscount} onChange={e => setInputData({ ...inputData, tuitionFeesDiscount: e.target.value })} />
                            <InputField label="Paid Tuition *" type="number" value={inputData.tuitionPaidFee} onChange={e => setInputData({ ...inputData, tuitionPaidFee: e.target.value })} />
                            <InputField label="Bus Fee *" type="number" value={inputData.busFee} onChange={e => setInputData({ ...inputData, busFee: e.target.value })} />
                            <InputField label="Bus Discount" type="number" value={inputData.busFeeDiscount} onChange={e => setInputData({ ...inputData, busDiscount: e.target.value })} />
                            <InputField label="Paid Bus *" type="number" value={inputData.busFeePaid} onChange={e => setInputData({ ...inputData, busFeePaid: e.target.value })} />
                            <InputField label="Last Year Discount" type="number" value={inputData.lastYearDiscount} onChange={e => setInputData({ ...inputData, lastYearDiscount: e.target.value })} />
                        </div>
                    </div>}

                    {/* Additional Information */}
                    {<div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 text-purple-600">Additional Information</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            <InputField label="Saral ID" value={inputData.saral} onChange={e => setInputData({ ...inputData, saral: e.target.value })} />
                            <InputField label="Aadhar" value={inputData.aadhar} onChange={e => setInputData({ ...inputData, aadhar: e.target.value })} />
                            <InputField label="GR No" value={inputData.grNo} onChange={e => setInputData({ ...inputData, grNo: e.target.value })} />
                            <InputField label="PEN No" value={inputData.penNo} onChange={e => setInputData({ ...inputData, penNo: e.target.value })} />
                        </div>
                    </div>}

                    {/* Submit Button */}
                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition font-semibold"
                        >
                            {submitting ? 'Importing...' : 'Import Student'}
                        </button>
                    </div>
                </form>
            </div>
            {/* Excel Upload Modal */}
            {showExcelModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-xl border border-purple-100">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100">
                            <h3 className="text-lg font-bold text-purple-700">Excel Template Format</h3>
                            <button
                                onClick={() => setShowExcelModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mb-4 text-sm text-red-600 flex items-center gap-2">
                            <TriangleAlert className="w-5 h-5" />
                            Column names must match exactly (starred fields are required)
                        </div>

                        <div className="overflow-x-auto mb-6 max-h-[60vh]">
                            <table className="min-w-full border-collapse">
                                <tbody>
                                    {[
                                        ["*Fname", "John"],
                                        ["*Sname", "Doe"],
                                        ["*FatherName", "Alix"],
                                        ["*DOB", "2008-05-10"],
                                        ["*Sex", "Male"],
                                        ["*FeeID", "123"],
                                        ["*FatherMobile", "9876543210"],
                                        ["*Class", "10"],
                                        ["*Div", "A"],
                                        ["Saral", "SRL123456"],
                                        ["MotherName", "Tina"],
                                        ["Aadhar", "1234 5678 9012"],
                                        ["MotherMobile", "8765432109"],
                                        ["Address", "123 Main St, City"],
                                        ["LastYearBalanceFee", "1500"],
                                        ["LastYearDiscount", "500"],
                                        ["*TuitionFee", "18000"],
                                        ["*TuitionFeesDiscount", "2000"],
                                        ["*TuitionPaidFee", "16000"],
                                        ["*BusFee", "3000"],
                                        ["*BusDiscount", "500"],
                                        ["*BusFeePaid", "2500"],
                                        ["*Ayear", "2024-25"],
                                        ["*Status", "Active"],
                                        ["*Type", "DS"],
                                        ["busStop", "Green Park"],
                                        ["busNoPlate", "MH12AB1234"],
                                        ["email", "john.doe@email.com"],
                                        ["caste", "General"],
                                        ["subCaste", "N/A"],
                                        ["nationality", "Indian"],
                                        ["category", "OBC"],
                                        ["religion", "Hindu"],
                                        ["grNo", "GR1023"],
                                        ["penNo", "PN56789"],
                                    ].map(([col, value]) => (
                                        <tr key={col} className="even:bg-purple-50 hover:bg-purple-100 transition-colors text-lg">
                                            <td className="px-4 py-2 font-bold tracking-wider text-purple-700 border border-purple-100 w-48">
                                                {col}
                                            </td>
                                            <td className="px-4 py-2 border border-purple-100 text-gray-800">{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>


                        <label className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-center cursor-pointer hover:bg-purple-700 transition-colors">
                            Upload Excel File
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                ref={fileInputRef}
                                onChange={handleBulkUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
            )}
        </div >
    );
};

