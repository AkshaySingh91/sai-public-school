import { AnimatePresence, motion } from "framer-motion"
import { FaTimes } from "react-icons/fa"

function ShowStockEditModal({
    showExcelModal,
    uploading,
    handleExcelUpload,
    setShowExcelModal,
}) {
    return (
        <>
            {/* Excel Upload Modal */}
            <AnimatePresence>
                {showExcelModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowExcelModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-2xl border border-purple-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center pb-4 border-b border-purple-100">
                                <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                                    Bulk Upload Template
                                </h2>
                                <button
                                    onClick={() => setShowExcelModal(false)}
                                    className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                    <FaTimes className="text-xl" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 text-center">
                                    Column names should follow this format{" "}
                                    <span className="text-purple-600">(*required)</span>
                                </p>

                                <div className="overflow-x-auto rounded-xl border border-purple-100">
                                    <table className="min-w-full divide-y divide-purple-100 text-sm">
                                        <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                                            <tr>
                                                {[
                                                    "ItemName",
                                                    "Quantity",
                                                    "PurchasePrice",
                                                    "SellingPrice",
                                                    "Category",
                                                    "FromClass",
                                                    "ToClass",
                                                ].map((header, index) => (
                                                    <th
                                                        key={index}
                                                        className="px-4 py-2.5 text-left font-medium border-r border-purple-500/30 last:border-r-0"
                                                    >
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-purple-100">
                                            <tr>
                                                <td className="px-4 py-2.5 font-medium text-violet-900">
                                                    School Bag
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-purple-800">
                                                    50
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-purple-800">
                                                    300
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-emerald-800">
                                                    400
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">
                                                        All
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-purple-800">
                                                    Nursery
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-purple-800">
                                                    3rd
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <motion.label
                                    whileHover={{ scale: 1.02 }}
                                    className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-center cursor-pointer hover:from-purple-700 hover:to-violet-700 shadow-md transition-all"
                                >
                                    {uploading ? "Uploading..." : "Choose Excel File"}
                                    <input
                                        type="file"
                                        accept=".xls,.xlsx"
                                        onChange={handleExcelUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </motion.label>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default ShowStockEditModal
