// src/Pages/Admin/Students/DailyBook.jsx
import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../config/firebase";
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
import { motion } from "framer-motion";

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

export default function StockDailyBook() {
  const { userData } = useAuth();
  const [stockTransactions, setStockTransactions] = useState([]);
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
    const fetchTransactions = async () => {
      setLoading(true);
      const studentsQ = query(
        collection(db, "students"),
        where("schoolCode", "==", userData.schoolCode)
      );
      const snap = await getDocs(studentsQ);
      const allTx = [];

      snap.forEach((studentDoc) => {
        const studentData = studentDoc.data();
        const studentInfo = {
          id: studentDoc.id,
          name: `${studentData.fname} ${studentData.lname}`,
          class: studentData.class,
          gender: studentData.gender,
        };

        // Process stock transactions
        (studentData.StockPaymentDetail || []).forEach((stockTx) => {
          const txDate = new Date(stockTx.date);
          if (txDate >= fromDate && txDate <= toDate) {
            // Calculate totals
            const totalQuantity = stockTx.items.reduce(
              (sum, item) => sum + (Number(item.quantity) || 0),
              0
            );

            const totalAmount = stockTx.items.reduce(
              (sum, item) => sum + (Number(item.total) || 0),
              0
            );

            const itemsList = stockTx.items
              .map((item) => `${item?.itemName?.toUpperCase()}`)
              .join(", ");

            allTx.push({
              studentId: studentDoc.id,
              studentName: studentInfo.name,
              date: stockTx.date,
              items: itemsList,
              totalQuantity,
              totalAmount,
              account: stockTx.account,
              receiptId: stockTx.receiptId,
              status: "completed",
              class: studentInfo.class,
              gender: studentInfo.gender,
            });
          }
        });
      });

      allTx.sort((a, b) => new Date(b.date) - new Date(a.date));
      setStockTransactions(allTx);
      setLoading(false);
    };

    fetchTransactions();
  }, [userData.schoolCode, fromDate, toDate]);

  const pageCount = Math.ceil(stockTransactions.length / perPage);
  const pageData = useMemo(() => {
    const start = (page - 1) * perPage;
    return stockTransactions.slice(start, start + perPage);
  }, [stockTransactions, page]);

  const exportExcel = () => {
    const wsData = stockTransactions.map((t) => ({
      Date: new Date(t.date).toLocaleString(),
      Student: t.studentName,
      Class: t.class,
      Gender: t.gender,
      Items: t.items,
      "Total Quantity": t.totalQuantity,
      "Total Amount": t.totalAmount,
      Account: t.account,
      "Receipt ID": t.receiptId,
      Status: t.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "StockTransactions");
    XLSX.writeFile(wb, "Stock_Daily_Book.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const headers = [
      [
        "Date",
        "Student",
        "Class",
        "Gender",
        "Items",
        "Total Qty",
        "Total Amount",
        "Account",
        "Receipt",
        "Status",
      ],
    ];

    const rows = stockTransactions.map((t) => [
      new Date(t.date).toLocaleString(),
      t.studentName,
      t.class,
      t.gender,
      t.items,
      t.totalQuantity,
      t.totalAmount,
      t.account,
      t.receiptId,
      t.status,
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.2,
        overflow: "linebreak",
      },
      margin: { top: 20 },
    });
    doc.save("Stock_Daily_Book.pdf");
  };
  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-purple-100">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl shadow-sm">
                <Receipt className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Stock Transactions
              </h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportExcel}
                className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                Excel
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
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
              <div className="flex flex-col sm:flex-wrap sm:flex-row items-center gap-4 mb-6">
                {/* From Date */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700">
                    From:
                  </label>
                  <input
                    type="date"
                    value={tempFrom}
                    onChange={(e) => setTempFrom(e.target.value)}
                    className="px-3 py-2 w-full sm:w-auto border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50"
                  />
                </div>

                {/* To Date */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700">
                    To:
                  </label>
                  <input
                    type="date"
                    value={tempTo}
                    onChange={(e) => setTempTo(e.target.value)}
                    className="px-3 py-2 w-full sm:w-auto border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50"
                  />
                </div>

                {/* Show Button */}
                <button
                  onClick={() => {
                    const from = new Date(tempFrom);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(tempTo);
                    to.setHours(23, 59, 59, 999);
                    setFromDate(from);
                    setToDate(to);
                  }}
                  className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md w-full sm:w-auto"
                >
                  Show
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-purple-100 shadow-sm overflow-y-hidden">
                <table className="w-full overflow-y-hidden">
                  <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white text-xs">
                    <tr>
                      {[
                        "Date & Time",
                        "Student",
                        "Class",
                        "Gender",
                        "Items",
                        "Total Qty",
                        "Amount",
                        "Account",
                        "Receipt",
                        "Status",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-left font-semibold tracking-wide whitespace-normal break-words border-r border-purple-500/30 last:border-r-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100 text-xs">
                    {pageData.map((t, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-purple-50/50 even:bg-purple-100/50 hover:bg-purple-200/50 transition-colors duration-150"
                      >
                        {/* Table cells updated with theme colors */}
                        <td className="px-4 py-3 text-gray-700 break-words font-medium">
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-violet-900 capitalize">
                          {t.studentName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.class}</td>
                        <td className="px-4 py-3 text-gray-600">{t.gender}</td>
                        <td className="px-4 py-3 text-violet-700 break-words">
                          {t.items}
                        </td>
                        <td className="px-4 py-3 text-center text-purple-800 font-medium">
                          {t.totalQuantity}
                        </td>
                        <td className="px-4 py-3 font-bold text-purple-700">
                          ₹{t.totalAmount}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.account}</td>
                        <td className="px-4 py-3 font-medium break-words">
                          <Link
                            to={`/stockallocate/${t.studentId}/receipt/${t.receiptId}`}
                            className="text-violet-600 hover:text-violet-800 underline decoration-2 underline-offset-2"
                          >
                            {t.receiptId}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100/80 text-emerald-800">
                            {t.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Updated Pagination */}
              {/* <div className="mt-6 flex items-center justify-between px-4">
                                <div className="text-sm text-violet-800/90">
                                    Showing {page * perPage - perPage + 1} to{" "}
                                    {Math.min(page * perPage, stockTransactions.length)} of{" "}
                                    {stockTransactions.length} entries
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                        disabled={page === 1}
                                        className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5 mr-1" />
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                                        disabled={page === pageCount}
                                        className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                        <ChevronRight className="w-5 h-5 ml-1" />
                                    </button>
                                </div>
                            </div> */}
              <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 px-4">
                <div className="text-sm text-violet-800/90 text-center md:text-left">
                  Showing {page * perPage - perPage + 1} to{" "}
                  {Math.min(page * perPage, stockTransactions.length)} of{" "}
                  {stockTransactions.length} entries
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Previous
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                    disabled={page === pageCount}
                    className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
