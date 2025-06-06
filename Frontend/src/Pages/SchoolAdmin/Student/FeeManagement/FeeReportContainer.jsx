// FeeReportsContainer.jsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import OutstandingFee from "../OutstandingFees/OutstandingFee";
import StudentFeeDetails from "./StudentFeeDetails";
import { useInstitution } from "../../../../contexts/InstitutionContext";

export default function FeeReportsContainer() {
  const { userData } = useAuth();
  const { school } = useInstitution();
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

  // only check prev year not eairler transactions
  function getPrevYear(year) {
    const years = year?.split("-") || ["00"];
    return years.map((y) => parseInt(y) || 0);
  }
  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "students"),
        where("schoolCode", "==", school.Code)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          ...raw,
          normalizedStatus: ["new", "current", "rollover"].includes(raw.status?.toLowerCase())
            ? "active"
            : "inactive", //new
        };
      });
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (school.Code) fetchStudents();
  }, [school.Code, userData]);
  // here we calc all stude LYBF+LYTF, orignal = SF+TF+MF+HF+SFD+TFD, discount = SFD+TFD, outstanding = pending SF+MF+TF+HF, paid = paid SF+HF+MF+TF
  const processStudentData = (student) => {
    const fees = student.allFee || {};

    const lastYearTransactions = (student.transactions || []).filter((t) => {
      const [startYear, endYear] = getPrevYear(student.academicYear);
      return t.academicYear === `${startYear - 1}-${endYear - 1}`;
    });
    const currentYearTransactions = (student.transactions || []).filter((tx) => tx.academicYear === student.academicYear && tx.status === "completed");
    // consider only completed payment "t.status === "completed""
    const lastYearTuitionPaid = lastYearTransactions
      .filter((t) => (t?.feeType?.toLowerCase() === "tuitionfee" || t?.feeType?.toLowerCase() === "admissionfee" || t?.feeType?.toLowerCase() === "hostelfee" || t?.feeType?.toLowerCase() === "messfee") && t?.status?.toLowerCase() === "completed")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const lastYearBusPaid = lastYearTransactions
      .filter((t) => t?.feeType?.toLowerCase() === "busfee" && t?.status?.toLowerCase() === "completed")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    // from here we got last year paid amount use to visulize chart

    const feesDetails = {
      lastYearBusPaid,
      lastYearTuitionPaid,
      lastYear: 0,
      tuitionFeeWithDiscount: 0,
      tuitionFeeDiscount: 0,
      netTuitionFee: 0,
      tuitionFeePaid: 0,
      tuitionFeePending: 0,
      busFeeWithDiscount: 0,
      busFeeDiscount: 0,
      netBusFee: 0,
      busFeePaid: 0,
      busFeePending: 0,
      totalPaid: 0,
      totalPending: 0,
    }

    feesDetails.lastYear += (fees.lastYearBusFee || 0) + (fees.lastYearBalanceFee || 0);
    feesDetails.tuitionFeeWithDiscount += (fees.tuitionFeesDiscount || 0) + (fees?.tuitionFees?.total || 0);
    feesDetails.tuitionFeeDiscount += (fees.tuitionFeesDiscount || 0)
    feesDetails.netTuitionFee += (feesDetails.tuitionFeeWithDiscount - feesDetails.tuitionFeeDiscount);
    // now we have to use transction sum with academic year to calculate fees detail
    feesDetails.tuitionFeePaid += currentYearTransactions.filter((t) => (t?.feeType?.toLowerCase() === "tuitionfee" || t?.feeType?.toLowerCase() === "admissionfee" || t?.feeType?.toLowerCase() === "hostelfee" || t?.feeType?.toLowerCase() === "messfee"))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
    feesDetails.tuitionFeePending += feesDetails.netTuitionFee - feesDetails.tuitionFeePaid;

    feesDetails.busFeeWithDiscount += (fees.busFee || 0) + (fees.busFeeDiscount || 0);
    feesDetails.busFeeDiscount += (fees.busFeeDiscount || 0);
    feesDetails.netBusFee += (feesDetails.busFeeWithDiscount - feesDetails.busFeeDiscount);
    feesDetails.busFeePaid += currentYearTransactions.filter((t) => t?.feeType?.toLowerCase() === "busfee")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
    feesDetails.busFeePending += (feesDetails.netBusFee - feesDetails.busFeePaid);
    feesDetails.totalPaid += feesDetails.tuitionFeePaid + feesDetails.busFeePaid;
    feesDetails.totalPending += feesDetails.tuitionFeePending + feesDetails.busFeePending + feesDetails.lastYear;

    return {
      ...student,
      feesDetails,
    };
  };
  // after fetching all student we need to cal fee data for each student
  const { activeRows, inactiveRows } = useMemo(() => {
    const processStudents = (statusFilter) => {
      const classMap = new Map();
      students
        .filter((s) => s.normalizedStatus === statusFilter)
        .forEach((student) => {
          const studentFees = processStudentData(student);  // Reuse your working function
          const cls = student.class?.toLowerCase() || "Unknown";
          const existing = classMap.get(cls) || {
            lastYear: 0, //it will inc last year balance + last year transport
            tuitionFeeWithDiscount: 0,
            tuitionFeeDiscount: 0,
            netTuitionFee: 0,
            tuitionFeePaid: 0,
            tuitionFeePending: 0,
            busFeeWithDiscount: 0,
            busFeeDiscount: 0,
            netBusFee: 0,
            busFeePaid: 0,
            busFeePending: 0,
            totalPaid: 0,
            totalPending: 0,
            count: 0,
          };
          // Accumulate the individual student's fees
          classMap.set(cls, {
            lastYear: existing.lastYear + studentFees.feesDetails.lastYear,
            tuitionFeeWithDiscount: existing.tuitionFeeWithDiscount + studentFees.feesDetails.tuitionFeeWithDiscount,
            tuitionFeeDiscount: existing.tuitionFeeDiscount + studentFees.feesDetails.tuitionFeeDiscount,
            netTuitionFee: existing.netTuitionFee + studentFees.feesDetails.netTuitionFee,
            tuitionFeePaid: existing.tuitionFeePaid + studentFees.feesDetails.tuitionFeePaid,
            tuitionFeePending: existing.tuitionFeePending + studentFees.feesDetails.tuitionFeePending,
            busFeeWithDiscount: existing.busFeeWithDiscount + studentFees.feesDetails.busFeeWithDiscount,
            busFeeDiscount: existing.busFeeDiscount + studentFees.feesDetails.busFeeDiscount,
            netBusFee: existing.netBusFee + studentFees.feesDetails.netBusFee,
            busFeePaid: existing.busFeePaid + studentFees.feesDetails.busFeePaid,
            busFeePending: existing.busFeePending + studentFees.feesDetails.busFeePending,
            totalPaid: existing.totalPaid + studentFees.feesDetails.totalPaid,
            totalPending: existing.totalPending + studentFees.feesDetails.totalPending,
            count: existing.count + 1,
          });
          // const studentThisYearTransaction = (student.transactions || []).filter((tx) => tx.academicYear === student.academicYear && tx.status === "completed");

          // existing.lastYear += (fees.lastYearBalanceFee || 0) + (fees.lastYearBusFee || 0);
          // existing.tuitionFeeWithDiscount += (fees.tuitionFeesDiscount || 0) + (fees?.tuitionFees?.total || 0);
          // existing.tuitionFeeDiscount += (fees.tuitionFeesDiscount || 0)
          // existing.netTuitionFee += (existing.tuitionFeeWithDiscount - existing.tuitionFeeDiscount);
          // // now we have to use transction sum with academic year to calculate fees detail
          // existing.tuitionFeePaid += studentThisYearTransaction.filter((t) => (t?.feeType?.toLowerCase() === "tuitionfee" || t?.feeType?.toLowerCase() === "admissionfee" || t?.feeType?.toLowerCase() === "hostelfee" || t?.feeType?.toLowerCase() === "messfee"))
          //   .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0,
          //   existing.tuitionFeePending += existing.netTuitionFee - existing.tuitionFeePaid;

          // existing.busFeeWithDiscount += (fees.busFee || 0) + (fees.busFeeDiscount || 0);
          // existing.busFeeDiscount += (fees.busFeeDiscount || 0);
          // existing.netBusFee += (existing.busFeeWithDiscount - existing.busFeeDiscount);
          // existing.busFeePaid += studentThisYearTransaction.filter((t) => t?.feeType?.toLowerCase() === "busfee")
          //   .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
          // existing.busFeePending += (existing.netBusFee - existing.busFeePaid);
          // existing.totalPaid += existing.tuitionFeePaid + existing.busFeePaid;
          // existing.totalPending += existing.tuitionFeePending + existing.busFeePending + existing.lastYear;

          // existing.count += 1;
          // till here existing will give single student all fees
          // very imp
          // classMap.set(cls, existing);
        });
      return Array.from(classMap.entries()).map(([classname, data]) => ({
        class: classname,
        ...data
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
          selectedClass === "All" ? true : s.class?.toLowerCase() === selectedClass?.toLowerCase();
        const divFilter = selectedDiv === "All" ? true : s.div?.toLowerCase() === selectedDiv?.toLowerCase();

        return (
          (s.fname.toLowerCase().includes(searchLower) ||
            s.lname.toLowerCase().includes(searchLower) ||
            // toString(s.feeId.toLowerCase().includes(searchLower) ||
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
            fetchStudents={fetchStudents} //call when student delete to refresh data 
          />
        </div>
      </div>
    </div>




  );
}
