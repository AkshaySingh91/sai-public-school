import { useEffect } from "react";
import { Trash2Icon } from "lucide-react"
import { Link } from "react-router-dom";

const StudentsStockPaymentHistory = ({ student, transactions, setTransactions, deleteStockTransaction }) => {
  useEffect(() => {
    if (student && student.StockPaymentDetail && student.StockPaymentDetail.length) {
      setTransactions(student.StockPaymentDetail)
    }
  }, [student])
  if (!student) return null;
  return (
    <>
      {/* Main UI - hidden on print */}
      <div className="rounded-xl shadow-md mt-10 bg-white w-auto">
        {transactions.length > 0 ? (
          <table className="w-auto  text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Quantity</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Receipt</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {tx.items.map(item => item.itemName).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    {tx.items.reduce((sum, item) => sum + item.total, 0) || 0}
                  </td>
                  <td className="px-4 py-3">
                    {tx.items.reduce((sum, item) => sum + item.quantity, 0) || 0}
                  </td>
                  <td className="px-4 py-3">{tx.account || ""}</td>
                  <td className="px-4 py-3 text-blue-600 hover:text-blue-800 font-medium">
                    <Link to={`/stockallocate/${student.id}/receipt/${tx.receiptId}`}>{tx.receiptId}</Link>
                  </td>
                  <td className="px-4 py-3 cursor-pointer">
                    <button
                      className="cursor-pointer"
                      onClick={() => deleteStockTransaction(tx.receiptId)}>
                      <Trash2Icon size={32} className="text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center w-full p-6 text-xl font-semibold rounded-lg">No stock payments found.</p>
        )}
      </div >
    </>
  );
};

export default StudentsStockPaymentHistory;
