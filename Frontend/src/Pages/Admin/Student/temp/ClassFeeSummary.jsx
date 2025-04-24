import React, { useEffect, useState } from "react";

const ClassFeeSummary = ({ students }) => {
    const [classSummary, setClassSummary] = useState([]);
    console.log("students", students);

    useEffect(() => {
        if (!Array.isArray(students)) return; // ✅ SAFETY CHECK

        const summary = {};

        students.forEach((student) => {
            const className = student.className || student.class;
            if (!summary[className]) {
                summary[className] = {
                    totalFee: 0,
                    currentPaidFee: 0,
                    discountFee: 0,
                };
            }

            summary[className].totalFee += student.totalFee || 0;
            summary[className].currentPaidFee += student.currentPaidFee || 0;
            summary[className].discountFee += student.discountFee || 0;
        });

        const data = Object.entries(summary).map(([className, values]) => {
            const feeAfterDiscount = values.totalFee - values.discountFee;
            const outstandingFee = values.totalFee - values.currentPaidFee;

            return {
                className,
                ...values,
                feeAfterDiscount,
                outstandingFee,
            };
        });

        setClassSummary(data.sort((a, b) => parseInt(a.className) - parseInt(b.className)));
    }, [students]);

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">📊 Class-wise Fee Summary</h2>
            <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full bg-white border border-gray-300 text-sm">
                    <thead className="bg-gray-100 text-gray-700 text-left">
                        <tr>
                            <th className="p-3 border-b">Class</th>
                            <th className="p-3 border-b">Total Fee</th>
                            <th className="p-3 border-b">Paid Fee</th>
                            <th className="p-3 border-b">Discount</th>
                            <th className="p-3 border-b">After Discount</th>
                            <th className="p-3 border-b">Outstanding</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classSummary.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 border-b font-medium">{item.className}</td>
                                <td className="p-3 border-b text-blue-700 font-semibold">₹ {item.totalFee}</td>
                                <td className="p-3 border-b text-green-600">₹ {item.currentPaidFee}</td>
                                <td className="p-3 border-b text-orange-500">₹ {item.discountFee}</td>
                                <td className="p-3 border-b text-purple-600">₹ {item.feeAfterDiscount}</td>
                                <td className="p-3 border-b text-red-600">₹ {item.outstandingFee}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClassFeeSummary;

