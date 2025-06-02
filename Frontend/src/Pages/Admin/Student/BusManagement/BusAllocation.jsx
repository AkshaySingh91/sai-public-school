import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSchool } from '../../../../contexts/SchoolContext';
import { motion } from 'framer-motion';
import { Search, Download, ChevronDown, X, Users, CheckCircle, Clock, DollarSign, Filter, Bus, Vault } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from "jspdf-autotable"
import TableLoader from '../../../../components/TableLoader';
import { debounce } from 'lodash';

const BusAllocation = () => {
  const { userData } = useAuth();
  const { school } = useSchool();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    academicYear: 'All',
    busNoPlate: 'All',
    busStop: 'All',
    class: 'All',
    division: 'All',
    studentsType: 'All',
    status: 'All',
    searchQuery: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10
  });
  const studentClass = school.class && school.class.length ? school.class : ["Nursery", "JRKG", "SRKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  const studentDivision = school.divisions && school.divisions.length ? school.divisions : ["A", "B", "C", "D", "SEMI"];
  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // 1) Students with a bus number
        const studentsQ = query(
          collection(db, "students"),
          where("schoolCode", "==", school.Code)
        );
        const studentsSnap = await getDocs(studentsQ);
        const filtered = studentsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s =>
            s.busNoPlate?.trim() !== "" &&
            s.busStop?.trim() !== ""
          );
        // 4) calculate paid amount 
        filtered.forEach((student) => {
          const currentYear = student.academicYear;
          student.busFeePaid = 0;
          (student.transactions || []).forEach((tnx) => {
            if (tnx.academicYear === currentYear && tnx?.status?.toLowerCase() === "completed" && tnx?.feeType?.toLowerCase() === "busfee") {
              student.busFeePaid += (Number(tnx.amount) || 0);
            }
          })
        })
        setStudents(filtered)
      } catch (err) {
        setError("Failed to load bus allocation data. Please try again later.");
        console.error("Fetch error:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userData, school.Code]);

  // Filtered students memoization
  const filteredStudents = useMemo(() => {
    console.log(filters)
    return students.filter(student => {
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (value === 'All' || !value) return true;
        console.log(key, student?.type?.toLowerCase(), value.toLowerCase())
        switch (key) {
          case 'searchQuery':
            const searchTerms = value.toLowerCase().split(' ');
            const studentFields = [
              student.fname?.toLowerCase(),
              student.lname?.toLowerCase(),
              student.fatherName?.toLowerCase(),
              student.feeId?.toLowerCase()
            ].join(' ');
            return searchTerms.every(term => studentFields.includes(term));

          case 'busNoPlate':
            return student?.busNoPlate?.toLowerCase() === value.toLowerCase();

          case 'busStop':
            return student?.busStop?.toLowerCase() === value.toLowerCase();

          case 'studentsType':
            return student?.type?.toLowerCase() === value.toLowerCase();
          case 'division':
            return student?.div?.toLowerCase() === value.toLowerCase();

          case 'status':
            return student?.status?.toLowerCase() === value.toLowerCase();

          default:
            return student[key] === value;
        }
      });

      return matchesFilters;
    });
  }, [students, filters]);

  // Stats calculation
  const { totalPaid, totalPending, collectionRate } = useMemo(() => {
    const paid = filteredStudents.reduce((sum, s) => sum + s.busFeePaid, 0);
    const pending = filteredStudents.reduce((sum, s) => {
      const busFee = s.allFee?.busFee || 0;
      return sum + Math.max(busFee - s.busFeePaid, 0);
    }, 0);

    return {
      totalPaid: paid,
      totalPending: pending,
      collectionRate: (paid / (paid + pending || 1)) * 100
    };
  }, [filteredStudents]);

  // Pagination
  const paginatedStudents = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    return filteredStudents.slice(start, start + pagination.itemsPerPage);
  }, [filteredStudents, pagination]);

  const totalPages = Math.ceil(filteredStudents.length / pagination.itemsPerPage);

  // Handlers
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSearch = debounce((value) => {
    handleFilterChange('searchQuery', value);
  }, 300);

  // Export handlers
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(paginatedStudents.map(student => ({
      'Academic Year': student.academicYear,
      'Name': `${student.fname} ${student.fatherName || ""} ${student.lname}`.toUpperCase(),
      'Class': student.class,
      'Division': student.div?.toUpperCase(),
      'Fee ID': student.feeId,
      'Bus Stop': student?.busStop?.toUpperCase(),
      'Bus Number': student?.busNoPlate?.toUpperCase(),
      'Bus Fee': student.allFee?.busFee || 0,
      'Discount': student.allFee?.busFeeDiscount || 0,
      'Paid': student.busFeePaid,
      'Pending': Math.max((student.allFee?.busFee || 0) - student.busFeePaid, 0)
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bus Allocations");
    XLSX.writeFile(workbook, "bus_allocations.xlsx");
  };
  const exportToPDF = () => {
    const doc = new jsPDF();
    const headers = [
      [
        "Academic Year",
        "Name",
        "Class",
        "Division",
        "Fee ID",
        "Bus Stop",
        "Bus Number",
        "Bus Fee",
        "Discount",
        "Paid",
        "Pending",
      ],
    ];
    const body = paginatedStudents.map(student => [
      student.academicYear,
      `${student.fname} ${student.fatherName || ""} ${student.lname}`.toUpperCase(),
      student.class,
      student.div?.toUpperCase() || "",
      student.feeId,
      student.busStop?.toUpperCase() || "",
      student.busNoPlate?.toUpperCase() || "",
      (student.allFee?.busFee || 0).toLocaleString(),
      (student.allFee?.busFeeDiscount || 0).toLocaleString(),
      (student.busFeePaid || 0).toLocaleString(),
      Math.max((student.allFee?.busFee || 0) - student.busFeePaid, 0).toLocaleString(),
    ]);

    autoTable(doc, {
      head: headers,
      body,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
      margin: { top: 20 },
    });

    doc.save("bus_allocations.pdf");
  };


  if (isLoading) return <TableLoader />;
  if (error)
    return <div className=''>
      Fail to fetch Bus data
    </div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Students"
            value={filteredStudents.length}
            color="purple"
          />
          <StatCard
            icon={CheckCircle}
            label="Paid"
            value={`₹${totalPaid.toLocaleString('en-IN')}`}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={`₹${totalPending.toLocaleString('en-IN')}`}
            color="orange"
          />
          <StatCard
            icon={DollarSign}
            label="Collection"
            value={`${Math.round(collectionRate)}%`}
            color="blue"
          />
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold">Filter Students</h3>
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
            >
              <ChevronDown className={`w-5 h-5 transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isFilterOpen && (
            <div className="p-6 space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students..."
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-purple-50 rounded-xl border-2 border-purple-200
                           focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                />
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" />
                {filters.searchQuery && (
                  <button
                    onClick={() => handleFilterChange('searchQuery', '')}
                    className="absolute right-4 top-3.5 text-purple-400 hover:text-purple-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FilterSelect
                  label="Academic Year"
                  options={['All', ...new Set(students.map(s => s.academicYear))]}
                  value={filters.academicYear}
                  onChange={(v) => handleFilterChange('academicYear', v)}
                />
                <FilterSelect
                  label="Bus Number"
                  options={['All', ...new Set(students.map(s => s?.busNoPlate))]}
                  value={filters.busNoPlate}
                  onChange={(v) => handleFilterChange('busNoPlate', v)}
                />
                <FilterSelect
                  label="Bus Stop"
                  options={['All', ...new Set(students.map(s => s?.busStop))]}
                  value={filters.busStop}
                  onChange={(v) => handleFilterChange('busStop', v)}
                />
                <FilterSelect
                  label="Class"
                  options={['All', ...studentClass]}
                  value={filters.class}
                  onChange={(v) => handleFilterChange('class', v)}
                />
                <FilterSelect
                  label="Division"
                  options={['All', ...studentDivision]}
                  value={filters.division}
                  onChange={(v) => handleFilterChange('division', v)}
                />
                <FilterSelect
                  label="Student Type"
                  options={['All', ...(school?.studentsType || ["DSS", "DS", "DSR"])]}
                  value={filters.studentsType}
                  onChange={(v) => handleFilterChange('studentsType', v)}
                />
                <FilterSelect
                  label="Status"
                  options={['All', 'New', 'Current', 'Inactive']}
                  value={filters.status}
                  onChange={(v) => handleFilterChange('status', v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">
                {filteredStudents.length} Students Found
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full" id="bus-allocation-table">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 whitespace-nowrap w-auto text-center">
                <tr>
                  {['Year', 'Name', 'Class', 'Div', 'FeeID', 'Bus Stop',
                    'Bus Number', 'Bus Fee', 'Discount', 'Paid', 'Pending'].map((header, i) => (
                      <th key={i} className="px-3 py-3 text-sm font-bold text-purple-800">
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {paginatedStudents.map((student, i) => (
                  <TableRow key={student.id} student={student} index={i} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <PaginationControls
            totalItems={filteredStudents.length}
            pagination={pagination}
            totalPages={totalPages}
            setPagination={setPagination}
          />
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${color}-100`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const FilterSelect = ({ label, options, value, onChange }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-xl bg-white
               focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
    >
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

const TableRow = ({ student, index }) => {
  const busFee = student.allFee?.busFee || 0;
  const discount = student.allFee?.busFeeDiscount || 0;
  const paid = student.busFeePaid || 0;
  const pending = Math.max(busFee - paid, 0);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="hover:bg-purple-50 whitespace-nowrap w-auto text-center"
    >
      <td className="px-3 py-3 text-gray-700 text-xs">{student.academicYear}</td>
      <td className="px-3 py-3 font-medium capitalize text-xs">{student.fname} {student.lname || "-"}</td>
      <td className="px-3 py-3 text-gray-700 text-xs capitalize">{student.class}</td>
      <td className="px-3 py-3 text-gray-700 uppercase text-xs">{student.div}</td>
      <td className="px-3 py-3 font-mono text-purple-700 text-xs">{student.feeId}</td>
      <td className="px-3 py-3 text-gray-700 uppercase text-xs">{student?.busStop}</td>
      <td className="px-3 py-3 uppercase">
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
          {student?.busNoPlate}
        </span>
      </td>
      <td className="px-3 py-3 font-bold text-xs">₹{busFee.toLocaleString()}</td>
      <td className="px-3 py-3 text-red-600 text-xs">-₹{discount.toLocaleString()}</td>
      <td className="px-3 py-3 text-green-600 text-xs">₹{paid.toLocaleString()}</td>
      <td className={`px-3 py-3 font-bold text-xs ${pending > 0 ? 'text-red-600' : 'text-green-600'}`}>
        ₹{pending.toLocaleString()}
      </td>
    </motion.tr>
  );
};

const PaginationControls = ({ totalItems, pagination, totalPages, setPagination }) => (
  <div className="p-4 border-t border-purple-100">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
          {Math.min(pagination.currentPage * pagination.itemsPerPage, totalItems)} of {totalItems}
        </span>
        <select
          value={pagination.itemsPerPage}
          onChange={(e) => setPagination(prev => ({
            ...prev,
            itemsPerPage: Number(e.target.value),
            currentPage: 1
          }))}
          className="px-3 py-1 border-2 border-purple-200 rounded-lg"
        >
          {[10, 25, 50, 100].map(size => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setPagination(prev => ({ ...prev, currentPage: 1 }))}
          disabled={pagination.currentPage === 1}
          className="px-3 py-1.5 text-purple-600 bg-white border-2 border-purple-200 rounded-lg disabled:opacity-50"
        >
          First
        </button>
        <button
          onClick={() => setPagination(prev => ({
            ...prev,
            currentPage: Math.max(1, prev.currentPage - 1)
          }))}
          disabled={pagination.currentPage === 1}
          className="px-3 py-1.5 text-purple-600 bg-white border-2 border-purple-200 rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-3 py-1.5 text-gray-700">
          Page {pagination.currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setPagination(prev => ({
            ...prev,
            currentPage: Math.min(totalPages, prev.currentPage + 1)
          }))}
          disabled={pagination.currentPage === totalPages}
          className="px-3 py-1.5 text-purple-600 bg-white border-2 border-purple-200 rounded-lg disabled:opacity-50"
        >
          Next
        </button>
        <button
          onClick={() => setPagination(prev => ({ ...prev, currentPage: totalPages }))}
          disabled={pagination.currentPage === totalPages}
          className="px-3 py-1.5 text-purple-600 bg-white border-2 border-purple-200 rounded-lg disabled:opacity-50"
        >
          Last
        </button>
      </div>
    </div>
  </div>
);

export default BusAllocation