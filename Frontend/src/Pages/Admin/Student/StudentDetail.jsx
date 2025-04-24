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
                console.log(studentData)
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

    const handleStudentUpdate = async () => {
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
            setStudent(prev => ({ ...prev, allFee: updatedFees }));
            Swal.fire('Success!', 'Fee structure updated', 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    const handleTransactionSubmit = async (e) => {
        e.preventDefault();
        try {
            const transaction = {
                ...newTransaction,
                receiptId: `${student.feeId}-${nanoid(4)}`,
                timestamp: new Date().toISOString()
            };

            const updatedTransactions = [...transactions, transaction];
            await updateDoc(doc(db, 'students', studentId), {
                transactions: updatedTransactions
            });

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

                    {activeTab === 0 && <PersonalInfo formData={formData} setFormData={setFormData} student={student} />}

                    {activeTab === 1 && (
                        <div className="space-y-6">
                            <FeeManagement
                                student={student}
                                transactions={transactions}
                                handleFeeUpdate={handleFeeUpdate}
                            />
                            <TransactionForm
                                newTransaction={newTransaction}
                                setNewTransaction={setNewTransaction}
                                student={student}
                                schoolData={schoolData}
                                handleTransactionSubmit={handleTransactionSubmit}
                            />
                        </div>
                    )}

                    {activeTab === 2 && <TransactionHistory transactions={transactions} />}
                </div>
            </div>
        </div>
    );
}


