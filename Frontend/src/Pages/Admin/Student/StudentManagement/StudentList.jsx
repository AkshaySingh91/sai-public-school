import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
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
  Filter,
  ChevronLeft,
  ChevronRight,
  SettingsIcon,
} from "lucide-react";
import TableLoader from "../../../../components/TableLoader";
import { useSchool } from "../../../../contexts/SchoolContext";
import { getNewClassFees } from "./StudentDetail";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const StudentList = () => {
  const { userData } = useAuth();
  const { school } = useSchool();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    class: "all",
    div: "all",
    search: "",
  });
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
    setLoading(true);
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
    const result = students.filter((s) => {
      const name = `${s.fname} ${s.mname} ${s.lname}`.toLowerCase();
      const matchSearch =
        name.includes(filters.search.toLowerCase()) ||
        s.feeId?.toLowerCase().includes(filters.search.toLowerCase());
      const matchClass = filters.class === "all" || s.class === filters.class;
      const matchDiv = filters.div === "all" || s.div === filters.div;
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
          <p class="text-xl">New students: ${
            toMove.filter((s) => s.status === "new").length
          }</p>
          <p class="text-xl">Current students: ${
            toMove.filter((s) => s.status === "current").length
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
          ).textContent = `Processing: ${student.fname} ${student.lname} (${
            student.class
          } → ${classOrder[classOrder.indexOf(student.class) + 1]})`;

          // replicate goToNextAcademicYear logic
          const idx = classOrder.indexOf(student.class);
          const nextClass = classOrder[idx + 1];

          // calculate unpaid
          const txs = student.transactions || [];
          const allFee = student.allFee || {};
          const unpaid = (key) => {
            const due =
              key === "schoolFee"
                ? allFee.schoolFees?.total || 0
                : allFee[key] || 0;
            const paid = txs
              .filter((t) => {
                return (
                  t.academicYear === student.academicYear &&
                  t?.feeType?.toLowerCase() === key.toLowerCase() &&
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
            unpaid("schoolFee");
          const lastTrans =
            (allFee.lastYearTransportFee || 0) + unpaid("transportFee");

          const newStatus =
            student.status === "new" ? "current" : student.status;
          const rawFees = await getNewClassFees(
            userData.schoolCode,
            nextClass,
            nextYear,
            student
          );
          // this is add fee & tut fee of next class of that stu type
          const admission =
            newStatus === "current" ? 0 : rawFees.studentFees.AdmissionFee;
          const tuition = rawFees.studentFees.TutionFee;
          // this is add fee & tut fee of next class of DSS stu type use to calc discount
          const originalAdmissionFee =
            newStatus === "current" ? 0 : rawFees.originalFees.AdmissionFee;
          const originalTutuionFee = rawFees.originalFees.TutionFee;

          const tuitionDiscount =
            originalAdmissionFee + originalTutuionFee - (admission + tuition);

          const updatedAllFee = {
            ...allFee,
            lastYearDiscount: allFee.tutionFeesDiscount,
            lastYearBalanceFee: lastBal,
            lastYearTransportFee: lastTrans,
            hostelFee: 0,
            messFee: 0,
            transportFee: allFee.transportFee,
            transportFeeDiscount: allFee.transportFeeDiscount,
            schoolFees: {
              AdmissionFee: admission,
              TutionFee: tuition,
              total: admission + tuition,
            },
            tutionFeesDiscount: tuitionDiscount,
          };

          const updated = {
            ...student,
            academicYear: nextYear,
            class: nextClass,
            status: newStatus,
            allFee: updatedAllFee,
          };
          console.log({ updated });
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

  // Export handlers
  const exportToExcel = () => {
    const formattedData = filteredStudents.map((student, index) => {
      const fullName = `${student.fname || ""} ${student.mname || ""} ${
        student.lname || ""
      }`.trim();

      return {
        "S.No": index + 1,
        Name: fullName,
        Class: student.class || "",
        Div: student.div || "",
        Name: `${student.fname || ""} ${student.mname || ""} ${
          student.lname || ""
        }`,
        Sex: student.gender || "",
        DOB: student.dob || "",
        Address: student.address || "",
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
        "Bus Transport": student.busStop ? "Y" : "N",
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

  return (
    // <>
    //   {loading ? (
    //     <div className="max-w-7xl mx-auto p-4 pt-8 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
    //       <TableLoader
    //         headers={6}
    //         rows={5}
    //         className="border-purple-200/40"
    //       />
    //     </div>
    //   ) : (
    //     <div className="w-full bg-white rounded-2xl shadow-xl border border-purple-100">
    //       {/* Filters and Actions */}
    //       <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-purple-100">
    //         <div className="flex items-center gap-3">
    //           <motion.div whileHover={{ scale: 1.05 }} className="relative">
    //             <select
    //               className="px-4 py-2.5 text-sm border-2 border-purple-100 rounded-xl bg-purple-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
    //               value={filters.class}
    //               onChange={(e) => setFilters((prev) => ({ ...prev, class: e.target.value }))}
    //             >
    //               <option value="all">All Classes</option>
    //               {classes.map((c) => (
    //                 <option key={c} value={c}>{c}</option>
    //               ))}
    //             </select>
    //           </motion.div>

    //           <motion.div whileHover={{ scale: 1.05 }} className="relative">
    //             <select
    //               className="px-4 py-2.5 text-sm border-2 border-purple-100 rounded-xl bg-purple-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
    //               value={filters.div}
    //               onChange={(e) => setFilters((prev) => ({ ...prev, div: e.target.value }))}
    //             >
    //               <option value="all">All Divisions</option>
    //               {divisions.map((div) => (
    //                 <option key={div} value={div}>{div}</option>
    //               ))}
    //             </select>
    //           </motion.div>
    //         </div>

    //         <div className="flex items-center gap-3 flex-wrap">
    //           <div className="relative">
    //             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
    //               <Search size={20} className="text-purple-400" />
    //             </div>
    //             <input
    //               type="text"
    //               className="pl-10 pr-4 py-2.5 border-2 border-purple-100 rounded-xl bg-purple-50 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
    //               placeholder="Search students..."
    //               value={filters.search}
    //               onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
    //             />
    //           </div>

    //           <motion.button
    //             whileHover={{ scale: 1.05 }}
    //             onClick={exportToPDF}
    //             className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg"
    //           >
    //             <FileText className="w-4 h-4 mr-2" />
    //             PDF
    //           </motion.button>

    //           <motion.button
    //             whileHover={{ scale: 1.05 }}
    //             onClick={exportToExcel}
    //             className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
    //           >
    //             <FileSpreadsheet className="w-4 h-4 mr-2" />
    //             Excel
    //           </motion.button>

    //           <motion.button
    //             whileHover={{ scale: 1.05 }}
    //             onClick={handleBatchMove}
    //             disabled={selectedStudents.length === 0}
    //             className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
    //           >
    //             Move Selected to Next Year
    //           </motion.button>
    //         </div>
    //       </div>

    //       {/* Student Table */}
    //       <div className="overflow-x-auto">
    //         <table className="min-w-full divide-y divide-purple-100">
    //           <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
    //             <tr>
    //               <th className="px-6 py-4 w-12">
    //                 <input
    //                   type="checkbox"
    //                   className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
    //                   checked={selectedStudents.length === currentItems.length && currentItems.length > 0}
    //                   onChange={toggleSelectAll}
    //                 />
    //               </th>
    //               {["Academic", "Name", "Type", "Fee ID", "Class", "Div", "Gender", "Father Contact", "Status", "Details"].map((header) => (
    //                 <th
    //                   key={header}
    //                   className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider"
    //                 >
    //                   {header}
    //                 </th>
    //               ))}
    //             </tr>
    //           </thead>
    //           <tbody className="divide-y divide-purple-100 bg-white">
    //             {currentItems.map((student) => (
    //               <motion.tr
    //                 key={student.id}
    //                 initial={{ opacity: 0, y: 10 }}
    //                 animate={{ opacity: 1, y: 0 }}
    //                 className="hover:bg-purple-50/80 transition-colors"
    //               >
    //                 <td className="px-6 py-4">
    //                   <input
    //                     type="checkbox"
    //                     className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
    //                     checked={selectedStudents.includes(student.id)}
    //                     onChange={() => toggleSelectStudent(student.id)}
    //                   />
    //                 </td>
    //                 <td className="px-6 py-4 text-sm text-violet-900">{student.academicYear}</td>
    //                 <td className="px-6 py-4 text-sm font-medium text-violet-900">
    //                   {student.fname} {student.mname} {student.lname}
    //                 </td>
    //                 <td className="px-6 py-4 text-sm text-gray-600">{student.type}</td>
    //                 <td className="px-6 py-4 text-sm text-violet-700 font-medium">{student.feeId}</td>
    //                 <td className="px-6 py-4 text-sm text-gray-600">{student.class}</td>
    //                 <td className="px-6 py-4 text-sm text-gray-600">{student.div}</td>
    //                 <td className="px-6 py-4">
    //                   <span
    //                     className={`px-3 py-1 text-xs font-medium rounded-xl ${
    //                       student.gender === "Male"
    //                         ? "bg-blue-100/80 text-blue-700"
    //                         : "bg-pink-100/80 text-pink-700"
    //                     }`}
    //                   >
    //                     {student.gender}
    //                   </span>
    //                 </td>
    //                 <td className="px-6 py-4 text-sm text-gray-600">{student.fatherMobile}</td>
    //                 <td className="px-6 py-4">
    //                   <span
    //                     className={`px-3 py-1 text-xs font-medium rounded-xl ${
    //                       statusStyles[student.status] || "bg-red-100/80 text-red-700"
    //                     }`}
    //                   >
    //                     {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
    //                   </span>
    //                 </td>
    //                 <td className="px-6 py-4 text-center">
    //                   <motion.button
    //                     whileHover={{ scale: 1.1 }}
    //                     onClick={() => navigate(`/student/${student.id}`)}
    //                     className="text-violet-600 hover:text-violet-800"
    //                   >
    //                     <SettingsIcon size={20} />
    //                   </motion.button>
    //                 </td>
    //               </motion.tr>
    //             ))}
    //           </tbody>
    //         </table>
    //       </div>

    //       {/* Pagination */}
    //       <div className="px-6 py-4 border-t border-purple-100 flex items-center justify-between bg-purple-50">
    //         <div className="text-sm text-violet-800/90">
    //           Showing <span className="font-medium">{idxStart + 1}</span> to{" "}
    //           <span className="font-medium">{Math.min(idxEnd, filteredStudents.length)}</span> of{" "}
    //           <span className="font-medium">{filteredStudents.length}</span> students
    //         </div>
    //         <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px">
    //           <motion.button
    //             whileHover={{ scale: 1.05 }}
    //             onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
    //             className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-l-xl hover:bg-violet-200 transition-colors disabled:opacity-50"
    //             disabled={currentPage === 1}
    //           >
    //             <ChevronLeft className="w-5 h-5 mr-1" />
    //             Previous
    //           </motion.button>

    //           {[...Array(totalPages).keys()].map((page) => (
    //             <motion.button
    //               key={page + 1}
    //               whileHover={{ scale: 1.05 }}
    //               onClick={() => setCurrentPage(page + 1)}
    //               className={`px-4 py-2 text-sm font-medium ${
    //                 currentPage === page + 1
    //                   ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white"
    //                   : "bg-white text-violet-800 hover:bg-violet-100"
    //               } border border-violet-200`}
    //             >
    //               {page + 1}
    //             </motion.button>
    //           ))}

    //           <motion.button
    //             whileHover={{ scale: 1.05 }}
    //             onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
    //             className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-r-xl hover:bg-violet-200 transition-colors disabled:opacity-50"
    //             disabled={currentPage === totalPages}
    //           >
    //             Next
    //             <ChevronRight className="w-5 h-5 ml-1" />
    //           </motion.button>
    //         </nav>
    //       </div>
    //     </div>
    //   )}
    // </>
    <>
      {loading ? (
        <div className="max-w-7xl mx-auto p-4 pt-8 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
          <TableLoader headers={6} rows={5} className="border-purple-200/40" />
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-purple-100">
          {/* Filters and Actions */}
          <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-purple-100">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <motion.div whileHover={{ scale: 1.05 }} className="relative">
                <select
                  className="px-4 py-2.5 text-sm border-2 border-purple-100 rounded-xl bg-purple-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
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
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} className="relative">
                <select
                  className="px-4 py-2.5 text-sm border-2 border-purple-100 rounded-xl bg-purple-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
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
              </motion.div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-grow min-w-[180px] md:min-w-[300px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-purple-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-purple-100 rounded-xl bg-purple-50 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  placeholder="Search students..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={exportToPDF}
                className="flex items-center px-5 w-1/2 sm:w-auto py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={exportToExcel}
                className="flex items-center w-1/2 sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleBatchMove}
                disabled={selectedStudents.length === 0}
                className="px-6 py-2.5 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                Move Selected to Next Year
              </motion.button>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-purple-100">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
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
                      className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {currentItems.map((student) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-purple-50/80 transition-colors"
                  >
                    <td className="px-3 md:px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleSelectStudent(student.id)}
                      />
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-violet-900">
                      {student.academicYear}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-violet-900 whitespace-nowrap">
                      {student.fname} {student.mname} {student.lname}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-600">
                      {student.type}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-violet-700 font-medium">
                      {student.feeId}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-600">
                      {student.class}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-600">
                      {student.div}
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <span
                        className={`px-2 md:px-3 py-0.5 text-xs md:text-sm font-medium rounded-xl ${
                          student.gender === "Male"
                            ? "bg-blue-100/80 text-blue-700"
                            : "bg-pink-100/80 text-pink-700"
                        }`}
                      >
                        {student.gender}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-600 whitespace-nowrap">
                      {student.fatherMobile}
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <span
                        className={`px-2 md:px-3 py-0.5 text-xs md:text-sm font-medium rounded-xl ${
                          statusStyles[student.status] ||
                          "bg-red-100/80 text-red-700"
                        }`}
                      >
                        {student.status.charAt(0).toUpperCase() +
                          student.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => navigate(`/student/${student.id}`)}
                        className="text-violet-600 hover:text-violet-800"
                      >
                        <SettingsIcon size={20} />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          
          <div className="px-4 py-3 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between bg-purple-50 gap-3 sm:gap-0">
            <div className="text-sm text-violet-800/90 whitespace-nowrap mb-2 sm:mb-0 text-center sm:text-left w-full sm:w-auto">
              Showing <span className="font-medium">{idxStart + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(idxEnd, filteredStudents.length)}
              </span>{" "}
              of <span className="font-medium">{filteredStudents.length}</span>{" "}
              students
            </div>
            <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px flex-wrap justify-center w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-l-xl hover:bg-violet-200 transition-colors disabled:opacity-50"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </motion.button>

              {/* Show fewer page buttons on small screens */}
              {[...Array(totalPages).keys()]
                .filter((page) => {
                  // Show all buttons on sm and above
                  if (window.innerWidth >= 640) return true;
                  // On mobile, show current page and 1 page before and after
                  return (
                    page + 1 === currentPage ||
                    page + 1 === currentPage - 1 ||
                    page + 1 === currentPage + 1 ||
                    page === 0 || // always show first page
                    page === totalPages - 1 // always show last page
                  );
                })
                .map((page) => (
                  <motion.button
                    key={page + 1}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setCurrentPage(page + 1)}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${
                      currentPage === page + 1
                        ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white"
                        : "bg-white text-violet-800 hover:bg-violet-100"
                    } border border-violet-200`}
                  >
                    {page + 1}
                  </motion.button>
                ))}

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-r-xl hover:bg-violet-200 transition-colors disabled:opacity-50"
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </motion.button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentList;
