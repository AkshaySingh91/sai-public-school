// src/Pages/Admin/Students/TransactionHistory.jsx
import React from 'react';
import { History, Trash2 } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

export default function TransactionHistory({ student, transactions }) {
    console.log({transactions})
    const deleteTransaction = async (tx) => {
        // take confirmation
        const result = await Swal.fire({
            title: 'Delete transaction?',
            text: `This will remove ${tx.feeType} payment of ₹${tx.amount}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#7e22ce',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!',
        });
        if (!result.isConfirmed) return;
        // after confirmation
        try {
            const ref = doc(db, 'students', student.id);
            const snap = await getDoc(ref);
            const data = snap.data();
            // Remove from transactions array
            const newTrans = (data.transactions || []).filter(
                (t) => t.receiptId !== tx.receiptId
            );
            await updateDoc(ref, {
                transactions: newTrans,
            });
            Swal.fire('Deleted!', 'Transaction removed and fees rolled back.', 'success');
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-purple-600">
                <History className="w-6 h-6 mr-2" />
                Payment History
            </h3>

            {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No transactions recorded yet
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-purple-50">
                            <tr>
                                {['Date', 'Amount', 'Type', 'Mode', 'Account', 'Remark', 'Receipt ID', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-2 text-left">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">₹{t.amount}</td>
                                    <td className="px-4 py-2">{t.feeType}</td>
                                    <td className="px-4 py-2">{t.paymentMode}</td>
                                    <td className="px-4 py-2">{t.account}</td>
                                    <td className="px-4 py-2">{t.remark || '-'}</td>
                                    <td className="px-4 py-2 font-mono text-purple-600">
                                        <Link
                                            to={`/student/${student.id}/receipt/${t.receiptId}`}
                                            className="hover:underline"
                                        >
                                            {t.receiptId}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => deleteTransaction(t)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
            }
        </div >
    );
}
