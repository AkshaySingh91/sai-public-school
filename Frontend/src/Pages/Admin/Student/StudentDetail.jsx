// src/Pages/Admin/Students/StudentDetail.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';
import FeeManagement from './FeeManagementTab';
import StudentProfile from './StudentProfileCard';
import TransactionHistory from './TransactionHistoryTab';
import TransactionForm from "./TransactionForm.jsx"
import PersonalInfo from "./PersonalInfo.jsx"

export default function StudentDetail() {
    const { studentId } = useParams();
    const { userData } = useAuth();
    const [student, setStudent] = useState(null);
    const [schoolData, setSchoolData] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState({});
    const [transactions, setTransactions] = useState([]);
    const [newTransaction, setNewTransaction] = useState({
        academicYear: '',
        paymentMode: '',
        account: '',
        date: new Date().toISOString().split('T')[0],
        feeType: '',
        amount: '',
        remark: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch student data
                const studentDoc = await getDoc(doc(db, 'students', studentId));
                if (!studentDoc.exists()) throw new Error('Student not found');
                const studentData = { id: studentDoc.id, ...studentDoc.data() };
                console.log({ studentData })
                setStudent(studentData);
                setFormData(studentData);

                // Fetch school data
                const schoolQ = query(
                    collection(db, "schools"),
                    where("Code", "==", userData.schoolCode) // Changed "Code" to "code"
                );

                const schoolSnap = await getDocs(schoolQ);

                if (schoolSnap.empty) throw new Error("School not found");
                const schoolDoc = schoolSnap.docs[0]; // Get the document snapshot
                const schoolData = schoolDoc.data(); // Get the data from the document 

                setSchoolData(schoolDoc.data());
                console.log({ studentData })
                setNewTransaction(prev => ({
                    ...prev,
                    academicYear: studentData.academicYear,
                    paymentMode: schoolData.paymentModes?.[0] || '',
                    account: schoolData.accounts?.[0]?.AccountNo || '',
                    feeType: schoolData.feeTypes?.[0] || ''
                }));

                // Fetch transactions
                if (studentData.transactions) {
                    setTransactions(studentData.transactions);
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        };

        fetchData();
    }, [studentId, userData.schoolCode]);

    // Modify handleStudentUpdate to handle academic year changes
    const handleStudentUpdate = async () => {
        if (formData.academicYear !== student.academicYear) {
            await handleAcademicYearUpdate(formData.academicYear);
            return;
        }
        try {
            await updateDoc(doc(db, 'students', studentId), formData);
            Swal.fire('Success!', 'Student details updated', 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    const handleFeeUpdate = async (updatedFees) => {
        try {
            await updateDoc(doc(db, 'students', studentId), { 'allFee': updatedFees });
            setStudent(prev => ({ ...prev, allFee: updatedFees, }));
            Swal.fire('Success!', 'Fee structure updated', 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    const handleTransactionSubmit = async (e) => {
        e.preventDefault();
        // Check for empty fields
        const requiredFields = [
            { key: 'academicYear', name: 'Academic Year' },
            { key: 'paymentMode', name: 'Payment Mode' },
            { key: 'account', name: 'Account' },
            { key: 'date', name: 'Date' },
            { key: 'feeType', name: 'Fee Type' },
            { key: 'amount', name: 'Amount' }
        ];

        // Check for empty required fields
        for (const field of requiredFields) {
            if (!newTransaction[field.key] || newTransaction[field.key].trim() === '') {
                Swal.fire('Validation Error', `${field.name} is required.`, 'error');
                return;
            }
        }

        // Validate academic year format (format like "24-25")
        const academicYearRegex = /^\d{2}-\d{2}$/;
        if (!academicYearRegex.test(newTransaction.academicYear)) {
            Swal.fire('Validation Error', 'Academic Year should be in format YY-YY (e.g., 24-25)', 'error');
            return;
        }
        // Validate date format
        if (isNaN(new Date(newTransaction.date).getTime())) {
            Swal.fire('Validation Error', 'Please enter a valid date', 'error');
            return;
        }

        // Validate amount (must be a positive number)
        const amount = parseFloat(newTransaction.amount);
        if (isNaN(amount) || amount <= 0) {
            Swal.fire('Validation Error', 'Amount must be a positive number', 'error');
            return;
        }

        // Validate payment mode from available options
        if (!schoolData.paymentModes?.includes(newTransaction.paymentMode)) {
            Swal.fire('Validation Error', 'Please select a valid Payment Mode', 'error');
            return;
        }

        // Validate account from available options
        const validAccounts = schoolData.accounts?.map(a => `${a.AccountNo} (${a.Branch})`) || [];
        if (!validAccounts.includes(newTransaction.account)) {
            Swal.fire('Validation Error', 'Please select a valid Account', 'error');
            return;
        }

        // Validate fee type from available options
        const validFeeTypes = ["SchoolFee", "MessFee", "HostelFee", "TransportFee"];
        if (!validFeeTypes.includes(newTransaction.feeType)) {
            Swal.fire('Validation Error', 'Please select a valid Fee Type', 'error');
            return;
        }

        try {
            const transaction = {
                ...newTransaction,
                receiptId: `${student.feeId}-${nanoid(4)}`,
                timestamp: new Date().toISOString(),
                amount: amount // Store as number, not string
            };


            // Update fee balances based on transaction
            const updatedFees = { ...student.allFee };

            if (transaction.academicYear !== student.academicYear) {
                // Deduct from previous year balances
                switch (transaction.feeType) {
                    case 'HostelFee':
                    case 'MessFee':
                    case 'SchoolFee':
                        updatedFees.lastYearBalanceFee = Math.max((updatedFees.lastYearBalanceFee || 0) - amount, 0);
                        break;
                    case 'TransportFee':
                        updatedFees.lastYearTransportFee = Math.max((updatedFees.lastYearTransportFee || 0) - amount, 0);
                        break;
                }
                // we dont have to change this year fees because we use it as total fees & to get paid we use transaction 
                // switch (transaction.feeType) {
                //     case 'HostelFee':
                //         updatedFees.hostelFee = Math.max((updatedFees.hostelFee || 0) - amount, 0);
                //         break;
                //     case 'MessFee':
                //         updatedFees.messFee = Math.max((updatedFees.messFee || 0) - amount, 0);
                //         break;
                //     case 'SchoolFee':
                //         updatedFees.schoolFees.total = Math.max((updatedFees.schoolFees?.total || 0) - amount, 0);
                //         break;
                //     case 'TransportFee':
                //         updatedFees.transportFee = Math.max((updatedFees.transportFee || 0) - amount, 0);
                //         break;
                // }
            }
            const updatedTransactions = [...transactions, transaction];

            await updateDoc(doc(db, 'students', studentId), {
                transactions: updatedTransactions,
                allFee: updatedFees
            });

            setStudent(prev => ({ ...prev, allFee: updatedFees }));

            setTransactions(updatedTransactions);
            setNewTransaction({
                academicYear: student.academicYear,
                paymentMode: '',
                account: '',
                date: new Date().toISOString().split('T')[0],
                feeType: '',
                amount: '',
                remark: ''
            });
            Swal.fire('Success!', 'Transaction recorded', 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };
    // In StudentDetail.jsx - Add these functions
    const validateAcademicYear = (currentYear, newYear) => {
        console.log({ currentYear, newYear })
        const [currentStart, currentEnd] = currentYear.split('-').map(Number);
        console.log({ currentStart, currentEnd })
        const [newStart, newEnd] = newYear.split('-').map(Number);
        console.log({ newStart, newEnd })
        return newStart === currentStart + 1 && newEnd === currentEnd + 1;
    };

    const getNewClassFees = async (newClass, targetAcademicYear) => {
        try {
            const fsRef = doc(db, "feeStructures", userData.schoolCode);
            const fsSnap = await getDoc(fsRef);

            if (!fsSnap.exists()) {
                console.error("Fee structure document not found");
                return { AcademicFee: 0, TutionFee: 0, total: 0 };
            }

            const structures = fsSnap.data().structures || [];
            let yearStructure = structures.find(s => s.year === targetAcademicYear);

            // Fallback to latest available structure if target year not found
            if (!yearStructure && structures.length > 0) {
                // Sort structures by academic year in descending order
                const sortedStructures = [...structures].sort((a, b) => {
                    // Extract starting year from academic year format "YY-YY"
                    const getStartYear = (year) => {
                        const [start] = year?.split('-') || ['00'];
                        return parseInt(start) || 0;
                    };

                    return getStartYear(b.year) - getStartYear(a.year);
                });

                yearStructure = sortedStructures[0];
                console.warn(`Using latest available structure for ${yearStructure.year}`);
            }

            if (!yearStructure) {
                console.warn("No fee structures available");
                return { AcademicFee: 0, TutionFee: 0, total: 0 };
            }

            // Rest of the original logic remains the same
            const classStructure = yearStructure.classes?.find(c =>
                c.name?.trim().toLowerCase() === newClass.trim().toLowerCase()
            );

            if (!classStructure) {
                console.warn(`No fee structure found for class ${newClass}`);
                return { AcademicFee: 0, TutionFee: 0, total: 0 };
            }

            const studentType = classStructure.studentType?.find(st =>
                st.name?.trim().toLowerCase() === student.type?.trim().toLowerCase()
            );

            if (!studentType) {
                console.warn(`No fee structure found for student type ${student.type}`);
                return { AcademicFee: 0, TutionFee: 0, total: 0 };
            }

            const feeStructure = studentType.feeStructure || {};
            const academicFee = Number(feeStructure.AcademicFee) || 0;
            const tutionFee = Number(feeStructure.TutionFee) || 0;

            return {
                AcademicFee: academicFee,
                TutionFee: tutionFee,
                total: academicFee + tutionFee
            };

        } catch (error) {
            console.error("Error fetching fee structure:", error);
            return { AcademicFee: 0, TutionFee: 0, total: 0 };
        }
    };

    const handleClassChange = async (newClass) => {
        console.log({ newClass })
        setFormData(prev => ({
            ...prev,
            class: newClass,
        }));
    };

    const handleAcademicYearUpdate = async (newAcademicYear) => {
        if (!validateAcademicYear(student.academicYear, newAcademicYear)) {
            Swal.fire('Error', 'Invalid academic year progression', 'error');
            return;
        }

        try {
            // Calculate unpaid fees
            const currentFees = student.allFee || {};
            const transactions = student.transactions || [];

            const currentYear = student.academicYear;
            const currentYearTransactions = transactions.filter(t => t.academicYear === currentYear);

            console.log(currentFees, transactions, currentYear, currentYearTransactions)

            const calculateCurrentYearUnpaid = (feeType) => {
                const feeAmount = feeType === 'SchoolFee' ?
                    currentFees.schoolFees?.total || 0 :
                    currentFees[feeType] || 0;

                const paid = currentYearTransactions
                    .filter(t => t.feeType === feeType)
                    .reduce((sum, t) => sum + t.amount, 0);

                return feeAmount - paid;
            };

            // Calculate previous year balances (already stored in lastYearBalanceFee)
            const previousYearBalance = currentFees.lastYearBalanceFee || 0;
            const previousTransportBalance = currentFees.lastYearTransportFee || 0;

            // Calculate current year unpaid amounts
            const unpaidHostel = Math.max(calculateCurrentYearUnpaid('HostelFee'), 0);
            const unpaidMess = Math.max(calculateCurrentYearUnpaid('MessFee'), 0);
            const unpaidSchool = Math.max(calculateCurrentYearUnpaid('SchoolFee'), 0);
            const unpaidTransport = Math.max(calculateCurrentYearUnpaid('TransportFee'), 0);

            console.log(currentFees.schoolFees?.total, calculateCurrentYearUnpaid('SchoolFee'))
            console.log(unpaidHostel, unpaidMess, unpaidSchool, unpaidTransport)
            // Get NEW fees for the NEXT academic year
            const newClass = formData.class;
            const newFees = await getNewClassFees(newClass, newAcademicYear);

            console.log({ newFees })
            const updatedFees = {
                ...currentFees,
                // Roll over previous balances + current year unpaid
                lastYearBalanceFee: previousYearBalance + unpaidHostel + unpaidMess + unpaidSchool,
                lastYearTransportFee: previousTransportBalance + unpaidTransport,
                // Reset current year fees
                hostelFee: 0,
                messFee: 0,
                transportFee: 0,
                schoolFees: newFees
            };

            // Update student data
            const updatedData = {
                ...student,
                academicYear: newAcademicYear,
                class: newClass,
                allFee: updatedFees
            };

            await updateDoc(doc(db, 'students', studentId), updatedData);
            setStudent(updatedData);
            setFormData(updatedData);
            Swal.fire('Success!', 'Academic year updated with fee rollover', 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };


    if (!student || !schoolData) return <div className="p-6 text-center">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 relative">
                <StudentProfile
                    student={student}
                    formData={formData}
                    setFormData={setFormData}
                    handleStudentUpdate={handleStudentUpdate}
                />

                <div className="md:w-2/3">
                    <div className="flex border-b mb-6">
                        {['Student Details', 'Fee Details', 'Transactions', 'Documents'].map((tab, idx) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(idx)}
                                className={`px-6 py-3 font-medium ${activeTab === idx
                                    ? 'text-purple-600 border-b-2 border-purple-600'
                                    : 'text-gray-500 hover:text-purple-500'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 0 && (
                        <PersonalInfo formData={formData} setFormData={setFormData} studentId={student} handleFeeUpdate={handleFeeUpdate} schoolData={schoolData} handleClassChange={handleClassChange} />
                    )}

                    {activeTab === 1 && (
                        <div className="space-y-6">
                            <FeeManagement
                                student={student}
                                transactions={transactions}
                                formData={formData}
                                setFormData={setFormData}
                                handleFeeUpdate={handleFeeUpdate}
                            />
                            <TransactionForm
                                newTransaction={newTransaction}
                                setNewTransaction={setNewTransaction}
                                schoolData={schoolData}
                                formData={formData}
                                setFormData={setFormData}
                                handleTransactionSubmit={handleTransactionSubmit}
                                student={student}
                            />
                        </div>
                    )}

                    {activeTab === 2 && <TransactionHistory student={student} transactions={transactions} setTransactions={setTransactions} />}
                </div>
            </div>
        </div>
    );
}