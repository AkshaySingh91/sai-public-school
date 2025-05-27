import React from 'react';

function formatDateTime(isoString) {
  const dateObj = new Date(isoString);

  const date = dateObj.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const time = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Convert from DD/MM/YYYY to DD-MM-YYYY
  const formattedDate = date.replace(/\//g, "-");

  return {
    date: formattedDate,
    time: time.toLowerCase(),
  };
}

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
    <div className="px-8 py-2 bg-white text-sm leading-relaxed text-black print:p-0">
      {['School Copy', 'Parent Copy'].map((copy, idx) => (
        <div key={idx} className="receipt-copy mb-12 w-full break-inside-avoid">
          {/* Header Section */}
          <div className="text-center space-y-2 pb-4">
            <p className="mt-2 text-purple-600 font-medium text-xs">{copy}</p>
            <h1 className="text-md font-bold text-blue-600 capitalize">
              {school.stockReceiptHeader ? school.stockReceiptHeader : `${school.schoolName} , ${school?.location?.taluka || ""}`}
            </h1>
          </div>

          <div className="border border-gray-300 rounded-xl shadow-md mx-auto max-w-2xl">
            <div className="heading uppercase text-green-700 w-full text-center text-md font-bold py-1 border-b-2 border-gray-300 ">{transaction?.feeType?.toLowerCase() === "itemfee" ? "Stationery Fee Receipt" : "Fee Recipt"}</div>

            <div className="body px-6 py-4">
              {/* Student Details */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className='text-xs'>
                  <p><span className="font-semibold">Fee Id:</span> {feeId}</p>
                  <p> <span className='font-semibold '>Name</span> <span className="uppercase whitespace-nowrap">{fname} {student.fatherName || ""} {lname}</span></p>
                  <p><span className="font-semibold">Receipt No:</span> {transaction.receiptId}</p>
                  <p><span className="font-semibold">Class:</span> {cls} - <span className='uppercase'>{div}</span></p>
                </div>
                <div className="text-right text-xs">
                  <p><span className="font-semibold">Date:</span> {formatDateTime(transaction.date).date}</p>
                  <p><span className="font-semibold">Time:</span> {formatDateTime(transaction.date).time}</p>
                  <p><span className="font-semibold">Year:</span> {academicYear}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse mb-3">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border p-1 text-left">Sr.</th>
                    <th className="border p-1 text-left uppercase">Item</th>
                    <th className="border p-1 text-right w-auto whitespace-nowrap">Quantity</th>
                    <th className="border p-1 text-right w-auto whitespace-nowrap">Price</th>
                    <th className="border p-1 text-right w-auto whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="border p-1">{index + 1}.</td>
                      <td className="border p-1">{item.itemName}</td>
                      <td className="border p-1 text-right w-auto whitespace-nowrap">{item.quantity}</td>
                      <td className="border p-1 text-right">₹{item.price.toFixed(2)}</td>
                      <td className="border p-1 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan="4" className="border p-1 text-left">Total Price</td>
                    <td className="border p-1 text-right">₹{totalAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="5" className="border p-1 italic text-sm">
                      <span className='font-semibold'>Amount in Words</span>: {convertToWords(Math.round(totalAmount))} Only
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4 mb-3 ">
                <div className='space-y-1 text-xs'>
                  <p className=" whitespace-nowrap ">
                    <span className='underline font-semibold'>
                      Payment Mode:</span>&nbsp;
                    <span className=' capitalize italic'>{transaction.account || "-"}</span>
                  </p>
                  {
                    transaction.remark &&
                    <p className=" whitespace-nowrap ">
                      <span className='underline font-semibold'>
                        Remark:</span>&nbsp;
                      <span className=' capitalize italic'>{transaction.remark || "-"}</span>
                    </p>
                  }
                  <p className="text-xs text-gray-600 whitespace-nowrap ">
                    Date: {new Date(transaction.date).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right text-xs">
                  {school.gstin && <p className="text-xs">GSTIN: {school.gstin}</p>}
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-4 pt-4">
                <div className="text-center w-1/2  ">
                  <p className="mb-14">Parent Sign</p>
                  <div className="border-t border-dashed border-gray-400"></div>
                </div>
                <div className="text-center w-1/2  ">
                  <p className="mb-14">Stamp</p>
                  <div className="border-t border-dashed border-gray-400"></div>
                </div>
                <div className="text-center w-1/2">
                  <p className="mb-14">Accountant Sign</p>
                  <div className="border-t border-dashed border-gray-400"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(StockFeeReceipt)
