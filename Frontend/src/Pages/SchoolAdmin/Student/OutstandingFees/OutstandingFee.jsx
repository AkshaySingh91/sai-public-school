import React, { useMemo, useCallback, useState } from 'react';
import { FiBarChart2, FiChevronDown, FiChevronUp, FiFilter } from 'react-icons/fi';
import clsx from 'clsx';
import { Download, FileText } from 'react-feather';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const OutstandingFee = ({
    loading,
    activeRows = [],
    inactiveRows = [],
    classActiveTab,
    setClassActiveTab,
    formatCurrency
}) => {
    const currentRows = useMemo(() =>
        classActiveTab === 'active' ? activeRows : inactiveRows,
        [classActiveTab, activeRows, inactiveRows]
    );
    const [sortConfig, setSortConfig] = useState({
        key: 'totalPending',
        direction: 'desc'
    });
    const [classFilter, setClassFilter] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    const classOptions = useMemo(() => {
        const classes = new Set();
        currentRows.forEach(row => classes.add(row.class));
        return ['All', ...Array.from(classes).sort()];
    }, [currentRows]);
    // Filter and sort rows
    const filteredAndSortedRows = useMemo(() => {
        let rows = [...currentRows];

        // Apply class filter
        if (classFilter !== 'All') {
            rows = rows.filter(row => row.class === classFilter);
        }

        // Apply sorting
        if (sortConfig.key) {
            rows.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return rows;
    }, [currentRows, classFilter, sortConfig]);
    // Request sort function
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    // Class-wise Excel export
    const exportClassExcel = useCallback(() => {
        const numericColumns = [
            'Students',
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
        const header = ['Class', ...numericColumns];

        // 1) Prepare the data rows
        const data = filteredAndSortedRows.map(row => ({
            Class: row.class?.toUpperCase() || '',
            Students: Number(row.count) || 0,
            'Last Year Balance': Number(row.lastYear) || 0,
            'Tuition Fee (With Discount)': Number(row.tuitionFeeWithDiscount) || 0,
            'Tuition Discount': Number(row.tuitionFeeDiscount) || 0,
            'Net Tuition Fee': Number(row.netTuitionFee) || 0,
            'Tuition Paid': Number(row.tuitionFeePaid) || 0,
            'Tuition Pending': Number(row.tuitionFeePending) || 0,
            'Bus Fee (With Discount)': Number(row.busFeeWithDiscount) || 0,
            'Bus Discount': Number(row.busFeeDiscount) || 0,
            'Net Bus Fee': Number(row.netBusFee) || 0,
            'Bus Paid': Number(row.busFeePaid) || 0,
            'Bus Pending': Number(row.busFeePending) || 0,
            'Total Paid': Number(row.totalPaid) || 0,
            'Total Pending': Number(row.totalPending) || 0
        }));

        // 2) Calculate totals
        const totalsRow = { Class: 'TOTAL' };
        numericColumns.forEach(col => {
            totalsRow[col] = data.reduce((sum, r) => sum + (r[col] || 0), 0);
        });

        // 3) Append totals row
        const dataWithTotals = [...data, totalsRow];

        // 4) Create worksheet from JSON
        const worksheet = XLSX.utils.json_to_sheet(dataWithTotals, {
            header,
            skipHeader: false
        });

        // 5) Style the totals row
        if (dataWithTotals.length > 0) {
            // Note: json_to_sheet writes header at row 0, data rows start at 1,
            // so totals row index = dataWithTotals.length (0-based)
            const totalsRowIndex = dataWithTotals.length;
            header.forEach((colName, colIdx) => {
                const cellAddr = XLSX.utils.encode_cell({ r: totalsRowIndex, c: colIdx });

                // Ensure the cell exists (for zero or missing values)
                if (!worksheet[cellAddr]) {
                    const val = totalsRow[colName];
                    worksheet[cellAddr] = {
                        t: typeof val === 'string' ? 's' : 'n',
                        v: val
                    };
                }

                // Apply bold font + top border
                worksheet[cellAddr].s = {
                    font: { bold: true },
                    border: {
                        top: { style: 'medium', color: { rgb: '000000' } }
                    }
                };
            });

            // Update sheet range to include the styled row
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            range.e.r = totalsRowIndex;
            worksheet['!ref'] = XLSX.utils.encode_range(range);
        }

        // 6) Build workbook and trigger download
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Fees');
        XLSX.writeFile(workbook, `Class_Fees_${classActiveTab}.xlsx`);
    }, [filteredAndSortedRows, classActiveTab]);

    // Class-wise PDF export 
    const exportClassPDF = useCallback(() => {
        const numericCols = [
            'Students',
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
        const header = ['Class', ...numericCols];

        // 1) Build body rows
        const body = filteredAndSortedRows.map(r => [
            r.class?.toUpperCase() || '',
            Number(r.count) || 0,
            Number(r.lastYear) || 0,
            Number(r.tuitionFeeWithDiscount) || 0,
            Number(r.tuitionFeeDiscount) || 0,
            Number(r.netTuitionFee) || 0,
            Number(r.tuitionFeePaid) || 0,
            Number(r.tuitionFeePending) || 0,
            Number(r.busFeeWithDiscount) || 0,
            Number(r.busFeeDiscount) || 0,
            Number(r.netBusFee) || 0,
            Number(r.busFeePaid) || 0,
            Number(r.busFeePending) || 0,
            Number(r.totalPaid) || 0,
            Number(r.totalPending) || 0
        ]);
        // 2) Calculate totals
        const totals = ['TOTAL'];
        numericCols.forEach((col, i) => {
            const colIndex = i + 1; // offset for 'Class'
            const sum = body.reduce((acc, row) => acc + Number(row[colIndex] || 0), 0);
            totals.push(sum);
        });

        // 3) Generate PDF
        const doc = new jsPDF({ unit: 'pt' });
        doc.setFontSize(12);
        doc.text(`${classActiveTab.toUpperCase()} Class Fee Summary`, 40, 40);
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
                // draw a top border on the totals row:
                lineWidth: 0.5,
                lineColor: 0  // black
            },
            // ensure the 'Class' column is left-aligned everywhere
            columnStyles: {
                0: { halign: 'left' }
            },
            margin: { left: 40, right: 40 }
        });

        doc.save(`Class_Fees_${classActiveTab}.pdf`);
    }, [filteredAndSortedRows, classActiveTab]);


    const totals = useMemo(() => {
        if (!currentRows || !currentRows.reduce) return {
            lastYear: 0,
            tuitionFeeWithDiscount: 0,
            tuitionFeeDiscount: 0,
            netTuitionFee: 0,
            tuitionFeePaid: 0,
            tuitionFeePending: 0,
            busFeeWithDiscount: 0,
            busFeeDiscount: 0,
            netBusFee: 0,
            busFeePaid: 0,
            busFeePending: 0,
            totalPaid: 0,
            totalPending: 0,
        };
        return currentRows.reduce((acc, row) => ({
            lastYear: (acc.lastYear + row.lastYear) || 0,
            tuitionFeeWithDiscount: (acc.tuitionFeeWithDiscount + row.tuitionFeeWithDiscount) || 0,
            tuitionFeeDiscount: (acc.tuitionFeeDiscount + row.tuitionFeeDiscount) || 0,
            netTuitionFee: (acc.netTuitionFee + row.netTuitionFee) || 0,
            tuitionFeePaid: (acc.tuitionFeePaid + row.tuitionFeePaid) || 0,
            tuitionFeePending: (acc.tuitionFeePending + row.tuitionFeePending) || 0,
            busFeeWithDiscount: (acc.busFeeWithDiscount + row.busFeeWithDiscount) || 0,
            busFeeDiscount: (acc.busFeeDiscount + row.busFeeDiscount) || 0,
            netBusFee: (acc.netBusFee + row.netBusFee) || 0,
            busFeePaid: (acc.busFeePaid + row.busFeePaid) || 0,
            busFeePending: (acc.busFeePending + row.busFeePending) || 0,
            totalPaid: (acc.totalPaid + row.totalPaid) || 0,
            totalPending: (acc.totalPending + row.totalPending) || 0,
        }), {
            lastYear: 0,
            tuitionFeeWithDiscount: 0, //
            tuitionFeeDiscount: 0,
            netTuitionFee: 0,
            tuitionFeePaid: 0,
            tuitionFeePending: 0,
            busFeeWithDiscount: 0,
            busFeeDiscount: 0, //
            netBusFee: 0,
            busFeePaid: 0,
            busFeePending: 0,
            totalPaid: 0,
            totalPending: 0,
        });
    }, [currentRows]);

    if (loading) return <div className="p-6 text-center">Loading class data...</div>;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold flex items-center gap-2 text-purple-700">
                        <FiBarChart2 className="w-6 h-6" />
                        Class-wise Outstanding Fees
                    </h2>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                        >
                            <FiFilter className="w-4 h-4" />
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>
                        <button
                            onClick={exportClassExcel}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={exportClassPDF}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                {/* Filters Panel */}
                {showFilters && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Class Filter
                                </label>
                                <select
                                    value={classFilter}
                                    onChange={(e) => setClassFilter(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    {classOptions.map(option => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sort By
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={sortConfig.key}
                                        onChange={(e) => requestSort(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="class">Class Name</option>
                                        <option value="totalPending">Total Outstanding</option>
                                        <option value="totalPaid">Total Paid</option>
                                        <option value="students">Student Count</option>
                                    </select>
                                    <button
                                        onClick={() => setSortConfig({
                                            ...sortConfig,
                                            direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                        })}
                                        className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                                    >
                                        {sortConfig.direction === 'asc' ?
                                            <FiChevronUp className="w-5 h-5" /> :
                                            <FiChevronDown className="w-5 h-5" />
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setClassFilter('All');
                                        setSortConfig({ key: 'totalPending', direction: 'desc' });
                                    }}
                                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex border-b border-gray-200 mb-6">
                    {['active', 'inactive'].map(status => (
                        <button
                            key={status}
                            onClick={() => setClassActiveTab(status)}
                            className={clsx(
                                "px-6 py-3 font-medium text-sm relative",
                                classActiveTab === status
                                    ? "text-purple-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
                                    : "text-gray-500 hover:text-purple-500"
                            )}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)} Students
                        </button>
                    ))}
                </div>
                {/* Responsive Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    { id: 'class', label: 'Class' },
                                    { id: 'students', label: 'Students' },
                                    { id: 'lastYear', label: 'L.Y. Bal' },
                                    { id: 'netTuitionFee', label: 'Net Tuition' },
                                    // { id: 'tuitionFeeDiscount', label: 'tuitionFeeDiscount' },
                                    { id: 'tuitionFeePaid', label: 'TuitionFee Paid' },
                                    { id: 'tuitionFeePending', label: 'TuitionFee Pending' },
                                    { id: 'netBusFe', label: 'Net BusFee' },
                                    // { id: 'busFeeDiscount', label: 'busFeeDiscount' },
                                    { id: 'busFeePaid', label: 'BusFee Paid' },
                                    { id: 'busFeePending', label: 'BusFee Pending' },
                                    { id: 'totalPaid', label: 'Total Paid' },
                                    { id: 'totalPending', label: 'Total Pending' }]
                                    .map((header, idx) => (
                                        <th
                                            key={header.id}
                                            className={clsx(
                                                "px-3 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap",
                                                header.id === 'class' && "pl-6 sticky left-0 bg-gray-50 z-10",
                                                header.id === 'totalPending' && "pr-6"
                                            )}
                                        >
                                            <div className="flex items-center">
                                                <span>{header.label}</span>
                                                {sortConfig.key === header.id && (
                                                    <span className="ml-1">
                                                        {sortConfig.direction === 'asc' ?
                                                            <FiChevronUp className="w-4 h-4" /> :
                                                            <FiChevronDown className="w-4 h-4" />
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredAndSortedRows.map(row => (
                                <tr key={row.class} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-3 pl-6 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                        {row.class}
                                    </td>
                                    <td className="px-3 py-3 text-sm text-gray-600">{row.count}</td>
                                    <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(row.lastYear)}</td>
                                    <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(row.netTuitionFee)}</td>
                                    {/* <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(row.tuitionFeeDiscount)}</td> */}
                                    <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(row.tuitionFeePaid)}</td>
                                    <td className={`px-3 py-3 text-sm ${(row?.tuitionFeePending || 0) > 0 ? "text-red-600" : "text-green-600"} `}>{formatCurrency(row.tuitionFeePending)}</td>
                                    <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(row.netBusFee)}</td>
                                    {/* <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(row.busFeeDiscount)}</td> */}
                                    <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(row.busFeePaid)}</td>
                                    <td className={`px-3 py-3 text-sm ${(row.busFeePending || 0) > 0 ? "text-red-600" : "text-green-600"} `}>{formatCurrency(row.busFeePending)}</td>
                                    <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(row.totalPaid)}</td>
                                    <td className="px-3 py-3 pr-6 text-sm font-medium">
                                        <span className={clsx(
                                            row.totalPending > 0 ? 'text-red-600' : 'text-green-600',
                                            'font-semibold'
                                        )}>
                                            {formatCurrency(Math.abs(row.totalPending))}
                                            {row.totalPending > 0 ? ' ▼' : ' ▲'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot className="bg-gray-50 font-medium whitespace-nowrap">
                            <tr>
                                <td className="px-3 py-3 pl-6 text-sm text-gray-700">Total</td>
                                <td className="px-3 py-3 text-sm text-gray-700">{currentRows.reduce((sum, row) => sum + (row.students || 0), 0)}</td>
                                <td className="px-3 py-3 text-sm text-gray-700">{formatCurrency(totals.lastYear)}</td>
                                <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(totals.netTuitionFee)}</td>
                                {/* <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(totals.tuitionFeeDiscount)}</td> */}
                                <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(totals.tuitionFeePaid)}</td>
                                <td className={`px-3 py-3 text-sm ${(totals.tuitionFeePending || 0) > 0 ? "text-red-600" : "text-green-600"} `}>{formatCurrency(totals.tuitionFeePending)}</td>
                                
                                <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(totals.netBusFee)}</td>
                                {/* <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(totals.busFeeDiscount)}</td> */}
                                <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(totals.busFeePaid)}</td>
                                <td className={`px-3 py-3 text-sm ${(totals.busFeePending || 0) > 0 ? "text-red-600" : "text-green-600"} `}>{formatCurrency(totals.busFeePending)}</td>
                                
                                <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(totals.totalPaid)}</td>
                                <td className="px-3 py-3 pr-6 text-sm font-medium">
                                    <span className={clsx(
                                        totals.totalPending > 0 ? 'text-red-600' : 'text-green-600'
                                    )}>
                                        {formatCurrency(Math.abs(totals.totalPending))}
                                        {totals.totalPending > 0 ? ' ▼' : ' ▲'}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {currentRows.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No {classActiveTab} students found
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutstandingFee;
