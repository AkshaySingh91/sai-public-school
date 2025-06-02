import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  UserX,
  ArrowUp,
  ArrowDown,
} from "react-feather";
import { MoreVertical, Trash2, Eye, UserCheck, Search } from 'lucide-react';
import { ChevronDown } from "react-feather";
import * as XLSX from "xlsx";
import clsx from 'clsx';
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { PieChart, FeeBar } from "./FeeVisualizations";
import { useSchool } from "../../../../contexts/SchoolContext"
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../../../../contexts/AuthContext";

const StudentFeeDetails = ({
  loading,
  filteredAllStudents,
  currentItems,
  studentActiveTab,
  searchTerm,
  sortKey,
  sortOrder,
  currentPage,
  itemsPerPage,
  formatCurrency,
  setStudentActiveTab,
  setSearchTerm,
  setSortKey,
  setSortOrder,
  setCurrentPage,
  selectedClass,
  selectedDiv,
  setSelectedClass,
  setSelectedDiv,
  fetchStudents,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const { school } = useSchool();
  const division = school.divisions && school.divisions.length ? school.divisions : ["A", "B", "C", "D", "SEMI"]
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const navigate = useNavigate();
  const handleRowClick = (studentId) => {
    setSelectedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  const exportStudentFeeExcel = useCallback(() => {
    // 1) Define columns
    const fixedCols = ['Name', 'Class', 'Div', 'Fee Id'];
    const numericCols = [
      'Last Year Balance',
      'Tuition Fee (With Discount)',
      'Tuition Discount',
      'Net Tuition Fee',
      'Tuition Paid',
      'Tuition Pending',
      'Bus Fee (With Discount)',
      'Bus Discount',
      'Net Bus Fee',
      'Bus Paid',
      'Bus Pending',
      'Total Paid',
      'Total Pending'
    ];
    const header = [...fixedCols, ...numericCols];

    // 2) Map each student to a row object
    const data = currentItems.map(student => ({
      Name: [student.fname || "", student.fatherName || "", student.lname || ""]
        .filter(Boolean)
        .map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' '),
      Class: student.class?.toUpperCase() || '',
      Div: student.div?.toUpperCase() || '',
      'Fee Id': student.feeId || '',
      'Last Year Balance': Number(student.feesDetails.lastYear) || 0,
      'Tuition Fee (With Discount)': Number(student.feesDetails.tuitionFeeWithDiscount) || 0,
      'Tuition Discount': Number(student.feesDetails.tuitionFeeDiscount) || 0,
      'Net Tuition Fee': Number(student.feesDetails.netTuitionFee) || 0,
      'Tuition Paid': Number(student.feesDetails.tuitionFeePaid) || 0,
      'Tuition Pending': Number(student.feesDetails.tuitionFeePending) || 0,
      'Bus Fee (With Discount)': Number(student.feesDetails.busFeeWithDiscount) || 0,
      'Bus Discount': Number(student.feesDetails.busFeeDiscount) || 0,
      'Net Bus Fee': Number(student.feesDetails.netBusFee) || 0,
      'Bus Paid': Number(student.feesDetails.busFeePaid) || 0,
      'Bus Pending': Number(student.feesDetails.busFeePending) || 0,
      'Total Paid': Number(student.feesDetails.totalPaid) || 0,
      'Total Pending': Number(student.feesDetails.totalPending) || 0
    }));

    // 3) Compute totals
    const totalsRow = {
      Name: 'TOTAL',
      Class: '',
      Div: '',
      'Fee Id': ''
    };
    numericCols.forEach(col => {
      totalsRow[col] = data.reduce((sum, r) => sum + (r[col] || 0), 0);
    });

    // 4) Append and build sheet
    const dataWithTotals = [...data, totalsRow];
    const ws = XLSX.utils.json_to_sheet(dataWithTotals, {
      header,
      skipHeader: false
    });

    // 5) Style totals row
    const totalRowIndex = dataWithTotals.length; // 0-based (header=0, rows 1…n, totals at index n)
    header.forEach((colName, colIdx) => {
      const addr = XLSX.utils.encode_cell({ r: totalRowIndex, c: colIdx });
      if (!ws[addr]) {
        const v = totalsRow[colName];
        ws[addr] = { t: typeof v === 'string' ? 's' : 'n', v };
      }
      ws[addr].s = {
        font: { bold: true },
        border: { top: { style: 'medium', color: { rgb: '000000' } } }
      };
    });
    // Extend the sheet range
    const range = XLSX.utils.decode_range(ws['!ref']);
    range.e.r = totalRowIndex;
    ws['!ref'] = XLSX.utils.encode_range(range);

    // 6) Export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Fees');
    XLSX.writeFile(wb, `Student_Fees_${studentActiveTab}.xlsx`);
  }, [currentItems, studentActiveTab]);


  const exportStudentFeePDF = useCallback(() => {
    // 1) Define columns
    const fixedCols = ['Name', 'Class', 'Div', 'Fee Id'];
    const numericCols = [
      'Last Year Balance',
      'Tuition Fee (With Discount)',
      'Tuition Discount',
      'Net Tuition Fee',
      'Tuition Paid',
      'Tuition Pending',
      'Bus Fee (With Discount)',
      'Bus Discount',
      'Net Bus Fee',
      'Bus Paid',
      'Bus Pending',
      'Total Paid',
      'Total Pending'
    ];
    const header = [...fixedCols, ...numericCols];

    // 2) Build table body rows
    const body = currentItems.map(student => [
      [student.fname || "", student.fatherName || "", student.lname || ""]
        .filter(Boolean)
        .map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' '),
      student.class?.toUpperCase() || '',
      student.div?.toUpperCase() || '',
      student.feeId || '',
      Number(student.feesDetails.lastYear) || 0,
      Number(student.feesDetails.tuitionFeeWithDiscount) || 0,
      Number(student.feesDetails.tuitionFeeDiscount) || 0,
      Number(student.feesDetails.netTuitionFee) || 0,
      Number(student.feesDetails.tuitionFeePaid) || 0,
      Number(student.feesDetails.tuitionFeePending) || 0,
      Number(student.feesDetails.busFeeWithDiscount) || 0,
      Number(student.feesDetails.busFeeDiscount) || 0,
      Number(student.feesDetails.netBusFee) || 0,
      Number(student.feesDetails.busFeePaid) || 0,
      Number(student.feesDetails.busFeePending) || 0,
      Number(student.feesDetails.totalPaid) || 0,
      Number(student.feesDetails.totalPending) || 0
    ]);

    // 3) Compute total row
    const totals = ['TOTAL', '', '', ''];
    numericCols.forEach((_, i) => {
      const idx = fixedCols.length + i;
      const sum = body.reduce((acc, row) => acc + Number(row[idx] || 0), 0);
      totals.push(sum);
    });

    // 4) Generate PDF
    const doc = new jsPDF({ unit: 'pt' });
    doc.setFontSize(12);
    doc.text(`Student Fee Summary: ${studentActiveTab.toUpperCase()}`, 40, 40);

    autoTable(doc, {
      startY: 60,
      head: [header],
      body,
      foot: [totals],
      styles: {
        fontSize: 4,
        cellPadding: 4,
        overflow: 'linebreak',
        halign: 'right'
      },
      headStyles: {
        fillColor: [103, 58, 183],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fontStyle: 'bold',
        halign: 'right',
        lineWidth: 0.5,
        lineColor: 0
      },
      columnStyles: {
        // Left-align the first four columns
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'left' },
        3: { halign: 'left' }
      },
      margin: { left: 40, right: 40 }
    });

    doc.save(`Student_Fees_${studentActiveTab}.pdf`);
  }, [currentItems, studentActiveTab]);

  const handleAction = async (action, student) => {
    console.log(action, student)
    switch (action) {
      case 'StudentProfile':
        navigate(`/student/${student.id}`)
        break;
      case 'StockTransactions':
        navigate(`/stockallocate/${student.id}`)
        break;
      case 'DeleteStudent':
        await deleteStudent(student.id)
        break;
    }
  };
  const deleteStudent = async (studentId) => {
    if (!studentId) {
      return Swal.fire('Error', "studentId not Exist.", 'error');
    }
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (!studentDoc.exists()) {
      return Swal.fire('Error', "Student not Exist.", 'error');
    };
    const result = await Swal.fire({
      title: 'Delete Student?',
      text: `This will remove student details & related transaction.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7e22ce',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteDoc(doc(db, 'students', studentId));
      await fetchStudents()
      Swal.fire('Deleted!', 'Student has been removed.', 'success');

    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };
  if (loading) return <LoadingSkeleton />;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Student-wise Outstanding fee
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportStudentFeeExcel}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={exportStudentFeePDF}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-center">
          {/* Search Input */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search student or Fee id or Div"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
          </div>

          {/* Class Selector */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm border w-full sm:w-auto rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none"
            >
              <option value="All">All Classes</option>
              {school.class?.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Division Selector */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedDiv}
              onChange={(e) => {
                setSelectedDiv(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm w-full border rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="All">All Divisions</option>
              {division.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort Controls */}
          <div className="flex gap-1.5 w-full sm:w-auto">
            <select
              value={sortKey || ""}
              onChange={(e) => setSortKey(e.target.value || null)}
              className="w-40 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Sort By</option>
              <option value="outstanding">Outstanding</option>
              <option value="lastYearBalance">Last Year Balance</option>
            </select>
            <button
              onClick={() =>
                setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              className="px-2.5 py-2 border rounded-lg hover:bg-gray-50 text-gray-600"
            >
              {sortOrder === "desc" ? (
                <ArrowDown className="w-4 h-4" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {["active", "inactive"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStudentActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-medium relative flex items-center gap-1.5 ${studentActiveTab === tab
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-purple-500"
              }`}
          >
            {tab === "active" ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="text-gray-400 ml-1">
              ({filteredAllStudents.length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                { id: 'name', label: 'Name' },
                { id: 'class', label: 'Class' },
                { id: 'feeId', label: 'FeeId' },
                { id: 'lastYear', label: 'L.Y. Bal' },
                { id: 'netTuitionFee', label: 'Net Tuition' },
                { id: 'tuitionFeePaid', label: 'TuitionFee Paid' },
                { id: 'tuitionFeePending', label: 'TuitionFee Pending' },
                { id: 'netBusFe', label: 'Net BusFee' },
                { id: 'busFeePaid', label: 'BusFee Paid' },
                { id: 'busFeePending', label: 'BusFee Pending' },
                { id: 'totalPaid', label: 'Total Paid' },
                { id: 'totalPending', label: 'Total Pending' },
                { id: 'action', label: 'Action' },
              ].map((header, idx) => (
                <th
                  key={header.id}
                  className={`px-3 py-2.5 text-left font-medium text-gray-700 ${idx === 0 ? "pl-4" : ""
                    } ${idx === 8 ? "pr-4" : ""}`}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {currentItems.map((student) => (
              <React.Fragment key={student.id}>
                <tr
                  onClick={() => handleRowClick(student.id)}
                  key={student.class} className="hover:bg-gray-50 transition-colors cursor-pointer">
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
                  <td className="px-2 py-3 pl-6 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap capitalize">
                    {student.class || ""}-
                    <span className="uppercase"> {student.div || ""}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-600">{student.feeId || ""}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-600">{formatCurrency(student?.feesDetails?.lastYear || 0)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-black bg-">{formatCurrency(student?.feesDetails?.netTuitionFee || 0)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-green-600">{formatCurrency(student?.feesDetails?.tuitionFeePaid || 0)}</td>
                  <td className={`whitespace-nowrap px-2 py-3 text-sm ${(student?.feesDetails?.tuitionFeePending || 0) > 0 ? "text-red-600" : "text-green-600"} `}>{formatCurrency(student?.feesDetails?.tuitionFeePending || 0)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-black">{formatCurrency(student?.feesDetails?.netBusFee || 0)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-green-600">{formatCurrency(student?.feesDetails?.busFeePaid || 0)}</td>
                  <td className={`whitespace-nowrap px-2 py-3 text-sm ${(student?.feesDetails?.tuitionFeePending || 0) > 0 ? "text-red-600" : "text-green-600"} `}>{formatCurrency(student?.feesDetails?.busFeePending || 0)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-green-600">{formatCurrency(student?.feesDetails?.totalPaid || 0)}</td>
                  <td className="whitespace-nowrap px-2 py-3 pr-6 text-sm font-medium text-center">
                    <span className={clsx(
                      (student?.feesDetails?.totalPending || 0) > 0 ? 'text-red-600' : 'text-green-600',
                      'font-semibold'
                    )}>
                      {formatCurrency(Math.abs(student?.feesDetails?.totalPending || 0))}
                      {(student?.feesDetails?.totalPending || 0) > 0 ? ' ▼' : ' ▲'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-green-600 "
                    onClick={e => e.stopPropagation()}       // ← prevent row-click
                  >
                    <ActionMenu
                      student={student}
                      onAction={handleAction}
                      isOpen={openActionMenu === student.id}
                      onToggle={(isOpen) => setOpenActionMenu(isOpen ? student.id : null)}
                    />
                  </td>
                </tr>
                {selectedStudentId === student.id && (
                  <tr className="bg-gray-50 transition-all">
                    <td colSpan={12} className="p-4 ">
                      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Last Year Balances */}
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-purple-600">
                              Previous Year Balances
                            </h3>
                            <div className="flex gap-4">
                              <PieChart
                                title="School Balance"
                                paid={student?.feesDetails?.lastYearTuitionPaid || 0}
                                total={
                                  (Number(student?.feesDetails?.lastYearTuitionPaid) || 0) +
                                  (Number(student?.allFee?.lastYearBalanceFee) || 0)
                                }
                                color="#7e22ce"
                              />
                              <PieChart
                                title="Bus Balance"
                                paid={Number(student?.feesDetails?.lastYearBusPaid) || 0}
                                total={
                                  (Number(student?.feesDetails?.lastYearBusPaid) || 0) +
                                  (Number(student?.allFee?.lastYearBusFee) || 0)
                                }
                                color="#3b82f6"
                              />
                            </div>
                          </div>

                          {/* Current Year Progress */}
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-purple-600">
                              Current Year Progress
                            </h3>
                            <FeeBar
                              label="School Fees"
                              paid={student?.feesDetails?.tuitionFeePaid}
                              total={Number(student?.feesDetails?.netTuitionFee) || 0}
                            />
                            <FeeBar
                              label="Bus Fees"
                              paid={student?.feesDetails?.busFeePaid}
                              total={Number(student?.feesDetails?.netBusFee) || 0}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {currentItems.length === 0 && (
          <div className="py-6 text-center text-gray-400">
            No students found
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="ml-2 text-purple-600 hover:text-purple-700"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200">
        <Pagination
          currentPage={currentPage}
          totalItems={filteredAllStudents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4 p-6">
    <div className="h-10 bg-gray-100 rounded w-1/3 mb-8"></div>
    <div className="flex gap-4 mb-6">
      <div className="h-12 bg-gray-100 rounded-lg w-1/2"></div>
      <div className="h-12 bg-gray-100 rounded-lg w-1/4"></div>
    </div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-lg"></div>
      ))}
    </div>
  </div>
);

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 px-4 py-3">
      <div className="text-sm text-gray-600 text-center sm:text-left">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm rounded-md bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <span className="px-3 py-2 text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm rounded-md bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};


const ActionMenu = ({ student, onAction, isOpen, onToggle }) => {
  const menuRef = useRef(null);
  const { userData } = useAuth();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onToggle(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onToggle]);

  const menuItems = [
    {
      icon: UserCheck,
      label: 'Student Profile',
      action: 'StudentProfile',
      color: 'text-green-600 hover:text-green-700 hover:bg-green-50'
    },
    {
      icon: Eye,
      label: 'Stock Details',
      action: 'StockTransactions',
      color: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
    },
    {
      icon: Trash2,
      label: 'Delete Student',
      action: 'DeleteStudent',
      color: 'text-red-600 hover:text-red-700 hover:bg-red-50'
    }
  ].filter((menu) => {
    if (userData.role === "superadmin" && menu.action === "StockTransactions") {
      return true;
    } else if (userData.role !== "superadmin") {
      return true
    } return false;
  });
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => onToggle(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {menuItems.map((item) => (
              <button
                key={item.action}
                onClick={() => {
                  onAction(item.action, student);
                  onToggle(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer font-medium rounded-lg transition-all duration-200 ${item.color}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFeeDetails;