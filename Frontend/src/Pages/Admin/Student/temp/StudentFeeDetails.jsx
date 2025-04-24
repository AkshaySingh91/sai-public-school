import React, { useEffect, useState } from 'react';
import {
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { useFirestore } from '../../../../contexts/FirestoreContext';

const FEE_TYPES = [
    "admission fee",
    "tuition fee",
    "hostel fee",
    "mess fee",
    "bus fee",
];

const StudentFeeDetails = () => {
    const { db } = useFirestore();
    const { studentId } = useParams();

    const [feeDetails, setFeeDetails] = useState([]);
    const [studentInfo, setStudentInfo] = useState({});
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [newPayment, setNewPayment] = useState({
        paymentDate: '',
        feeType: '',
        paymentMode: '',
        account: '',
        amount: '',
        remark: '',
        academicYear: '',
    });

    // Fetch basic student info
    const fetchStudentInfo = async () => {
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
            setStudentInfo(studentSnap.data());
        }
    };

    // Fetch fee transactions (filtered if dates provided)
    const fetchFeeDetails = async () => {
        const transRef = collection(db, 'students', studentId, 'transactions');
        let q = query(transRef);

        if (fromDate && toDate) {
            const from = Timestamp.fromDate(new Date(fromDate));
            const to = Timestamp.fromDate(new Date(toDate));
            q = query(transRef, where('paymentDate', '>=', from), where('paymentDate', '<=', to));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeeDetails(data);
    };

    useEffect(() => {
        fetchStudentInfo();
        fetchFeeDetails();
    }, [studentId]);

    const handleFilter = () => {
        if (!fromDate || !toDate) {
            alert("Please select both From and To dates.");
            return;
        }
        fetchFeeDetails();
    };

    const handleAddPayment = async () => {
        if (!newPayment.paymentDate || !newPayment.feeType || !newPayment.amount) {
            alert("Please fill all required fields.");
            return;
        }

        try {
            const paymentDate = Timestamp.fromDate(new Date(newPayment.paymentDate));
            const amountPaidNow = parseFloat(newPayment.amount);

            // Calculate previous total paid
            const transactionSnap = await getDocs(collection(db, 'students', studentId, 'transactions'));
            let totalPaidBefore = 0;
            transactionSnap.forEach(doc => {
                totalPaidBefore += doc.data().amount || 0;
            });

            const currentPaidFee = totalPaidBefore + amountPaidNow;

            const studentRef = doc(db, 'students', studentId);
            const studentSnap = await getDoc(studentRef);
            const studentData = studentSnap.data();

            const className = studentData.class;
            const studentType = studentData.studentType;
            const totalFee = studentData.totalFee || 0;
            const academicYear = newPayment.academicYear;

            const feeDocRef = doc(db, 'feestructure', academicYear);
            const feeSnap = await getDoc(feeDocRef);
            const classes = feeSnap.data()?.Classes || [];

            let dsFee = 0;
            let studentFee = 0;

            const classEntry = classes.find(cls => cls.class === className);
            if (classEntry && classEntry.feeStructure) {
                classEntry.feeStructure.forEach(fee => {
                    const admission = fee.allFees?.admission || 0;
                    const tuition = fee.allFees?.tuition || 0;

                    if (fee.type === "DS") dsFee = admission + tuition;
                    if (fee.type === studentType) studentFee = admission + tuition;
                });
            }

            const discountFee = dsFee - studentFee;
            const outstandingFee = totalFee - currentPaidFee;

            const fullTransaction = {
                ...newPayment,
                studentId,
                paymentDate,
                amount: amountPaidNow,
                createdAt: Timestamp.now(),
                currentPaidFee,
                outstandingFee,
                discountFee,
            };

            // Add to global collection
            const globalDocRef = await addDoc(collection(db, 'transactions'), fullTransaction);

            // Add to student subcollection
            await addDoc(collection(db, 'students', studentId, 'transactions'), {
                ...fullTransaction,
                globalTransactionId: globalDocRef.id,
            });

            // Update student document with latest totals
            await updateDoc(studentRef, {
                currentPaidFee,
                outstandingFee,
                discountFee,
            });

            // Reset form
            setNewPayment({
                paymentDate: '',
                feeType: '',
                paymentMode: '',
                account: '',
                amount: '',
                remark: '',
                academicYear: '',
            });

            fetchFeeDetails();
        } catch (error) {
            console.error("Error adding payment: ", error);
            alert("Something went wrong while adding the payment.");
        }
    };

    return (
        <div className="max-w-5xl mx-auto mt-8 p-4">
            <h2 className="text-2xl font-bold mb-2">Student Fee Details</h2>
            <p className="text-gray-700 mb-4">
                <strong>Name:</strong> {studentInfo.name} | <strong>Class:</strong> {studentInfo.class} | <strong>Division:</strong> {studentInfo.division}
            </p>

            {/* Filter Section */}
            <div className="flex gap-4 mb-4">
                <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="p-2 border rounded"
                />
                <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="p-2 border rounded"
                />
                <button
                    onClick={handleFilter}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Filter
                </button>
            </div>

            {/* Table of Fee Transactions */}
            <table className="w-full table-auto border border-gray-300 mb-6">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border">Fee Type</th>
                        <th className="p-2 border">Mode</th>
                        <th className="p-2 border">Account</th>
                        <th className="p-2 border">Amount</th>
                        <th className="p-2 border">Remark</th>
                        <th className="p-2 border">Academic Year</th>
                    </tr>
                </thead>
                <tbody>
                    {feeDetails.map((fee, index) => (
                        <tr key={index} className="text-center border-t">
                            <td className="p-2 border">
                                {fee.paymentDate?.toDate().toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="p-2 border capitalize">{fee.feeType}</td>
                            <td className="p-2 border capitalize">{fee.paymentMode}</td>
                            <td className="p-2 border capitalize">{fee.account}</td>
                            <td className="p-2 border">₹{fee.amount}</td>
                            <td className="p-2 border">{fee.remark}</td>
                            <td className="p-2 border">{fee.academicYear}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Add Payment Form */}
            <h3 className="text-xl font-semibold mb-2">Add Payment</h3>
            <div className="grid grid-cols-2 gap-4">
                <input
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                    className="p-2 border rounded"
                />
                <select
                    value={newPayment.feeType}
                    onChange={(e) => setNewPayment({ ...newPayment, feeType: e.target.value })}
                    className="p-2 border rounded"
                >
                    <option value="">Select Fee Type</option>
                    {FEE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <select
                    value={newPayment.paymentMode}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMode: e.target.value })}
                    className="p-2 border rounded"
                >
                    <option value="">Select Mode</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                </select>
                <select
                    value={newPayment.account}
                    onChange={(e) => setNewPayment({ ...newPayment, account: e.target.value })}
                    className="p-2 border rounded"
                >
                    <option value="">Select Account</option>
                    <option value="school account 1">School Account 1</option>
                    <option value="school account 2">School Account 2</option>
                </select>
                <input
                    type="number"
                    placeholder="Amount"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="p-2 border rounded"
                />
                <input
                    type="text"
                    placeholder="Remark"
                    value={newPayment.remark}
                    onChange={(e) => setNewPayment({ ...newPayment, remark: e.target.value })}
                    className="p-2 border rounded"
                />
                <input
                    type="text"
                    placeholder="Academic Year (e.g. 2024-25)"
                    value={newPayment.academicYear}
                    onChange={(e) => setNewPayment({ ...newPayment, academicYear: e.target.value })}
                    className="p-2 border rounded col-span-2"
                />
            </div>

            <button
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
                onClick={handleAddPayment}
            >
                Add Payment
            </button>
        </div>
    );
};

export default StudentFeeDetails; 