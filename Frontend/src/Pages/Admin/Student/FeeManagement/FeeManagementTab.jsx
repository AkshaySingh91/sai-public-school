// src/Pages/Admin/Students/FeeManagement.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Wallet, Save } from 'lucide-react';
import { PieChart, FeeBar } from './FeeVisualizations';
import { SchoolFeeInputs, OtherFeeInputs } from './FeeInputs';
import { motion } from "framer-motion"

export default function FeeManagement({ student, transactions, handleFeeUpdate, formData, setFormData }) {
    // local copy of fees
    const [fees, setFees] = useState({
        // ensure the shape exists immediately
        schoolFees: { AdmissionFee: 0, tuitionFee: 0, total: 0 },
        messFee: 0,
        hostelFee: 0,
        transportFee: 0,
        transportFeeDiscount: 0,
        tuitionFeesDiscount: 0,
        lastYearBalanceFee: 0,
        lastYearDiscount: 0,
        lastYearTransportFee: 0,
        lastYearTransportFeeDiscount: 0,
    });
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
            setDirty(false);
        }
    }, [student.allFee]);

    // whenever any contributing field changes, recompute school total and summary
    useEffect(() => {
        if (((fees.schoolFees?.total || 0) > 0) && (fees.messFee >= 0) && (fees.hostelFee >= 0) && (fees.transportFee >= 0)) {
            const tuition = Number(fees.schoolFees?.tuitionFee) || 0;
            const academic = Number(fees.schoolFees?.AdmissionFee) || 0;
            const schoolTotal = tuition + academic;
            const mess = Number(fees.messFee) || 0;
            const hostel = Number(fees.hostelFee) || 0;
            const transport = Number(fees.transportFee) || 0;

            setFees((prev) => ({
                ...prev,
                schoolFees: { ...prev.schoolFees, total: schoolTotal },
            }));

            setSummaryTotal(schoolTotal + mess + hostel + transport);
        }
    }, [
        fees.schoolFees?.tuitionFee,
        fees.schoolFees?.AdmissionFee,
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
            if (t.status === "completed") {
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
            }
            return acc;
        }, {
            currentYearPaid: { SchoolFee: 0, TransportFee: 0, MessFee: 0, HostelFee: 0 },
            lastYearPaid: { balance: 0, transport: 0 }
        });
    }, [transactions, student.academicYear]);
    // Calculate current year totals
    const currentYearTotals = useMemo(() => ({
        SchoolFee: (fees.schoolFees?.AdmissionFee || 0) + (fees.schoolFees?.tuitionFee || 0),
        TransportFee: fees.transportFee || 0,
        MessFee: fees.messFee || 0,
        HostelFee: fees.hostelFee || 0
    }), [fees]);


    return (
        <div className="space-y-8">
            {/* Fee Input Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center mb-6">
                    <Wallet className="w-6 h-6 text-purple-600 mr-2" />
                    <h3 className="text-2xl font-semibold text-purple-600">Fee Management</h3>
                </div>
                <SchoolFeeInputs fees={fees} onChange={onChange} />
                <OtherFeeInputs fees={fees} onChange={onChange} />

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
                                title="Last Year Transport Balance"
                                paid={lastYearPaid.transport}
                                total={fees.lastYearTransportFee + lastYearPaid.transport}
                                color="#3b82f6"
                            />
                        </div>
                    </div>

                    {/* Current Year Progress */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-purple-600">Current Year Progress</h3>
                        <FeeBar label="School Fees" paid={currentYearPaid.SchoolFee} total={currentYearTotals.SchoolFee} />
                        <FeeBar label="Transport Fees" paid={currentYearPaid.TransportFee} total={currentYearTotals.TransportFee} />
                        {currentYearTotals.MessFee > 0 && (
                            <FeeBar label="Mess Fees" paid={currentYearPaid.MessFee} total={currentYearTotals.MessFee} />
                        )}
                        {currentYearTotals.HostelFee > 0 && (
                            <FeeBar label="Hostel Fees" paid={currentYearPaid.HostelFee} total={currentYearTotals.HostelFee} />
                        )}
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