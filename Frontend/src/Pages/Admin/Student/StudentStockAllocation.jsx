import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../../config/firebase";
import { doc, getDoc, query, updateDoc, collection, where, getDocs, arrayUnion, writeBatch } from "firebase/firestore";
import { useSchool } from "../../../contexts/SchoolContext";
import { nanoid } from "nanoid";
import { toast } from "react-toastify";
import StudentsStockPaymentHistory from "./StudentsStockPaymentHistory"
import Swal from "sweetalert2"
import { useNavigate } from 'react-router-dom';
import NotFound from "../../../components/NotFound"
import { User } from "lucide-react";

const StudentStockAllocation = () => {
    const { studentId } = useParams();
    const { school } = useSchool();
    const [student, setStudent] = useState(null);
    const [stockItems, setStockItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [activeTab, setActiveTab] = useState('create');
    const [loading, setLoading] = useState(true);
    const [accounts] = useState(school?.account || ["CASH", "ONLINE"]);
    const [selectedAccount, setSelectedAccount] = useState("CASH");
    const [transactions, setTransactions] = useState([]);
    const navigate = useNavigate();

    const fetchStudent = async () => {
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
            if (!student) return;

            try {
                const q = query(
                    collection(db, "allStocks"),
                    where("schoolCode", "==", student.schoolCode),
                    where("className", "==", student.class),
                    where("category", "in", ["All", student.gender === "Male" ? "Boys" : "Girls"])
                );

                const snapshot = await getDocs(q);
                const items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    selected: false,
                    purchaseQuantity: 1
                }));
                setStockItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setSelectedItems(items);
            } catch (error) {
                toast.error("Failed to load stock items");
            }
        };

        fetchStock();
    }, [student]);

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
            receiptId: `STOCK-${nanoid(6).toUpperCase()}`
        };

        try {
            const batch = writeBatch(db);

            // Update student document
            const studentRef = doc(db, "students", studentId);
            batch.update(studentRef, {
                StockPaymentDetail: arrayUnion(paymentData)
            });

            // Update stock quantities
            selected.forEach(item => {
                const stockRef = doc(db, "allStocks", item.id);
                const newQuantity = item.quantity - item.purchaseQuantity;
                batch.update(stockRef, { quantity: newQuantity });
            });

            await batch.commit();

            // Update UI state
            setSelectedItems(items => items.map(item =>
                item.selected ? { ...item, selected: false, quantity: item.quantity - item.purchaseQuantity } : item
            ));

            // Show success message and print receipt
            Swal.fire({
                icon: 'success',
                title: 'Payment Successful!',
                html: `
                <div class="text-center">
                    <p>Receipt ID: <strong>${paymentData.receiptId}</strong></p>
                    <p class="mt-2">Total Amount: ₹${paymentData.total}</p>
                </div>
            `,
                confirmButtonColor: '#2563eb',
            });
            // update studen bec on updating trans StudentsStockPaymentHistory will not update due to conditional rendering
            setStudent(prev => ({ ...prev, StockPaymentDetail: [...transactions, paymentData] }))
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
        if (!(receiptId && receiptId.trim())) return
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

            setTransactions(updatedTransactions);

            Swal.fire('Deleted!', 'Stock transaction removed successfully.', 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };
    // UI Components
    const ProfileCard = () => (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-fit">
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <User size={62} className="text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    {student.fname} {student.lname}
                </h2>
                <p className="text-gray-600 mb-4">
                    {student.class} - {student.div}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <DetailItem label="Academic Year" value={student.academicYear} />
                    <DetailItem label="Status" value={student.status} badge />
                    <DetailItem label="Date of Birth" value={new Date(student.dob).toLocaleDateString()} />
                    <DetailItem label="Bus Stop" value={student.busStop} />
                    <DetailItem label="Father's Name" value={student.fatherName} />
                    <DetailItem label="Category" value={student.category} />
                </div>
            </div>
        </div>
    );

    const DetailItem = ({ label, value, badge }) => (
        <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            {badge ? (
                <span className={`px-2 py-1 rounded-full text-xs ${value === 'current' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {value}
                </span>
            ) : (
                <div className="font-medium text-gray-800 truncate">{value || '-'}</div>
            )}
        </div>
    );

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
        <div className="p-6 flex flex-col lg:flex-row gap-8">
            {/* Left fixed Profile Card */}
            <aside className="lg:w-1/3 w-full">
                <div className="sticky top-6">
                    <ProfileCard />
                </div>
            </aside>

            {/* Right content area */}
            <main className="lg:w-2/3 w-full flex flex-col space-y-6 overflow-auto">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <TabButton
                        active={activeTab === 'create'}
                        onClick={() => setActiveTab('create')}
                        className="flex-1 text-center"
                    >
                        Create Transaction
                    </TabButton>
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                        className="flex-1 text-center"
                    >
                        Transaction History
                    </TabButton>
                </div>

                {/* Content */}
                {activeTab === 'create' ? (
                    <div className="space-y-6">
                        {
                            selectedItems.length ?
                                (<div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Select</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Item Name</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Unit Price</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Available Qty</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Order Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {
                                                selectedItems.map(item => (
                                                    <tr key={item.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.selected}
                                                                onChange={() => handleSelectItem(item.id)}
                                                                disabled={item.quantity === 0}
                                                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                                                        <td className="px-4 py-3">₹{item.sellingPrice}</td>
                                                        <td className="px-4 py-3">{item.quantity}</td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={item.quantity}
                                                                value={item.purchaseQuantity}
                                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                className="w-20 px-2 py-1 border rounded-md text-sm"
                                                                disabled={!item.selected}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>) :
                                <div className="bg-white rounded-lg p-6 animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded mx-auto  mb-2 w-3/4"></div>
                                    <div className="h-6 bg-gray-200 rounded mx-auto  mb-2 w-1/2"></div>
                                    <div className="h-6 bg-gray-200 rounded mx-auto  w-2/3"></div>
                                </div>
                        }


                        {/* Selected Items Summary */}
                        {selectedItems.filter(item => item.selected).length > 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                                <h3 className="text-lg font-semibold">Selected Items</h3>
                                <div className="space-y-4">
                                    {selectedItems.filter(item => item.selected).map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <span className="font-medium">{item.itemName}</span>
                                            <div className="flex items-center gap-6">
                                                <span className="w-20">₹{item.sellingPrice}</span>
                                                <span className="w-20">× {item.purchaseQuantity}</span>
                                                <span className="w-24 font-medium">
                                                    ₹{item.sellingPrice * item.purchaseQuantity}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-gray-200 space-y-4">
                                    <select
                                        name="paymentMethod"
                                        id="paymentMethod"
                                        value={selectedAccount}
                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                        className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        {accounts.map((account, idx) => (
                                            <option key={idx} value={account}>{account}</option>
                                        ))}
                                    </select>

                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold">Total Amount:</span>
                                        <span className="text-2xl font-bold text-blue-600">
                                            ₹{selectedItems
                                                .filter(item => item.selected)
                                                .reduce((sum, item) => sum + item.sellingPrice * item.purchaseQuantity, 0)}
                                        </span>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Process Payment
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-100 font-semibold text-xl  text-gray-600 text-center  rounded-lg p-6  ">
                                No Item seleted for purchase
                            </div>
                        )}
                    </div>
                ) : (
                    <StudentsStockPaymentHistory
                        student={student}
                        transactions={transactions}
                        setTransactions={setTransactions}
                        deleteStockTransaction={deleteStockTransaction}
                    />
                )}
            </main>
        </div>
    );
};

// Sub-components for better readability
const TabButton = ({ active, children, onClick }) => (
    <button
        className={`px-6 py-3 font-medium ${active ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
        onClick={onClick}
    >
        {children}
    </button>
);


export default StudentStockAllocation;