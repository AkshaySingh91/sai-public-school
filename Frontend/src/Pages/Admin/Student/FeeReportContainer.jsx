// // FeeReportsContainer.jsx (New Parent Component)
// import React, { useState, useEffect, useMemo } from 'react';
// import { useAuth } from '../../../contexts/AuthContext';
// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { db } from '../../../config/firebase';
// import OutstandingFee from './OutstandingFee';
// import StudentFeeDetails from './StudentFeeDetails';
// import { PieChart, FeeBar } from './FeeVisualizations';

// export default function FeeReportsContainer() {
//     const { userData } = useAuth();
//     const [students, setStudents] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [classActiveTab, setClassActiveTab] = useState('active');
//     const [studentActiveTab, setStudentActiveTab] = useState('active');
//     const [currentPage, setCurrentPage] = useState(1);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [sortKey, setSortKey] = useState(null);
//     const [sortOrder, setSortOrder] = useState('desc');
//     const itemsPerPage = 10;

//     // Fetch students (same as original)
//     useEffect(() => {
//         const fetchStudents = async () => {
//             try {
//                 setLoading(true);
//                 const q = query(
//                     collection(db, 'students'),
//                     where('schoolCode', '==', userData.schoolCode)
//                 );
//                 const snapshot = await getDocs(q);
//                 const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//                 setStudents(data);
//                 console.log("students in outstanding fee", data);
//             } catch (error) {
//                 console.error("Error fetching students:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchStudents();
//     }, [userData.schoolCode]);

//     // Process student data (same as StudentFeeDetails)
//     // FeeReportsContainer.jsx (Updated processStudentData)
//     const processStudentData = (student) => {
//         const fees = student.allFee || {};
//         const transactions = student.transactions || [];

//         // Last year payments calculation
//         const lastYearTransactions = transactions.filter(t => t.academicYear !== student.academicYear);
//         const lastYearSchoolPaid = lastYearTransactions
//             .filter(t => t.feeType === 'SchoolFee')
//             .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

//         const lastYearTransportPaid = lastYearTransactions
//             .filter(t => t.feeType === 'TransportFee')
//             .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

//         // Current year payments calculation
//         const currentYearTransactions = transactions.filter(t => t.academicYear === student.academicYear);

//         // Calculate net fees after discounts
//         const schoolFeeNet = (fees.schoolFees?.total || 0) 
//         const transportFeeNet = (fees.transportFee || 0) 
//         const currentYearPaid = {
//             SchoolFee: currentYearTransactions.filter(t => t.feeType === 'SchoolFee')
//                 .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
//             TransportFee: currentYearTransactions.filter(t => t.feeType === 'TransportFee')
//                 .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
//             MessFee: currentYearTransactions.filter(t => t.feeType === 'MessFee')
//                 .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
//             HostelFee: currentYearTransactions.filter(t => t.feeType === 'HostelFee')
//                 .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
//         };

//         // Calculate totals correctly
//         const totalFees = schoolFeeNet + transportFeeNet +
//             (fees.messFee || 0) +
//             (fees.hostelFee || 0);

//         const totalPaid = Object.values(currentYearPaid).reduce((sum, val) => sum + val, 0);
//         const totalDiscount = (fees.schoolFeesDiscount || 0) +
//             (fees.transportFeeDiscount || 0);

//         return {
//             ...student,
//             lastYearSchoolBalance: fees.lastYearBalanceFee || 0,
//             lastYearTransportBalance: fees.lastYearTransportFee || 0,
//             lastYearSchoolPaid,
//             lastYearTransportPaid,
//             currentYearPaid,
//             currentYearTotals: {
//                 SchoolFee: schoolFeeNet,
//                 TransportFee: transportFeeNet,
//                 MessFee: fees.messFee || 0,
//                 HostelFee: fees.hostelFee || 0
//             },
//             totalFees,
//             totalDiscount,
//             afterDiscount: totalFees,
//             paid: totalPaid,
//             outstanding: totalFees - totalPaid
//         };
//     };
//     const { activeRows, inactiveRows } = useMemo(() => {
//         const processStudents = (statusFilter) => {
//             const classMap = new Map();
//             students.filter(s => s.status === statusFilter).forEach(student => {
//                 const cls = student.class || 'Unknown';
//                 const existing = classMap.get(cls) || {
//                     lastYear: 0,
//                     original: 0,
//                     discount: 0,
//                     paid: 0,
//                     count: 0
//                 };
//                 const fees = student.allFee || {};
//                 // Last Year Fees
//                 existing.lastYear += (fees.lastYearTransportFee || 0) + (fees.lastYearBalanceFee || 0);
//                 // Original Fees (pre-discount totals)
//                 existing.original += (fees.schoolFees?.total || 0) + (fees.transportFee || 0) + (fees.messFee || 0) + (fees.hostelFee || 0) + (fees.transportFeeDiscount || 0) + (fees.schoolFeesDiscount || 0);
//                 // Discounts
//                 existing.discount += (fees.schoolFeesDiscount || 0) + (fees.transportFeeDiscount || 0);
//                 // Paid Amounts
//                 const paid = (student.transactions || [])
//                     .filter(t => t.academicYear === student.academicYear)
//                     .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
//                 existing.paid += paid;
//                 existing.count += 1;
//                 classMap.set(cls, existing);
//             });

