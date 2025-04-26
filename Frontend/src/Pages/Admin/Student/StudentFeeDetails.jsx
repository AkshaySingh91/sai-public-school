// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { useAuth } from '../../../contexts/AuthContext';
// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { db } from '../../../config/firebase';
// import { Download, FileText, UserCheck, UserX } from 'react-feather';
// import * as XLSX from 'xlsx';
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';
// import { Pagination } from '../../../components/Pagination';
// import { Spinner } from '../../../components/Loading';

// export default function StudentFeeDetails() {
//     const { userData } = useAuth();
//     const [students, setStudents] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [activeTab, setActiveTab] = useState('active');
//     const [currentPage, setCurrentPage] = useState(1);
//     const itemsPerPage = 10;

//     useEffect(() => {
//         const fetchStudents = async () => {
//             try {
//                 setLoading(true);
//                 const q = query(
//                     collection(db, 'students'),
//                     where('schoolCode', '==', userData.schoolCode)
//                 );
//                 const snapshot = await getDocs(q);
//                 const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//                 setStudents(data);
//             } catch (error) {
//                 console.error("Error fetching students:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchStudents();
//     }, [userData.schoolCode]);

//     const filteredStudents = useMemo(() =>
//         students.filter(s => s.status === activeTab)
//         , [students, activeTab]);

//     const currentItems = useMemo(() => {
//         const start = (currentPage - 1) * itemsPerPage;
//         return filteredStudents.slice(start, start + itemsPerPage);
//     }, [filteredStudents, currentPage]);

//     const formatCurrency = (amount) =>
//         new Intl.NumberFormat('en-IN', {
//             style: 'currency',
//             currency: 'INR',
//             maximumFractionDigits: 0
//         }).format(amount).replace('₹', '₹ ');

//     const processStudentData = (student) => {
//         const fees = student.allFee || {};
//         const transactions = student.transactions || [];

//         const paid = transactions
//             .filter(t => t.academicYear === student.academicYear)
//             .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

//         const totalFees = (fees.schoolFees?.total || 0) +
//             (fees.transportFee || 0) +
//             (fees.messFee || 0) +
//             (fees.hostelFee || 0);

//         const totalDiscount = (fees.schoolFeesDiscount || 0) +
//             (fees.transportFeeDiscount || 0);

//         return {
//             ...student,
//             lastYearBalance: (fees.lastYearBalanceFee || 0) + (fees.lastYearTransportFee || 0),
//             totalFees,
//             totalDiscount,
//             afterDiscount: totalFees - totalDiscount,
//             paid,
//             outstanding: (totalFees - totalDiscount) - paid
//         };
//     };

//     const exportExcel = useCallback(() => {
//         const data = filteredStudents.map(student => {
//             const processed = processStudentData(student);
//             return {
//                 'Academic Year': student.academicYear,
//                 'Student Type': student.type,
//                 'Name': `${student.fname} ${student.lname}`,
//                 'Class': student.class,
//                 'Division': student.div,
//                 'Fee ID': student.feeId,
//                 'Last Year Balance': processed.lastYearBalance,
//                 'Total Fees': processed.totalFees,
//                 'Discounts': processed.totalDiscount,
//                 'Net Fees': processed.afterDiscount,
//                 'Paid Amount': processed.paid,
//                 'Outstanding': processed.outstanding
//             };
//         });

//         const worksheet = XLSX.utils.json_to_sheet(data);
//         const workbook = XLSX.utils.book_new();
//         XLSX.utils.book_append_sheet(workbook, worksheet, 'Fee Details');
//         XLSX.writeFile(workbook, `Student_Fees_${activeTab}.xlsx`);
//     }, [filteredStudents, activeTab]);

//     const exportPDF = useCallback(() => {
//         const doc = new jsPDF();
//         const data = filteredStudents.map(processStudentData);

