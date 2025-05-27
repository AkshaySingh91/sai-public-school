import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

function ShowAddStockModal({
    classNames,
    showModal,
    isEditing,
    newStock,
    resetForm,
    setIsEditing,
    setShowModal,
    setNewStock,
    addStock,
}) {
    return (
        <>
            {/* Add Stock Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => {
                            // either we have click on add or edit 
                            if (isEditing) {
                                resetForm();
                                setIsEditing(false);
                                setShowModal(false)
                            } else {
                                setShowModal(false)
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl border border-purple-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center pb-4 border-b border-purple-100">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                                    Add New Stock
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-purple-500 hover:text-purple-700 transition-colors"
                                >
                                    <FaTimes className="text-xl" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Item Name"
                                    className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                                    value={newStock.itemName || ""}
                                    onChange={(e) =>
                                        setNewStock({ ...newStock, itemName: e.target.value })
                                    }
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        min={1}
                                        placeholder="Quantity"
                                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                                        value={newStock.quantity}
                                        onChange={(e) =>
                                            setNewStock({ ...newStock, quantity: e.target.value })
                                        }
                                    />
                                    <select
                                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                                        value={newStock.category}
                                        onChange={(e) =>
                                            setNewStock({ ...newStock, category: e.target.value })
                                        }
                                    >
                                        <option value="All">All Categories</option>
                                        <option value="Boys">Boys</option>
                                        <option value="Girls">Girls</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        min={1}
                                        placeholder="Purchase Price"
                                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                                        value={newStock.purchasePrice}
                                        onChange={(e) =>
                                            setNewStock({
                                                ...newStock,
                                                purchasePrice: e.target.value,
                                            })
                                        }
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        placeholder="Selling Price"
                                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                                        value={newStock.sellingPrice}
                                        onChange={(e) =>
                                            setNewStock({
                                                ...newStock,
                                                sellingPrice: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                                        value={newStock.fromClass}
                                        onChange={(e) =>
                                            setNewStock({
                                                ...newStock,
                                                fromClass: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="">From Class</option>
                                        {classNames.map((cls, idx) => (
                                            <option key={idx} value={cls}>
                                                {cls}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                                        value={newStock.toClass}
                                        onChange={(e) =>
                                            setNewStock({ ...newStock, toClass: e.target.value })
                                        }
                                    >
                                        <option value="">To Class</option>
                                        {classNames.map((cls, idx) => (
                                            <option key={idx} value={cls}>
                                                {cls}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-purple-100">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    onClick={addStock}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 shadow-md transition-all"
                                >
                                    {isEditing ? "Update Stock" : "Add Stock"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default ShowAddStockModal
