// src/Pages/SchoolAdmin/Students/FeeManagement.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Wallet, Save } from 'lucide-react';
import { PieChart, FeeBar } from './FeeVisualizations';
import { SchoolFeeInputs, OtherFeeInputs } from './FeeInputs';
import { motion } from "framer-motion"
import Swal from 'sweetalert2';

export default function FeeManagement({ student, transactions, handleFeeUpdate, formData, setFormData }) {
    // local copy of fees
    const [fees, setFees] = useState({
        // ensure the shape exists immediately
        tuitionFees: { AdmissionFee: 0, tuitionFee: 0, total: 0 },
        tuitionFeesDiscount: 0,
        busFee: 0,
        busFeeDiscount: 0,
        lastYearBalanceFee: 0,
        lastYearDiscount: 0,
        lastYearBusFee: 0,
        lastYearBusFeeDiscount: 0,
        messFee: 0,
        hostelFee: 0,
    });
    const originalFees = useRef(fees);
    const [dirty, setDirty] = useState(false);
    const [summaryTotal, setSummaryTotal] = useState(0);

    // compute paid fees
    const paidFees = (transactions || [])
        .filter((t) => t.academicYear === student.academicYear && t.status == "completed")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    // on mount / student changes, seed from student.allFee
    useEffect(() => {
        if (student.allFee) {
            setFees(student.allFee);
            originalFees.current = student.allFee;
            setDirty(false);
        }
    }, [student.allFee]);

    // whenever any contributing field changes, recompute school total and summary
    useEffect(() => {
        if (((fees.tuitionFees?.total || 0) >= 0) && (fees.messFee >= 0) && (fees.hostelFee >= 0) && (fees.busFee >= 0)) {
            const tuition = Number(fees.tuitionFees?.tuitionFee) || 0;
            const academic = Number(fees.tuitionFees?.AdmissionFee) || 0;
            const schoolTotal = tuition + academic;
            const mess = Number(fees.messFee) || 0;
            const hostel = Number(fees.hostelFee) || 0;
            const bus = Number(fees.busFee) || 0;

            setFees((prev) => ({
                ...prev,
                tuitionFees: { ...prev.tuitionFees, total: schoolTotal },
            }));

            setSummaryTotal(schoolTotal + mess + hostel + bus);
        }
    }, [
        fees.tuitionFees?.tuitionFee,
        fees.tuitionFees?.AdmissionFee,
        fees.messFee,
        fees.hostelFee,
        fees.busFee,
    ]);

    const handleFeeChange = (key, value) => {
        // key will be tuitionFees.tuitionFee , tuitionFees.AdmissionFee, tuitionFees.total, messFee, hostelFee, busFee, etc
        const num = Number(value);
        setFees(prev => {
            const next = { ...prev };
            if (key.startsWith('tuitionFees.')) {
                // direct tuition‐fee or admission‐fee edits
                const sub = key.split('.')[1];
                next.tuitionFees = { ...prev.tuitionFees, [sub]: num };
                // always keep total in sync if you're editing AdmissionFee or tuitionFee
                if (sub === 'tuitionFee' || sub === 'AdmissionFee') {
                    next.tuitionFees.total =
                        (next.tuitionFees.AdmissionFee || 0) +
                        (next.tuitionFees.tuitionFee || 0);
                }
            }
            else if (key === 'tuitionFeesDiscount') {
                // discount changed → recalc net tuitionFee & total
                const oldDiscount = prev.tuitionFeesDiscount || 0;
                const grossTuition = (prev.tuitionFees.tuitionFee || 0) + oldDiscount;
                const newTuitionFee = grossTuition - num;
                next.tuitionFees = {
                    ...prev.tuitionFees,
                    tuitionFee: newTuitionFee,
                    total: (prev.tuitionFees.AdmissionFee || 0) + newTuitionFee,
                };
                next.tuitionFeesDiscount = num;
            }
            else if (key === 'busFee') {
                // direct bus-fee edit: just update busFee
                next.busFee = num;
            }
            else if (key === 'busFeeDiscount') {
                // bus-fee discount changed → recalc net busFee
                const oldBusDiscount = prev.busFeeDiscount || 0;
                const grossBus = (prev.busFee || 0) + oldBusDiscount;
                const newBusFee = grossBus - num;
                next.busFee = newBusFee;
                next.busFeeDiscount = num;
            }
            else {
                // everything else you had
                next[key] = num;
            }

            return next;
        });

        setDirty(true);
    };
    // Calculate and show discount adjustment details
    const showDiscountAdjustmentDetails = (oldFees, newFees) => {
        const changes = [];

        // Tuition discount change?
        if (oldFees.tuitionFeesDiscount !== newFees.tuitionFeesDiscount) {
            const oldNet = (oldFees.tuitionFees.AdmissionFee || 0) + (oldFees.tuitionFees.tuitionFee || 0);
            const newNet = (newFees.tuitionFees.AdmissionFee || 0) + (newFees.tuitionFees.tuitionFee || 0);
            changes.push({
                label: 'Tuition Fee',
                before: oldNet,
                after: newNet
            });
        }

        // Bus discount change?
        if (oldFees.busFeeDiscount !== newFees.busFeeDiscount) {
            const oldBus = oldFees.busFee || 0;
            const newBus = newFees.busFee || 0;
            changes.push({
                label: 'Bus Fee',
                before: oldBus,
                after: newBus
            });
        }

        if (changes.length === 0) {
            return '';
        }

        // Build table rows
        let rowsHtml = '';
        for (const c of changes) {
            rowsHtml += `
            <tr>
                <td style="padding:8px; font-weight:500;">${c.label}</td>
                <td style="padding:8px; text-align:right;">₹ ${c.before.toLocaleString('en-IN')}</td>
                <td style="padding:8px; text-align:center; color:#7e22ce; font-weight:600;">→</td>
                <td style="padding:8px; text-align:right; color:#16a34a; font-weight:600;">₹ ${c.after.toLocaleString('en-IN')}</td>
            </tr>
            `;
        }

        return `
            <div style="text-align:left; margin-top:1rem; padding:1rem; background:#eef8ff; border:1px solid #bfdbfe; border-radius:0.5rem;">
            <h3 style="margin-bottom:0.75rem; color:#1e3a8a; font-size:1.125rem; font-weight:600;">
                Discount Adjustments Applied
            </h3>
            <table style="width:100%; border-collapse:collapse; font-family:sans-serif;">
                <thead>
                <tr>
                    <th style="padding:8px; text-align:left;">Fee</th>
                    <th style="padding:8px; text-align:right;">Before</th>
                    <th style="padding:8px; text-align:center;">—</th>
                    <th style="padding:8px; text-align:right;">After</th>
                </tr>
                </thead>
                <tbody>
                ${rowsHtml}
                </tbody>
            </table>
            </div>
        `;
    }

    const onSave = () => {
        const oldFees = originalFees.current;
        const newFees = fees;
        // Check if there are discount changes to show confirmation
        const hasDiscountChanges =
            oldFees.tuitionFeesDiscount !== newFees.tuitionFeesDiscount ||
            oldFees.busFeeDiscount !== newFees.busFeeDiscount;

        if (hasDiscountChanges) {
            Swal.fire({
                title: 'Confirm Fee Adjustments',
                html: `
                    <div class="text-left">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 class="text-xl font-semibold text-gray-800">Discount Changes Applied</h3>
                        </div>
                        <p class="text-gray-600 mb-4">
                            Discount changes automatically adjust base fees to maintain consistent net payable amounts.
                            Please review the changes before saving.
                        </p>
                        ${showDiscountAdjustmentDetails(oldFees, newFees)}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Confirm & Save',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#0ea5e9',
                cancelButtonColor: '#94a3b8',
                customClass: {
                    popup: 'rounded-xl',
                    confirmButton: 'px-6 py-2 rounded-lg font-medium',
                    cancelButton: 'px-6 py-2 rounded-lg font-medium'
                },
                focusConfirm: false,
                showCloseButton: true
            }).then((result) => {
                if (result.isConfirmed) {
                    handleFeeUpdate(newFees);
                    originalFees.current = newFees;
                    setDirty(false);

                    // Show success message
                    Swal.fire({
                        icon: 'success',
                        title: 'Fees Updated!',
                        text: 'Fee structure has been successfully updated',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
        } else {
            handleFeeUpdate(newFees);
            originalFees.current = newFees;
            setDirty(false);

            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Fees Updated!',
                text: 'Fee structure has been successfully updated',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };
    const { currentYearPaid, lastYearPaid } = useMemo(() => {
        const currentYear = student.academicYear;

        return transactions.reduce((acc, t) => {
            function getPrevYear(year) {
                const years = year?.split("-") || ["00"];
                return years.map((y) => parseInt(y) || 0);
            }
            if (t.status === "completed") {
                if (t.academicYear === currentYear) {
                    // if addmission fee paid than we have to sum it in tuition fee
                    if (t?.feeType?.toLowerCase() === 'admissionfee') {
                        acc.currentYearPaid["TuitionFee"] = acc.currentYearPaid["TuitionFee"] + t.amount
                    }
                    acc.currentYearPaid[t.feeType] = (acc.currentYearPaid[t.feeType] || 0) + t.amount;
                } else {
                    if (t?.feeType?.toLowerCase() === 'tuitionfee' || t?.feeType?.toLowerCase() === 'admissionfee') {
                        acc.lastYearPaid.balance += t.amount;
                    }
                    if (t?.feeType?.toLowerCase() === 'busfee') {
                        acc.lastYearPaid.bus += t.amount;
                    }
                }
            }
            return acc;
        }, {
            currentYearPaid: { TuitionFee: 0, BusFee: 0, MessFee: 0, HostelFee: 0 },
            lastYearPaid: { balance: 0, bus: 0 }
        });
    }, [transactions, student.academicYear]);
    // Calculate current year totals
    const currentYearTotals = useMemo(() => ({
        TuitionFee: (fees.tuitionFees?.AdmissionFee || 0) + (fees.tuitionFees?.tuitionFee || 0),
        BusFee: fees.busFee || 0,
        MessFee: fees.messFee || 0,
        HostelFee: fees.hostelFee || 0
    }), [fees]);


    return (
        <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center mb-6">
                    <Wallet className="w-6 h-6 text-purple-600 mr-2" />
                    <h3 className="text-2xl font-semibold text-purple-600">Fee Management</h3>
                </div>
                <SchoolFeeInputs fees={fees} onChange={handleFeeChange} />
                <OtherFeeInputs fees={fees} onChange={handleFeeChange} />
                {/* Update Button */}
                {dirty && (
                    <div className="text-right mb-6">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={onSave}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium px-6 py-2 rounded-xl shadow-md transition-all"
                        >
                            <Save className="w-5 h-5" /> Update Fees
                        </motion.button>
                    </div>
                )}
                <div className="pt-4 border-t border-purple-100">
                    <h4 className="text-lg font-semibold mb-4 text-purple-600">Fee Summary</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Summary label="Total Fees" value={summaryTotal} />
                        <Summary label="Paid Fees" value={paidFees} />
                        <Summary label="Outstanding" value={summaryTotal - paidFees} />
                    </div>
                </div>
            </div>

            {/* Visualizations Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-white rounded-2xl shadow-sm p-6 border border-purple-100"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Previous Year Balances */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-purple-600">Previous Year Balances</h3>
                        <div className="flex flex-col sm:flex-row justify-evenly gap-4">
                            <PieChart
                                title="Last Year School Balance"
                                paid={lastYearPaid.balance}
                                total={fees.lastYearBalanceFee + lastYearPaid.balance}
                                color="#7e22ce"
                            />
                            <PieChart
                                title="Last Year Bus Balance"
                                paid={lastYearPaid.bus}
                                total={fees.lastYearBusFee + lastYearPaid.bus}
                                color="#3b82f6"
                            />
                        </div>
                    </div>

                    {/* Current Year Progress */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-purple-600">Current Year Progress</h3>
                        {
                            !currentYearTotals.TuitionFee && !currentYearTotals.BusFee && !currentYearTotals.MessFee && !currentYearTotals.HostelFee ?
                                <div className="h-full my-auto font-mono text-center text-xl">
                                    <div className="text-5xl mt-4 font-bold text-gray-400">
                                        N/A
                                    </div>
                                </div> :
                                <>
                                    <FeeBar label="School Fees" paid={currentYearPaid.TuitionFee} total={currentYearTotals.TuitionFee} />
                                    <FeeBar label="Bus Fees" paid={currentYearPaid.BusFee} total={currentYearTotals.BusFee} />
                                    {currentYearTotals.MessFee > 0 && (
                                        <FeeBar label="Mess Fees" paid={currentYearPaid.MessFee} total={currentYearTotals.MessFee} />
                                    )}
                                    {currentYearTotals.HostelFee > 0 && (
                                        <FeeBar label="Hostel Fees" paid={currentYearPaid.HostelFee} total={currentYearTotals.HostelFee} />
                                    )}
                                </>
                        }
                    </div>
                </div>
            </motion.div>
        </div>

    );
};

const Summary = ({ label, value }) => (
    <div className="text-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-2xl font-bold text-purple-600 mt-1">
            ₹{value.toLocaleString()}
        </div>
    </div>
);  