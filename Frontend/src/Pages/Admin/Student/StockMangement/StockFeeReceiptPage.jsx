import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSchool } from '../../../../contexts/SchoolContext';
import Swal from 'sweetalert2';
import StockFeeReceipt from './StockFeeReceipt';

function StockFeeReceiptPage() {
    const { studentId, receiptId } = useParams();
    const { userData } = useAuth();
    const { school } = useSchool();
    const [student, setStudent] = useState(null);
    const [transaction, setTransaction] = useState(null);
    const [printTriggered, setPrintTriggered] = useState(false);

    const fetchStudentAndTransaction = useCallback(async () => {
        try {
            const studentDoc = await getDoc(doc(db, 'students', studentId));
            if (!studentDoc.exists()) return;

            const studentData = { id: studentDoc.id, ...studentDoc.data() };
            console.log(studentData.StockPaymentDetail, receiptId)
            // dont type check this line
            const tx = (studentData.StockPaymentDetail || [])
                .find(t => t.receiptId == receiptId);

            if (!tx) {
                Swal.fire('Error', 'Transaction not found', 'error');
                return;
            }

            setStudent(studentData);
            setTransaction(tx);
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
            console.error('Error:', error);
        }
    }, [studentId, receiptId]);

    useEffect(() => {
        if (userData?.schoolCode) {
            fetchStudentAndTransaction();
        }
    }, [userData?.schoolCode, fetchStudentAndTransaction]);

    useEffect(() => {
        if (student && school && transaction && !printTriggered) {
            const printTimer = setTimeout(() => {
                window.print();
                setPrintTriggered(true);
            }, 500);

            return () => clearTimeout(printTimer);
        }
    }, [student, school, transaction, printTriggered]);

    if (!student || !school || !transaction) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600 text-lg font-medium bg-white rounded-xl px-6 py-4">
                    {!student ? 'Loading student...' :
                        !school ? 'Loading school...' : 'Loading transaction...'}
                </div>
            </div>
        );
    }

    return (
        <>
            <style media="print">{`
                body * { visibility: hidden !important; }
                .stock-receipt-print, .stock-receipt-print * { 
                    visibility: visible !important; 
                    box-shadow: none !important;
                }
                .stock-receipt-print { 
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    width: 100%;
                    background: white;
                }
                @page { 
                    size: A5;
                    margin: 0.5cm;
                }
                .no-print, .print-hide { 
                    display: none !important; 
                }
                .stock-receipt-copy { 
                    page-break-inside: avoid;
                    page-break-after: always;
                    padding: 0.5rem !important;
                }
            `}</style>

            <div className="stock-receipt-print px-6">
                <StockFeeReceipt
                    student={student}
                    school={school}
                    transaction={transaction}
                />
            </div>

            <div className="print-hide fixed bottom-4 left-4 bg-blue-100 p-4 rounded-lg">
                <p className="text-blue-800 font-medium">
                    ⓘ The print dialog should open automatically.
                    If not, please use Ctrl/Cmd + P to print.
                </p>
            </div>
        </>
    );
}

export default React.memo(StockFeeReceiptPage);