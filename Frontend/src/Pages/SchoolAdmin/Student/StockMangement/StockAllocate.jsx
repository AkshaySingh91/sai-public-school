import React, { useState, useEffect } from "react";
import { db } from "../../../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../../../../contexts/AuthContext";
import { useInstitution } from "../../../../contexts/InstitutionContext";
import { LuWallet, LuDownload } from "react-icons/lu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import TableLoader from "../../../../components/TableLoader";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";

function StockAllocate() {
  const { school } = useInstitution();
  const { userData } = useAuth();
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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    const fetchStudents = async () => {
      const studentsCollection = collection(db, "students");
      try {
        const q = query(
          studentsCollection,
          where("schoolCode", "==", school.Code)
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
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [school.Code, userData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    const filtered = students.filter(
      (student) =>
        (newFilters.class ? student.class?.toLowerCase()?.trim() === newFilters.class?.toLowerCase()?.trim() : true) &&
        (newFilters.div ? student.div?.toLowerCase()?.trim() === newFilters.div?.toLowerCase()?.trim() : true) &&
        (newFilters.gender ? student.gender?.toLowerCase()?.trim() === newFilters.gender?.toLowerCase()?.trim() : true) &&
        (newFilters.search?.trim()
          ? student.fname?.toLowerCase()?.trim()
            .includes(newFilters.search?.trim().toLowerCase())
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
      {loading ? (
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

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Class Filter */}
              <div className="space-y-1">
                <label htmlFor="class" className="block text-xs font-medium text-gray-500">
                  Class
                </label>
                <select
                  id="class"
                  name="class"
                  value={filters.class}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  <option value="">All Classes</option>
                  {classOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Filter */}
              <div className="space-y-1">
                <label htmlFor="div" className="block text-xs font-medium text-gray-500">
                  Division
                </label>
                <select
                  id="div"
                  name="div"
                  value={filters.div}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  <option value="">All Divisions</option>
                  {divOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div className="space-y-1">
                <label htmlFor="gender" className="block text-xs font-medium text-gray-500">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={filters.gender}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  <option value="">All Genders</option>
                  {["Male", "Female", "Other"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="search" className="block text-xs font-medium text-gray-500">
                  Search
                </label>
                <div className="relative">
                  <input
                    id="search"
                    type="text"
                    name="search"
                    placeholder="Search by name..."
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              {/* Optional: Clear Filters Button */}
              {(filters.class || filters.div || filters.gender || filters.search) && (
                <button
                  onClick={() => {
                    setFilters({
                      class: '',
                      div: '',
                      gender: '',
                      search: ''
                    });
                    setFilteredStudents(students);
                  }}
                  className="px-3 py-2 rounded-md bg-purple-500 text-sm text-white hover:text-purple-800 whitespace-nowrap"
                >
                  Clear filters
                </button>
              )}            </div>
          </div>


          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-purple-600 to-violet-700">
                  <tr>
                    {["Name", "Fee ID", "Class", "Division", "Gender", "Contact", "Status", "Type", "Actions"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-purple-500/20 last:border-r-0"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStudents.length > 0 ? (
                    currentStudents.map((student, index) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {student.fname || '-'} {student.lname || ''}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {student.fatherName || 'Guardian not specified'}
                            </p>
                          </div>
                        </td>

                        {/* Fee ID */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-800 rounded">
                            {student.feeId || "N/A"}
                          </span>
                        </td>

                        {/* Class */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 uppercase">
                          {student.class || "N/A"}
                        </td>

                        {/* Division */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 uppercase">
                          {student.div || "N/A"}
                        </td>

                        {/* Gender */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student?.gender?.toLowerCase() === "male"
                              ? "bg-blue-100 text-blue-800"
                              : student?.gender?.toLowerCase() === "female"
                                ? "bg-pink-100 text-pink-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {student.gender || "N/A"}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {student.fatherMobile ? (
                            <a
                              href={`tel:${student.fatherMobile}`}
                              className="text-purple-600 hover:text-purple-800 hover:underline"
                            >
                              {student.fatherMobile}
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap capitalize">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status?.toLowerCase() === "new"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {student.status || "N/A"}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 uppercase">
                          {student.type || "N/A"}
                        </td>

                        {/* Actions */}
                        <td className=" px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                          <Link
                            to={`/school/stockallocate/${student.id}`}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            title="Allocate Stock"
                          >
                            <LuWallet className="w-4 h-4 mr-1 text-purple-500" />
                            Allocate
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900">No students found</h3>
                          <p className="text-gray-500 mt-1">
                            {filters.class || filters.div || filters.gender || filters.search
                              ? "Try adjusting your search or filter criteria"
                              : "No students are currently registered"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col justify-between items-center bg-white p-4 rounded-xl shadow-lg border border-purple-100 space-y-3 md:space-y-4">
            <div className="paginaition-navigaion w-full flex flex-row justify-between items-center  space-y-3 md:space-y-0 md:space-x-4 px-4">
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
            {/* Items Per Page Selector - Separate row */}
            <div className="mt-4 flex items-center justify-between self-end">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {[1, 25, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">entries</span>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StockAllocate;