//             return Array.from(classMap.entries()).map(([cls, data], index) => ({
//                 no: index + 1,
//                 class: cls,
//                 students: data.count,
//                 lastYear: data.lastYear,
//                 original: data.original,
//                 discount: data.discount,
//                 afterDiscount: data.original - data.discount,
//                 paid: data.paid,
//                 outstanding: (data.original - data.discount) - data.paid
//             }));
//         };

//         return {
//             activeRows: processStudents('active'),
//             inactiveRows: processStudents('inactive')
//         };
//     }, [students]);

//     const filteredAllStudents = useMemo(() => {
//         let result = students
//             .filter(s => s.status === studentActiveTab)
//             .map(processStudentData)
//             .filter(s => {
//                 const searchLower = searchTerm.toLowerCase();
//                 return (
//                     s.fname.toLowerCase().includes(searchLower) ||
//                     s.lname.toLowerCase().includes(searchLower) ||
//                     s.feeId.toLowerCase().includes(searchLower)
//                 );
//             });

//         if (sortKey) {
//             result = result.sort((a, b) => {
//                 const valueA = a[sortKey];
//                 const valueB = b[sortKey];
//                 return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
//             });
//         }

//         return result;
//     }, [students, studentActiveTab, searchTerm, sortKey, sortOrder]);

//     // Pagination slicing (same as both components)
//     const currentItems = useMemo(() => {
//         const start = (currentPage - 1) * itemsPerPage;
//         return filteredAllStudents.slice(start, start + itemsPerPage);
//     }, [filteredAllStudents, currentPage]);

//     // Common currency formatting
//     const formatCurrency = (amount) =>
//         new Intl.NumberFormat('en-IN', {
//             style: 'currency',
//             currency: 'INR',
//             maximumFractionDigits: 0
//         }).format(amount).replace('₹', '₹ ');

//     return (
//         <div className="space-y-8">
//             <OutstandingFee
//                 loading={loading}
//                 activeRows={activeRows || []}
//                 inactiveRows={inactiveRows || []}
//                 classActiveTab={classActiveTab}
//                 setClassActiveTab={setClassActiveTab}
//                 formatCurrency={formatCurrency}
//             />

//             <StudentFeeDetails
//                 loading={loading}
//                 filteredAllStudents={filteredAllStudents}
//                 currentItems={currentItems}
//                 studentActiveTab={studentActiveTab}
//                 searchTerm={searchTerm}
//                 sortKey={sortKey}
//                 sortOrder={sortOrder}
//                 currentPage={currentPage}
//                 itemsPerPage={itemsPerPage}
//                 formatCurrency={formatCurrency}
//                 setStudentActiveTab={setStudentActiveTab}
//                 setSearchTerm={setSearchTerm}
//                 setSortKey={setSortKey}
//                 setSortOrder={setSortOrder}
//                 setCurrentPage={setCurrentPage}
//             />
//         </div>
//     );
// }

// FeeReportsContainer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import OutstandingFee from './OutstandingFee';
import StudentFeeDetails from './StudentFeeDetails';
import { PieChart, FeeBar } from './FeeVisualizations';

