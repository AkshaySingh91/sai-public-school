import { History } from 'lucide-react';

export default function TransactionHistory({ transactions }) {
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
            )}
        </div>
    );
}