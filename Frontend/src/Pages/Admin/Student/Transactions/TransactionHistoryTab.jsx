import React from 'react';
import { History, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

export default function TransactionHistory({ student, transactions, setTransactions, handleTransactionStatusUpdate, fetchData }) {
    const deleteTransaction = async (tx, isCompleted) => {
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

        try {
            const ref = doc(db, 'students', student.id);
            const newTrans = (transactions || []).filter(
                (t) => (isCompleted ? t.receiptId : t.tempReceiptId) !== (isCompleted ? tx.receiptId : tx.tempReceiptId)
            );
            // return
            await updateDoc(ref, { transactions: newTrans });
            setTransactions(newTrans)
            fetchData()
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
                    <table className="w-full text-sm">
                        <thead className="bg-purple-50">
                            <tr>
                                {['Date', 'Amount', 'Type', 'Mode', 'Account', 'Status', 'Recp. ID', 'Actions'].map(h => (
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
                                    <td className="px-4 py-2 capitalize">{t.paymentMode.toLowerCase()}</td>
                                    <td className="px-4 py-2">{t.account}</td>
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${t.status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className=" px-4 py-2 font-mono text-purple-600">
                                        {t.status === 'completed'
                                            ? <Link to={`/student/${student.id}/receipt/${t.receiptId}`}>{t.receiptId}</Link>
                                            : <span className="text-gray-400">{t.status}</span>
                                        }
                                    </td>
                                    <td className="px-4 py-4  flex items-center gap-2">
                                        {t.paymentMode.toLowerCase() === 'cheque' && t.status === 'pending' && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleTransactionStatusUpdate(t.tempReceiptId, 'completed')}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="Mark as cleared"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleTransactionStatusUpdate(t.tempReceiptId, 'cancle')}
                                                    className="text-gray-500 hover:text-gray-700"
                                                    title="Keep as pending"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (t.status === "completed") {
                                                    deleteTransaction(t, true)
                                                } else {
                                                    // reject / pending in both cases tempReciptId will there
                                                    deleteTransaction(t, false)
                                                }
                                            }}
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
            )}
        </div>
    );
}