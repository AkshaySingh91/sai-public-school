import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
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
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  SettingsIcon,
  User,
  Settings,
  Calendar,
  CreditCard,
  GraduationCap,
  Users,
  Phone,
} from "lucide-react";
import TableLoader from "../../../../components/TableLoader";
import { useInstitution } from "../../../../contexts/InstitutionContext";
import { getNewClassFees } from "./StudentDetail";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const statusStyles = {
  current: "bg-green-100 text-green-800",
  new: "bg-blue-100 text-blue-800",
  inactive: "bg-red-100 text-gray-600",
};

const typeStyles = {
  ds: "bg-blue-100 text-blue-700",
  dss: "bg-purple-100 text-purple-700",
  dsr: "bg-orange-100 text-orange-700"
};
const StudentList = () => {
  const { userData } = useAuth();
  const { school } = useInstitution();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ class: "all", div: "all", search: "" });
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItem] = useState(false)
  // init class & division
  useEffect(() => {
    if (school.class) setClasses(school.class);
  }, [school.class]);
  useEffect(() => {
    if (school.divisions) setDivisions(school.divisions);
  }, [school.divisions]);

  // fetch all students
  useEffect(() => {
    if (school.Code) fetchStudents();
  }, [userData, school]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "students"),
        where("schoolCode", "==", school.Code)
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setStudents(list);
      setFilteredStudents(list);
      setTotalItem(list.length)
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  // filters
  useEffect(() => {
    const searchTerm = String(filters.search || '').toLowerCase();
    const classFilter = String(filters.class || 'all').toLowerCase();
    const divFilter = String(filters.div || 'all').toLowerCase();

    const result = students.filter(s => {
      // build a safe fullName
      const fullName = [
        s.fname,
        s.fatherName,
        s.lname
      ]
        .filter(Boolean)                  // drop undefined/null
        .map(v => String(v))              // coerce everything to string
        .join(' ')
        .toLowerCase();

      const feeId = String(s.feeId || '').toLowerCase();

      const matchSearch =
        fullName.includes(searchTerm) ||
        feeId.includes(searchTerm);

      const matchClass =
        classFilter === 'all' ||
        String(s.class || '').toLowerCase() === classFilter;

      const matchDiv =
        divFilter === 'all' ||
        String(s.div || '').toLowerCase() === divFilter;

      return matchSearch && matchClass && matchDiv;
    });

    setFilteredStudents(result);
    setCurrentPage(1);
  }, [filters, students]);

  // pagination
  const idxEnd = currentPage * pageSize;
  const idxStart = idxEnd - pageSize;
  const currentItems = filteredStudents.slice(idxStart, idxEnd);
  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  // Generate page numbers with ellipsis logic
  const generatePageNumbers = () => {
    const delta = 2; // Number of pages to show around current page
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    range.push(1);

    // Add pages around current page
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Add ellipsis where needed
    let prev = 0;
    range.forEach(page => {
      if (page - prev === 2) {
        rangeWithDots.push(prev + 1);
      } else if (page - prev !== 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(page);
      prev = page;
    });

    return rangeWithDots;
  };

  const pageNumbers = generatePageNumbers();

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPrevPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1));

  // selection
  const toggleSelectAll = (e) => {
    setSelectedStudents(e.target.checked ? currentItems.map((s) => s.id) : []);
  };
  const toggleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // batch move to next academic year
  const handleBatchMove = async () => {
    try {
      // classOrder should always have increasing order of class
      const classOrder =
        school?.class?.length > 0
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
      // get all selected student
      const selected = students.filter((s) => selectedStudents.includes(s.id));
      // determine next academic year
      const [curStart, curEnd] = school?.academicYear
        .split("-")
        .map((n) => parseInt(n));
      const nextYear = `${curStart + 1}-${curEnd + 1}`;

      // filter valid students, remove inactive student & those who is in last class
      const toMove = selected.filter((s) => {
        const idx = classOrder.indexOf(s.class);
        return (
          idx >= 0 &&
          idx < classOrder.length - 1 &&
          (s?.status || "").toLowerCase() !== "inactive"
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
        <div class="text-center">
          <p class="text-xl">New students: ${toMove.filter((s) => s.status === "new").length
          }</p>
          <p class="text-xl">Current students: ${toMove.filter((s) => s.status === "current").length
          }</p>
          <p class="mt-2 text-sm text-gray-500">This operation cannot be undone.</p>
        </div>
      `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Begin Migration",
        cancelButtonText: "Cancel",
        showLoaderOnConfirm: true,
      });
      if (!isConfirmed) return;

      Swal.fire({
        title: "Processing Students...",
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
          Swal.getHtmlContainer().querySelector(
            ".progress-bar"
          ).style.width = `${progress}%`;
          Swal.getHtmlContainer().querySelector(
            ".progress-text"
          ).textContent = `${index + 1}/${total}`;
          Swal.getHtmlContainer().querySelector(
            ".current-student"
          ).textContent = `Processing: ${student.fname} ${student.lname} (${student.class
          } → ${classOrder[classOrder.indexOf(student.class) + 1]})`;

          // replicate goToNextAcademicYear logic
          const idx = classOrder.indexOf(student.class);
          const nextClass = classOrder[idx + 1];

          // calculate unpaid
          const txs = student.transactions || [];
          const allFee = student.allFee || {};
          const unpaid = (key) => {
            const due =
              key === "tuitionFee"
                ? allFee.tuitionFees?.total || 0
                : allFee[key] || 0;
            const paid = txs
              .filter((t) => {
                return (
                  t.academicYear === student.academicYear &&
                  t?.feeType?.toLowerCase() === key?.toLowerCase() &&
                  t.status === "completed"
                );
              })
              .reduce((a, t) => a + t.amount, 0);
            return Math.max(due - paid, 0);
          };
          const lastBal =
            (allFee.lastYearBalanceFee || 0) +
            unpaid("hostelFee") +
            unpaid("messFee") +
            unpaid("tuitionFee");
          const lastTrans =
            (allFee.lastYearBusFee || 0) + unpaid("busFee");

          const newStatus =
            student.status === "new" ? "current" : student.status;
          const rawFees = await getNewClassFees(
            school.Code,
            nextClass,
            nextYear,
            student
          );
          // this is add fee & tut fee of next class of that stu type
          const admission = newStatus === 'current' ? 0 : rawFees.studentFees.AdmissionFee;
          const tuition = rawFees.studentFees.tuitionFee;
          // this is add fee & tut fee of next class of DSS stu type use to calc discount
          const originalAdmissionFee = newStatus === "current" ? 0 : rawFees.originalFees.AdmissionFee;
          const originalTutuionFee = rawFees.originalFees.tuitionFee;

          const tuitionDiscount =
            originalAdmissionFee + originalTutuionFee - (admission + tuition);

          const updatedAllFee = {
            ...allFee,
            lastYearDiscount: allFee.tuitionFeesDiscount,
            lastYearBalanceFee: lastBal,
            lastYearBusFee: lastTrans,
            hostelFee: 0,
            messFee: 0,
            busFee: allFee.busFee,
            busFeeDiscount: allFee.busFeeDiscount,
            tuitionFees: { AdmissionFee: admission, tuitionFee: tuition, total: admission + tuition },
            tuitionFeesDiscount: tuitionDiscount,
          };

          const updated = {
            ...student,
            academicYear: nextYear,
            class: nextClass,
            status: newStatus,
            allFee: updatedAllFee,
          };
          await updateDoc(doc(db, "students", student.id), updated);
          processed++;
          // Add slight delay for UI updates and rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing ${student.name}:`, error);
          errors.push({
            student: student.name,
            error: error.message,
          });
        }
      }
      // Final updates
      await fetchStudents();
      setSelectedStudents([]);
      if (errors.length === 0) {
        await Swal.fire({
          title: "Migration Complete!",
          html: `<p>Successfully moved ${processed} students.</p>`,
          icon: "success",
          timer: 2000,
        });
      } else {
        await Swal.fire({
          title: "Partial Completion",
          html: `
          <p>Moved ${processed} students successfully.</p>
          <p class="text-red-600">${errors.length} errors occurred.</p>
          <ul class="text-sm text-left mt-2">
            ${errors.map((e) => `<li>${e.student}: ${e.error}</li>`).join("")}
          </ul>
        `,
          icon: "warning",
          confirmButtonText: "Okay",
        });
      }
    } catch (error) {
      console.error("Batch move failed:", error);
      Swal.fire({
        title: "Operation Failed",
        html: `<p class="text-red-600">${error.message}</p>`,
        icon: "error",
      });
    }
  };
  const handleBatchDelete = async () => {
    try {
      const selected = students.filter((s) =>
        selectedStudents.includes(s.id) &&
        s.schoolCode === school.Code // Initial filter
      );

      // Confirm deletion
      const { isConfirmed } = await Swal.fire({
        title: `Delete ${selected.length} students?`,
        html: `
        <div class="text-center">
          <p class="text-xl">Students to delete: ${selected.length}</p>
          <p class="mt-2 text-sm text-red-600">This will permanently remove students from your school!</p>
        </div>
      `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Delete Permanently",
        cancelButtonText: "Cancel",
        showLoaderOnConfirm: true,
      });

      if (!isConfirmed) return;

      // Show progress dialog
      Swal.fire({
        title: "Deleting Students...",
        html: `
        <div class="progress-container">
          <div class="progress-bar bg-red-500 h-2 rounded" style="width: 0%"></div>
          <div class="progress-text mt-2">0/${selected.length}</div>
          <div class="current-student mt-2 text-sm text-gray-600"></div>
        </div>
      `,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      let processed = 0;
      const total = selected.length;
      const errors = [];

      for (const [index, student] of selected.entries()) {
        try {
          // Double-check school code and ID
          if (student.schoolCode !== school.Code || !selectedStudents.includes(student.id)) {
            throw new Error("Unauthorized deletion attempt blocked");
          }

          // Update progress
          const progress = Math.floor((index / total) * 100);
          Swal.getHtmlContainer().querySelector(".progress-bar").style.width = `${progress}%`;
          Swal.getHtmlContainer().querySelector(".progress-text").textContent = `${index + 1}/${total}`;
          Swal.getHtmlContainer().querySelector(".current-student").textContent =
            `Deleting: ${student.fname} ${student.lname} (${student.class})`;

          // Perform deletion
          await deleteDoc(doc(db, "students", student.id));
          processed++;
          // remove it for fast deletion
          // await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error deleting ${student.name}:`, error);
          errors.push({
            student: `${student.fname} ${student.lname}`,
            error: error.message
          });
        }
      }

      // Final updates
      await fetchStudents();
      setSelectedStudents([]);

      if (errors.length === 0) {
        await Swal.fire({
          title: "Deletion Complete!",
          html: `<p>Successfully deleted ${processed} students.</p>`,
          icon: "success",
          timer: 2000,
        });
      } else {
        await Swal.fire({
          title: "Partial Deletion",
          html: `
          <p>Deleted ${processed} students successfully.</p>
          <p class="text-red-600">${errors.length} errors occurred.</p>
          <ul class="text-sm text-left mt-2">
            ${errors.map((e) => `<li>${e.student}: ${e.error}</li>`).join("")}
          </ul>
        `,
          icon: "warning",
          confirmButtonText: "Okay",
        });
      }
    } catch (error) {
      console.error("Batch delete failed:", error);
      Swal.fire({
        title: "Deletion Failed",
        html: `<p class="text-red-600">${error.message}</p>`,
        icon: "error",
      });
    }
  };
  // Export handlers
  const exportToExcel = () => {
    const formattedData = filteredStudents.map((student, index) => {
      const fullName = `${student.fname || ''} ${student.fatherName || ''} ${student.lname || ''}`.trim();

      return {
        "S.No": index + 1,
        "Class": student.class || "",
        "Div": student.div || "",
        "Name": fullName,
        "Sex": student.gender || "",
        "DOB": student.dob || "",
        "Address": student.address || "",
        "Mob Father": student.fatherMobile || "",
        "Mob Mother": student.motherMobile || "",
        Email: student.email || "",
        Caste: student.category || student.caste || "",
        Subcaste: student.subcaste || "",
        Nationality: student.nationality || "",
        "S Category": student.scategory || student.category || "",
        Religion: student.religion || "",
        Aadhar: student.aadhar || "",
        "Saral ID": student.saralId || student.saral || "",
        Mobile: student.mobile || "",
        "Bus Bus": student.busStop ? "Y" : "N",
        "Bus Destination": student.busStop || "",
        "Bus No": student.busNoPlate || "",
      };
    });

    // Create worksheet and workbook
    const worksheet = utils.json_to_sheet(formattedData, { skipHeader: false });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Students");

    // Write to file
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
          student.fatherMobile,
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
  return (
    <>
      {loading ? (
        <div className="max-w-7xl mx-auto p-4 pt-8 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
          <TableLoader headers={6} rows={5} className="border-purple-200/40" />
        </div>
      ) : (
        <div className="w-full bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          {/* Filters and Actions */}
          <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.05 }} className="relative">
                <select
                  className="px-4 py-2.5 text-sm border-2 border-purple-100 rounded-xl bg-purple-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  value={filters.class}
                  onChange={(e) => setFilters((prev) => ({ ...prev, class: e.target.value }))}
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} className="relative">
                <select
                  className="px-4 py-2.5 text-sm border-2 border-purple-100 rounded-xl bg-purple-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  value={filters.div}
                  onChange={(e) => setFilters((prev) => ({ ...prev, div: e.target.value }))}
                >
                  <option value="all">All Divisions</option>
                  {divisions.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </motion.div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-purple-400" />
                </div>
                <input
                  type="text"
                  className="pl-10 pr-4 py-2.5 border-2 border-purple-100 rounded-xl bg-purple-50 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  placeholder="Search students..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={exportToPDF}
                className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={exportToExcel}
                className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </motion.button>

              {
                userData.privilege === "both" && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={handleBatchMove}
                      disabled={selectedStudents.length === 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                    >
                      Move to Next Year
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={handleBatchDelete}
                      disabled={selectedStudents.length === 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                    >
                      Delete Student
                    </motion.button>
                  </>
                )
              }
            </div>
          </div>

          {/* Student Table */}
          <div className="relative hidden md:block">
            <table className="w-full">
              <thead className="sticky top-0 bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-sm">
                <tr>
                  {
                    userData.privilege === "both" &&
                    <th className="p-3 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
                        checked={selectedStudents.length === currentItems.length && currentItems.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  }
                  {["Academic", "Name", "Type", "Fee ID", "Class", "Div", "Gender", "Father Contact", "Status",
                    userData.privilege === "both" ? "Actions" : ""].filter(Boolean).map((header) => (
                      <th
                        key={header}
                        className="p-3 text-left text-sm font-medium uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 capitalize text-left">
                {currentItems.map((student) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-purple-50/50 transition-colors"
                  >
                    {
                      userData.privilege === "both" &&
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleSelectStudent(student.id)}
                        />
                      </td>
                    }
                    <td className="p-3 text-sm text-violet-800">{student.academicYear || "-"}</td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {student.fname || '-'} {student.lname || ''}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {student.fatherName || 'Guardian not specified'}
                        </p>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-violet-700 uppercase">{student.type || "-"}</td>
                    <td className="p-3 text-sm text-violet-600 font-medium">{student.feeId || "-"}</td>
                    <td className="p-3 text-sm text-violet-700">{student.class || "-"}</td>
                    <td className="p-3 text-sm text-violet-700 uppercase">{student.div || "-"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-lg ${student?.gender?.toLowerCase() === "male"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                          }`}
                      >
                        {student.gender || "-"}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-violet-600">{student.fatherMobile}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-lg ${statusStyles[student.status?.toLowerCase()] || "bg-red-100 text-red-700"
                          }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    {
                      userData.privilege === "both" &&
                      <td td className="p-3 text-center">
                        <motion.button
                          whileHover={{ rotate: 90 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => navigate(`/school/student/${student.id}`)}
                          className="text-violet-600 hover:text-violet-800 p-1 rounded-lg hover:bg-purple-100 cursor-pointer"
                        >
                          <SettingsIcon size={20} />
                        </motion.button>
                      </td>
                    }
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* MOBILE: show cards below md */}
          <div className="block md:hidden p-4 space-y-4">
            {students.map(student => (
              <StudentProfileCard
                key={student.id}
                student={student}
                isSelected={selectedStudents.includes(student.id)}
                showCheckbox={userData.privilege === "both"}
                onSelect={() => toggleSelectStudent(student.id)}
                onEdit={() => navigate(`/school/student/${student.id}`)}
              />
            ))}
          </div>
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-purple-100 bg-purple-50">
            {/* Top row - Info and page size selector */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-violet-800/90">
                Showing{" "}
                <span className="font-semibold text-violet-900">{idxStart + 1}</span> to{" "}
                <span className="font-semibold text-violet-900">{idxEnd}</span> of{" "}
                <span className="font-semibold text-violet-900">{totalItems.toLocaleString()}</span> students
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-violet-800/90">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="px-3 py-1 text-sm border border-violet-200 rounded-lg bg-white text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-violet-800/90">per page</span>
              </div>
            </div>

            {/* Bottom row - Navigation */}
            <div className="flex items-center justify-between">
              {/* Quick navigation info */}
              <div className="text-xs text-violet-700/80">
                Page {currentPage} of {totalPages}
              </div>

              {/* Pagination Controls */}
              <nav className="relative z-0 inline-flex items-center rounded-xl shadow-sm">
                {/* First Page Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToFirstPage}
                  className="flex items-center px-3 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-l-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === 1}
                  title="First page"
                >
                  <span className="text-xs">First</span>
                </motion.button>

                {/* Previous Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToPrevPage}
                  className="flex items-center px-3 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border-t border-b border-violet-200 hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>

                {/* Page Numbers */}
                {pageNumbers.map((page, index) => (
                  <div key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-2 text-sm text-violet-600 bg-transparent">
                        <MoreHorizontal className="w-4 h-4" />
                      </span>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-2 text-sm font-medium border-t border-b border-violet-200 transition-all duration-200 ${currentPage === page
                          ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg transform scale-105"
                          : "bg-white text-violet-800 hover:bg-violet-100 hover:text-violet-900"
                          }`}
                        title={`Go to page ${page}`}
                      >
                        {page}
                      </motion.button>
                    )}
                  </div>
                ))}

                {/* Next Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToNextPage}
                  className="flex items-center px-3 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border-t border-b border-violet-200 hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === totalPages}
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>

                {/* Last Page Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToLastPage}
                  className="flex items-center px-3 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-r-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === totalPages}
                  title="Last page"
                >
                  <span className="text-xs">Last</span>
                </motion.button>
              </nav>

              {/* Quick Jump Input */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-violet-700/80">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  className="w-16 px-2 py-1 text-xs border border-violet-200 rounded-md bg-white text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                        e.target.value = '';
                      }
                    }
                  }}
                  placeholder={currentPage.toString()}
                />
              </div>
            </div>
          </div>
        </div >
      )}
    </>
  );
};

