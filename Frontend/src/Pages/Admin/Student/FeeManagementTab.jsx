// src/Pages/Admin/Students/FeeManagement.jsx
import React, { useEffect, useState } from 'react';
import { Wallet, Save } from 'lucide-react';

export default function FeeManagement({ student, transactions, handleFeeUpdate,formData,setFormData }) {
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
        if (student.allFee) {
            console.log(student.allFee)
            setFees(student.allFee);
            setDirty(false);
        }
    }, [student.allFee]);

    // whenever any contributing field changes, recompute school total and summary
    useEffect(() => {
        console.log("formData",formData);
        const tuition = Number(fees.schoolFees?.TutionFees) || 0;
        const academic = Number(fees.schoolFees?.AcademicFees) || 0;
        console.log(fees.schoolFees)
        console.log({ academic, tuition })
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

    const humanize = (str) =>
        str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase());

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-semibold mb-6 flex items-center text-purple-600">
                <Wallet className="w-6 h-6 mr-2" />
                Fee Management
            </h3>

            {/* School Fees (dynamic keys) */}
            <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">School Fees</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(fees.schoolFees || {}).map(([key, val]) => (
                        <div
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg ${key === 'total' ? 'bg-gray-100 order-last' : 'bg-gray-50'
                                } `}
                        >
                            <span className="font-medium">{humanize(key)}</span>
                            <div className="flex items-center gap-2 ">
                                <span>₹</span>
                                {key === 'total' ? (
                                    <span className="font-bold">{val}</span>
                                ) : (
                                    <input
                                        type="number"
                                        className="w-24 p-1 border rounded text-right"
                                        value={val}
                                        onChange={(e) => onChange(`schoolFees.${key}`, e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Other Fees (everything except schoolFees) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(fees)
                    .filter(([k]) => k !== 'schoolFees')
                    .map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{humanize(key)}</span>
                            <div className="flex items-center gap-2">
                                <span>₹</span>
                                <input
                                    type="number"
                                    className="w-24 p-1 border rounded text-right"
                                    value={val}
                                    onChange={(e) => onChange(key, e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
            </div>

            {/* Save Button */}
            {dirty && (
                <div className="text-right mb-6">
                    <button
                        onClick={onSave}
                        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-lg"
                    >
                        <Save className="w-5 h-5" /> Update Fees
                    </button>
                </div>
            )}

            {/* Summary */}
            <div className="pt-4 border-t">
                <h4 className="text-lg font-semibold mb-4 text-purple-600">Fee Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Summary label="Total Fees" value={summaryTotal} />
                    <Summary label="Paid Fees" value={paidFees} />
                    <Summary label="Outstanding" value={summaryTotal - paidFees} />
                </div>
            </div>
        </div>
    );
}


function Summary({ label, value }) {
    return (
        <div className="text-center p-4 bg-purple-50 rounded-xl">
            <div className="text-sm text-gray-600">{label}</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">₹{value}</div>
        </div>
    );
}
