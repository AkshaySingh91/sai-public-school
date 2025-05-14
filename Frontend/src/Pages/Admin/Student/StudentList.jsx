import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { utils, writeFile } from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  Search,
  FileText,
  FileSpreadsheet,
  Filter,
  ChevronLeft,
  ChevronRight,
  SettingsIcon,
} from "lucide-react";
import TableLoader from "../../../components/TableLoader"

const StudentList = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    class: "all",
    div: "all",
    search: "",
  });

  const itemsPerPage = 10;

  useEffect(() => {
    if (userData) fetchStudents();
  }, [userData]);

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const q = query(
        collection(db, "students"),
        where("schoolCode", "==", userData.schoolCode)
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setStudents(list);
      console.log({ list });
      setFilteredStudents(list);
      // Extract unique classes and divisions
      const uniqueClasses = [...new Set(list.map((s) => s.class))];
      setClasses(uniqueClasses);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = students.filter((student) => {
      const matchesSearch =
        `${student.fname} ${student.mname} ${student.lname}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        student.feeId?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesClass =
        filters.class === "all" || student.class === filters.class;
      const matchesDiv = filters.div === "all" || student.div === filters.div;

      return matchesSearch && matchesClass && matchesDiv;
    });
    setFilteredStudents(result);
    setCurrentPage(1);
  }, [filters, students]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Export handlers
  const exportToExcel = () => {
    // Map and transform the student data
    const formattedData = filteredStudents.map((student) => ({
      "ID": student.id,
      "Year": student.academicYear,
      "Fee ID": student.feeId,
      "FirstName": student.fname,
      "MiddleName": student.mname,
      "SurName": student.lname,
      "Gender": student.gender,
      "Class": student.class,
      "Div": student.div,
      "Contact": student?.fatherMobile || student.motherMobile,
      "Type": student.type,
      "Status": student.status,
      "Enrollment": new Date(
        student.createdAt.seconds * 1000 +
        Math.round(student.createdAt.nanoseconds / 1000000)
      ).toLocaleDateString("en-GB"),
    }));

    const worksheet = utils.json_to_sheet(formattedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Students");
    writeFile(workbook, "students.xlsx");
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      // Define column widths based on content
      const columnStyles = {
        0: { cellWidth: 25 }, // Academic
        1: { cellWidth: 40 }, // Name
        2: { cellWidth: 20 }, // Type
        3: { cellWidth: 25 }, // FeeID
        4: { cellWidth: 20 }, // Class
        5: { cellWidth: 20 }, // Gender
        6: { cellWidth: 30 }, // Contact
        7: { cellWidth: 20 }, // Status
      };
      autoTable(doc, {
        head: [
          [
            "Academic",
            "Name",
            "Type",
            "FeeID",
            "Class",
            "Gender",
            "Contact",
            "Status",
          ],
        ],
        body: filteredStudents.map((student) => [
          student.academicYear,
          `${student.fname} ${student.lname}`,
          student.type,
          student.feeId,
          student.class,
          student.gender,
          student.FatherMob,
          student.status,
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [103, 58, 183],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center", // Center align header text
          cellPadding: 2, // Reduce cell padding
        },
        columnStyles: columnStyles,
        margin: { top: 20, left: 5 },
        styles: {
          fontSize: 10, // Reduce font size if needed
          cellPadding: 1, // Reduce general cell padding
          overflow: "linebreak",
        },
      });

      doc.save("students.pdf");
    } catch (error) {
      console.error("PDF generation error:", error);
    }
  };
  const statusStyles = {
    current: "bg-green-100 text-green-800",
    new: "bg-blue-100 text-blue-800",
    inactive: "bg-red-100 text-gray-600",
  };

  const toggleSelectAll = (e) => {
    setSelectedEmployees(e.target.checked ? currentItems.map((s) => s.id) : []);
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (<>
    {
      loading ?
        <div className="max-w-7xl mx-auto  p-4 pt-8 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
          <TableLoader
            headers={6}
            rows={5}
            className="border-purple-200/40"
          />
        </div> :
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100">
          {/* Filters and Actions */}
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3 bg-indigo-50">
            <div className="flex items-center gap-2">
              <select
                className="px-4 py-2 text-sm border rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.class}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, class: e.target.value }))
                }
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                className="px-4 py-2 text-sm border rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.div}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, div: e.target.value }))
                }
              >
                <option value="all">All Divisions</option>
                {["A", "B", "C", "D", "E"].map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>

              <button className="p-2 text-gray-600 border rounded-md hover:bg-gray-50">
                <Filter size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={20} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  className="py-2 pl-10 pr-3 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Search students..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>

              <button
                onClick={exportToPDF}
                className="flex items-center px-3 py-2 text-sm border rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText size={16} className="mr-2" />
                <span>Export PDF</span>
              </button>

              <button
                onClick={exportToExcel}
                className="flex items-center px-3 py-2 text-sm border rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileSpreadsheet size={16} className="mr-2" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>


          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={
                        selectedStudents.length === currentItems.length &&
                        currentItems.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  {[
                    "Academic",
                    "Name",
                    "Type",
                    "Fee ID",
                    "Class",
                    "Div",
                    "Gender",
                    "Father Contact",
                    "Status",
                    "Details",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-sm font-semibold text-indigo-900 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleSelectStudent(student.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {student.academicYear}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.fname} {student.mname} {student.lname}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-indigo-600 font-mono">
                      {student.feeId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {student.class}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {student.div}
                    </td>
                    <td className={`px-2 py-1`}>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-lg  ${student.gender === "Male"
                          ? "bg-blue-100 text-blue-400"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {student.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {student.fatherMobile}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-4 py-1  text-xs font-medium rounded-full ${statusStyles[student.status] || "bg-red-100 text-red-800"
                          }`}
                      >
                        {student.status.charAt(0).toUpperCase() +
                          student.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/student/${student.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <SettingsIcon size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t flex items-center justify-between bg-indigo-50">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="ml-3 px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredStudents.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredStudents.length}</span>{" "}
                  students
                </p>
              </div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>

                {[...Array(totalPages).keys()].map((page) => (
                  <button
                    key={page + 1}
                    onClick={() => setCurrentPage(page + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page + 1
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {page + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            </div>
          </div>
        </div>
    }
  </>);
};



export default StudentList;
