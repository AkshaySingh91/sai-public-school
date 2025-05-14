// src/Pages/Admin/Students/FeeReceiptPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import FeeReceipt from './FeeReceipt';

export default function FeeReceiptPage() {
    const { studentId, receiptId } = useParams();
    const { userData } = useAuth();
    const [student, setStudent] = useState(null);
    const [school, setSchool] = useState(null);
    const [transaction, setTransaction] = useState(null);

    // Fetch student and transaction
    useEffect(() => {
        const fetchStudentAndTransaction = async () => {
            try {
                const studentDoc = await getDoc(doc(db, 'students', studentId));
                if (!studentDoc.exists()) return;

                const studentData = { id: studentDoc.id, ...studentDoc.data() };
                setStudent(studentData);

                // Find the specific transaction
                const tx = (studentData.transactions || []).find(t => t.receiptId === receiptId);
                if (!tx) return;

                // Verify transaction has historical snapshot
                if (!tx.historicalSnapshot) {
                    console.error('Transaction missing historical snapshot');
                    return;
                }

                setTransaction(tx);
            } catch (error) {
                console.error('Error fetching student:', error);
            }
        };

        fetchStudentAndTransaction();
    }, [studentId, receiptId]);

    // Fetch school data
    useEffect(() => {
        if (!userData?.schoolCode) return;

        const fetchSchool = async () => {
            try {
                const schoolsRef = collection(db, 'schools');
                const q = query(schoolsRef, where('Code', '==', userData.schoolCode));
                const snap = await getDocs(q);

                if (snap.docs.length > 0) {
                    const schoolData = snap.docs[0].data();
                    setSchool({ id: snap.docs[0].id, ...schoolData });
                }
            } catch (error) {
                console.error('Error fetching school:', error);
            }
        };

        fetchSchool();
    }, [userData?.schoolCode]);

    // Auto-print when data is ready
    useEffect(() => {
        if (student && school && transaction) {
            setTimeout(() => window.print(), 500);
        }
    }, [student, school, transaction]);

    if (!student) return <div className="p-6 text-center">Loading student data...</div>;
    if (!school) return <div className="p-6 text-center">Loading school info...</div>;
    if (!transaction) return <div className="p-6 text-center">Receipt not found</div>;

    const tx = student.transactions.find(t => t.receiptId === receiptId);
    if (!tx || tx.status !== 'completed') {
        return <div className="p-6 text-center">Receipt not available</div>;
    }
    return (
        <>
            <style media="print">{`
    body * { visibility: hidden !important; }
    .receipt-print, .receipt-print * { 
        visibility: visible !important; 
        box-shadow: none !important;
    }
    .receipt-print { 
        position: absolute; 
        top: 0; 
        left: 0; 
        width: 100%;
        background: white;
    }
    @page { 
        size: A5;  // Changed from A4 to A5
        margin: 0.5cm;  // Reduced margin
    }
    .no-print, .print-hide { 
        display: none !important; 
    }
    .receipt-copy { 
        page-break-inside: avoid;
        page-break-after: always;  // Force page break after each copy
        padding: 0.5rem !important;  // Reduced padding
    }
    .receipt-copy:last-child { 
        page-break-after: auto; 
    }
            `}</style>


            <div className="receipt-print px-6">
                <FeeReceipt
                    student={student}
                    school={school}
                    transaction={transaction}
                />
            </div>

            {/* Print instructions for user */}
            <div className="print-hide fixed bottom-4 left-4 bg-blue-100 p-4 rounded-lg">
                <p className="text-blue-800 font-medium">
                    ⓘ The print dialog should open automatically.
                    If not, please use Ctrl/Cmd + P to print the receipt.
                </p>
            </div>
        </>
    );
}