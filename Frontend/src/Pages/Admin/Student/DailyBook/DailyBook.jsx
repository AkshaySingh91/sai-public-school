// src/Pages/Admin/Students/DailyBook.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext";
import { db } from "../../../../config/firebase";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { FileText, File, ChevronLeft, ChevronRight, Receipt, User, CheckCircle, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { MoreVertical, Trash2, Eye, UserCheck, Search } from 'lucide-react';
import Swal from "sweetalert2"
import { useSchool } from "../../../../contexts/SchoolContext"

const SkeletonLoader = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="animate-pulse flex space-x-4 p-4 bg-gray-100 rounded-xl">
        <div className="rounded-full bg-gray-300 h-10 w-10"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

function formatDateTime(isoString) {
  const dateObj = new Date(isoString);

  const date = dateObj.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const time = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Convert from DD/MM/YYYY to DD-MM-YYYY
  const formattedDate = date.replace(/\//g, "-");

  return {
    date: formattedDate,
    time: time.toLowerCase(),
  };
}
export default function DailyBook() {
  const { school } = useSchool();
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tempFrom, setTempFrom] = useState(() => {
    const initialFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return initialFrom.toISOString().split("T")[0];
  });
  const [tempTo, setTempTo] = useState(() => {
    const initialTo = new Date();
    return initialTo.toISOString().split("T")[0];
  });
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  const [toDate, setToDate] = useState(new Date());
  const perPage = 8;
  // Filters state
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [feeTypeFilter, setFeeTypeFilter] = useState('All Fee Types');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All Payment Modes');
  const [searchTerm, setSearchTerm] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState(null);

  // sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null,    // 'receiptId', 'date', etc.
    direction: 'desc' // 'asc' or 'desc'
  });
  // Memoized filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' ||
        `${transaction.fname} ${transaction.fatherName} ${transaction.lname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.feeType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter?.toLowerCase()?.trim() === 'all status' || transaction.status?.toLowerCase()?.trim() === statusFilter?.toLowerCase()?.trim();
      const matchesFeeType = feeTypeFilter?.toLowerCase()?.trim() === 'all fee types' || transaction.feeType?.toLowerCase()?.trim() === feeTypeFilter?.toLowerCase()?.trim();
      const matchesPaymentMode = paymentModeFilter?.toLowerCase()?.trim() === 'all payment modes' || transaction.paymentMode?.toLowerCase()?.trim() === paymentModeFilter?.toLowerCase()?.trim();

      const transactionDate = new Date(transaction.date);
      const matchesDateRange = transactionDate >= fromDate && transactionDate <= toDate;
      return matchesDateRange && matchesStatus && matchesFeeType && matchesPaymentMode && matchesSearch;
    });
  }, [transactions, statusFilter, feeTypeFilter, paymentModeFilter, searchTerm]);
  // Memoized sorted and filtered transactions
  const sortedAndFilteredTransactions = useMemo(() => {
    let sortableItems = [...filteredTransactions];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        // Special handling for receiptId
        if (sortConfig.key === 'receiptId') {
          // Extract numeric part for proper numeric comparison
          const getNumericPart = (id) => {
            // check if id is already no
            if (typeof id === "number") return id;
            const num = parseInt(id?.replace(/[^\d]/g, '') || 0);
            return isNaN(num) ? 0 : num;
          };

          const aVal = getNumericPart(a.receiptId);
          const bVal = getNumericPart(b.receiptId);

          if (aVal < bVal) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (aVal > bVal) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        }
        // Default comparison for other fields
        else {
          if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [filteredTransactions, sortConfig]);

  const totalPaid = useMemo(() =>
    filteredTransactions.reduce((sum, tnx) => sum + (Number(tnx.amount) || 0), 0),
    [filteredTransactions]
  );
  const totalStudent = useMemo(() =>
    new Set(filteredTransactions.map(t => t.studentId)).size,
    [filteredTransactions]
  );
  // Function to handle sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchDaily = async () => {
    setLoading(true);
    const studentsQ = query(
      collection(db, "students"),
      where("schoolCode", "==", school.Code)
    );
    const snap = await getDocs(studentsQ);
    const allTx = [];

    snap.forEach((doc) => {
      const data = doc.data();
      (data.transactions || []).forEach((t) => {
        const txDate = new Date(t.timestamp);
        // i wrote this bec some of transaction date is not equal to timestamp (deleted by fault)
        const receiptDate = new Date(t.date);
        // dont add imported transaction , but show cancle transaction
        if (!(isNaN(Number(t.receiptId)) && t.status === "completed") && ((txDate >= fromDate && txDate <= toDate) || (!isNaN(receiptDate) && (receiptDate >= fromDate && receiptDate <= toDate)))) {
          allTx.push({
            studentId: doc.id,
            fname: data.fname || "",
            fatherName: data.fatherName || "",
            lname: data.lname || "",
            ...t,
          });
        }
      });
    });

    allTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setTransactions(allTx);
    setLoading(false)
  };
  useEffect(() => {
    fetchDaily();
  }, [school.Code, fromDate, toDate, userData, school.Code]);

  const pageCount = Math.ceil(sortedAndFilteredTransactions.length / perPage);
  const pageData = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedAndFilteredTransactions.slice(start, start + perPage);
  }, [sortedAndFilteredTransactions, page]);

  const exportExcel = () => {
    const wsData = filteredTransactions.map((t) => ({
      Date: new Date(t.date).toLocaleString(),
      Year: t.academicYear,
      Student: `${t.fname || ""} ${t.fatherName || ""} ${t.lname || ""}`.toUpperCase(),
      FeeType: t.feeType,
      Amount: t.amount,
      Mode: t.paymentMode,
      Account: t.account,
      Remark: t.remark,
      ReceiptID: t.receiptId,
      Status: t.status || "pending",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "DailyBook");
    XLSX.writeFile(wb, "DailyBook.xlsx");
  };

  const exportPDF = () => {
    {
      const doc = new jsPDF();
      const headers = [
        [
          "Date",
          "Year",
          "Student",
          "FeeType",
          "Amount",
          "Mode",
          "Account",
          "Remark",
          "ReceiptID",
          "Status",
        ],
      ];
      const rows = filteredTransactions.map((t) => [
        new Date(t.date).toLocaleString(),
        t.academicYear,
        `${t.fname} ${t.fatherName} ${t.lname}`.toUpperCase(),
        t.feeType,
        `₹${t.amount}`,
        t.paymentMode,
        t.account,
        t.remark || "-",
        t.receiptId,
        t.status || "pending",
      ]);

      autoTable(doc, {
        head: headers,
        body: rows,
        theme: "grid",
        headStyles: {
          fillColor: [103, 58, 183],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 9,
          cellPadding: 1.5,
          overflow: "linebreak",
        },
        margin: { top: 20 },
      });
      doc.save("DailyBook.pdf");
    };
  }
  // Get unique filter options
  const statusOptions = useMemo(() =>
    ['All Status', ...new Set(transactions.map(t => t.status))],
    [transactions]
  );

  const feeTypeOptions = useMemo(() =>
    ['All Fee Types', ...new Set(transactions.map(t => t.feeType))],
    [transactions]
  );

  const paymentModeOptions = useMemo(() =>
    ['All Payment Modes ', ...(school?.paymentModes || [])],
    [school]
  );
  const navigate = useNavigate();

  const handleAction = async (action, transaction) => {
    switch (action) {
      case 'details':
        navigate(`/student/${transaction.studentId}/receipt/${transaction.receiptId}`)
        break;
      case 'profile':
        navigate(`/student/${transaction.studentId}`)
        break;
      case 'delete':
        await deleteTransaction(transaction)
        break;
    }
  };
  const deleteTransaction = async (tx) => {
    const result = await Swal.fire({
      title: 'Delete transaction?',
      text: `This will remove ${tx.feeType} payment of ₹${tx.amount}. thus student fees that he/she have to paid will be increased by ₹${tx.amount} because of this transaction will be not added in total fees paid `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7e22ce',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;

    try {
      // get all transaction of that studnet.
      if (!tx.studentId) {
        return Swal.fire('Error', "studentId not Exist.", 'error');
      }
      const isCompleted = tx.status === "completed";
      const studentDoc = await getDoc(doc(db, 'students', tx.studentId));
      if (!studentDoc.exists()) {
        return Swal.fire('Error', "Student not Exist.", 'error');
      };
      const studentData = { id: studentDoc.id, ...studentDoc.data() };
      const studentAllTransaction = studentData.transactions || [];
      const newTrans = studentAllTransaction.filter(
        (t) => (isCompleted ? t.receiptId : t.tempReceiptId) !== (isCompleted ? tx.receiptId : tx.tempReceiptId)
      );
      // return
      const ref = doc(db, 'students', tx.studentId);
      await updateDoc(ref, { transactions: newTrans });
      setTransactions(newTrans)
      fetchDaily()
      Swal.fire('Deleted!', 'Transaction removed and fees rolled back.', 'success');
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };
  return (
    <div className="sm:p-4 p-2 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="sm:bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              icon={User}
              label="Students Paid Today"
              value={totalStudent}
              color="purple"
            />
            <StatCard
              icon={CheckCircle}
              label="Total Paid"
              value={`₹${totalPaid.toLocaleString('en-IN')}`}
              color="green"
            />
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 lg:mt-6">
            <div className="flex items-center space-x-3 sm:mb-4 mb-8 md:mb-0 sm:mt-8 lg:mt-0">
              <div div className="p-3 bg-purple-100 rounded-xl">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <h1 className="text-2xl font-bold text-[#9514FB]">
                Daily Transactions
              </h1>
            </div>
            <div className="flex space-x-3 w-full sm:w-auto">
              <button
                onClick={exportExcel}
                className="flex items-center w-1/2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-all"
              >
                <FileText className="w-4 h-4 mr-2" />
                Excel
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center w-1/2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all"
              >
                <File className="w-4 h-4 mr-2" />
                PDF
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* Filters container: Stack on small, row on md+ */}
              <div className="flex flex-col md:flex-row items-start md:items-center flex-wrap gap-4 mb-6 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700 sm:w-auto">
                    From:
                  </label>
                  <input
                    type="date"
                    value={tempFrom}
                    onChange={(e) => setTempFrom(e.target.value)}
                    className="px-3 py-2 border sm:w-auto w-full border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700 sm:w-auto ">
                    To:
                  </label>
                  <input
                    type="date"
                    value={tempTo}
                    onChange={(e) => setTempTo(e.target.value)}
                    className="px-3 py-2 border w-full sm:w-auto border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => {
                    const from = new Date(tempFrom);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(tempTo);
                    to.setHours(23, 59, 59, 999);
                    setFromDate(from);
                    setToDate(to);
                  }}
                  className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-all"
                >
                  Show
                </button>
                <div className="filter-group">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border-2 border-purple-200 w-full rounded-xl p-2 text-sm text-purple-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  >
                    {statusOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <select
                    value={feeTypeFilter}
                    onChange={(e) => setFeeTypeFilter(e.target.value)}
                    className="border-2 border-purple-200 w-full rounded-xl p-2 text-sm text-purple-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  >
                    {feeTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <select
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="border-2 border-purple-200 w-full rounded-xl p-2 text-sm text-purple-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  >
                    {paymentModeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                {/* search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by student, fee type"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <div className="relative">
                  <select
                    value={sortConfig.key || ''}
                    onChange={(e) => requestSort(e.target.value)}
                    className="appearance-none border-2 border-purple-200 rounded-xl p-2 text-sm text-purple-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none pr-8"
                  >
                    <option value="">Default</option>
                    <option value="receiptId">Receipt ID</option>
                    <option value="amount">Amount</option>
                    <option value="date">Date</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-purple-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                {sortConfig.key && (
                  <button
                    onClick={() => requestSort(sortConfig.key)}
                    className="flex items-center p-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                    title={`Sort ${sortConfig.direction === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {sortConfig.direction === 'asc' ?
                      <ArrowUp className="w-4 h-4 text-purple-700" /> :
                      <ArrowDown className="w-4 h-4 text-purple-700" />
                    }
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-gray-100">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gradient-to-r from-purple-500 to-violet-500 text-white text-xs">
                    <tr>
                      {[
                        "Date & Time",
                        "Academic Year",
                        "Student",
                        "Fee Type",
                        "Amount",
                        "Payment Mode",
                        "Account",
                        "Remarks",
                        "Receipt",
                        "Status",
                        "Actions"
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-2 py-3 text-left font-semibold whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {pageData.map((t, i) => (
                      <tr
                        key={i}
                        className="hover:bg-purple-50 transition-colors text-left"
                      >
                        <td className={`px-2 py-2 text-gray-700 break-words ${t.status !== "completed" ? "opacity-50" : ""} `}>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 capitalize whitespace-nowrap">
                              {formatDateTime(t.timestamp).date}
                            </p>
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDateTime(t.timestamp).time}
                            </p>
                          </div>
                        </td>
                        <td className={`px-2  py-2 text-gray-600 ${t.status !== "completed" ? "opacity-50" : ""} `}>
                          {t.academicYear}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-left">
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {t.fname || '-'} {t.lname || ''}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {t.fatherName || 'Guardian not specified'}
                          </p>
                        </td>
                        <td className={`px-2 py-2 text-gray-600${t.status !== "completed" ? "opacity-50" : ""} `}>{t.feeType}</td>
                        <td className={`px-2 py-2 font-semibold text-purple-700 ${t.status !== "completed" ? "opacity-50" : ""} `}>
                          ₹{t.amount}
                        </td>
                        <td className={`px-2 py-2 text-gray-600 uppercase ${t.status !== "completed" ? "opacity-50" : ""} `}>
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px]">
                            {t.paymentMode}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-gray-600">{t.account}</td>
                        <td className="px-2 py-2 text-gray-600 break-words">
                          {t.remark || "-"}
                        </td>
                        <td className={`px-2 py-2 font-medium break-words ${t.status !== "completed" ? "opacity-50" : ""} `}>
                          {t.status === "completed" ? (
                            <Link
                              to={`/student/${t.studentId}/receipt/${t.receiptId}`}
                            >
                              {t.receiptId}
                            </Link>
                          ) : (
                            <span className="text-gray-400">{t.status}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px]  font-medium ${t.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-800 border-1 border-yellow-200"
                              }`}
                          >
                            {t.status || "pending"}
                          </span>
                        </td>
                        <td className="px-2 py-2 cursor-pointer">
                          <ActionMenu
                            transaction={t}
                            onAction={handleAction}
                            // append index because studnet can make more thatn 1 trns
                            isOpen={openActionMenu === `${t.studentId}-${i}`}
                            onToggle={(isOpen) => setOpenActionMenu(isOpen ? `${t.studentId}-${i}` : null)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination controls: wrap on small screens */}
              <div className="mt-6 flex flex-col md:flex-row items-center justify-center px-4 gap-4">
                {/* Empty State */}
                {pageData.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                    <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                  </div>
                )}

                {/* Pagination */}
                {pageData.length > 0 && (
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/20">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium">{(page - 1) * perPage + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(page * perPage, sortedAndFilteredTransactions.length)}</span> of{" "}
                      <span className="font-medium">{sortedAndFilteredTransactions.length}</span> results
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(page - 1, 1))}
                        disabled={page === 1}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                          let pageNum;
                          if (pageCount <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= pageCount - 2) {
                            pageNum = pageCount - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-8 h-8 text-sm font-medium rounded-lg transition-all ${page === pageNum
                                ? 'bg-purple-500 text-white shadow-lg'
                                : 'text-gray-700 hover:bg-white/50'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setPage(Math.min(page + 1, pageCount))}
                        disabled={page === pageCount}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 whitespace-nowrap">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-1 whitespace-nowrap">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${color === 'purple' ? 'bg-purple-100' : 'bg-green-100'}`}>
        <Icon className={`w-4 h-4 ${color === 'purple' ? 'text-purple-600' : 'text-green-600'}`} />
      </div>
    </div>
  </div>
);
const ActionMenu = ({ transaction, onAction, isOpen, onToggle }) => {
  const menuRef = useRef(null);
  const { userData } = useAuth();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onToggle(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onToggle]);

  const menuItems = [
    {
      icon: UserCheck,
      label: 'Student Profile',
      action: 'profile',
      color: 'text-green-600 hover:text-green-700 hover:bg-green-50'
    },
    {
      icon: Eye,
      label: 'View Transaction',
      action: 'details',
      color: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
    },
    {
      icon: Trash2,
      label: 'Delete Transaction',
      action: 'delete',
      color: 'text-red-600 hover:text-red-700 hover:bg-red-50'
    }
  ].filter((menu) => {
    if (userData.role === "superadmin" && menu.action === "details") {
      return true;
    } else if (userData.role !== "superadmin") {
      return true
    } return false;
  })
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => onToggle(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {menuItems.map((item) => (
              <button
                key={item.action}
                onClick={() => {
                  onAction(item.action, transaction);
                  onToggle(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer font-medium rounded-lg transition-all duration-200 ${item.color}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
