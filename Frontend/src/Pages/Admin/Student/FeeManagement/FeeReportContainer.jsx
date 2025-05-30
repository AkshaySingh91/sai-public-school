// FeeReportsContainer.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import OutstandingFee from "../OutstandingFees/OutstandingFee";
import StudentFeeDetails from "./StudentFeeDetails";

export default function FeeReportsContainer() {
  const { userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classActiveTab, setClassActiveTab] = useState("active");
  const [studentActiveTab, setStudentActiveTab] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedDiv, setSelectedDiv] = useState("All");
  const itemsPerPage = 10;

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "students"),
          where("schoolCode", "==", userData.schoolCode)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const raw = doc.data();
          return {
            id: doc.id,
            ...raw,
            normalizedStatus: ["new", "current"].includes(raw.status)
              ? "active"
              : raw.status, //new
          };
        });
        setStudents(data);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [userData.schoolCode]);

  // here we calc all stude LYBF+LYTF, orignal = SF+TF+MF+HF+SFD+TFD, discount = SFD+TFD, outstanding = pending SF+MF+TF+HF, paid = paid SF+HF+MF+TF
  const processStudentData = (student) => {
    const fees = student.allFee || {};
    const transactions = student.transactions || [];

    // only check prev year not eairler transactions
    function getPrevYear(year) {
      const years = year?.split("-") || ["00"];
      return years.map((y) => parseInt(y) || 0);
    }

    const lastYearTransactions = transactions.filter((t) => {
      const [startYear, endYear] = getPrevYear(student.academicYear);
      // console.log({ startYear, endYear }, `${startYear - 1}-${endYear - 1}`)
      return t.academicYear === `${startYear - 1}-${endYear - 1}`;
    });
    // consider only completed payment "t.status === "completed""
    const lastYearTuitionPaid = lastYearTransactions
      .filter((t) => (t?.feeType?.toLowerCase() === "tuitionfee" || t?.feeType?.toLowerCase() === "admissionfee" || t?.feeType?.toLowerCase() === "hostelfee" || t?.feeType?.toLowerCase() === "messfee") && t?.status?.toLowerCase() === "completed")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const lastYearBusPaid = lastYearTransactions
      .filter((t) => t?.feeType?.toLowerCase() === "busfee" && t?.status?.toLowerCase() === "completed")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // console.log({ lastYearTuitionPaid })
    // console.log({ lastYearBusPaid })

    const currentYearTransactions = transactions.filter(
      (t) => t.academicYear === student.academicYear
    );

    const tuitionFeeNet = fees.tuitionFees?.total || 0;
    const busFeeNet = fees.busFee || 0;

    // this is total all type of fees paid by student
    const currentYearPaid = {
      schoolFee: currentYearTransactions
        .filter((t) => (t?.feeType?.toLowerCase() === "tuitionfee" || t?.feeType?.toLowerCase() === "admissionfee") && t?.status?.toLowerCase() === "completed")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      busFee: currentYearTransactions
        .filter((t) => t?.feeType?.toLowerCase() === "busfee" && t?.status?.toLowerCase() === "completed")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      messFee: currentYearTransactions
        .filter((t) => t?.feeType?.toLowerCase() === "messfee" && t?.status?.toLowerCase() === "completed")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      hostelFee: currentYearTransactions
        .filter((t) => t?.feeType?.toLowerCase() === "hostelfee" && t?.status?.toLowerCase() === "completed")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    };
    // this is total fees for current year of student 
    const totalFees =
      tuitionFeeNet +
      busFeeNet +
      (fees.messFee || 0) +
      (fees.hostelFee || 0);

    const totalPaid = Object.values(currentYearPaid).reduce(
      (sum, val) => sum + val,
      0);
    const totalDiscount =
      (fees.tutionFeesDiscount || 0) + (fees.busFeeDiscount || 0);

    const busFeePaid = currentYearTransactions
      .filter((t) => t?.feeType?.toLowerCase() === "busfee" && t?.status?.toLowerCase() === "completed")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const tutionFeePaid = totalPaid - busFeePaid;

    return {
      ...student,
      lastYearTuitionBalance: fees.lastYearBalanceFee || 0,
      lastYearBusFee: fees.lastYearBusFee || 0,
      currentYearPaid,
      currentYearTotals: {
        schoolFee: tuitionFeeNet,
        busFee: busFeeNet,
        messFee: fees.messFee || 0,
        hostelFee: fees.hostelFee || 0,
      },
      totalFees: totalFees + totalDiscount, //add discount
      totalDiscount,
      afterDiscount: totalFees,
      paid: totalPaid,
      outstanding: totalFees - totalPaid,
      lastYearTuitionPaid, //use to visulize chart
      lastYearBusPaid, //use to visulize chart
      tutionFeeNet: totalFees - busFeeNet, // use in excel total tuition fee it inc mess, hostel also
      tutionFeePaid, // use in excel it is total tuition paid fee ic hostel, mess
      totalTransportFee: busFeeNet + (fees?.busFeeDiscount || 0), // use in excel it is bus with discount
      busFeeNet, // use in excel it is bus without discount
      busFeePaid, // use in excel it is bus fee paid by stu
    };
  };

  const { activeRows, inactiveRows } = useMemo(() => {
    const processStudents = (statusFilter) => {
      const classMap = new Map();
      students
        .filter((s) => s.normalizedStatus === statusFilter)
        .forEach((student) => {
          const cls = student.class || "Unknown";
          const existing = classMap.get(cls) || {
            lastYear: 0,
            original: 0,
            discount: 0,
            paid: 0,
            count: 0,
          };
          const fees = student.allFee || {};

          existing.lastYear +=
            (fees.lastYearBusFee || 0) + (fees.lastYearBalanceFee || 0);

          existing.original +=
            (fees.tuitionFees?.total || 0) +
            (fees.busFee || 0) +
            (fees.messFee || 0) +
            (fees.hostelFee || 0) +
            (fees.busFeeDiscount || 0) +
            (fees.tutionFeesDiscount || 0);

          existing.discount +=
            (fees.tutionFeesDiscount || 0) + (fees.busFeeDiscount || 0);
          //    if payment is completed ie  t.status === "completed")
          const paid = (student.transactions || [])
            .filter(
              (t) =>
                t.academicYear === student.academicYear &&
                t.status === "completed"
            )
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          existing.paid += paid;
          existing.count += 1;
          // till here existing will give single student all fees
          // very imp
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
        outstanding: data.original - data.discount - data.paid,
      }));
    };

    return {
      activeRows: processStudents("active"),
      inactiveRows: processStudents("inactive"),
    };
  }, [students]);

  // header filter & select div or class logic
  const filteredAllStudents = useMemo(() => {
    let result = students
      .filter((s) => s.normalizedStatus === studentActiveTab)
      .map(processStudentData)
      .filter((s) => {
        const searchLower = searchTerm.toLowerCase();
        const classFilter =
          selectedClass === "All" ? true : s.class === selectedClass;
        const divFilter = selectedDiv === "All" ? true : s.div === selectedDiv;

        return (
          (s.fname.toLowerCase().includes(searchLower) ||
            s.lname.toLowerCase().includes(searchLower) ||
            s.feeId.toLowerCase().includes(searchLower) ||
            s.div.toLowerCase().includes(searchLower)) &&
          classFilter &&
          divFilter
        );
      });
    if (sortKey) {
      result = result.sort((a, b) => {
        const valueA = a[sortKey];
        const valueB = b[sortKey];
        return sortOrder === "desc" ? valueB - valueA : valueA - valueB;
      });
    }

    return result;
  }, [
    students,
    studentActiveTab,
    searchTerm,
    sortKey,
    sortOrder,
    selectedClass,
    selectedDiv,
  ]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAllStudents.slice(start, start + itemsPerPage);
  }, [filteredAllStudents, currentPage]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("₹", "₹ ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Outstanding Fee Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">

          <OutstandingFee
            loading={loading}
            activeRows={activeRows || []}
            inactiveRows={inactiveRows || []}
            classActiveTab={classActiveTab}
            setClassActiveTab={setClassActiveTab}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* Student Details Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
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
            selectedClass={selectedClass}
            selectedDiv={selectedDiv}
            setSelectedClass={setSelectedClass}
            setSelectedDiv={setSelectedDiv}
          />
        </div>
      </div>
    </div>




  );
}
