import React, { useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from "../../../../config/firebase"; // Update if your context path is different

const AllTransactions = () => {
   const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState([]);

  const handleFetch = async () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates.");
      return;
    }

    const from = Timestamp.fromDate(new Date(fromDate));
    const to = Timestamp.fromDate(new Date(toDate));

    const q = query(
      collection(db, 'transactions'),
      where('paymentDate', '>=', from),
      where('paymentDate', '<=', to)
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTransactions(data);
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6">
      <h2 className="text-2xl font-bold mb-4">All Transactions</h2>

      {/* Filter Section */}
      <div className="flex gap-4 mb-6">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          onClick={handleFetch}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Get Transactions
        </button>
      </div>

      {/* Table */}
      {transactions.length > 0 ? (
        <table className="w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Student ID</th>
              <th className="p-2 border">Fee Type</th>
              <th className="p-2 border">Mode</th>
              <th className="p-2 border">Account</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Remark</th>
              <th className="p-2 border">Academic Year</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn, index) => (
              <tr key={index} className="text-center border-t">
                <td className="p-2 border">
                  {txn.paymentDate?.toDate().toLocaleDateString()}
                </td>
                <td className="p-2 border">{txn.studentId}</td>
                <td className="p-2 border capitalize">{txn.feeType}</td>
                <td className="p-2 border capitalize">{txn.paymentMode}</td>
                <td className="p-2 border">{txn.account}</td>
                <td className="p-2 border">₹{txn.amount}</td>
                <td className="p-2 border">{txn.remark}</td>
                <td className="p-2 border">{txn.academicYear}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600">No transactions found for selected dates.</p>
      )}
    </div>
  );
};

export default AllTransactions;