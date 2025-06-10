// src/Pages/SchoolAdmin/Students/FeeReceiptPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import FeeReceipt from './FeeReceipt';
import { useInstitution } from '../../../../contexts/InstitutionContext';

export default function FeeReceiptPage() {
    const { studentId, receiptId, receiptType } = useParams();
    const { school } = useInstitution();
    const [student, setStudent] = useState(null);
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
                // we use receiptType to avoid confict btw 2 different types of fee receipts of same id 
                const tx = (studentData.transactions || []).find(t => t.receiptId == receiptId && t.feeType?.toLowerCase() == receiptType?.toLowerCase());
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

    // Auto-print when data is ready
    useEffect(() => {
        if (student && school && transaction) {
            setTimeout(() => window.print(), 500);
        }
    }, [student, school, transaction]);

    if (!student) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600 text-lg font-medium bg-white shadow-md rounded-xl px-6 py-4">
                    Loading student data...
                </div>
            </div>
        );
    }
    if (!school) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600 text-lg font-medium bg-white shadow-md rounded-xl px-6 py-4">
                    Loading school info...
                </div>
            </div>
        );
    }
    if (!transaction) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-xl text-red-500 font-semibold bg-slate-100 border border-red-200 shadow rounded-2xl px-6 py-5 text-center">
                    Receipt not found
                </div>
            </div>
        );
    }


    const tx = student.transactions.find(t => t.receiptId == receiptId);
    if (!tx || tx.status !== 'completed') {
        return <div className="flex items-center justify-center h-64">
            <div className="text-xl text-red-500 font-semibold bg-slate-100 border border-red-200 shadow rounded-2xl px-6 py-5 text-center">
                Transaction is not completed !
            </div>
        </div>
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