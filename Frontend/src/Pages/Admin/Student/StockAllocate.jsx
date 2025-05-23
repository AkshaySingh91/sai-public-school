import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import { LuWallet, LuDownload } from "react-icons/lu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import TableLoader from "../../../components/TableLoader";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

function StockAllocate() {
  const { school } = useSchool();
  const { userData: users } = useAuth();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filters, setFilters] = useState({
    class: "",
    div: "",
    gender: "",
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState(false);

  // Class and division options
  const classOptions = school.class?.length
    ? school.class
    : [
        "Nursery",
        "JRKG",
        "SRKG",
        "1st",
        "2nd",
        "3rd",
        "4th",
        "5th",
        "6th",
        "7th",
        "8th",
        "9th",
      ];
  const divOptions = school.divisions?.length
    ? school.divisions
    : ["A", "B", "C", "D", "SEMI"];

  useEffect(() => {
    const fetchStudents = async () => {
      const studentsCollection = collection(db, "students");
      try {
        const q = query(
          studentsCollection,
          where("schoolCode", "==", users?.schoolCode)
        );
        const snapshot = await getDocs(q);
        const studentsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStudents(studentsList);
        setFilteredStudents(studentsList);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchStudents();
  }, [users?.schoolCode]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    const filtered = students.filter(
      (student) =>
        (newFilters.class ? student.class === newFilters.class : true) &&
        (newFilters.div ? student.div === newFilters.div : true) &&
        (newFilters.gender ? student.gender === newFilters.gender : true) &&
        (newFilters.search
          ? student.fname
              .toLowerCase()
              .includes(newFilters.search.toLowerCase())
          : true)
    );
    setFilteredStudents(filtered);
    setCurrentPage(1);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = filteredStudents.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Export functions
  const calculateStockData = (student) => {
    const stockDetails = student.StockPaymentDetail || [];
    const allItems = new Set();
    let totalPayment = 0;

    stockDetails.forEach((transaction) => {
      transaction.items.forEach((item) => {
        allItems.add(item.itemName);
        totalPayment += item.amount * item.quantity;
      });
    });

    return {
      totalItemBought: allItems.size,
      totalPayment: totalPayment,
    };
  };

  const exportToExcel = () => {
    setExportLoading(true);
    const data = filteredStudents.map((student) => {
      const stockData = calculateStockData(student);
      return {
        "Student ID": student.id,
        Name: `${student.fname} ${student.lname}`,
        Class: student.class,
        Division: student.div,
        Gender: student.gender,
        "Total Items Bought": stockData.totalItemBought,
        "Total Payment": stockData.totalPayment,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Allocation");
    XLSX.writeFile(wb, "Stock_Allocation.xlsx");
    setExportLoading(false);
  };

  const exportToPDF = () => {
    setExportLoading(true);
    const doc = new jsPDF();
    const headers = [
      [
        "Student ID",
        "Name",
        "Class",
        "Division",
        "Gender",
        "Items Bought",
        "Total Payment",
      ],
    ];
    const data = filteredStudents.map((student) => {
      const stockData = calculateStockData(student);
      return [
        student.id,
        `${student.fname} ${student.lname}`,
        student.class,
        student.div,
        student.gender,
        stockData.totalItemBought,
        stockData.totalPayment,
      ];
    });

    autoTable(doc, {
      head: headers,
      body: data,
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { top: 20 },
      styles: { fontSize: 9 },
    });
    doc.save("Stock_Allocation.pdf");
    setExportLoading(false);
  };

  return (
    <>
      {!currentStudents.length ? (
        <TableLoader />
      ) : (
        <div className="p-8 space-y-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent mb-4 md:mb-0">
              Stock Allocation
            </h1>
            <div className="flex gap-3">
              <motion.button
                onClick={exportToExcel}
                disabled={exportLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 disabled:opacity-50 shadow-md transition-all"
              >
                <LuDownload className="mr-2 w-4 h-4" /> Excel
              </motion.button>
              <motion.button
                onClick={exportToPDF}
                disabled={exportLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 shadow-md transition-all"
              >
                <LuDownload className="mr-2 w-4 h-4" /> PDF
              </motion.button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-xl shadow-lg border border-purple-100">
            {[
              { name: "class", options: classOptions, label: "All Classes" },
              { name: "div", options: divOptions, label: "All Divisions" },
              {
                name: "gender",
                options: ["Male", "Female", "Other"],
                label: "All Genders",
              },
            ].map((filter) => (
              <select
                key={filter.name}
                name={filter.name}
                value={filters[filter.name]}
                onChange={handleFilterChange}
                className="border-2 border-purple-200 rounded-xl p-2 text-sm text-purple-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">{filter.label}</option>
                {filter.options.map((option) => (
                  <option
                    key={option}
                    value={option}
                    className="text-purple-900"
                  >
                    {option}
                  </option>
                ))}
              </select>
            ))}

            <input
              type="text"
              name="search"
              placeholder="Search by name..."
              value={filters.search}
              onChange={handleFilterChange}
              className="border-2 border-purple-200 rounded-xl p-2 text-sm text-purple-900 placeholder-purple-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border-2 border-purple-200 rounded-xl p-2 text-sm text-purple-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value} className="text-purple-900">
                  {value} per page
                </option>
              ))}
            </select>
          </div>

          {/* Students Table */}
          {/* <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-purple-100">
             <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-purple-100">
            <table className="w-full table-fixed overflow-x-auto">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white text-xs">
                <tr>
                  {["Name", "Class", "Division", "Gender", "Actions"].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left font-semibold tracking-wide whitespace-normal break-words border-r border-purple-500/30 last:border-r-0"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 text-xs">
                {currentStudents.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-purple-50/50 even:bg-purple-100/50 hover:bg-purple-200/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-purple-900">
                      {student.fname} {student.lname}
                    </td>
                    <td className="px-6 py-4 text-sm text-purple-800">{student.class}</td>
                    <td className="px-6 py-4 text-sm text-purple-800">{student.div}</td>
                    <td className="px-6 py-4 text-sm text-purple-800">{student.gender}</td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/stockallocate/${student.id}`}
                        className="text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        <LuWallet className="w-6 h-6" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          </div> */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-purple-100">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white text-xs">
                  <tr>
                    {["Name", "Class", "Division", "Gender", "Actions"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left font-semibold tracking-wide whitespace-normal break-words border-r border-purple-500/30 last:border-r-0"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 text-xs">
                  {currentStudents.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-purple-50/50 even:bg-purple-100/50 hover:bg-purple-200/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-purple-900">
                        {student.fname} {student.lname}
                      </td>
                      <td className="px-6 py-4 text-sm text-purple-800">
                        {student.class}
                      </td>
                      <td className="px-6 py-4 text-sm text-purple-800">
                        {student.div}
                      </td>
                      <td className="px-6 py-4 text-sm text-purple-800">
                        {student.gender}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/stockallocate/${student.id}`}
                          className="text-violet-600 hover:text-violet-800 transition-colors"
                        >
                          <LuWallet className="w-6 h-6" />
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {/* <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-lg border border-purple-100">
            <span className="text-sm text-violet-700 mb-2 md:mb-0">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredStudents.length)} of{" "}
              {filteredStudents.length} entries
            </span>
            <div className="flex space-x-2">
              <motion.button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                whileHover={{ scale: 1.05 }}
                className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </motion.button>
              <span className="px-4 py-2.5 text-violet-700 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <motion.button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                whileHover={{ scale: 1.05 }}
                className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 ml-1" />
                Next
              </motion.button>
            </div>
          </div> */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-lg border border-purple-100 space-y-3 md:space-y-0 md:space-x-4">
            <span className="text-sm text-violet-700 text-center md:text-left">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredStudents.length)} of{" "}
              {filteredStudents.length} entries
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <motion.button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                whileHover={{ scale: 1.05 }}
                className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </motion.button>

              <span className="px-4 py-2 text-sm text-violet-700 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <motion.button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                whileHover={{ scale: 1.05 }}
                className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StockAllocate;
