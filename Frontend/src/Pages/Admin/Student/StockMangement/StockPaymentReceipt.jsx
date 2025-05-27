// StockPaymentReceipt.js
import React from 'react';

const StockPaymentReceipt = ({ student, transaction, school }) => {
    return (
        <div className="receipt-print p-6">
            <div className="receipt-copy bg-white p-6 rounded-lg">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">{school.name}</h2>
                    <p className="text-gray-600">{school.address}</p>
                </div>

                <div className="flex justify-between mb-6">
                    <div>
                        <p><strong>Student:</strong> {student.fname} {student.lname}</p>
                        <p><strong>Class:</strong> {student.class} - {student.div}</p>
                    </div>
                    <div>
                        <p><strong>Date:</strong> {new Date(transaction.date).toLocaleDateString()}</p>
                        <p><strong>Receipt ID:</strong> {transaction.receiptId}</p>
                    </div>
                </div>

                <table className="w-full mb-6">
                    <thead>
                        <tr>
                            <th className="text-left p-2">Item</th>
                            <th className="text-left p-2">Quantity</th>
                            <th className="text-left p-2">Price</th>
                            <th className="text-left p-2">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaction.items.map((item, index) => (
                            <tr key={index}>
                                <td className="p-2">{item.itemName}</td>
                                <td className="p-2">{item.quantity}</td>
                                <td className="p-2">₹{item.amount / item.quantity}</td>
                                <td className="p-2">₹{item.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="text-right text-xl font-bold">
                    Grand Total: ₹{transaction.total}
                </div>
            </div>
        </div>
    );
};

export default StockPaymentReceipt;