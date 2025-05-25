// src/Pages/Admin/Students/DailyBook.jsx
import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext";
import { db } from "../../../../config/firebase";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  FileText,
  File,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center justify-between space-x-4 p-4">
        {[...Array(9)].map((__, j) => (
          <div key={j} className="h-4 bg-gray-200 rounded flex-1"></div>
        ))}
      </div>
    ))}
  </div>
);

export default function DailyBook() {
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

  useEffect(() => {
    const fetchDaily = async () => {
      setLoading(true);
      const studentsQ = query(
        collection(db, "students"),
        where("schoolCode", "==", userData.schoolCode)
      );
      const snap = await getDocs(studentsQ);
      const allTx = [];

      snap.forEach((doc) => {
        const data = doc.data();
        (data.transactions || []).forEach((t) => {
          const txDate = new Date(t.timestamp);
          if (txDate >= fromDate && txDate <= toDate) {
            allTx.push({
              studentId: doc.id,
              studentName: `${data.fname} ${data.lname}`,
              ...t,
            });
          }
        });
      });

      allTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTransactions(allTx);
      setLoading(false);
    };
    fetchDaily();
  }, [userData.schoolCode, fromDate, toDate]);

  const pageCount = Math.ceil(transactions.length / perPage);
  const pageData = useMemo(() => {
    const start = (page - 1) * perPage;
    return transactions.slice(start, start + perPage);
  }, [transactions, page]);

  const exportExcel = () => {
    const wsData = transactions.map((t) => ({
      Date: new Date(t.date).toLocaleString(),
      Year: t.academicYear,
      Student: t.studentName,
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
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleString(),
      t.academicYear,
      t.studentName,
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

  return (
    // <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
    //   <div className="max-w-7xl mx-auto">
    //     <div className="bg-white rounded-2xl shadow-lg p-6">
    //       <div className="flex flex-col md:flex-row items-center justify-between mb-8">
    //         <div className="flex items-center space-x-3 mb-4 md:mb-0">
    //           <div className="p-3 bg-purple-100 rounded-xl">
    //             <Receipt className="w-6 h-6 text-purple-600" />
    //           </div>
    //           <h1 className="text-3xl font-bold text-gray-800">
    //             Daily Transactions
    //           </h1>
    //         </div>
    //         <div className="flex space-x-3">
    //           <button
    //             onClick={exportExcel}
    //             className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-all"
    //           >
    //             <FileText className="w-4 h-4 mr-2" />
    //             Excel
    //           </button>
    //           <button
    //             onClick={exportPDF}
    //             className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all"
    //           >
    //             <File className="w-4 h-4 mr-2" />
    //             PDF
    //           </button>
    //         </div>
    //       </div>

    //       {loading ? (
    //         <SkeletonLoader />
    //       ) : (
    //         <>
    //           <div className="flex flex-wrap items-center gap-4 mb-6">
    //             <div className="flex items-center gap-2">
    //               <label className="text-sm font-medium text-gray-700">From:</label>
    //               <input
    //                 type="date"
    //                 value={tempFrom}
    //                 onChange={(e) => setTempFrom(e.target.value)}
    //                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
    //               />
    //             </div>
    //             <div className="flex items-center gap-2">
    //               <label className="text-sm font-medium text-gray-700">To:</label>
    //               <input
    //                 type="date"
    //                 value={tempTo}
    //                 onChange={(e) => setTempTo(e.target.value)}
    //                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
    //               />
    //             </div>
    //             <button
    //               onClick={() => {
    //                 const from = new Date(tempFrom);
    //                 from.setHours(0, 0, 0, 0);
    //                 const to = new Date(tempTo);
    //                 to.setHours(23, 59, 59, 999);
    //                 setFromDate(from);
    //                 setToDate(to);
    //               }}
    //               className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-all"
    //             >
    //               Show
    //             </button>
    //           </div>
    //           <div className="overflow-x-auto rounded-xl border border-gray-100">
    //             <table className="w-full table-fixed">
    //               <thead className="bg-gradient-to-r from-purple-500 to-violet-500 text-white text-xs">
    //                 <tr>
    //                   {[
    //                     "Date & Time",
    //                     "Academic Year",
    //                     "Student",
    //                     "Fee Type",
    //                     "Amount",
    //                     "Payment Mode",
    //                     "Account",
    //                     "Remarks",
    //                     "Receipt",
    //                     "Status",
    //                   ].map((h, i) => (
    //                     <th
    //                       key={i}
    //                       className="px-2 py-3 text-left font-semibold whitespace-normal break-words"
    //                     >
    //                       {h}
    //                     </th>
    //                   ))}
    //                 </tr>
    //               </thead>
    //               <tbody className="divide-y divide-gray-100 text-xs">
    //                 {pageData.map((t, i) => (
    //                   <tr
    //                     key={i}
    //                     className="hover:bg-purple-50 transition-colors"
    //                   >
    //                     <td className="px-2 py-2 text-gray-700 break-words">
    //                       {new Date(t.date).toLocaleString()}
    //                     </td>
    //                     <td className="px-2 py-2 text-gray-600">
    //                       {t.academicYear}
    //                     </td>
    //                     <td className="px-2 py-2 font-medium text-gray-900">
    //                       {t.studentName}
    //                     </td>
    //                     <td className="px-2 py-2 text-gray-600">{t.feeType}</td>
    //                     <td className="px-2 py-2 font-semibold text-purple-700">
    //                       ₹{t.amount}
    //                     </td>
    //                     <td className="px-2 py-2 text-gray-600">
    //                       <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px]">
    //                         {t.paymentMode}
    //                       </span>
    //                     </td>
    //                     <td className="px-2 py-2 text-gray-600">{t.account}</td>
    //                     <td className="px-2 py-2 text-gray-600 break-words">
    //                       {t.remark || "-"}
    //                     </td>
    //                     <td className="px-2 py-2 font-medium break-words">
    //                       {/* if trans is completed than only show link*/}
    //                       {t.status === 'completed'
    //                         ? <Link to={`/student/${t.studentId}/receipt/${t.receiptId}`}>{t.receiptId}</Link>
    //                         : <span className="text-gray-400">{t.status}</span>
    //                       }
    //                     </td>
    //                     <td className="px-2 py-2">
    //                       <span
    //                         className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${t.status === "completed"
    //                           ? "bg-green-100 text-green-700"
    //                           : "bg-yellow-100 text-yellow-800"
    //                           }`}
    //                       >
    //                         {t.status || "pending"}
    //                       </span>
    //                     </td>
    //                   </tr>
    //                 ))}
    //               </tbody>
    //             </table>
    //           </div>

    //           <div className="mt-6 flex items-center justify-between px-4">
    //             <div className="text-sm text-gray-600">
    //               Showing {page * perPage - perPage + 1} to{" "}
    //               {Math.min(page * perPage, transactions.length)} of{" "}
    //               {transactions.length} entries
    //             </div>
    //             <div className="flex space-x-2">
    //               <button
    //                 onClick={() => setPage((p) => Math.max(p - 1, 1))}
    //                 disabled={page === 1}
    //                 className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    //               >
    //                 <ChevronLeft className="w-5 h-5 mr-1" />
    //                 Previous
    //               </button>
    //               <button
    //                 onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
    //                 disabled={page === pageCount}
    //                 className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    //               >
    //                 Next
    //                 <ChevronRight className="w-5 h-5 ml-1" />
    //               </button>
    //             </div>
    //           </div>
    //         </>
    //       )}
    //     </div>
    //   </div>
    // </div>
    <div className="sm:p-6 p-2 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="sm:bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="flex items-center space-x-3 sm:mb-4 mb-8 md:mb-0 sm:mt-8">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Receipt className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-[#9514FB]">
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
              </div>

              {/* Table container: already overflow-x-auto, so fine for responsiveness */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full table-fixed min-w-[700px]">
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
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-2 py-3 text-left font-semibold whitespace-normal break-words"
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
                        className="hover:bg-purple-50 transition-colors"
                      >
                        <td className="px-2 py-2 text-gray-700 break-words">
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {t.academicYear}
                        </td>
                        <td className="px-2 py-2 font-medium text-gray-900">
                          {t.studentName}
                        </td>
                        <td className="px-2 py-2 text-gray-600">{t.feeType}</td>
                        <td className="px-2 py-2 font-semibold text-purple-700">
                          ₹{t.amount}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px]">
                            {t.paymentMode}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-gray-600">{t.account}</td>
                        <td className="px-2 py-2 text-gray-600 break-words">
                          {t.remark || "-"}
                        </td>
                        <td className="px-2 py-2 font-medium break-words">
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${t.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {t.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls: wrap on small screens */}
              <div className="mt-6 flex flex-col md:flex-row items-center justify-between px-4 gap-4">
                <div className="text-sm text-gray-600">
                  Showing {page * perPage - perPage + 1} to{" "}
                  {Math.min(page * perPage, transactions.length)} of{" "}
                  {transactions.length} entries
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                    disabled={page === pageCount}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}