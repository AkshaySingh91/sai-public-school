import React from 'react';

function toWords(num) {
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
        'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy',
        'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + toWords(num % 100) : '');
    if (num < 100000) return toWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + toWords(num % 1000) : '');
    if (num < 10000000) return toWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + toWords(num % 100000) : '');
    return 'Amount too large';
}

function humanize(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, c => c.toUpperCase())
        .trim();
}

export default function FeeReceipt({ student, school, transaction, transactions }) {
    const { feeType, amount: txAmount, paymentMode, account, remark = '', academicYear: txYear } = transaction;
    const { allFee, academicYear, feeId, fname, lname, busDestination, class: cls, div } = student;
    const { schoolFees, schoolFeesDiscount, transportFee, transportFeeDiscount, messFee, hostelFee } = allFee;
    // Determine fee category
    const feeCategory = feeType === 'SchoolFee' ? 'School' :
        feeType === 'TransportFee' ? 'Transport' :
            feeType === 'MessFee' ? 'Mess' :
                feeType === 'HostelFee' ? 'Hostel' : 'Other';
    // Calculate base values based on category
    let baseGross = 0, discount = 0, afterDiscount = 0, totalPaid = 0, outstanding = 0;
    // console.log(transactions, txYear, feeCategory)

    switch (feeCategory) {
        case 'School':
            baseGross = schoolFees.total + schoolFeesDiscount || 0;
            discount = schoolFeesDiscount || 0;
            afterDiscount = baseGross - discount;
            totalPaid = transactions
                .filter(t => t.academicYear === txYear && t.feeType === 'SchoolFee')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            console.log({ totalPaid })
            outstanding = afterDiscount - totalPaid;
            break;

        case 'Transport':
            baseGross = transportFee || 0;
            discount = transportFeeDiscount || 0;
            afterDiscount = baseGross - discount;
            totalPaid = transactions
                .filter(t => t.academicYear === txYear && t.feeType === 'TransportFee')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            outstanding = afterDiscount - totalPaid;
            break;

        case 'Mess':
            baseGross = messFee || 0;
            totalPaid = transactions
                .filter(t => t.academicYear === txYear && t.feeType === 'MessFee')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            outstanding = baseGross - totalPaid;
            break;

        case 'Hostel':
            baseGross = hostelFee || 0;
            totalPaid = transactions
                .filter(t => t.academicYear === txYear && t.feeType === 'HostelFee')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            outstanding = baseGross - totalPaid;
            break;

        default:
            baseGross = txAmount;
            totalPaid = txAmount;
            outstanding = 0;
    }
    // console.log(baseGross, discount, afterDiscount, totalPaid, outstanding)
    // Build receipt rows
    const rows = [];
    if (['School', 'Transport'].includes(feeCategory)) {
        rows.push(
            { label: `${humanize(feeCategory)} Fee`, amt: baseGross },
            { label: `${humanize(feeCategory)} Fee Discount`, amt: discount },
            { label: 'After Discount', amt: afterDiscount, total: true }
        );
    } else {
        rows.push({ label: `${humanize(feeCategory)} Fee`, amt: baseGross });
    }

    rows.push(
        { label: 'This Payment', amt: txAmount, mode: paymentMode, account, remark },
        { label: `Total Paid (${txYear})`, amt: totalPaid, total: true },
        { label: 'Outstanding Amount', amt: outstanding, total: true }
    );

    // Format amounts
    const format = amt => `₹${Math.abs(amt).toFixed(2)}`;
    const paidWords = toWords(Math.round(totalPaid)) + ' Only';

    return (
        <div className="space-y-20 p-6">
            {/* School Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold">{school.schoolName}</h1>
                <p className="text-gray-600 mt-2">{school.address}</p>
            </div>

            {['School Copy', 'Parent Copy'].map((copy, idx) => (
                <div key={idx} className="bg-white border border-gray-300 rounded-lg shadow-sm ">
                    {/* Receipt Header */}
                    <div className="p-4 border-b border-gray-300 grid grid-cols-2">
                        <div>
                            <p className="font-bold">Receipt ID: {transaction.receiptId}</p>
                            <p>Fee ID: {feeId}</p>
                            <p>Name: {fname} {lname}</p>
                            <p>Academic Year: {txYear}</p>
                        </div>
                        <div className="text-right">
                            <p>Class: {cls} - {div}</p>
                            <p>Date: {new Date(transaction.date).toLocaleDateString()}</p>
                            <p className="italic text-purple-600">{copy}</p>
                        </div>
                    </div>

                    {/* Fee Details Table */}
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left">Description</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Payment Mode</th>
                                <th className="p-3 text-left">Account</th>
                                <th className="p-3 text-left">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i} className={row.total ? 'bg-gray-50 font-semibold' : 'border-b border-gray-200'}>
                                    <td className="p-3">{row.label}</td>
                                    <td className="p-3 text-right">{format(row.amt)}</td>
                                    <td className="p-3">{row.mode || '-'}</td>
                                    <td className="p-3">{['School', 'Transport'].includes(feeCategory) ? i === 3 ? account : '-' : i == 1 ? account : '-'}</td>
                                    <td className="p-3">{row.remark || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="p-4 bg-gray-100 border-t border-gray-300">
                        <p className="font-semibold">
                            Net Amount in Words: {paidWords}
                        </p>
                        {school.gstin && (
                            <p className="mt-2 text-sm">GSTIN: {school.gstin}</p>
                        )}
                        <div className="sign flex w-full justify-evenly mt-8 mb-3">
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
                    </div>
                </div>
            ))}
        </div>
    );
}