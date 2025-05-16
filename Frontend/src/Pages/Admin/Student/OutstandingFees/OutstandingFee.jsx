import React, { useMemo, useCallback } from 'react';
import { FiBarChart2 } from 'react-icons/fi';
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
    // Class-wise Excel export
    const exportClassExcel = useCallback(() => {
        const data = currentRows.map(row => ({
            'Class': row.class,
            'Total Students': row.students,
            'Last Year Balance': row.lastYear,
            'Original Fees': row.original,
            'Discounts': row.discount,
            'Net Fees': row.afterDiscount,
            'Paid Amount': row.paid,
            'Outstanding': row.outstanding
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Fees');
        XLSX.writeFile(workbook, `Class_Fees_${classActiveTab}.xlsx`);
    }, [currentRows, classActiveTab]);

    // Class-wise PDF export
    const exportClassPDF = useCallback(() => {
        const doc = new jsPDF();
        doc.text(`${classActiveTab.toUpperCase()} Class Fee Summary`, 14, 16);
        autoTable(doc, {
            startY: 25,
            head: [
                ['Class', 'Students', 'Last Year', 'Original',
                    'Discount', 'Net Fees', 'Paid', 'Outstanding']
            ],
            body: currentRows.map(row => [
                row.class,
                row.students,
                !isNaN(row.lastYear) ? Number(row.lastYear).toLocaleString() : '0',
                !isNaN(row.original) ? Number(row.original).toLocaleString() : '0',
                !isNaN(row.discount) ? Number(row.discount).toLocaleString() : '0',
                !isNaN(row.afterDiscount) ? Number(row.afterDiscount).toLocaleString() : '0',
                !isNaN(row.paid) ? Number(row.paid).toLocaleString() : '0',
                !isNaN(row.outstanding) ? Number(row.outstanding).toLocaleString() : '0'
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
        doc.save(`Class_Fees_${classActiveTab}.pdf`);
    }, [currentRows, classActiveTab, formatCurrency]);

    const totals = useMemo(() => {
        if (!currentRows || !currentRows.reduce) return {
            lastYear: 0,
            original: 0,
            discount: 0,
            afterDiscount: 0,
            paid: 0,
            outstanding: 0
        };

        return currentRows.reduce((acc, row) => ({
            lastYear: acc.lastYear + (row.lastYear || 0),
            original: acc.original + (row.original || 0),
            discount: acc.discount + (row.discount || 0),
            afterDiscount: acc.afterDiscount + (row.afterDiscount || 0),
            paid: acc.paid + (row.paid || 0),
            outstanding: acc.outstanding + (row.outstanding || 0)
        }), {
            lastYear: 0,
            original: 0,
            discount: 0,
            afterDiscount: 0,
            paid: 0,
            outstanding: 0
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
                                {['Class', 'Total Students', 'L . Y Balance', 'Total Fees', 'Discount', 'Net Fees', 'Total Paid', 'Balance'].map((header, idx) => (
                                    <th
                                        key={header}
                                        className={clsx(
                                            "px-4 py-3 text-left text-sm font-semibold text-gray-700",
                                            idx === 0 && "pl-6",
                                            idx === 7 && "pr-6"
                                        )}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 bg-white">
                            {currentRows.map(row => (
                                <tr key={row.class} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 pl-6 text-sm font-medium text-gray-900">{row.class}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{row.students}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(row.lastYear)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(row.original)}</td>
                                    <td className="px-4 py-3 text-sm text-red-600">-{formatCurrency(row.discount)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(row.afterDiscount)}</td>
                                    <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(row.paid)}</td>
                                    <td className="px-4 py-3 pr-6 text-sm font-medium">
                                        <span className={clsx(
                                            row.outstanding >= 0 ? 'text-red-600' : 'text-green-600'
                                        )}>
                                            {formatCurrency(Math.abs(row.outstanding))}
                                            {row.outstanding >= 0 ? ' ▲' : ' ▼'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot className="bg-gray-50 font-medium">
                            <tr>
                                <td className="px-4 py-3 pl-6 text-sm text-gray-700">Total</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{currentRows.reduce((sum, row) => sum + (row.students || 0), 0)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.lastYear)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.original)}</td>
                                <td className="px-4 py-3 text-sm text-red-600">-{formatCurrency(totals.discount)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.afterDiscount)}</td>
                                <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(totals.paid)}</td>
                                <td className="px-4 py-3 pr-6 text-sm text-gray-700">
                                    <span className={clsx(totals.outstanding >= 0 ? 'text-red-600' : 'text-green-600')}>
                                        {formatCurrency(Math.abs(totals.outstanding))}
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
