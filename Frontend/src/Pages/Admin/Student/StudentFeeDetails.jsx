import React, { useCallback, useState } from 'react';
import { Download, FileText, UserCheck, UserX, Search, ArrowUp, ArrowDown, X } from 'react-feather';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import { PieChart, FeeBar } from './FeeVisualizations';

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
    setCurrentPage
}) => {
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    const handleRowClick = (studentId) => {
        setSelectedStudentId(prev => prev === studentId ? null : studentId);
    };
    const exportExcel = useCallback(() => {
        const data = filteredAllStudents.map(student => ({
            'Academic Year': student.academicYear,
            'Student Type': student.type,
            'Name': `${student.fname} ${student.lname}`,
            'Class': student.class,
            'Division': student.div,
            'Fee ID': student.feeId,
            'Last Year Balance': student.lastYearBalance,
            'Total Fees': student.totalFees,
            'Discounts': student.totalDiscount,
            'Net Fees': student.afterDiscount,
            'Paid Amount': student.paid,
            'Outstanding': student.outstanding
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Fee Details');
        XLSX.writeFile(workbook, `Student_Fees_${studentActiveTab}.xlsx`);
    }, [filteredAllStudents, studentActiveTab]);

    const exportPDF = useCallback(() => {
        const doc = new jsPDF();
        doc.text(`${studentActiveTab.toUpperCase()} Student Fee Details`, 14, 16);
        autoTable(doc, {
            startY: 25,
            head: [
                ['Name', 'Class', 'Fee ID', 'Last Year', 'Total Fees',
                    'Discount', 'Net Fees', 'Paid', 'Outstanding']
            ],
            body: filteredAllStudents.map(s => [
                `${s.fname} ${s.lname}`,
                `${s.class} - ${s.div}`,
                s.feeId,
                !isNaN(Number(s.lastYearBalance)) ? Number(s.lastYearBalance).toLocaleString() : '0',
                !isNaN(Number(s.totalFees)) ? Number(s.totalFees).toLocaleString() : '0',
                !isNaN(Number(s.totalDiscount)) ? Number(s.totalDiscount).toLocaleString() : '0',
                !isNaN(Number(s.afterDiscount)) ? Number(s.afterDiscount).toLocaleString() : '0',
                !isNaN(Number(s.paid)) ? Number(s.paid).toLocaleString() : '0',
                !isNaN(Number(s.outstanding)) ? Number(s.outstanding).toLocaleString() : '0'
            ]),
            headStyles: {
                fillColor: [103, 58, 183],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 1.5,
                overflow: 'linebreak'
            },
            margin: { top: 20 }
        });
        doc.save(`Student_Fees_${studentActiveTab}.pdf`);
    }, [filteredAllStudents, studentActiveTab]);

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <h2 className="text-xl font-semibold text-gray-800">Student-wise Outstanding fee</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportExcel}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={exportPDF}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search student or Fee id"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                    </div>

                    <div className="flex gap-1.5">
                        <select
                            value={sortKey || ''}
                            onChange={(e) => setSortKey(e.target.value || null)}
                            className="w-40 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">Sort By</option>
                            <option value="outstanding">Outstanding</option>
                            <option value="lastYearBalance">Last Year Balance</option>
                        </select>

                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="px-2.5 py-2 border rounded-lg hover:bg-gray-50 text-gray-600"
                        >
                            {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                {['active', 'inactive'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setStudentActiveTab(tab);
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2.5 text-sm font-medium relative flex items-center gap-1.5 ${studentActiveTab === tab
                            ? 'text-purple-600 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:text-purple-500'
                            }`}
                    >
                        {tab === 'active' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        <span className="text-gray-400 ml-1">({filteredAllStudents.length})</span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Student', 'Class', 'Fee ID', 'Last Year', 'Total', 'Discount', 'Net', 'Paid', 'Balance'].map((header, idx) => (
                                <th
                                    key={header}
                                    className={`px-3 py-2.5 text-left font-medium text-gray-700 ${idx === 0 ? 'pl-4' : ''
                                        } ${idx === 8 ? 'pr-4' : ''}`}
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                        {currentItems.map(student => (
                            <React.Fragment key={student.id}>
                                <tr
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleRowClick(student.id)}
                                >
                                    <td className="px-3 py-2.5 pl-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 bg-purple-50 rounded-full flex items-center justify-center text-xs text-purple-600">
                                                {student.fname[0]}{student.lname[0]}
                                            </div>
                                            <span className="font-medium">{student.fname} {student.lname}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600">
                                        {student.class}-{student.div}
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-purple-600">
                                        {student.feeId}
                                    </td>
                                    <td className="px-3 py-2.5">{formatCurrency(student?.lastYearSchoolBalance || 0 + student?.lastYearTransportBalance || 0)}</td>
                                    <td className="px-3 py-2.5">{formatCurrency(student?.totalFees || 0)}</td>
                                    <td className="px-3 py-2.5 text-red-600">-{formatCurrency(student?.totalDiscount || 0)}</td>
                                    <td className="px-3 py-2.5 font-medium">{formatCurrency(student?.afterDiscount || 0)}</td>
                                    <td className="px-3 py-2.5 text-green-600">{formatCurrency(student?.paid || 0)}</td>
                                    <td className="px-3 py-2.5 pr-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${student.outstanding > 0
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {formatCurrency(Math.abs(student?.outstanding || 0))}
                                        </span>
                                    </td>
                                </tr>
                                {selectedStudentId === student.id && (
                                    <tr className="bg-gray-50 transition-all">
                                        <td colSpan={9} className="p-4">
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
                                                                paid={student.lastYearSchoolPaid}
                                                                total={student.lastYearSchoolBalance + student.lastYearSchoolPaid}
                                                                color="#7e22ce"
                                                            />
                                                            <PieChart
                                                                title="Transport Balance"
                                                                paid={student.lastYearTransportPaid}
                                                                total={student.lastYearTransportBalance + student.lastYearTransportPaid}
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
                                                            paid={student.currentYearPaid.SchoolFee}
                                                            total={student.currentYearTotals.SchoolFee}
                                                        />
                                                        <FeeBar
                                                            label="Transport Fees"
                                                            paid={student.currentYearPaid.TransportFee}
                                                            total={student.currentYearTotals.TransportFee}
                                                        />
                                                        {student.currentYearTotals.MessFee > 0 && (
                                                            <FeeBar
                                                                label="Mess Fees"
                                                                paid={student.currentYearPaid.MessFee}
                                                                total={student.currentYearTotals.MessFee}
                                                            />
                                                        )}
                                                        {student.currentYearTotals.HostelFee > 0 && (
                                                            <FeeBar
                                                                label="Hostel Fees"
                                                                paid={student.currentYearPaid.HostelFee}
                                                                total={student.currentYearTotals.HostelFee}
                                                            />
                                                        )}
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
                                onClick={() => setSearchTerm('')}
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

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
                Showing {startItem} to {endItem} of {totalItems} results
            </div>
            <div className="flex gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-md bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-md bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default StudentFeeDetails;

/*
student.allFees = {
  "hostelFee": 0,
  "lastYearBalanceFee": 20,
  "lastYearDiscount": 16,
  "lastYearTransportFee": 0,
  "lastYearTransportFeeDiscount": 2,
  "messFee": 0,
  "schoolFees": {
    "AcademicFee": 3323,
    "TutionFee": 0,
    "total": 0
  },
  "schoolFeesDiscount": 13,
  "transportFee": 0,
  "transportFeeDiscount": 0
}
 
transaction schema
{
  "academicYear": "24-25", (this is curr academic year of student if it is 23-24 means he paying prev year)
  "account": "cash", (fees are going to which acc of school)
  "amount": 121, 
  "date": "2025-04-24",
  "feeType": "AcademicFees",
  "paymentMode": "CASH",
  "receiptId": "FEE-XWXCZT-hdCx",
  "remark": "",
  "timestamp": "2025-04-24T15:24:34.851Z"
}
employee schema: 
{
  "active": true,
  "aadharCardNo": "134412341234123123",
  "address": "D/103 Rashmi Regency 1 opposite banq",
  "class": "100",
  "contact": "9296756919",
  "department": "Computer",
  "designation": "Sakha baaap",
  "div": "Z",
  "dob": "2008-06-15",
  "doj": "2025-04-11",
  "email": "singhakshay6794@gmail.com",
  "firstName": "Akshay",
  "gender": "Male",
  "lastName": "Singh",
  "maritalStatus": "Single",
  "middleName": "Rajesh",
  "schoolCode": "12",
  "type": "Teaching",
  "uid": "XGlXSkmJLcqnP263qiI",
  "webAccess": "no"
}  
  {
  "code": "12",
  "academicYear": "24-25",
  "accounts": [{}]
  "class": ["Nursery", "JRKG", "1st"],
  "createdAt": "2025-04-14T15:24:46.945Z",
  "feeTypes": ["AcademicFee", "TuitionFee"],
  "location": "asdfasd",
  "logoURL": "",
  "paymentModes": ["CASH", "GPAY"],
  "schoolName": "asdfasdf",
  "studentsType": ["DSS", "DS", "DSR"]
}
suppose allfee.hostelFee = 2000, allfee.messFee = 1500, allfee.schoolFees.total = 3000, allfee.transportFee = 1000 than & student.academicYear = "24-25" than this all fees are of this Year also allfee.lastYearBalanceFee = 2000, allfee.lastYearTransportFee = 3000 this are pending fees of "23-24".
let say i have create transaction of academicYear "24-25" & feeType = schoolFee & amount = 2000. than to calculate total paid fees of this "24-25" we will take sum of all amount of all transaction of academicYear = student.acadmicYear. suppose i paid 1000 & acadmic year is "23-24" & feetype = "schoolFee" & update allFee.lastYearBalanceFee = 1000 than total fee will allFee.lastYearBalanceFee + (sum of all amount of transaction of academicyear !== student.acadmicyear), while paid lastYearBalancefee = (sum of all amount of transaction of academicyear !== student.acadmicyear) same for lastYearTransportFee.
what if i update student.acadmicYear to "25-26" but his hostel, mess, transport, schoolfee is pending also this  lastYearBalancefee & lastYearTransportFee is also pending but when updating new acadmic year allfee.schoolfee.total will update because class has change & mess, hostel, transport fee should be 0. his prev year "24-25" fees & "23-24" (lastYearBalancefee & lastYearTransportFee) was also pending how to handle that how can we sum all pending (hostelFee, messFee, schoolFees.total) & add it to lastYearBalancefee while , transportFee add into  lastYearTransportFee but fees paid logic is depend to transaction acadmicyear & feetype. 
tell me what should i do to handle this problem, while eg. think in depth &carefully
*/ 
