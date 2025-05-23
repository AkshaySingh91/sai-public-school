import { motion } from "framer-motion"
import { Link } from "react-router-dom";
import { Trash2Icon } from "lucide-react";
import { useEffect } from "react"

export default function StudentsStockPaymentHistory({
  student,
  transactions,
  setTransactions,
  deleteStockTransaction,
  // Pagination props (should be managed in parent)
  currentPage = 1,
  pageSize = 5,
  totalItems = 0,
  onPageChange = () => { }
}) {
  useEffect(() => {
    if (student?.StockPaymentDetail?.length) {
      setTransactions(student.StockPaymentDetail)
    }
  }, [student])

  if (!student) return null;

  return (
    // <div className="rounded-2xl shadow-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-violet-50  overflow-hidden">
    //   {transactions.length > 0 ? (
    //     <div className="overflow-x-auto">
    //       <table className="w-full text-sm">
    //         <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
    //           <motion.tr
    //             initial={{ opacity: 0 }}
    //             animate={{ opacity: 1 }}
    //             transition={{ duration: 0.3 }}
    //           >
    //             {["Date", "Items", "Amount", "Qty", "Account", "Receipt", "Actions"].map((header, idx) => (
    //               <th
    //                 key={idx}
    //                 className="px-4 py-3 text-left text-sm font-semibold border-r border-purple-500/30 last:border-r-0 w-auto whitespace-nowrap"
    //               >
    //                 {header}
    //               </th>
    //             ))}
    //           </motion.tr>
    //         </thead>
    //         <tbody className="divide-y divide-purple-100">
    //           {transactions.map((tx, index) => (
    //             <motion.tr
    //               key={index}
    //               className="hover:bg-purple-50/80 transition-colors duration-300"
    //               initial={{ opacity: 0, y: 10 }}
    //               animate={{ opacity: 1, y: 0 }}
    //             >
    //               <td className="px-4 py-3 text-gray-700 font-medium">
    //                 {new Date(tx.date).toLocaleDateString()}
    //               </td>
    //               <td className="px-4 py-3 text-violet-900 font-medium max-w-[200px] truncate">
    //                 {tx.items.map(item => item.itemName).join(', ')}
    //               </td>
    //               <td className="px-4 py-3 text-purple-800 font-semibold">
    //                 ₹{tx.items.reduce((sum, item) => sum + item.total, 0) || 0}
    //               </td>
    //               <td className="px-4 py-3 text-center text-purple-700">
    //                 {tx.items.reduce((sum, item) => sum + item.quantity, 0) || 0}
    //               </td>
    //               <td className="px-4 py-3 text-gray-600">{tx.account || "-"}</td>
    //               <td className="px-4 py-3">
    //                 <Link
    //                   to={`/stockallocate/${student.id}/receipt/${tx.receiptId}`}
    //                   className="text-violet-600 hover:text-violet-800 underline decoration-2 underline-offset-2"
    //                 >
    //                   {tx.receiptId}
    //                 </Link>
    //               </td>
    //               <td className="px-4 py-3">
    //                 <button
    //                   onClick={() => deleteStockTransaction(tx.receiptId)}
    //                   className="p-1.5 rounded-lg hover:bg-red-50/80 transition-colors duration-300"
    //                 >
    //                   <Trash2Icon className="w-5 h-5 text-red-600 hover:text-red-700" />
    //                 </button>
    //               </td>
    //             </motion.tr>
    //           ))}
    //         </tbody>
    //       </table>
    //     </div>
    //   ) : (
    //     <div className="p-8 text-center">
    //       <div className="inline-block px-6 py-4 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100">
    //         <span className="text-gray-500 font-medium text-lg">
    //           No stock payments found
    //         </span>
    //       </div>
    //     </div>
    //   )}

    //   {/* Pagination */}
    //   {transactions.length > 0 && (
    //     <div className="p-4 border-t border-purple-100 flex items-center justify-between">
    //       <div className="text-sm text-violet-800/90">
    //         Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
    //       </div>
    //       <div className="flex gap-2">
    //         <button
    //           onClick={() => onPageChange(currentPage - 1)}
    //           disabled={currentPage === 1}
    //           className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    //         >
    //           Previous
    //         </button>
    //         <span className="px-4 py-2 text-sm font-medium text-violet-800">
    //           Page {currentPage}
    //         </span>
    //         <button
    //           onClick={() => onPageChange(currentPage + 1)}
    //           disabled={currentPage * pageSize >= totalItems}
    //           className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    //         >
    //           Next
    //         </button>
    //       </div>
    //     </div>
    //   )}
    // </div>

    <div className="rounded-2xl shadow-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-violet-50 overflow-hidden">
  {transactions.length > 0 ? (
    <div className="w-full overflow-x-auto">
      <table className="min-w-max w-full text-sm">
        <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {["Date", "Items", "Amount", "Qty", "Account", "Receipt", "Actions"].map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left text-sm font-semibold border-r border-purple-500/30 last:border-r-0 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </motion.tr>
        </thead>
        <tbody className="divide-y divide-purple-100">
          {transactions.map((tx, index) => (
            <motion.tr
              key={index}
              className="hover:bg-purple-50/80 transition-colors duration-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                {new Date(tx.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-violet-900 font-medium max-w-[200px] truncate">
                {tx.items.map(item => item.itemName).join(', ')}
              </td>
              <td className="px-4 py-3 text-purple-800 font-semibold whitespace-nowrap">
                ₹{tx.items.reduce((sum, item) => sum + item.total, 0) || 0}
              </td>
              <td className="px-4 py-3 text-center text-purple-700 whitespace-nowrap">
                {tx.items.reduce((sum, item) => sum + item.quantity, 0) || 0}
              </td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tx.account || "-"}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Link
                  to={`/stockallocate/${student.id}/receipt/${tx.receiptId}`}
                  className="text-violet-600 hover:text-violet-800 underline decoration-2 underline-offset-2"
                >
                  {tx.receiptId}
                </Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={() => deleteStockTransaction(tx.receiptId)}
                  className="p-1.5 rounded-lg hover:bg-red-50/80 transition-colors duration-300"
                >
                  <Trash2Icon className="w-5 h-5 text-red-600 hover:text-red-700" />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="p-8 text-center">
      <div className="inline-block px-6 py-4 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100">
        <span className="text-gray-500 font-medium text-lg">
          No stock payments found
        </span>
      </div>
    </div>
  )}

  {/* Pagination */}
  {transactions.length > 0 && (
    <div className="p-4 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
      <div className="text-sm text-violet-800/90">
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-sm font-medium text-violet-800">
          Page {currentPage}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage * pageSize >= totalItems}
          className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )}
</div>

  );
};