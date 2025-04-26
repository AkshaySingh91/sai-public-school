// src/Pages/Admin/Students/FeeManagement.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Wallet, Save } from 'lucide-react';
import { PieChart, FeeBar } from './FeeVisualizations';
import { SchoolFeeInputs, OtherFeeInputs } from './FeeInputs';

export default function FeeManagement({ student, transactions, handleFeeUpdate }) {
    // local copy of fees
    const [fees, setFees] = useState({
        // ensure the shape exists immediately
        schoolFees: { AcademicFees: 0, TutionFees: 0, total: 0 },
        messFee: 0,
        hostelFee: 0,
        transportFee: 0,
        transportFeeDiscount: 0,
        schoolFeesDiscount: 0,
        lastYearBalanceFee: 0,
        lastYearDiscount: 0,
        lastYearTransportFee: 0,
        lastYearTransportFeeDiscount: 0,
    });
    const [dirty, setDirty] = useState(false);
    const [summaryTotal, setSummaryTotal] = useState(0);

    // compute paid fees
    const paidFees = (transactions || [])
        .filter((t) => t.academicYear === student.academicYear)
        .reduce((sum, t) => sum + Number(t.amount), 0);

    // on mount / student changes, seed from student.allFee
    useEffect(() => {
        console.log(student.allFee)
        if (student.allFee) {
            console.log(student.allFee)
            setFees(student.allFee);
            setDirty(false);
        }
    }, [student.allFee]);

    // whenever any contributing field changes, recompute school total and summary
    useEffect(() => {
        const tuition = Number(fees.schoolFees?.TutionFees) || 0;
        const academic = Number(fees.schoolFees?.AcademicFees) || 0;
        const schoolTotal = tuition + academic;

        const mess = Number(fees.messFee) || 0;
        const hostel = Number(fees.hostelFee) || 0;
        const transport = Number(fees.transportFee) || 0;

        setFees((prev) => ({
            ...prev,
            schoolFees: { ...prev.schoolFees, total: schoolTotal },
        }));

        setSummaryTotal(schoolTotal + mess + hostel + transport);
    }, [
        fees.schoolFees?.TutionFees,
        fees.schoolFees?.AcademicFees,
        fees.messFee,
        fees.hostelFee,
        fees.transportFee,
    ]);

    const onChange = (key, value) => {
        setFees((prev) => {
            const next = { ...prev };
            if (key.startsWith('schoolFees.')) {
                const sub = key.split('.')[1];
                next.schoolFees = { ...next.schoolFees, [sub]: Number(value) };
            } else {
                next[key] = Number(value);
            }
            return next;
        });
        setDirty(true);
    };

    const onSave = () => {
        handleFeeUpdate(fees);
        setDirty(false);
    };
    const { currentYearPaid, lastYearPaid } = useMemo(() => {
        const currentYear = student.academicYear;

        return transactions.reduce((acc, t) => {
            if (t.academicYear === currentYear) {
                acc.currentYearPaid[t.feeType] = (acc.currentYearPaid[t.feeType] || 0) + t.amount;
            } else {
                if (t.feeType === 'SchoolFee') {
                    acc.lastYearPaid.balance += t.amount;
                }
                if (t.feeType === 'TransportFee') {
                    acc.lastYearPaid.transport += t.amount;
                }
            }
            return acc;
        }, {
            currentYearPaid: { SchoolFee: 0, TransportFee: 0, MessFee: 0, HostelFee: 0 },
            lastYearPaid: { balance: 0, transport: 0 }
        });
    }, [transactions, student.academicYear]);

    // Calculate current year totals
    const currentYearTotals = useMemo(() => ({
        SchoolFee: (fees.schoolFees?.AcademicFees || 0) + (fees.schoolFees?.TutionFees || 0),
        TransportFee: fees.transportFee || 0,
        MessFee: fees.messFee || 0,
        HostelFee: fees.hostelFee || 0
    }), [fees]);

    // Calculate remaining amounts
    const currentYearRemaining = useMemo(() => ({
        SchoolFee: currentYearTotals.SchoolFee - currentYearPaid.SchoolFee,
        TransportFee: currentYearTotals.TransportFee - currentYearPaid.TransportFee,
        MessFee: currentYearTotals.MessFee - currentYearPaid.MessFee,
        HostelFee: currentYearTotals.HostelFee - currentYearPaid.HostelFee
    }), [currentYearTotals, currentYearPaid]);

    return (
        <div className="space-y-8">
            {/* Fee Input Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-xl font-semibold mb-6 flex items-center text-purple-600">
                    <Wallet className="w-6 h-6 mr-2" />
                    Fee Management
                </h3>

                <SchoolFeeInputs fees={fees} onChange={onChange} />
                <OtherFeeInputs fees={fees} onChange={onChange} />

                {dirty && (
                    <div className="text-right mb-6">
                        <button
                            onClick={onSave}
                            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                        >
                            <Save className="w-5 h-5" /> Update Fees
                        </button>
                    </div>
                )}

                <div className="pt-4 border-t">
                    <h4 className="text-lg font-semibold mb-4 text-purple-600">Fee Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Summary label="Total Fees" value={summaryTotal} />
                        <Summary label="Paid Fees" value={paidFees} />
                        <Summary label="Outstanding" value={summaryTotal - paidFees} />
                    </div>
                </div>
            </div>

            {/* Visualizations Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="grid grid-row-1 lg:grid-row-2 gap-8">
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-purple-600">Previous Year Balances</h3>
                        <div className="flex justify-evenly box-border gap-3">
                            <PieChart
                                title="Last Year School Balance"
                                paid={lastYearPaid.balance}
                                total={fees.lastYearBalanceFee}
                                color="#7e22ce"
                            />
                            <PieChart
                                title="Last Year Transport Balance"
                                paid={lastYearPaid.transport}
                                total={fees.lastYearTransportFee}
                                color="#3b82f6"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-purple-600">Current Year Progress</h3>
                        <FeeBar
                            label="School Fees"
                            paid={currentYearPaid.SchoolFee}
                            total={currentYearTotals.SchoolFee}
                        />
                        <FeeBar
                            label="Transport Fees"
                            paid={currentYearPaid.TransportFee}
                            total={currentYearTotals.TransportFee}
                        />
                        {currentYearTotals.MessFee > 0 && (
                            <FeeBar
                                label="Mess Fees"
                                paid={currentYearPaid.MessFee}
                                total={currentYearTotals.MessFee}
                            />
                        )}
                        {currentYearTotals.HostelFee > 0 && (
                            <FeeBar
                                label="Hostel Fees"
                                paid={currentYearPaid.HostelFee}
                                total={currentYearTotals.HostelFee}
                            />
                        )}
                    </div>
                </div>
            </div>
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