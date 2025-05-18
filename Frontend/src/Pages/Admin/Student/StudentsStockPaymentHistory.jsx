import React, { Fragment, useState, useEffect } from "react";
import Stockfeereceipt from "./Transactions/Stockfeereceipt";
import { useSchool } from "../../../contexts/SchoolContext";

const StudentsStockPaymentHistory = ({ student }) => {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { school } = useSchool();

  useEffect(() => {
    if (selectedTransaction) {
      setTimeout(() => window.print(), 500);
    }
  }, [selectedTransaction]);

  if (!student) return null;

  return (
    <>
      <style>{`
  @media print {
  body * {
    visibility: hidden;
  }
  .receipt-print, .receipt-print * {
    visibility: visible;
  }
  .receipt-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100vh;
    padding: 0;
    margin: 0;
    background: white;

    /* Remove flexbox */
    display: block;
  }

  .receipt-copy {
    page-break-inside: avoid;
    page-break-before: auto;
    
    /* Center horizontally and add some vertical spacing */
    max-width: 700px; /* or your desired max width */
    margin: 5vh auto;  /* vertical margin + horizontal auto center */
    padding: 20px;
    
    /* Add a min height so it can vertically center visually */
    min-height: 80vh;

    /* Use flex to center content inside each receipt-copy */
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .receipt-copy + .receipt-copy {
    page-break-before: always; /* new page for second copy */
  }
}

`}</style>

      {/* Main UI - hidden on print */}
      <div className="p-6 border rounded-xl shadow-md mt-10 bg-white no-print">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Stock Payment History for {student.fname} {student.lname}
        </h2>

        {student.StockPaymentDetail?.length > 0 ? (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Date</th>
                <th className="border px-3 py-2">Item</th>
                <th className="border px-3 py-2">Amount</th>
                <th className="border px-3 py-2">Quantity</th>
                <th className="border px-3 py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {student.StockPaymentDetail.map((tx, idx) => (
                <Fragment key={idx}>
                  {tx.items?.map((item, i) => (
                    <tr key={i}>
                      {i === 0 && (
                        <td
                          className="border px-3 py-2 text-center align-middle"
                          rowSpan={tx.items.length}
                        >
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                      )}
                      <td className="border px-3 py-2">{item.itemName}</td>
                      <td className="border px-3 py-2">₹{item.amount}</td>
                      <td className="border px-3 py-2">{item.quantity}</td>
                      {i === 0 && (
                        <td
                          className="border px-3 py-2 text-center align-middle"
                          rowSpan={tx.items.length}
                        >
                          {tx.receiptId ? (
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => setSelectedTransaction(tx)}
                            >
                              View Receipt
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No stock payments found.</p>
        )}
      </div>

      {/* Receipt printing container */}
      {selectedTransaction && (
        <div className="receipt-print">
          <Stockfeereceipt
            student={student}
            transaction={selectedTransaction}
            school={school || {}}
          />
        </div>
      )}
    </>
  );
};

export default StudentsStockPaymentHistory;
