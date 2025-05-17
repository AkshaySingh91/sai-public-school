import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import { useAuth } from "../../../../contexts/AuthContext";
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
import TableLoader from "../../../../components/TableLoader"
import { useSchool } from "../../../../contexts/SchoolContext"
import { getNewClassFees } from "./StudentDetail"
import Swal from "sweetalert2";

const StudentList = () => {
  const { userData } = useAuth();
  const { school } = useSchool()
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ class: "all", div: "all", search: "" });
  const itemsPerPage = 10;

  // init class & division
  useEffect(() => {
    if (school.class) setClasses(school.class);
  }, [school.class]);
  useEffect(() => {
    if (school.divisions) setDivisions(school.divisions);
  }, [school.divisions]);

  // fetch all students
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
      setFilteredStudents(list);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  // filters
  useEffect(() => {
    const result = students.filter(s => {
      const name = `${s.fname} ${s.mname} ${s.lname}`.toLowerCase();
      const matchSearch = name.includes(filters.search.toLowerCase()) ||
        s.feeId?.toLowerCase().includes(filters.search.toLowerCase());
      const matchClass = filters.class === 'all' || s.class === filters.class;
      const matchDiv = filters.div === 'all' || s.div === filters.div;
      return matchSearch && matchClass && matchDiv;
    });
    setFilteredStudents(result);
    setCurrentPage(1);
  }, [filters, students]);

  // pagination
  const idxEnd = currentPage * itemsPerPage;
  const idxStart = idxEnd - itemsPerPage;
  const currentItems = filteredStudents.slice(idxStart, idxEnd);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // selection
  const toggleSelectAll = (e) => {
    setSelectedStudents(e.target.checked ? currentItems.map(s => s.id) : []);
  };
  const toggleSelectStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // batch move to next academic year
  const handleBatchMove = async () => {
    try {
      // classOrder should always have increasing order of class
      const classOrder = school?.class?.length > 0 ? school.class : [
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
      // get all selected student
      const selected = students.filter(s => selectedStudents.includes(s.id));
      // determine next academic year
      const [curStart, curEnd] = school?.academicYear.split('-').map(n => parseInt(n));
      const nextYear = `${curStart + 1}-${curEnd + 1}`;

      // filter valid students, remove inactive student & those who is in last class
      const toMove = selected.filter(s => {
        const idx = classOrder.indexOf(s.class);
        return (
          idx >= 0 && idx < classOrder.length - 1 &&
          (s?.status || "").toLowerCase() !== 'inactive'
        );
      });
      // Progress tracking
      let processed = 0;
      const total = toMove.length;
      const errors = [];

      // confirm
      const { isConfirmed } = await Swal.fire({
        title: `Move ${total} students to ${nextYear}?`,
        html: `
        <div class="text-left">
          <p>New students: ${toMove.filter(s => s.status === 'new').length}</p>
          <p>Current students: ${toMove.filter(s => s.status === 'current').length}</p>
          <p class="mt-2 text-sm text-gray-500">This operation cannot be undone.</p>
        </div>
      `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Begin Migration',
        cancelButtonText: 'Cancel',
        showLoaderOnConfirm: true,
      });
      if (!isConfirmed) return;

      Swal.fire({
        title: 'Processing Students...',
        html: `
        <div class="progress-container">
          <div class="progress-bar" style="width: 0%"></div>
          <div class="progress-text">0/${total}</div>
          <div class="current-student mt-2 text-sm text-gray-600"></div>
        </div>
      `,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      for (const [index, student] of toMove.entries()) {
        try {
          const progress = Math.floor((index / total) * 100);
          Swal.getHtmlContainer().querySelector('.progress-bar').style.width = `${progress}%`;
          Swal.getHtmlContainer().querySelector('.progress-text').textContent =
            `${index + 1}/${total}`;
          Swal.getHtmlContainer().querySelector('.current-student').textContent =
            `Processing: ${student.fname} ${student.lname} (${student.class} → ${classOrder[classOrder.indexOf(student.class) + 1]})`;

          // replicate goToNextAcademicYear logic
          const idx = classOrder.indexOf(student.class);
          const nextClass = classOrder[idx + 1];

          // calculate unpaid
          const txs = student.transactions || [];
          const allFee = student.allFee || {};
          const unpaid = (key) => {
            const due = key === 'schoolFee' ? allFee.schoolFees?.total || 0 : allFee[key] || 0;
            const paid = txs.filter(t => {
              return t.academicYear === student.academicYear && t?.feeType?.toLowerCase() === key.toLowerCase() && t.status === "completed"
            })
              .reduce((a, t) => a + t.amount, 0);
            return Math.max(due - paid, 0);
          };
          const lastBal = (allFee.lastYearBalanceFee || 0) + unpaid('hostelFee') + unpaid('messFee') + unpaid('schoolFee');
          const lastTrans = (allFee.lastYearTransportFee || 0) + unpaid('transportFee');

          const newStatus = student.status === 'new' ? 'current' : student.status;
          const rawFees = await getNewClassFees(userData.schoolCode, nextClass, nextYear, student);
          // this is add fee & tut fee of next class of that stu type
          const admission = newStatus === 'current' ? 0 : rawFees.studentFees.AdmissionFee;
          const tuition = rawFees.studentFees.TutionFee;
          // this is add fee & tut fee of next class of DSS stu type use to calc discount
          const originalAdmissionFee = newStatus === "current" ? 0 : rawFees.originalFees.AdmissionFee;
          const originalTutuionFee = rawFees.originalFees.TutionFee;

          const tuitionDiscount = (originalAdmissionFee + originalTutuionFee) - (admission + tuition);

          const updatedAllFee = {
            ...allFee,
            lastYearDiscount: allFee.tutionFeesDiscount,
            lastYearBalanceFee: lastBal,
            lastYearTransportFee: lastTrans,
            hostelFee: 0,
            messFee: 0,
            transportFee: allFee.transportFee,
            transportFeeDiscount: allFee.transportFeeDiscount,
            schoolFees: { AdmissionFee: admission, TutionFee: tuition, total: admission + tuition },
            tutionFeesDiscount: tuitionDiscount,
          };

          const updated = {
            ...student,
            academicYear: nextYear,
            class: nextClass,
            status: newStatus,
            allFee: updatedAllFee,
          };
          console.log({ updated })
          await updateDoc(doc(db, 'students', student.id), updated);
          processed++;
          // Add slight delay for UI updates and rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`Error processing ${student.name}:`, error);
          errors.push({
            student: student.name,
            error: error.message
          });
        }
      }
      // Final updates
      await fetchStudents();
      setSelectedStudents([]);
      if (errors.length === 0) {
        await Swal.fire({
          title: 'Migration Complete!',
          html: `<p>Successfully moved ${processed} students.</p>`,
          icon: 'success',
          timer: 2000
        });
      } else {
        await Swal.fire({
          title: 'Partial Completion',
          html: `
          <p>Moved ${processed} students successfully.</p>
          <p class="text-red-600">${errors.length} errors occurred.</p>
          <ul class="text-sm text-left mt-2">
            ${errors.map(e => `<li>${e.student}: ${e.error}</li>`).join('')}
          </ul>
        `,
          icon: 'warning',
          confirmButtonText: 'Okay'
        });
      }
    } catch (error) {
      console.error('Batch move failed:', error);
      Swal.fire({
        title: 'Operation Failed',
        html: `<p class="text-red-600">${error.message}</p>`,
        icon: 'error'
      });
    }
  };

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
                {divisions.map((div) => (
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
              <button
                onClick={handleBatchMove}
                disabled={selectedStudents.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
              >
                Move Selected to Next Year
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
                  <span className="font-medium">{idxStart + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(idxEnd, filteredStudents.length)}
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
