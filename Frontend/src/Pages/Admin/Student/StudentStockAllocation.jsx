import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../../config/firebase";
import { doc, getDoc, query, updateDoc, collection, where, getDocs, arrayUnion, writeBatch } from "firebase/firestore";
import { useSchool } from "../../../contexts/SchoolContext";
import { toast } from "react-toastify";
import StudentsStockPaymentHistory from "./StudentsStockPaymentHistory"
import Swal from "sweetalert2"
import NotFound from "../../../components/NotFound"
import { FileTextIcon, User } from "lucide-react";
import { motion } from "framer-motion";
import { ShoppingCart, ReceiptText, History, IndianRupee, CheckCircle } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

const StudentStockAllocation = () => {
    const { studentId } = useParams();
    const { school, refresh } = useSchool();
    const [student, setStudent] = useState(null);
    const [stockItems, setStockItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [activeTab, setActiveTab] = useState('create');
    const [loading, setLoading] = useState(false);
    const [studentStockLoading, setStudentStockLoading] = useState(false);
    const [accounts] = useState(school?.account || ["CASH", "ONLINE"]);
    const [selectedAccount, setSelectedAccount] = useState("CASH");
    const [transactions, setTransactions] = useState([]);
    // for tnx history tab
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5; // Set your preferred page size
    const { userData } = useAuth();

    // Slice transactions based on pagination
    const paginatedTransactions = transactions.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );
    // this remark will user if student get some discount
    const [remark, setRemark] = useState("");

    const fetchStudent = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "students", studentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setStudent({ id: docSnap.id, ...docSnap.data() });
            }
        } catch (error) {
            toast.error("Failed to load student details");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchStudent();
    }, [studentId]);

    useEffect(() => {
        const fetchStock = async () => {
            if (!student || !school) return;

            try {
                setStudentStockLoading(true);
                // Get school's class order for range comparison
                const classOrder = school.class || [
                    "Nursery", "JRKG", "SRKG", "1st", "2nd", "3rd",
                    "4th", "5th", "6th", "7th", "8th", "9th"
                ];

                // Get student's class index
                const studentClassIndex = classOrder.indexOf(student.class);

                const q = query(
                    collection(db, "allStocks"),
                    where("schoolCode", "==", student.schoolCode)
                );

                const snapshot = await getDocs(q);
                const filteredItems = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        // Get indices for fromClass and toClass
                        const fromIndex = classOrder.indexOf(data.fromClass);
                        const toIndex = classOrder.indexOf(data.toClass);

                        return {
                            id: doc.id,
                            ...data,
                            fromIndex,
                            toIndex
                        };
                    })
                    .filter(item => {
                        // Check if student's class falls within the item's class range
                        const inClassRange = studentClassIndex >= item.fromIndex &&
                            studentClassIndex <= item.toIndex;
                        // Check category match
                        const categoryMatch = item.category === "All" ||
                            item.category === (student.gender === "Male" ? "Boys" : "Girls");

                        return inClassRange && categoryMatch && item.quantity > 0;
                    })
                    .map(item => ({
                        ...item,
                        selected: false,
                        purchaseQuantity: 1
                    }));
                setStockItems(filteredItems);
                setSelectedItems(filteredItems);
            } catch (error) {
                toast.error("Failed to load stock items");
            } finally {
                setStudentStockLoading(false);
            }
        };

        fetchStock();
    }, [student, school]);

    useEffect(() => {
        if (student && student.StockPaymentDetail & student && student.StockPaymentDetail.length) {
            setTransactions(student.StockPaymentDetail)
        }
    }, [student])
    const handleSelectItem = (itemId) => {
        setSelectedItems(items => items.map(item =>
            item.id === itemId ? { ...item, selected: !item.selected } : item
        ));
    };

    const handleQuantityChange = (itemId, value) => {
        const purchaseQuantity = Math.max(1, Math.min(Number(value), stockItems.find(i => i.id === itemId).quantity));
        setSelectedItems(items => items.map(item =>
            item.id === itemId ? { ...item, purchaseQuantity } : item
        ));
    };
    const handlePayment = async () => {
        const selected = selectedItems.filter(item => item.selected);
        if (selected.length === 0) return;
        const stockReceiptCount = (school.stockReceiptCount || 0) + 1;
        console.log({ stockReceiptCount })
        const paymentData = {
            account: selectedAccount,
            date: new Date().toISOString(),
            items: selected.map(item => ({
                itemId: item.id,
                itemName: item.itemName,
                quantity: item.purchaseQuantity,
                price: item.sellingPrice,
                total: item.sellingPrice * item.purchaseQuantity
            })),
            total: selected.reduce((sum, item) => sum + (item.sellingPrice * item.purchaseQuantity), 0),
            receiptId: stockReceiptCount,
            feeType: "ItemFee",
            remark
        };

        try {
            const batch = writeBatch(db);
            // Update student document
            const studentRef = doc(db, "students", studentId);
            batch.update(studentRef, {
                StockPaymentDetail: arrayUnion(paymentData)
            });

            // Update stock quantities
            // selected.forEach(item => {
            //     const stockRef = doc(db, "allStocks", item.id);
            //     const newQuantity = item.quantity - item.purchaseQuantity;
            //     batch.update(stockRef, { quantity: newQuantity });
            // });

            await batch.commit();

            // Update UI state
            setSelectedItems(items => items.map(item =>
                item.selected ? { ...item, selected: false, quantity: item.quantity - item.purchaseQuantity } : item
            ));
            // update stockReceiptCount from school
            const schoolsRef = collection(db, 'schools');
            const q = query(schoolsRef, where("Code", "==", userData.schoolCode));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) throw new Error("School not found");
            const schoolDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'schools', schoolDoc.id), {
                stockReceiptCount: stockReceiptCount
            });

            // Show success message and print receipt
            Swal.fire({
                icon: 'success',
                title: 'Payment Successful!',
                html: `
                <div class="text-center">
                    <p>Receipt ID: <strong>${paymentData.receiptId}</strong></p>
                    <p class="mt-2">Total Amount: ₹${paymentData.total}</p>
                </div>`,
                confirmButtonColor: '#2563eb',
            });
            // update studen bec on updating trans StudentsStockPaymentHistory will not update due to conditional rendering
            refresh()
            // setStudent(prev => ({ ...prev, StockPaymentDetail: [...transactions, paymentData] }))
        } catch (error) {
            console.error('Payment error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Payment Failed',
                html: `
                <div class="text-center">
                    <p>${error.message}</p>
                    <p class="mt-2">Please check stock availability and try again.</p>
                </div>
            `,
                confirmButtonColor: '#dc2626'
            });
        }
    };

    const deleteStockTransaction = async (receiptId) => {
        if (!((typeof receiptId === "string" && receiptId.trim()) || typeof receiptId === "number")) return
        const result = await Swal.fire({
            title: 'Delete Stock Transaction?',
            text: `This will permanently remove transaction ${receiptId}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#7e22ce',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Confirm Delete',
        });

        if (!result.isConfirmed) return;

        try {
            const studentRef = doc(db, 'students', student.id);
            const updatedTransactions = transactions.filter(t => t.receiptId !== receiptId);

            await updateDoc(studentRef, {
                StockPaymentDetail: updatedTransactions
            });
            console.log(updatedTransactions)
            // setTransactions(updatedTransactions);
            refresh()
            Swal.fire('Deleted!', 'Stock transaction removed successfully.', 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };
    // animation 
    const tabVariants = {
        active: {
            color: "#6b21a8",
            scale: 1.02
        },
        inactive: {
            color: "#6b21a8b8",
            scale: 1
        }
    };
    if (loading) {
        return <>
            <div className="flex space-x-6 p-8">
                {/* Left: profile card skeleton */}
                <div className="w-1/3 bg-white rounded-lg p-6 shadow animate-pulse">
                    <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto mb-6" />
                    <div className="h-6 bg-gray-200 rounded mb-4" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded" />
                </div>
                {/* Right: details skeleton */}
                <div className="flex-1 bg-white rounded-lg p-6 shadow space-y-4 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-6 bg-gray-200 rounded w-1/4 mt-6" />
                </div>
            </div>
        </>
    }
    if (!student) return <div className="text-center text-black text-xl w-full rounded-lg bg-slate-100 ">
        <NotFound />
    </div>;

    return (
        <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen flex flex-col lg:flex-row gap-8">
            {/* Left Profile Card */}
            <aside className="lg:w-1/3 w-full">
                <div className="sticky top-6">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-fit">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <User size={62} className="text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-1 capitalize">
                                {student.fname} {student.lname}
                            </h2>
                            <p className="text-gray-600 mb-4">
                                {student.class} - <span className="uppercase">{student.div}</span>
                            </p>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {/* Academic Year */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Academic Year</div>
                                    <div className="font-medium text-gray-800 truncate">{student.academicYear || '-'}</div>
                                </div>

                                {/* Status with badge */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Status</div>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs ${student.status === 'current'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                            }`}
                                    >
                                        {student.status}
                                    </span>
                                </div>

                                {/* Date of Birth */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Date of Birth</div>
                                    <div className="font-medium text-gray-800 truncate">
                                        {student.dob ? new Date(student.dob).toLocaleDateString() : '-'}
                                    </div>
                                </div>

                                {/* Bus Stop */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Bus Stop</div>
                                    <div className="font-medium text-gray-800 truncate">{student.busStop || '-'}</div>
                                </div>

                                {/* Father's Name */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Father's Name</div>
                                    <div className="font-medium text-gray-800 truncate">{student.fatherName || '-'}</div>
                                </div>

                                {/* Category */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Student Group</div>
                                    <div className="font-medium text-gray-800 truncate ">
                                        {student.class} - <span className="uppercase">{student.gender}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Right Content Area */}
            <main className="lg:w-2/3 w-full flex flex-col space-y-6 overflow-hidden ">
                {/* Animated Tabs */}
                <div className="flex border-b-2 border-purple-200 relative">
                    <motion.div
                        className="absolute bottom-0 left-0 h-1 bg-purple-600"
                        initial={false}
                        animate={{
                            x: activeTab === 'create' ? 0 : '100%',
                            width: '50%'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                    <button
                        onClick={() => setActiveTab('create')}
                        className="flex-1 text-center py-4"
                    >
                        <motion.div
                            className="flex items-center justify-center gap-2"
                            variants={tabVariants}
                            animate={activeTab === 'create' ? 'active' : 'inactive'}
                            transition={{ duration: 0.2 }}
                        >
                            <ReceiptText className="w-5 h-5" />
                            Create Transaction
                        </motion.div>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className="flex-1 text-center py-4"
                    >
                        <motion.div
                            className="flex items-center justify-center gap-2"
                            variants={tabVariants}
                            animate={activeTab === 'history' ? 'active' : 'inactive'}
                            transition={{ duration: 0.2 }}
                        >
                            <History className="w-5 h-5" />
                            Transaction History
                        </motion.div>
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'create' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {
                            !studentStockLoading ?
                                selectedItems.length ? (
                                    <div className="overflow-hidden">
                                        <div className="bg-white rounded-xl border border-purple-100 shadow-lg overflow-x-auto">
                                            <table className="w-full ">
                                                <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                                                    <tr>
                                                        {["Select", "Item Name", "Unit Price", "Available Qty", "Order Qty"].map((header, idx) => (
                                                            <th
                                                                key={idx}
                                                                className="px-4 py-3 text-left text-sm font-semibold first:rounded-tl-xl last:rounded-tr-xl"
                                                            >
                                                                {header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-purple-100">
                                                    {selectedItems.map(item => (
                                                        <motion.tr
                                                            key={item.id}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="hover:bg-purple-50 transition-colors"
                                                        >
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.selected}
                                                                    onChange={() => handleSelectItem(item.id)}
                                                                    disabled={item.quantity === 0}
                                                                    className="h-5 w-5 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-purple-900 uppercase">{item.itemName}</td>
                                                            <td className="px-4 py-3 text-violet-700">
                                                                <IndianRupee className="inline w-4 h-4 mr-1" />
                                                                {item.sellingPrice}
                                                            </td>
                                                            <td className="px-4 py-3 text-purple-800">{item.quantity}</td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={item.quantity}
                                                                    value={item.purchaseQuantity}
                                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                    className="w-20 px-3 py-1.5 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                                                    disabled={!item.selected}
                                                                />
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-purple-50 text-xl text-center p-6 ">
                                        <p>No Stock allocatated for  <span className="uppercase font-medium font-mono whitespace-nowrap">class - {student.class}</span> and <span className="uppercase font-medium font-mono whitespace-nowrap">Division - {student.div}</span> </p>
                                    </div>
                                ) :
                                <div className="bg-purple-50 rounded-xl p-6 animate-pulse flex flex-col items-center">
                                    <div className="h-8 bg-purple-200 rounded-full w-3/4 mb-4" />
                                    <div className="h-6 bg-purple-200 rounded-full w-1/2 mb-3" />
                                    <div className="h-6 bg-purple-200 rounded-full w-2/3" />
                                </div>
                        }
                        {/* Selected Items Summary */}
                        {selectedItems.filter(item => item.selected).length > 0 ? (
                            <motion.div
                                initial={{ scale: 0.98, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-white rounded-xl border border-purple-100 shadow-lg p-6 space-y-4"
                            >
                                <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                                    <ShoppingCart className="w-6 h-6 text-violet-600" />
                                    Selected Items
                                </h3>

                                <div className="space-y-3">
                                    {selectedItems.filter(item => item.selected).map(item => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ x: -10 }}
                                            animate={{ x: 0 }}
                                            className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-l-4 border-violet-500"
                                        >
                                            <span className="font-medium text-purple-800">{item.itemName}</span>
                                            <div className="flex items-center gap-6 text-violet-700">
                                                <span><IndianRupee className="inline w-4 h-4" />{item.sellingPrice}</span>
                                                <span>× {item.purchaseQuantity}</span>
                                                <span className="font-semibold">
                                                    <IndianRupee className="inline w-4 h-4" />
                                                    {item.sellingPrice * item.purchaseQuantity}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-purple-100 space-y-4">
                                    <select
                                        value={selectedAccount}
                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                        className="w-full p-3 border-2 border-purple-200 rounded-xl bg-white focus:border-violet-500 focus:ring-2 focus:ring-purple-200 text-purple-900"
                                    >
                                        {accounts.map((account, idx) => (
                                            <option key={idx} value={account} className="text-purple-900">
                                                {account}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex justify-between items-center bg-violet-100/50 p-4 rounded-xl">
                                        <span className="text-lg font-bold text-purple-900">Total Amount:</span>
                                        <span className="text-2xl font-extrabold text-violet-700">
                                            <IndianRupee className="inline w-6 h-6 mr-1" />
                                            {selectedItems
                                                .filter(item => item.selected)
                                                .reduce((sum, item) => sum + item.sellingPrice * item.purchaseQuantity, 0)}
                                        </span>
                                    </div>
                                    <div className="remark space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center">
                                            <span className="mr-2 text-purple-500"><FileTextIcon /> </span>
                                            Remark
                                        </label>
                                        <input
                                            value={remark}
                                            onChange={(e) => {
                                                if (e.target.value.trim()) {
                                                    setRemark(e.target.value)
                                                }
                                            }}
                                            type="text"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                        />
                                    </div>
                                    <motion.button
                                        onClick={handlePayment}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <CheckCircle className="inline w-5 h-5 mr-2" />
                                        Process Payment
                                    </motion.button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-purple-50 rounded-xl p-8 text-center border-2 border-dashed border-purple-200">
                                <ShoppingCart className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                <p className="text-lg font-semibold text-purple-700">
                                    No items selected for purchase
                                </p>
                                <p className="text-purple-500 mt-2">
                                    Select items from the list above to begin
                                </p>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <StudentsStockPaymentHistory
                        student={student}
                        transactions={paginatedTransactions}
                        setTransactions={setTransactions}
                        deleteStockTransaction={deleteStockTransaction}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={transactions.length || 0}
                        onPageChange={setCurrentPage}
                    />
                )}
            </main>
        </div>

    );
};



export default StudentStockAllocation;