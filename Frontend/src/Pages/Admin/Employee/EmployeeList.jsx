import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { utils, writeFile } from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { Link } from "react-router-dom";

import {
  SettingsIcon,
  Search,
  FileText,
  FileSpreadsheet,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import EmployeeForm from "./EmployeeForm";

const EmployeeList = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [filters, setFilters] = useState({
    designation: "all",
    type: "all",
    search: "",
  });

  const itemsPerPage = 10;

  useEffect(() => {
    if (userData) fetchEmployees();
  }, [userData]);

  const fetchEmployees = async () => {
    try {
      const q = query(
        collection(db, "Employees"),
        where("schoolCode", "==", userData.schoolCode)
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));

      setEmployees(list);
      setFilteredEmployees(list);

      // Extract unique designations
      const uniqueDesignations = [...new Set(list.map((e) => e.designation))];
      setDesignations(uniqueDesignations);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    let result = employees.filter((emp) => {
      const matchesSearch =
        `${emp.firstName} ${emp.lastName}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(filters.search.toLowerCase()) ||
        emp.type?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesDesignation =
        filters.designation === "all" ||
        emp.designation?.toLowerCase() === filters.designation?.toLowerCase();
      const matchesType =
        filters.type === "all" ||
        emp.type?.toLowerCase() === filters.type?.toLowerCase();
      return matchesSearch && matchesDesignation && matchesType;
    });

    setFilteredEmployees(result);
    setCurrentPage(1);
  }, [filters, employees]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployees.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  // Export handlers
  const exportToExcel = () => {
    const worksheet = utils.json_to_sheet(filteredEmployees);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Employees");
    writeFile(workbook, "employees.xlsx");
  };
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      autoTable(doc, {
        head: [
          ["Name", "Designation", "Type", "Email", "Contact", "DOJ", "Status"],
        ],
        body: filteredEmployees.map((emp) => [
          `${emp.firstName} ${emp.lastName}`,
          emp.designation || "N/A",
          emp.type || "N/A",
          emp.email || "N/A",
          emp.contact || "N/A",
          emp.doj || "N/A",
          emp.active ? "Active" : "Inactive",
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [103, 58, 183],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        margin: { top: 20 },
      });

      doc.save("EmployeeTable.pdf");
    } catch (error) {
      console.error("PDF generation error:", error);
    }
  };

  // Table header with sorting and selection
  const toggleSelectAll = (e) => {
    setSelectedEmployees(
      e.target.checked ? currentItems.map((e) => e.uid) : []
    );
  };

  const toggleSelectEmployee = (uid) => {
    setSelectedEmployees((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm">
      {/* Filters and Actions */}
      <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="px-4 py-2 text-sm border rounded-md w-full sm:w-auto  bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filters.designation}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, designation: e.target.value }))
            }
          >
            <option value="all">All Designations</option>
            {designations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            className="px-4 py-2 text-sm border rounded-md bg-white w-full sm:w-auto text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, type: e.target.value }))
            }
          >
            <option value="all">All Types</option>
            <option value="teaching">Teaching</option>
            <option value="non-teaching">Non-Teaching</option>
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="inline-block p-2 text-gray-600 border rounded-md hover:bg-gray-50"
          >
            Add Employee
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={20} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="w-full sm:w-64 py-2 pl-10 pr-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Search employees..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={exportToPDF}
              className="flex items-center w-1/2 sm:w-auto px-3 py-2 text-sm border rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              <FileText size={16} className="mr-2" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={exportToExcel}
              className="flex items-center px-3 w-1/2 sm:w-auto py-2 text-sm border rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              <FileSpreadsheet size={16} className="mr-2" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={
                    selectedEmployees.length === currentItems.length &&
                    currentItems.length > 0
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              {[
                "Name",
                "Designation",
                "Type",
                "Email",
                "Contact",
                "DOJ",
                "Status",
                "Details",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((emp) => (
              <tr key={emp.uid} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={selectedEmployees.includes(emp.uid)}
                    onChange={() => toggleSelectEmployee(emp.uid)}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {emp.firstName} {emp.lastName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {emp.designation}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                  {emp.type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{emp.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {emp.contact}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {emp.doj && emp.doj.toDate
                    ? emp.doj.toDate().toLocaleDateString()
                    : "N/A"}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      emp.active
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {emp.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-center px-4 py-3">
                  <button
                    onClick={() => navigate(`/employee/${emp.uid}`)}
                    className="cursor-pointer text-gray-400 hover:text-purple-600"
                  >
                    <SettingsIcon size={24} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>

              {/* EmployeeForm goes here */}
              <EmployeeForm onClose={() => setShowModal(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
        </div>

        <div className="hidden sm:flex sm:items-center sm:justify-between w-full">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstItem + 1}</span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(indexOfLastItem, filteredEmployees.length)}
            </span>{" "}
            of <span className="font-medium">{filteredEmployees.length}</span>{" "}
            results
          </p>

          <nav className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>

            {[...Array(totalPages).keys()].map((page) => (
              <button
                key={page + 1}
                onClick={() => setCurrentPage(page + 1)}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === page + 1
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {page + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
