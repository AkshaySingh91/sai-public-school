// src/Pages/Admin/Students/OutstandingFee.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { FiBarChart2 } from 'react-icons/fi';
import clsx from 'clsx';
// import StudentFeeDetails from "./StudentFeeDetails"

export default function OutstandingFee() {
    const { userData } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('active');

    useEffect(() => {
        async function fetchStudents() {
            try {
                setLoading(true);
                const q = query(
                    collection(db, 'students'),
                    where('schoolCode', '==', userData.schoolCode)
                );
                const snap = await getDocs(q);
                setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStudents();
    }, [userData.schoolCode]);

    const { activeRows, inactiveRows } = useMemo(() => {
        const processStudents = (statusFilter) => {
            const classMap = new Map();

            students.filter(s => s.status === statusFilter).forEach(student => {
                const cls = student.class || 'Unknown';
                const existing = classMap.get(cls) || {
                    lastYear: 0,
                    original: 0,
                    discount: 0,
                    paid: 0,
                    count: 0
                };

                const fees = student.allFee || {};

                // Last Year Fees
                existing.lastYear += (fees.lastYearTransportFee || 0) + (fees.lastYearBalanceFee || 0);

                // Original Fees (pre-discount totals)
                existing.original += (fees.schoolFees?.total || 0) + (fees.transportFee || 0) + (fees.messFee || 0) + (fees.hostelFee || 0) + (fees.transportFeeDiscount || 0) + (fees.schoolFeesDiscount || 0);

                // Discounts
                const discounts = (fees.schoolFeesDiscount || 0) + (fees.transportFeeDiscount || 0);
                existing.discount += discounts;

                // Paid Amounts
                const paid = (student.transactions || [])
                    .filter(t => t.academicYear === student.academicYear)
                    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                existing.paid += paid;

                existing.count += 1;
                classMap.set(cls, existing);
            });

            return Array.from(classMap.entries()).map(([cls, data], index) => ({
                no: index + 1,
                class: cls,
                students: data.count,
                lastYear: data.lastYear,
                original: data.original,
                discount: data.discount,
                afterDiscount: data.original - data.discount,
                paid: data.paid,
                outstanding: (data.original - data.discount) - data.paid
            }));
        };

        return {
            activeRows: processStudents('active'),
            inactiveRows: processStudents('inactive')
        };
    }, [students]);

    const currentRows = tab === 'active' ? activeRows : inactiveRows;
    const totals = useMemo(() => currentRows.reduce((acc, row) => ({
        lastYear: acc.lastYear + row.lastYear,
        original: acc.original + row.original,
        discount: acc.discount + row.discount,
        afterDiscount: acc.afterDiscount + row.afterDiscount,
        paid: acc.paid + row.paid,
        outstanding: acc.outstanding + row.outstanding
    }), { lastYear: 0, original: 0, discount: 0, afterDiscount: 0, paid: 0, outstanding: 0 }));

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount)
            .replace(/^₹/, '₹ ');  // Add space after ₹ symbol for better readability
    };
    // if (loading) return <div className="p-6 text-center"><Spinner className="w-8 h-8 text-purple-600" /></div>;

    return (<>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-purple-700 mb-6">
                    <FiBarChart2 className="w-6 h-6" />
                    Class-wise Outstanding Fees
                </h2>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    {['active', 'inactive'].map(status => (
                        <button
                            key={status}
                            onClick={() => setTab(status)}
                            className={clsx(
                                "px-6 py-3 font-medium text-sm relative",
                                tab === status
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
                                {['Class', 'Total Students', 'Last Year', 'Original', 'Discount', 'Net Fee', 'Paid', 'Outstanding'].map((header, idx) => (
                                    <th
                                        key={header}
                                        className={clsx(
                                            "px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase",
                                            idx === 0 && "pl-6", // First column padding
                                            idx === 7 && "pr-6" // Last column padding
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

                        {/* Totals Footer */}
                        <tfoot className="bg-gray-50 font-medium">
                            <tr>
                                <td className="px-4 py-3 pl-6 text-sm text-gray-700">Total</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{currentRows.reduce((sum, row) => sum + row.students, 0)}</td>
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
                        No {tab} students found
                    </div>
                )}
            </div>
        </div>
        {/* <StudentFeeDetails /> */}
    </>
    );
}
