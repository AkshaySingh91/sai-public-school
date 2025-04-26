// src/Pages/Admin/Students/FeeReceiptPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import FeeReceipt from './FeeReceipt';

export default function FeeReceiptPage() {
    const { studentId, receiptId } = useParams();
    const { userData } = useAuth();
    const [student, setStudent] = useState(null);
    const [school, setSchool] = useState(null);

    // Fetch student once
    useEffect(() => {
        getDoc(doc(db, 'students', studentId)).then((snap) => {
            if (snap.exists()) setStudent({ id: snap.id, ...snap.data() });
        });
    }, [studentId]);

    // Fetch school once student is ready
    useEffect(() => {
        if (!student) return;
        (async () => {
            const schoolsRef = collection(db, 'schools');
            const q = query(
                schoolsRef,
                where('Code', '==', userData.schoolCode)
            );
            const snap = await getDocs(q);
            if (snap.size) {
                const d = snap.docs[0];
                setSchool({ id: d.id, ...d.data() });
            }
        })();
    }, [student, userData.schoolCode]);

    // Auto-print when both loaded
    useEffect(() => {
        if (student && school) setTimeout(() => window.print(), 300);
    }, [student, school]);

    if (!student) return <div className="p-6 text-center">Loading student…</div>;
    if (!school) return <div className="p-6 text-center">Loading school…</div>;

    const tx = (student.transactions || []).find(
        (t) => t.receiptId === receiptId
    );
    if (!tx) return <div className="p-6 text-center">Receipt not found</div>;

    return (
        <>
            {/* print-only CSS */}
            <style media="print">{`
        body * { visibility: hidden !important; }
        .receipt-print, .receipt-print * { visibility: visible !important; }
        .receipt-print { position: absolute; top: 0; left: 0; width: 100%; }
        @page { size: A4; margin: 1cm; }
        .receipt-print > * { page-break-after: always; }
        .receipt-print > *:last-child { page-break-after: auto; }
      `}</style>

            <div className="receipt-print">
                <FeeReceipt
                    student={student}
                    school={school}
                    transaction={tx}
                    transactions={student.transactions}
                />
            </div>
        </>
    );
}
