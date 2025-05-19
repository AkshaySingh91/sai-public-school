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

function humanize(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, c => c.toUpperCase())
        .trim();
}

export default function FeeReceipt({ student, school, transaction }) {
    const {
        feeType,
        amount: txAmount,
        paymentMode,
        account,
        remark = '',
        academicYear: txYear,
        historicalSnapshot,
        timestamp
    } = transaction;
    console.log(new Date(timestamp).toLocaleString())
    console.log({ transaction })
    const { academicYear: currAcademicYear, feeId, fname, lname, class: cls, div } = student;
    console.log({ student })
    // Determine fee context
    const isPrevYear = txYear !== currAcademicYear;
    const feeCategory = feeType.includes('School') ? 'School' :
        feeType.includes('Transport') ? 'Transport' :
            feeType.includes('Mess') ? 'Mess' :
                feeType.includes('Hostel') ? 'Hostel' : 'Other';

    // Extract from historical snapshot
    const {
        initialFee = 0,
        applicableDiscount = 0,
        previousPayments = 0,
        remainingBefore = 0,
        remainingAfter = 0
    } = historicalSnapshot || {};

    // Build receipt rows based on fee type
    const rows = [];
    const showDiscount = ['School', 'Transport'].includes(feeCategory);

    // Fee Breakdown
    rows.push({
        label: `${isPrevYear ? 'Last Year ' : ''}${humanize(feeCategory)} Fee`,
        amt: initialFee
    });

    if (showDiscount) {
        rows.push({
            label: `${isPrevYear ? 'Last Year ' : ''}${humanize(feeCategory)} Discount`,
            amt: applicableDiscount
        });

        rows.push({
            label: 'Net Fee After Discount',
            amt: initialFee - applicableDiscount,
            highlight: true
        });
    }

    // Payment History
    rows.push({
        label: 'Previous Payments',
        amt: previousPayments,
        note: `Before ${new Date(transaction.timestamp).toLocaleDateString()}`
    });

    // Current Payment
    rows.push({
        label: 'This Payment',
        amt: txAmount,
        mode: paymentMode,
        account,
        remark,
        highlight: true
    });

    // Outstanding
    rows.push({
        label: 'Remaining Balance',
        amt: remainingAfter,
        total: true
    });

    // Formatting function
    const format = amt => `₹${Math.abs(amt).toFixed(2)}`;
    const amountInWords = convertToWords(Math.round(txAmount)) + ' Only';

    console.log({ rows })
    return (
        <div className="space-y-24 overflow-x-hidden">
            {/* School Header */}

            {['School Copy', 'Parent Copy'].map((copy, idx) => (
                <div className=''>
                    <div className="text-center mb-4 mt-4">
                        <p className="italic text-purple-600">{copy}</p>
                        <h1 className="text-md font-bold capitalize">
                            {
                                // if tx type is school show school header , else transport header
                                transaction.feeType === "TransportFee" ? (school.transportReceiptHeader ? school.transportReceiptHeader : `${school.schoolName} , ${school?.location?.taluka || ""}`) : (school.schoolReceiptHeader ? school.schoolReceiptHeader : `${school.schoolName} , ${school?.location?.taluka || ""}`)
                            }
                        </h1>
                    </div>
                    <div key={idx} className="receipt-copy bg-white border border-gray-200 rounded-sm mb-4 ">
                        {/* Receipt Header */}
                        <div className="p-2 border-b border-gray-200 grid grid-cols-2 text-xs ">
                            <div>
                                <p className="font-bold">Receipt ID: {transaction.receiptId}</p>
                                <p>Fee ID: {feeId}</p>
                                <p>Name: {fname} {lname}</p>
                                <p>Academic Year: {txYear}</p>
                            </div>
                            <div className="text-right">
                                <p>Class: {cls} - {div}</p>
                                <p>Date: {new Date(timestamp).toLocaleDateString()}</p>
                                <p>Time: {new Date(timestamp).toLocaleTimeString()}</p>
                            </div>
                        </div>

                        {/* Fee Details Table */}
                        <table className="w-full text-xs border-collapse border border-gray-400 ">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-1 text-left border-2 border-gray-300 w-auto whitespace-nowrap ">Description</th>
                                    <th className="p-1 text-right border-2 border-gray-300 w-auto whitespace-nowrap ">Amount</th>
                                    {showDiscount && <th className="p-1 border-2 text-left border-gray-300 w-auto whitespace-nowrap ">Discounts</th>}
                                    <th className="p-3 text-left border-2 border-gray-300 w-auto whitespace-nowrap">Payment Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i} className={`${row.total ? 'bg-gray-50' : ''}`}>
                                        <td className="p-1 border-2 border-gray-300 w-auto whitespace-nowrap ">
                                            {row.label}
                                            {row.note && <div className="text-xs text-gray-500">{row.note}</div>}
                                        </td>
                                        <td className="p-1 text-right border-2 border-gray-300 ">{format(row.amt)}</td>
                                        {showDiscount && (
                                            <td className="p-1 border-gray-300 ">
                                                {i === 1 ? format(row.amt) : '-'}
                                            </td>
                                        )}
                                        <td className=" border-2 border-collapse border-gray-300">
                                            {row.mode && (
                                                <div className='text-[13px]'>
                                                    <div className='border-y-2 border-gray-300 p-2 whitespace-pre-wrap'><b>Mode</b>: {row.mode}</div>
                                                    <div className='border-y-2 border-gray-300 p-2 whitespace-pre-wrap'><b>Account</b>: {row.account || '-'}</div>
                                                    <div className='border-y-2 border-gray-300 p-2 whitespace-pre-wrap'><b>Note</b>: {row.remark || '-'}</div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Footer */}
                        < div className="bg-gray-50 border-t border-gray-200 text-xs" >
                            <p className="font-semibold p-2 border-2 border-gray-300">
                                Net Amount in Words: {amountInWords}
                            </p>
                            {
                                school.gstin && (
                                    <p className="mt-2 text-xs">GSTIN: {school.gstin}</p>
                                )
                            }
                            < div className="sign flex w-full justify-evenly mt-4" >
                                <div className="parent-sign flex flex-col items-center">
                                    <h3 className='mb-10'>Parent Sign
                                    </h3>
                                    <hr className='border border-slate-700 w-32' />
                                </div>
                                <div className="accountant-sign flex flex-col items-center">
                                    <h3 className='mb-10'>Accountant Sign
                                    </h3>
                                    <hr className='border border-slate-700 w-32' />

                                </div>

                            </div>
                        </div >
                    </div >
                </div >
            ))
            }
        </div >
    );
}