import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import { LuWallet, LuDownload } from "react-icons/lu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { autoTable } from 'jspdf-autotable'
import TableLoader from "../../../components/TableLoader"

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
  const classOptions = school.class?.length ? school.class : [
    "Nursery", "JRKG", "SRKG", "1st", "2nd", "3rd", "4th",
    "5th", "6th", "7th", "8th", "9th"
  ];
  const divOptions = school.divisions?.length ? school.divisions : ["A", "B", "C", "D", "SEMI"];

  useEffect(() => {
    const fetchStudents = async () => {
      const studentsCollection = collection(db, "students");
      try {
        const q = query(
          studentsCollection,
          where("schoolCode", "==", users?.schoolCode)
        );
        const snapshot = await getDocs(q);
        const studentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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

    const filtered = students.filter(student =>
      (newFilters.class ? student.class === newFilters.class : true) &&
      (newFilters.div ? student.div === newFilters.div : true) &&
      (newFilters.gender ? student.gender === newFilters.gender : true) &&
      (newFilters.search ? student.fname.toLowerCase().includes(newFilters.search.toLowerCase()) : true)
    );
    setFilteredStudents(filtered);
    setCurrentPage(1);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Export functions
  const calculateStockData = (student) => {
    const stockDetails = student.StockPaymentDetail || [];
    const allItems = new Set();
    let totalPayment = 0;

    stockDetails.forEach(transaction => {
      transaction.items.forEach(item => {
        allItems.add(item.itemName);
        totalPayment += item.amount * item.quantity;
      });
    });

    return {
      totalItemBought: allItems.size,
      totalPayment: totalPayment
    };
  };

  const exportToExcel = () => {
    setExportLoading(true);
    const data = filteredStudents.map(student => {
      const stockData = calculateStockData(student);
      return {
        "Student ID": student.id,
        "Name": `${student.fname} ${student.lname}`,
        "Class": student.class,
        "Division": student.div,
        "Gender": student.gender,
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
      ["Student ID", "Name", "Class", "Division", "Gender", "Items Bought", "Total Payment"]
    ];
    const data = filteredStudents.map(student => {
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
        fontStyle: "bold"
      },
      margin: { top: 20 },
      styles: { fontSize: 9 }
    });
    doc.save("Stock_Allocation.pdf");
    setExportLoading(false);
  };

  return (<>
    {
      !currentStudents.length ? <TableLoader /> :
        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Stock Allocation</h1>
            <div className="flex gap-3">
              <button
                onClick={exportToExcel}
                disabled={exportLoading}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <LuDownload className="mr-2" /> Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={exportLoading}
                className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                <LuDownload className="mr-2" /> PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-lg shadow">
            <select
              name="class"
              value={filters.class}
              onChange={handleFilterChange}
              className="border rounded-lg p-2 text-sm"
            >
              <option value="">All Classes</option>
              {classOptions.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            <select
              name="div"
              value={filters.div}
              onChange={handleFilterChange}
              className="border rounded-lg p-2 text-sm"
            >
              <option value="">All Divisions</option>
              {divOptions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>

            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="border rounded-lg p-2 text-sm"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            <input
              type="text"
              name="search"
              placeholder="Search by name..."
              value={filters.search}
              onChange={handleFilterChange}
              className="border rounded-lg p-2 text-sm"
            />

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border rounded-lg p-2 text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="text-black bg-gradient-to-br from-indigo-50 to-violet-50 ">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Class</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Division</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gender</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl shadow-sm">
                {currentStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{student.fname} {student.lname}</td>
                    <td className="px-6 py-4 text-sm">{student.class}</td>
                    <td className="px-6 py-4 text-sm">{student.div}</td>
                    <td className="px-6 py-4 text-sm">{student.gender}</td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/stockallocate/${student.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <LuWallet className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow">
            <span className="text-sm text-gray-600 mb-2 md:mb-0">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredStudents.length)} of {filteredStudents.length} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
    }

  </>);
}

export default StockAllocate;