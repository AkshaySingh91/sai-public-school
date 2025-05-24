import React from 'react';

function convertToWords(n) {
  if (n === 0)
    return "Zero";
  const units = [
    "", "One", "Two", "Three",
    "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven",
    "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];

  // Words for numbers multiple of 10        
  const tens = [
    "", "", "Twenty", "Thirty", "Forty",
    "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const multiplier = ["", "Thousand", "Million", "Billion"];

  let res = "";
  let group = 0;

  // Process number in group of 1000s
  while (n > 0) {
    if (n % 1000 !== 0) {

      let value = n % 1000;
      let temp = "";

      // Handle 3 digit number
      if (value >= 100) {
        temp = units[Math.floor(value / 100)] + " Hundred ";
        value %= 100;
      }

      // Handle 2 digit number
      if (value >= 20) {
        temp += tens[Math.floor(value / 10)] + " ";
        value %= 10;
      }

      // Handle unit number
      if (value > 0) {
        temp += units[value] + " ";
      }

      // Add the multiplier according to the group
      temp += multiplier[group] + " ";

      // Add the result of this group to overall result
      res = temp + res;
    }
    n = Math.floor(n / 1000);
    group++;
  }

  // Remove trailing space
  return res.trim();
}
function StockFeeReceipt({ student, school, transaction }) {
  const { fname, lname, class: cls, div, academicYear, feeId } = student;
  const items = transaction.items || [];
  const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div className="px-8 py-6 bg-white text-sm leading-relaxed text-black print:p-0">
      {['School Copy', 'Parent Copy'].map((copy, idx) => (
        <div key={idx} className="receipt-copy mb-12 w-full break-inside-avoid">
          <div className="border border-gray-300 px-6 py-3 rounded-xl shadow-md mx-auto max-w-2xl">
            {/* Header Section */}
            <div className="text-center mb-6 border-b pb-4 border-slate-200">
              <p className="mt-2 text-purple-600 font-medium">{copy}</p>
              <h1 className="text-md font-bold text-blue-600">
                {school.busReceiptHeader ? school.busReceiptHeader : `${school.schoolName} , ${school?.location?.taluka || ""}`}
              </h1>
            </div>

            {/* Student Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p><span className="font-semibold">Name:</span> {fname} {lname}</p>
                <p><span className="font-semibold">Class:</span> {cls} - {div}</p>
                <p><span className="font-semibold">Receipt No:</span> {transaction.receiptId}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold">Academic Year:</span> {academicYear}</p>
                <p><span className="font-semibold">Fee Id:</span> {feeId}</p>
                <p><span className="font-semibold">Date:</span> {new Date(transaction.date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border p-2 text-left">Item</th>
                  <th className="border p-2 text-right">Qty</th>
                  <th className="border p-2 text-right">Unit Price</th>
                  <th className="border p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border p-2">{item.itemName}</td>
                    <td className="border p-2 text-right">{item.quantity}</td>
                    <td className="border p-2 text-right">₹{item.price.toFixed(2)}</td>
                    <td className="border p-2 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 font-semibold">
                  <td colSpan="3" className="border p-2 text-right">Grand Total</td>
                  <td className="border p-2 text-right">₹{totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan="4" className="border p-2 italic text-sm">
                    <span className='font-semibold'>Amount in Words</span>: {convertToWords(Math.round(totalAmount))} Only
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="font-semibold whitespace-nowrap">Payment Mode: {transaction.account}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">Date: {new Date(transaction.date).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                {school.gstin && <p className="text-sm">GSTIN: {school.gstin}</p>}
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-4 pt-4 border-t border-slate-200">
              <div className="text-center w-1/2  ">
                <p className="mb-14">Parent's Signature</p>
                <div className="border-t border-dashed border-gray-400"></div>
              </div>
              <div className="text-center w-1/2">
                <p className="mb-14">School Signature</p>
                <div className="border-t border-dashed border-gray-400"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(StockFeeReceipt)
