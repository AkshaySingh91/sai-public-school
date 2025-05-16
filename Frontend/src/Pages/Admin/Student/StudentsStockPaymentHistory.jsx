const StudentsStockPaymentHistory = ({ student }) => {
  if (!student) return null;

  return (
    <div className="p-6 border rounded-xl shadow-md mt-10 bg-white">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Stock Payment History for {student.fname} {student.lname}
      </h2>

      {student.StockPaymentDetail && student.StockPaymentDetail.length > 0 ? (
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead style={{ backgroundColor: '#E5E7EB' }}>
              <tr>
                <th className="px-6 py-4 text-left text-black font-semibold">Date</th>
                <th className="px-6 py-4 text-left text-black font-semibold">Item</th>
                <th className="px-6 py-4 text-left text-black font-semibold">Qty</th>
                <th className="px-6 py-4 text-left text-black font-semibold">Fee Type</th>
                <th className="px-6 py-4 text-left text-black font-semibold">Account</th>
                <th className="px-6 py-4 text-left text-black font-semibold">Amount</th>
                <th className="px-6 py-4 text-left text-black font-semibold">Remark</th>  
                
              </tr>
            </thead>
            <tbody>
              {student.StockPaymentDetail.map((entry, index) => (
                <tr
                  key={index}
                  className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <td className="px-6 py-4 text-gray-700">{entry.date || "—"}</td>
                  <td className="px-6 py-4 text-gray-700">{entry.itemName}</td>
                  <td className="px-6 py-4 text-gray-700">{entry.quantity}</td>
                  <td className="px-6 py-4 text-gray-700">{entry.feeType}</td>
                  <td className="px-6 py-4 text-gray-700">{entry.account}</td>
                   <td className="px-6 py-4 text-gray-700">₹{entry.amount}</td>
                <td className="px-6 py-4 text-gray-700">{entry.remark ? entry.remark : "Not remark"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 italic">No stock payment records available for this student.</p>
      )}
    </div>
  );
};

export default StudentsStockPaymentHistory;
