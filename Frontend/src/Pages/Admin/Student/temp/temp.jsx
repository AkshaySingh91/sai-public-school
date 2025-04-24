// src/Pages/Admin/Students/StudentDetail.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { Switch } from '@headlessui/react';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';
import {
    User, Mail, Phone, CreditCard, CalendarDays, Hash, Ticket,
    Banknote, Wallet, Save, Trash2, VenusAndMars, GraduationCapIcon,
    HomeIcon, CreditCardIcon, Utensils, Bus, PiggyBankIcon, DollarSign, History, FileTextIcon
} from 'lucide-react';
import { SelectField } from '../AddStudent';

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
            await updateDoc(doc(db, 'students', studentId), {
                'allFee': updatedFees
            });
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
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Sidebar */}
                <div className="md:w-1/3 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <User className="w-10 h-10 text-purple-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 capitalize">{student.fname} {student.lname}</h2>
                            <p className="text-gray-600 mt-1 font-bold">{student.class} - {student.div}</p>
                            <p className="text-sm text-purple-600 font-mono mt-2">{student.feeId}</p>
                        </div>

                        <div className="space-y-4">
                            <DetailItem icon={<CalendarDays className="w-5 h-5" />} label="Academic Year" value={student.academicYear} />
                            <DetailItem icon={<User className="w-5 h-5" />} label="Student Type" value={student.type} />
                            <DetailItem icon={<Banknote className="w-5 h-5" />} label="Status">
                                <Switch
                                    checked={formData.status === 'active'}
                                    onChange={(val) => setFormData({ ...formData, status: val ? 'active' : 'inactive' })}
                                    className={`${formData.status === 'active' ? 'bg-purple-600' : 'bg-gray-200'} 
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                >
                                    <span className={`${formData.status === 'active' ? 'translate-x-6' : 'translate-x-1'} 
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </Switch>
                            </DetailItem>
                            <DetailItem icon={<CalendarDays className="w-5 h-5" />} label="Created At"
                                value={new Date(student.createdAt?.seconds * 1000).toLocaleDateString()} />
                        </div>

                        <div className="mt-6 space-y-4">
                            <button
                                onClick={handleStudentUpdate}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center"
                            >
                                <Save className="w-5 h-5 mr-2" /> Update Details
                            </button>
                            <button
                                onClick={() => {
                                    Swal.fire({
                                        title: 'Delete Student?',
                                        text: "This action cannot be undone!",
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonColor: '#7e22ce',
                                        cancelButtonColor: '#64748b',
                                        confirmButtonText: 'Yes, delete it!'
                                    }).then(async (result) => {
                                        if (result.isConfirmed) {
                                            // Add delete logic here
                                        }
                                    });
                                }}
                                className="w-full text-red-600 hover:text-red-700 font-medium py-2.5 rounded-lg border border-red-200 hover:border-red-300 flex items-center justify-center"
                            >
                                <Trash2 className="w-5 h-5 mr-2" /> Delete Student
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="md:w-2/3">
                    <div className="flex border-b mb-6">
                        {['Student Details', 'Fee Details', 'Documents'].map((tab, idx) => (
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

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Personal Information */}
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                                        Personal Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputField
                                            icon={<User className="w-5 h-5" />}
                                            label="First Name"
                                            value={formData.fname}
                                            onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                                        />
                                        <InputField
                                            icon={<User className="w-5 h-5" />}
                                            label="Last Name"
                                            value={formData.lname}
                                            onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                                        />
                                        <InputField
                                            icon={<User className="w-5 h-5" />}
                                            label="Father Name"
                                            value={formData.mname}
                                            onChange={(e) => setFormData({ ...formData, mname: e.target.value })}
                                        />
                                        <InputField
                                            icon={<User className="w-5 h-5" />}
                                            label="Mother Name"
                                            value={formData.mname}
                                            onChange={(e) => setFormData({ ...formData, mname: e.target.value })}
                                        />
                                        <InputField
                                            icon={<CalendarDays className="w-5 h-5" />}
                                            label="Date of Birth"
                                            type="date"
                                            value={formData.dob}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        />
                                        <SelectField
                                            icon={<VenusAndMars className="w-5 h-5" />}
                                            label="Gender"
                                            options={['Male', 'Female', 'Other']}
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                                        Contact Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            icon={<Mail className="w-5 h-5" />}
                                            label="Student Email"
                                            type="email"
                                            value={formData.studentEmail}
                                            onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                                        />
                                        <InputField
                                            icon={<Phone className="w-5 h-5" />}
                                            label="Student Mobile"
                                            value={formData.studentMobile}
                                            onChange={(e) => setFormData({ ...formData, studentMobile: e.target.value })}
                                        />
                                        <InputField
                                            icon={<Phone className="w-5 h-5" />}
                                            label="Father's Mobile"
                                            value={formData.fatherMobile}
                                            onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                                        />
                                        <InputField
                                            icon={<Phone className="w-5 h-5" />}
                                            label="Mother's Mobile"
                                            value={formData.motherMobile}
                                            onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Academic Information */}
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                                        Academic Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            icon={<GraduationCapIcon className="w-5 h-5" />}
                                            label="Class"
                                            value={formData.class}
                                            disabled
                                        />
                                        <InputField
                                            icon={<Hash className="w-5 h-5" />}
                                            label="Division"
                                            value={formData.div}
                                            onChange={(e) => setFormData({ ...formData, div: e.target.value })}
                                        />
                                        <InputField
                                            icon={<CalendarDays className="w-5 h-5" />}
                                            label="Academic Year"
                                            value={formData.academicYear}
                                            disabled
                                        />
                                        <InputField
                                            icon={<Ticket className="w-5 h-5" />}
                                            label="Coupon Code"
                                            value={formData.couponCode}
                                            onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                                        Additional Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            icon={<HomeIcon className="w-5 h-5" />}
                                            label="Address"
                                            textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                        <InputField
                                            icon={<CreditCardIcon className="w-5 h-5" />}
                                            label="Aadhar Number"
                                            value={formData.addharNo}
                                            onChange={(e) => setFormData({ ...formData, addharNo: e.target.value })}
                                        />
                                        <SelectField
                                            icon={<Utensils className="w-5 h-5" />}
                                            label="Meal Service"
                                            options={['Yes', 'No']}
                                            value={formData.mealService}
                                            onChange={(e) => setFormData({ ...formData, mealService: e.target.value })}
                                        />
                                        <InputField
                                            icon={<Bus className="w-5 h-5" />}
                                            label="Bus Stop"
                                            value={formData.busStop}
                                            onChange={(e) => setFormData({ ...formData, busStop: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 1 && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                <h3 className="text-xl font-semibold mb-4 flex items-center text-purple-600">
                                    <Wallet className="w-6 h-6 mr-2" />
                                    Fee Management
                                </h3>

                                {/* Current Fees */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <FeeItem
                                        label="School Fees"
                                        value={student.allFee.schoolFees}
                                        onChange={(val) => handleFeeUpdate({ ...student.allFee, schoolFees: val })}
                                    />
                                    <FeeItem
                                        label="Transport Fee"
                                        value={student.allFee.transportFee}
                                        onChange={(val) => handleFeeUpdate({ ...student.allFee, transportFee: val })}
                                    />
                                    <FeeItem
                                        label="Mess Fee"
                                        value={student.allFee.messFee}
                                        onChange={(val) => handleFeeUpdate({ ...student.allFee, messFee: val })}
                                    />
                                    <FeeItem
                                        label="Hostel Fee"
                                        value={student.allFee.hostelFee}
                                        onChange={(val) => handleFeeUpdate({ ...student.allFee, hostelFee: val })}
                                    />
                                </div>

                                {/* Fee Summary */}
                                <div className="pt-4 border-t">
                                    <h4 className="text-lg font-semibold mb-4 text-purple-600">Fee Summary</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <SummaryItem
                                            label="Total Fees"
                                            value={Object.values(student.allFee).reduce((a, b) => a + b, 0)}
                                        />
                                        <SummaryItem
                                            label="Paid Fees"
                                            value={transactions
                                                .filter(t => t.academicYear === student.academicYear)
                                                .reduce((sum, t) => sum + Number(t.amount), 0)}
                                        />
                                        <SummaryItem
                                            label="Outstanding"
                                            value={Object.values(student.allFee).reduce((a, b) => a + b, 0) -
                                                transactions.filter(t => t.academicYear === student.academicYear)
                                                    .reduce((sum, t) => sum + Number(t.amount), 0)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Form */}
                            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                <h3 className="text-xl font-semibold mb-4 flex items-center text-purple-600">
                                    <CreditCard className="w-6 h-6 mr-2" />
                                    Record New Payment
                                </h3>

                                <form onSubmit={handleTransactionSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectField
                                        icon={<CalendarDays />}
                                        label="Academic Year"
                                        options={schoolData.feeStructures?.map(s => s.year) || []}
                                        value={newTransaction.academicYear}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, academicYear: e.target.value })}
                                    />

                                    <SelectField
                                        icon={<Wallet />}
                                        label="Payment Mode"
                                        options={schoolData.paymentModes || []}
                                        value={newTransaction.paymentMode}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, paymentMode: e.target.value })}
                                    />

                                    <SelectField
                                        icon={<PiggyBankIcon />}
                                        label="Account"
                                        options={schoolData.accounts?.map(a => `${a.AccountNo} (${a.Branch})`) || []}
                                        value={newTransaction.account}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, account: e.target.value })}
                                    />

                                    <InputField
                                        icon={<CalendarDays />}
                                        label="Date"
                                        type="date"
                                        value={newTransaction.date}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                                    />

                                    <SelectField
                                        icon={<FileTextIcon />}
                                        label="Fee Type"
                                        options={schoolData.feeTypes || []}
                                        value={newTransaction.feeType}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, feeType: e.target.value })}
                                    />

                                    <InputField
                                        icon={<DollarSign />}
                                        label="Amount"
                                        type="number"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                    />

                                    <div className="md:col-span-2">
                                        <InputField
                                            icon={<FileTextIcon />}
                                            label="Remarks"
                                            textarea
                                            value={newTransaction.remark}
                                            onChange={(e) => setNewTransaction({ ...newTransaction, remark: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="md:col-span-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                                    >
                                        Record Payment
                                    </button>
                                </form>
                            </div>

                            {/* Transaction History */}
                            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                <h3 className="text-xl font-semibold mb-4 flex items-center text-purple-600">
                                    <History className="w-6 h-6 mr-2" />
                                    Payment History
                                </h3>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-purple-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Date</th>
                                                <th className="px-4 py-2 text-left">Amount</th>
                                                <th className="px-4 py-2 text-left">Type</th>
                                                <th className="px-4 py-2 text-left">Mode</th>
                                                <th className="px-4 py-2 text-left">Receipt ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((t, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2">{new Date(t.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-2">₹{t.amount}</td>
                                                    <td className="px-4 py-2">{t.feeType}</td>
                                                    <td className="px-4 py-2">{t.paymentMode}</td>
                                                    <td className="px-4 py-2 font-mono text-purple-600">{t.receiptId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Reusable Components
const DetailItem = ({ icon, label, value, children }) => (
    <div className="flex items-center justify-between py-2">
        <div className="flex items-center text-gray-600">
            <span className="mr-2 text-purple-500">{icon}</span>
            {label}
        </div>
        {children || <span className="font-medium">{value || '-'}</span>}
    </div>
);

const InputField = ({ icon, label, textarea = false, ...props }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center">
            <span className="mr-2 text-purple-500">{icon}</span>
            {label}
        </label>
        {textarea ? (
            <textarea
                {...props}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                rows="3"
            />
        ) : (
            <input
                {...props}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
        )}
    </div>
);

const FeeItem = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
            <span className="mr-2">₹</span>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-32 px-2 py-1 border rounded text-right"
            />
        </div>
    </div>
);

const SummaryItem = ({ label, value }) => (
    <div className="text-center p-4 bg-purple-50 rounded-xl">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-2xl font-bold text-purple-600 mt-1">₹{value}</div>
    </div>
);