//         doc.text(`${activeTab.toUpperCase()} Student Fee Details`, 14, 16);
//         doc.autoTable({
//             startY: 25,
//             head: [
//                 ['Name', 'Class', 'Fee ID', 'Last Year', 'Total Fees',
//                     'Discount', 'Net Fees', 'Paid', 'Outstanding']
//             ],
//             body: data.map(s => [
//                 `${s.fname} ${s.lname}`,
//                 `${s.class} - ${s.div}`,
//                 s.feeId,
//                 formatCurrency(s.lastYearBalance),
//                 formatCurrency(s.totalFees),
//                 formatCurrency(s.totalDiscount),
//                 formatCurrency(s.afterDiscount),
//                 formatCurrency(s.paid),
//                 formatCurrency(s.outstanding)
//             ]),
//             theme: 'grid',
//             styles: { fontSize: 8 },
//             headStyles: { fillColor: [79, 70, 229] }
//         });
//         doc.save(`Student_Fees_${activeTab}.pdf`);
//     }, [filteredStudents, activeTab]);

//     if (loading) return <div className="text-center p-8"><Spinner size="lg" /></div>;

//     return (
//         <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
//             {/* Header */}
//             <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//                 <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
//                     <FileText className="w-6 h-6 text-purple-600" />
//                     Student Fee Details
//                 </h2>
//                 <div className="flex gap-2">
//                     <button
//                         onClick={exportExcel}
//                         className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
//                     >
//                         <Download className="w-4 h-4" />
//                         Excel
//                     </button>
//                     <button
//                         onClick={exportPDF}
//                         className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
//                     >
//                         <Download className="w-4 h-4" />
//                         PDF
//                     </button>
//                 </div>
//             </div>

//             {/* Tabs */}
//             <div className="flex border-b border-gray-200">
//                 {['active', 'inactive'].map(tab => (
//                     <button
//                         key={tab}
//                         onClick={() => {
//                             setActiveTab(tab);
//                             setCurrentPage(1);
//                         }}
//                         className={`px-6 py-3 font-medium relative flex items-center gap-2 ${activeTab === tab
//                                 ? 'text-purple-600 border-b-2 border-purple-600'
//                                 : 'text-gray-500 hover:text-purple-500'
//                             }`}
//                     >
//                         {tab === 'active' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
//                         {tab.charAt(0).toUpperCase() + tab.slice(1)}
//                     </button>
//                 ))}
//             </div>

//             {/* Table */}
//             <div className="overflow-x-auto p-4">
//                 <table className="min-w-full divide-y divide-gray-200">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             {['Name', 'Class', 'Fee ID', 'Last Year', 'Total Fees', 'Discount',
//                                 'Net Fees', 'Paid', 'Outstanding'].map(header => (
//                                     <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
//                                         {header}
//                                     </th>
//                                 ))}
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-200">
//                         {currentItems.map(student => {
//                             const s = processStudentData(student);
//                             return (
//                                 <tr key={student.id} className="hover:bg-gray-50">
//                                     <td className="px-4 py-3 text-sm font-medium text-gray-900">
//                                         {student.fname} {student.lname}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm text-gray-600">
//                                         {student.class} - {student.div}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm text-purple-600 font-mono">
//                                         {student.feeId}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm text-gray-600">
//                                         {formatCurrency(s.lastYearBalance)}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm text-gray-600">
//                                         {formatCurrency(s.totalFees)}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm text-red-600">
//                                         -{formatCurrency(s.totalDiscount)}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm text-gray-600">
//                                         {formatCurrency(s.afterDiscount)}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm text-green-600">
//                                         {formatCurrency(s.paid)}
//                                     </td>
//                                     <td className="px-4 py-3 text-sm font-semibold">
//                                         <span className={
//                                             s.outstanding > 0 ? 'text-red-600' : 'text-green-600'
//                                         }>
//                                             {formatCurrency(Math.abs(s.outstanding))}
//                                         </span>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>

//                 {currentItems.length === 0 && (
//                     <div className="text-center py-8 text-gray-500">
//                         No {activeTab} students found
//                     </div>
//                 )}
//             </div>

//             {/* Pagination */}
//             <div className="px-6 py-4 border-t border-gray-200">
//                 <Pagination
//                     currentPage={currentPage}
//                     totalItems={filteredStudents.length}
//                     itemsPerPage={itemsPerPage}
//                     onPageChange={setCurrentPage}
//                 />
//             </div>
//         </div>
//     );
// }