export default function FeeReportsContainer() {
    const { userData } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classActiveTab, setClassActiveTab] = useState('active');
    const [studentActiveTab, setStudentActiveTab] = useState('active');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc');
    const itemsPerPage = 10;

    // Fetch students
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true);
                const q = query(
                    collection(db, 'students'),
                    where('schoolCode', '==', userData.schoolCode)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => {
                    const raw = doc.data();
                    return {
                        id: doc.id,
                        ...raw,
                        normalizedStatus: ['new', 'current'].includes(raw.status) ? 'active' : raw.status
                    };
                });
                setStudents(data);
                console.log("students in outstanding fee", data);
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [userData.schoolCode]);

    // Process student data
    const processStudentData = (student) => {
        const fees = student.allFee || {};
        const transactions = student.transactions || [];

        const lastYearTransactions = transactions.filter(t => t.academicYear !== student.academicYear);
        const lastYearSchoolPaid = lastYearTransactions
            .filter(t => t.feeType === 'SchoolFee')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const lastYearTransportPaid = lastYearTransactions
            .filter(t => t.feeType === 'TransportFee')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const currentYearTransactions = transactions.filter(t => t.academicYear === student.academicYear);

        const schoolFeeNet = (fees.schoolFees?.total || 0);
        const transportFeeNet = (fees.transportFee || 0);

        const currentYearPaid = {
            SchoolFee: currentYearTransactions.filter(t => t.feeType === 'SchoolFee')
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
            TransportFee: currentYearTransactions.filter(t => t.feeType === 'TransportFee')
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
            MessFee: currentYearTransactions.filter(t => t.feeType === 'MessFee')
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
            HostelFee: currentYearTransactions.filter(t => t.feeType === 'HostelFee')
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        };

        const totalFees = schoolFeeNet + transportFeeNet +
            (fees.messFee || 0) +
            (fees.hostelFee || 0);

        const totalPaid = Object.values(currentYearPaid).reduce((sum, val) => sum + val, 0);
        const totalDiscount = (fees.schoolFeesDiscount || 0) +
            (fees.transportFeeDiscount || 0);

        return {
            ...student,
            lastYearSchoolBalance: fees.lastYearBalanceFee || 0,
            lastYearTransportBalance: fees.lastYearTransportFee || 0,
            lastYearSchoolPaid,
            lastYearTransportPaid,
            currentYearPaid,
            currentYearTotals: {
                SchoolFee: schoolFeeNet,
                TransportFee: transportFeeNet,
                MessFee: fees.messFee || 0,
                HostelFee: fees.hostelFee || 0
            },
            totalFees,
            totalDiscount,
            afterDiscount: totalFees,
            paid: totalPaid,
            outstanding: totalFees - totalPaid
        };
    };

    const { activeRows, inactiveRows } = useMemo(() => {
        const processStudents = (statusFilter) => {
            const classMap = new Map();
            students.filter(s => s.normalizedStatus === statusFilter).forEach(student => {
                const cls = student.class || 'Unknown';
                const existing = classMap.get(cls) || {
                    lastYear: 0,
                    original: 0,
                    discount: 0,
                    paid: 0,
                    count: 0
                };
                const fees = student.allFee || {};
                existing.lastYear += (fees.lastYearTransportFee || 0) + (fees.lastYearBalanceFee || 0);
                existing.original += (fees.schoolFees?.total || 0) + (fees.transportFee || 0) + (fees.messFee || 0) + (fees.hostelFee || 0) + (fees.transportFeeDiscount || 0) + (fees.schoolFeesDiscount || 0);
                existing.discount += (fees.schoolFeesDiscount || 0) + (fees.transportFeeDiscount || 0);
                const paid = (student.transactions || [])
                    .filter(t => t.academicYear === student.academicYear)
                    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                existing.paid += paid;
                existing.count += 1;
                classMap.set(cls, existing);
            });

            return Array.from(classMap.entries()).map(([cls, data], index) => ({
                no: index + 1,
                class: cls,
                students: data.count,
                lastYear: data.lastYear,
                original: data.original,
                discount: data.discount,
                afterDiscount: data.original - data.discount,
                paid: data.paid,
                outstanding: (data.original - data.discount) - data.paid
            }));
        };

        return {
            activeRows: processStudents('active'),
            inactiveRows: processStudents('inactive')
        };
    }, [students]);

    const filteredAllStudents = useMemo(() => {
        let result = students
            .filter(s => s.normalizedStatus === studentActiveTab)
            .map(processStudentData)
            .filter(s => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    s.fname.toLowerCase().includes(searchLower) ||
                    s.lname.toLowerCase().includes(searchLower) ||
                    s.feeId.toLowerCase().includes(searchLower)
                );
            });

        if (sortKey) {
            result = result.sort((a, b) => {
                const valueA = a[sortKey];
                const valueB = b[sortKey];
                return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
            });
        }

        return result;
    }, [students, studentActiveTab, searchTerm, sortKey, sortOrder]);

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAllStudents.slice(start, start + itemsPerPage);
    }, [filteredAllStudents, currentPage]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount).replace('₹', '₹ ');

    return (
        <div className="space-y-8">
            <OutstandingFee
                loading={loading}
                activeRows={activeRows || []}
                inactiveRows={inactiveRows || []}
                classActiveTab={classActiveTab}
                setClassActiveTab={setClassActiveTab}
                formatCurrency={formatCurrency}
            />

            <StudentFeeDetails
                loading={loading}
                filteredAllStudents={filteredAllStudents}
                currentItems={currentItems}
                studentActiveTab={studentActiveTab}
                searchTerm={searchTerm}
                sortKey={sortKey}
                sortOrder={sortOrder}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                formatCurrency={formatCurrency}
                setStudentActiveTab={setStudentActiveTab}
                setSearchTerm={setSearchTerm}
                setSortKey={setSortKey}
                setSortOrder={setSortOrder}
                setCurrentPage={setCurrentPage}
            />
        </div>
    );
}
