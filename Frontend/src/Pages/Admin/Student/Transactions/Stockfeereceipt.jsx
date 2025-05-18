import React from 'react';

function toWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy',
    'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 20) return a[num];
  if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '');
  if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + toWords(num % 100) : '');
  return 'Amount too large';
}

const format = amt => `₹${Math.abs(amt).toFixed(2)}`;

const formatDateTime = (dateStr) => {
  const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' };
  const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString('en-IN', optionsDate),
    time: date.toLocaleTimeString('en-IN', optionsTime)
  };
};

export default function Stockfeereceipt({ student, school, transaction }) {
  const { fname, lname, class: cls, div } = student;

  const items = Array.isArray(transaction.items) && transaction.items.length > 0
    ? transaction.items
    : [{
      itemName: transaction.itemName,
      quantity: transaction.quantity,
      amount: transaction.amount,
      receiptId: transaction.receiptId,
      paymentMode: transaction.paymentMode,
      account: transaction.account,
      remark: transaction.remark
    }];

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const amountInWords = toWords(Math.round(totalAmount)) + ' Only';
  const { date: displayDate, time: displayTime } = formatDateTime(transaction.date);

  return (
    <div className="px-8 py-6 bg-white  text-sm leading-relaxed text-black">
      {['School Copy', 'Parent Copy'].map((copy, idx) => (
        <div key={idx} className="receipt-copy mb-12 w-full">
          <div className="border border-gray-300 p-6 rounded-xl shadow-md">
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold">{school.schoolName}, {school?.location?.taluka || ''}</h2>
              <p className="text-purple-700 font-medium text-lg">{copy}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-5 border-b border-gray-300 pb-3">
              <div>
                <p><strong>Receipt ID:</strong> {transaction.receiptId || '-'}</p>
                <p><strong>Name:</strong> {fname} {lname}</p>
                <p><strong>Items:</strong> {items.map(item => item.itemName).join(', ')}</p>
              </div>
              <div className="text-right">
                <p><strong>Class:</strong> {cls} - {div}</p>
                <p><strong>Date:</strong> {displayDate}</p>
                <p><strong>Time:</strong> {displayTime}</p>
              </div>
            </div>

            <table className="w-full border border-collapse text-sm mb-4">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border px-4 py-2">Description</th>
                  <th className="border px-4 py-2 text-right">Qty</th>
                  <th className="border px-4 py-2 text-right">Amount</th>
                  <th className="border px-4 py-2 text-left">Payment Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border px-4 py-2">{item.itemName}</td>
                    <td className="border px-4 py-2 text-right">{item.quantity}</td>
                    <td className="border px-4 py-2 text-right">{format(item.amount)}</td>
                    <td className="border px-4 py-2 text-xs">
                      {index === 0 && (
                        <>
                          <p><strong>Mode:</strong> {item.paymentMode || transaction.paymentMode}</p>
                          <p><strong>Account:</strong> {item.account || transaction.account || '-'}</p>
                          <p><strong>Note:</strong> {item.remark || transaction.remark || '-'}</p>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan="2" className="border px-4 py-2 text-right">Total</td>
                  <td className="border px-4 py-2 text-right">{format(totalAmount)}</td>
                  <td className="border px-4 py-2"></td>
                </tr>
              </tfoot>
            </table>

            <p className="italic text-green-700 mb-2"><strong>In Words:</strong> {amountInWords}</p>
            {school.gstin && <p className="text-xs mb-2">GSTIN: {school.gstin}</p>}

            <div className="flex justify-between mt-6">
              <div className="text-center w-1/2">
                <p className="mb-8">Parent Signature</p>
                <hr className="border-t border-black w-32 mx-auto" />
              </div>
              <div className="text-center w-1/2">
                <p className="mb-8">Accountant Signature</p>
                <hr className="border-t border-black w-32 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