export default StudentList;
function StudentProfileCard({ student, isSelected, onSelect, onEdit, showCheckbox }) {
  const getInitials = (fname, lname) => {
    return `${fname?.charAt(0) || ''}${lname?.charAt(0) || ''}`.toUpperCase();
  };

  const getAvatarColor = (gender) => {
    return gender?.toLowerCase() === 'male'
      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
      : 'bg-gradient-to-br from-pink-500 to-pink-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${isSelected ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'
        }`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {showCheckbox && (
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500 mt-1"
                checked={isSelected}
                onChange={onSelect}
              />
            )}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(student.gender)}`}>
              {getInitials(student.fname, student.lname)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {student.fname} {student.lname}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${typeStyles[student.type?.toLowerCase()] || typeStyles.regular}`}>
                  {student.type}
                </span>
              </div>
              <p className="text-gray-500 text-sm capitalize flex items-center">
                <User size={12} className="mr-1" />
                {student.fatherName || 'Guardian not specified'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[student.status?.toLowerCase()] || statusStyles.inactive}`}>
              <div className={`w-2 h-2 rounded-full mr-1.5 ${student.status?.toLowerCase() === 'active' ? 'bg-green-500' :
                student.status?.toLowerCase() === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              {student.status}
            </span>
            {showCheckbox && (
              <motion.button
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
                onClick={onEdit}
                className="text-violet-600 hover:text-violet-800 p-1 rounded-lg hover:bg-purple-100"
              >
                <Settings size={16} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-gray-600">
              <Calendar size={14} className="mr-2" />
              <span className="text-sm font-medium">Academic Year</span>
            </div>
            <p className="text-sm text-gray-900 font-semibold">
              {student.academicYear || "-"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-gray-600">
              <CreditCard size={14} className="mr-2" />
              <span className="text-sm font-medium">Fee ID</span>
            </div>
            <p className="text-sm text-gray-900 font-semibold">
              {student.feeId || "-"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-gray-600">
              <GraduationCap size={14} className="mr-2" />
              <span className="text-sm font-medium">Class</span>
            </div>
            <p className="text-sm text-gray-900 font-semibold">
              {student.class} - {student.div}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-gray-600">
              <Users size={14} className="mr-2" />
              <span className="text-sm font-medium">Gender</span>
            </div>
            <p className="text-sm text-gray-900 font-semibold capitalize">
              {student.gender || "-"}
            </p>
          </div>

          <div className="space-y-1 lg:col-span-2">
            <div className="flex items-center text-gray-600">
              <Phone size={14} className="mr-2" />
              <span className="text-sm font-medium">Father's Contact</span>
            </div>
            <p className="text-sm text-gray-900 font-semibold">
              {student.fatherMobile || "-"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}