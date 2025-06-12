// src/Pages/SchoolAdmin/Students/FeeInputs.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion"
const humanize = (str) =>
    str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

export const SchoolFeeInputs = ({ fees, onChange }) => {
    const tuition = fees.tuitionFees;

    // compute total on the fly
    const total = (Number(tuition.AdmissionFee) + Number(tuition.tuitionFee) - (tuition.discount || 0));

    return (
        <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-4">School Fees</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Admission Fee */}
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <span className="font-medium text-gray-600">Admission Fee</span>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                            min={0}
                            type="number"
                            className="w-24 p-1 border border-purple-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={tuition.AdmissionFee || 0}
                            onChange={e => onChange('tuitionFees.AdmissionFee', e.target.value)}
                        />
                    </div>
                </motion.div>

                {/* Net Tuition Fee */}
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <span className="font-medium text-gray-600">Net Tuition Fee</span>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                            min={0}
                            type="number"
                            className="w-24 p-1 border border-purple-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={tuition.tuitionFee || 0}
                            onChange={e => onChange('tuitionFees.tuitionFee', e.target.value)}
                        />
                    </div>
                </motion.div>

                {/* Total Fee */}
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center justify-between p-4 rounded-lg bg-purple-50">
                    <span className="font-medium text-gray-600">Total Fee after Discount</span>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <span className="font-bold text-purple-600">{total.toLocaleString()}</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export const OtherFeeInputs = ({ fees, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Object.entries(fees)
            .filter(([k]) => k !== 'tuitionFees')
            .map(([key, val]) => (
                <motion.div
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <span className="font-medium text-gray-600">{humanize(key)}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                            min={0}
                            type="number"
                            className="w-24 p-1 border border-purple-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            value={val}
                            onChange={e => onChange(key, e.target.value)}
                        />
                    </div>
                </motion.div>
            ))}
    </div>
);