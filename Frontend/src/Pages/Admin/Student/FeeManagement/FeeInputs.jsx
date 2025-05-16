// src/Pages/Admin/Students/FeeInputs.jsx
import React from 'react';

const humanize = (str) =>
    str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

export const SchoolFeeInputs = ({ fees, onChange }) => {
    console.log({ fees })
    return (<>
        <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-2">School Fees</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(fees.schoolFees || {}).map(([key, val]) => (
                    <div
                        key={key}
                        className={`flex items-center justify-between p-3 rounded-lg ${key === 'total' ? 'bg-gray-50 order-last' : 'bg-gray-50'
                            }`}
                    >
                        <span className="font-medium text-gray-600">{humanize(key)}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">₹</span>
                            {key === 'total' ? (
                                <span className="font-bold text-purple-600">{val.toLocaleString()}</span>
                            ) : (
                                <input
                                    type="number"
                                    className="w-24 p-1 border rounded text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    value={val}
                                    onChange={(e) => onChange(`schoolFees.${key}`, e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </>)
};

export const OtherFeeInputs = ({ fees, onChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Object.entries(fees)
            .filter(([k]) => k !== 'schoolFees')
            .map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">{humanize(key)}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                            type="number"
                            className="w-24 p-1 border rounded text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            value={val}
                            onChange={(e) => onChange(key, e.target.value)}
                        />
                    </div>
                </div>
            ))}
    </div>
);