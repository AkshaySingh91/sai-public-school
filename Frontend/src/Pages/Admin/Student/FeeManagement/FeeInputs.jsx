// src/Pages/Admin/Students/FeeInputs.jsx
import { motion } from "framer-motion"
const humanize = (str) =>
    str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

export const SchoolFeeInputs = ({ fees, onChange }) => {
    return (<>
        <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-4">School Fees</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(fees.schoolFees || {}).map(([key, val]) => (
                    <motion.div
                        key={key}
                        whileHover={{ scale: key === 'total' ? 1 : 1.02 }}
                        className={`flex items-center justify-between p-4 rounded-lg 
                  ${key === 'total'
                                ? 'bg-purple-50'
                                : 'bg-gray-50 hover:bg-gray-100 transition-colors'}
                `}
                    >
                        <span className="font-medium text-gray-600">{humanize(key)}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">₹</span>
                            {key === 'total' ? (
                                <span className="font-bold text-purple-600">{val.toLocaleString()}</span>
                            ) : (
                                <input
                                    type="number"
                                    className="w-24 p-1 border border-purple-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    value={val}
                                    onChange={e => onChange(`schoolFees.${key}`, e.target.value)}
                                />
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    </>)
};

export const OtherFeeInputs = ({ fees, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Object.entries(fees)
            .filter(([k]) => k !== 'schoolFees')
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