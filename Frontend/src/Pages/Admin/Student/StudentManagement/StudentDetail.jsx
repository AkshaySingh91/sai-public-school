// src/Pages/Admin/Students/StudentDetail.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import { db } from "../../../../config/firebase.js";
import { useAuth } from "../../../../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { nanoid } from "nanoid";
import { useSchool } from "../../../../contexts/SchoolContext"
import FeeManagement from "../FeeManagement/FeeManagementTab.jsx";
import StudentProfile from "./StudentProfileCard";
import TransactionHistory from "../Transactions/TransactionHistoryTab.jsx";
import TransactionForm from "../FeeManagement/TransactionForm.jsx";
import PersonalInfo from "./PersonalInfo.jsx";
import StudentDocumentTab from "../Documents/StudentDocumentTab.jsx"

export default function StudentDetail() {
  const { studentId } = useParams();
  const { userData } = useAuth();
  const [student, setStudent] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTransaction, setNewTransaction] = useState({
    academicYear: "",
    paymentMode: "",
    account: "",
    date: new Date().toISOString().split("T")[0],
    feeType: "",
    amount: "",
    remark: "",
  });
  const { school: schoolData } = useSchool();
  const navigate = useNavigate();
  // first the student data will fetch using id /student/id using student data we will set form, student previous transaction, school details
  useEffect(() => {
    setLoading(true);
    // Fetch student data
    const fetchData = async () => {
      try {
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) throw new Error("Student not found");
        const studentData = { id: studentDoc.id, ...studentDoc.data() };
        setStudent(studentData);
        setFormData(studentData);

        setNewTransaction((prev) => ({
          ...prev,
          academicYear: studentData.academicYear,
          paymentMode: schoolData.paymentModes?.[0] || "",
          account: schoolData.accounts?.[0]?.AccountNo || "",
          feeType: schoolData.feeTypes?.[0] || "",
        }));

        // Fetch transactions
        if (studentData.transactions) {
          setTransactions(studentData.transactions);
        }
      } catch (error) {
        Swal.fire("Error", error.message, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, userData.schoolCode]);

  // Modify handleStudentUpdate to handle academic year changes
  const handleStudentUpdate = async () => {
    if (formData.academicYear !== student.academicYear) {
      await goToNextAcademicYear();
      return;
    }
    try {
      await updateDoc(doc(db, "students", studentId), formData);
      Swal.fire("Success!", "Student details updated", "success");
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleFeeUpdate = async (updatedFees) => {
    try {
      await updateDoc(doc(db, "students", studentId), { allFee: updatedFees });
      setStudent((prev) => ({ ...prev, allFee: updatedFees }));
      Swal.fire("Success!", "Fee structure updated", "success");
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    // Check for empty fields
    const requiredFields = [
      { key: "academicYear", name: "Academic Year" },
      { key: "paymentMode", name: "Payment Mode" },
      { key: "account", name: "Account" },
      { key: "date", name: "Date" },
      { key: "feeType", name: "Fee Type" },
      { key: "amount", name: "Amount" },
    ];

    // Check for empty required fields
    for (const field of requiredFields) {
      if (
        !newTransaction[field.key] ||
        newTransaction[field.key].trim() === ""
      ) {
        Swal.fire("Validation Error", `${field.name} is required.`, "error");
        return;
      }
    }

    // Validate academic year format (format like "24-25")
    const academicYearRegex = /^\d{2}-\d{2}$/;
    if (!academicYearRegex.test(newTransaction.academicYear)) {
      Swal.fire(
        "Validation Error",
        "Academic Year should be in format YY-YY (e.g., 24-25)",
        "error"
      );
      return;
    }
    // Validate date format
    if (isNaN(new Date(newTransaction.date).getTime())) {
      Swal.fire("Validation Error", "Please enter a valid date", "error");
      return;
    }

    // Validate amount (must be a positive number)
    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      Swal.fire(
        "Validation Error",
        "Amount must be a positive number",
        "error"
      );
      return;
    }

    // Validate payment mode from available options
    if (!schoolData.paymentModes?.includes(newTransaction.paymentMode)) {
      Swal.fire(
        "Validation Error",
        "Please select a valid Payment Mode",
        "error"
      );
      return;
    }

    // Validate account from available options
    const validAccounts =
      schoolData.accounts?.map((a) => `${a.AccountNo} (${a.Branch})`) || [];
    if (!validAccounts.includes(newTransaction.account)) {
      Swal.fire("Validation Error", "Please select a valid Account", "error");
      return;
    }

    // Validate fee type from available options
    const validFeeTypes = ["SchoolFee", "MessFee", "HostelFee", "TransportFee"];
    if (!validFeeTypes.includes(newTransaction.feeType)) {
      Swal.fire("Validation Error", "Please select a valid Fee Type", "error");
      return;
    }

    try {
      const isCurrentYear = newTransaction.academicYear === student.academicYear;
      const feeType = newTransaction.feeType;
      const paymentAmount = parseFloat(newTransaction.amount);
      const transactionDate = new Date(newTransaction.date);

      // 1. Determine fee context and initial values
      let initialFee = 0;
      let applicableDiscount = 0;
      let currentBalance = 0;

      // 1. Calculate previous payments, it will usefull to check if transaction is valid or not
      //  TO DO: what if cheque is pending. we do not have to add that amount but when click on cheque = success we have to avoid   
      let previousPayments = 0;
      previousPayments = transactions
        .filter(tx =>
          tx.feeType === feeType &&
          tx.academicYear === newTransaction.academicYear &&
          tx.status === 'completed'
        )
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      console.log({ currentBalance, previousPayments, paymentAmount })

      if (isCurrentYear) {
        // as this is fee from student.allfee is unchangable this adding previousPayments not required  
        switch (feeType) {
          case 'SchoolFee':
            initialFee = (student.allFee.schoolFees?.total || 0) + (student.allFee.tutionFeesDiscount || 0);
            applicableDiscount = student.allFee.tutionFeesDiscount || 0;
            currentBalance = initialFee - applicableDiscount;
            break;
          case 'TransportFee':
            initialFee = (student.allFee.transportFee || 0) + (student.allFee.transportFeeDiscount || 0);
            applicableDiscount = student.allFee.transportFeeDiscount || 0;
            currentBalance = initialFee - applicableDiscount;
            break;
          case 'MessFee':
            initialFee = student.allFee.messFee || 0;
            currentBalance = initialFee;
            break;
          case 'HostelFee':
            initialFee = student.allFee.hostelFee || 0;
            currentBalance = initialFee;
            break;
        }
      } else {
        switch (feeType) {
          // last year fees input field change thus to know what is initial we have to add previousPayments
          case 'SchoolFee':
            initialFee = previousPayments + (student.allFee.lastYearBalanceFee || 0) + (student.allFee.lastYearDiscount || 0);
            applicableDiscount = student.allFee.lastYearDiscount || 0;
            currentBalance = initialFee - applicableDiscount;
            break;
          case 'TransportFee':
            initialFee = previousPayments + (student.allFee.lastYearTransportFee || 0) + (student.allFee.lastYearTransportFeeDiscount || 0);
            applicableDiscount = (student.allFee.lastYearTransportFeeDiscount || 0);
            currentBalance = initialFee - applicableDiscount;
            break;
          default:
            initialFee = previousPayments + (student.allFee.lastYearBalanceFee || 0) + (student.allFee.lastYearDiscount || 0);
            currentBalance = initialFee;
        }
      }

      console.log({ initialFee, applicableDiscount }, student.allFee.lastYearBalanceFee, student.allFee.lastYearDiscount)
      console.log({ initialFee, applicableDiscount }, student.allFee.schoolFees?.total, student.allFee.tutionFeesDiscount)



      // 3. Calculate remaining balances
      const remainingBefore = Math.max(currentBalance - previousPayments, 0);
      const remainingAfter = Math.max(remainingBefore - paymentAmount, 0);
      console.log(
        remainingBefore,
        remainingAfter
      )
      // Validate payment amount
      if (paymentAmount > remainingBefore) {
        Swal.fire("Error", "Payment amount exceeds outstanding balance", "error");
        return;
      }

      // 4. Create historical snapshot
      const historicalSnapshot = {
        initialFee,
        applicableDiscount,
        previousPayments,
        remainingBefore,
        remainingAfter,
        transactionDate: transactionDate.toISOString(),
        feeCategory: feeType.replace('Fee', '') // School/Transport/Mess/Hostel
      };

      // 5. Create transaction object
      const transaction = {
        ...newTransaction,
        receiptId: `${student.feeId}-${nanoid(4)}`,
        timestamp: new Date().toISOString(),
        amount: paymentAmount,
        status:
          newTransaction.paymentMode.toLowerCase() === 'cheque'
            ? 'pending'
            : 'completed',
        historicalSnapshot
      };

      // 6. Update student's fee balance (only if transaction is completed)
      const updatedFees = { ...student.allFee };
      if (transaction.status === 'completed') {
        if (!isCurrentYear) {
          switch (feeType) {
            case 'SchoolFee':
              updatedFees.lastYearBalanceFee = Math.max(
                updatedFees.lastYearBalanceFee - paymentAmount,
                0
              );
              break;
            case 'TransportFee':
              updatedFees.lastYearTransportFee = Math.max(
                updatedFees.lastYearTransportFee - paymentAmount,
                0
              );
              break;
            default:
              updatedFees.lastYearBalanceFee = Math.max(
                updatedFees.lastYearBalanceFee - paymentAmount,
                0
              );
          }
        }
      }

      // 7. Update Firestore
      const updatedTransactions = [...transactions, transaction];
      await updateDoc(doc(db, "students", studentId), {
        transactions: updatedTransactions,
        ...(transaction.status === 'completed' && { allFee: updatedFees })
      });

      // 8. Update local state
      setStudent(prev => ({ ...prev, allFee: updatedFees }));
      setTransactions(updatedTransactions);
      setNewTransaction({
        academicYear: student.academicYear,
        paymentMode: "",
        account: "",
        date: new Date().toISOString().split("T")[0],
        feeType: "",
        amount: "",
        remark: "",
      });

      Swal.fire("Success!", "Transaction recorded with historical context", "success");
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };
  const handleTransactionStatusUpdate = async (receiptId, newStatus) => {
    try {
      const transaction = transactions.find((t) => t.receiptId === receiptId);
      if (!transaction) throw new Error("Transaction not found");

      const updatedTransactions = transactions.map((t) =>
        t.receiptId === receiptId ? { ...t, status: newStatus } : t
      );

      const updatedFees = { ...student.allFee };

      if (newStatus === "completed") {
        const { amount, feeType, academicYear } = transaction;

        if (academicYear !== student.academicYear) {
          switch (feeType) {
            case "SchoolFee":
              updatedFees.lastYearBalanceFee = Math.max(
                (updatedFees.lastYearBalanceFee || 0) - amount,
                0
              );
              break;
            case "TransportFee":
              updatedFees.lastYearTransportFee = Math.max(
                (updatedFees.lastYearTransportFee || 0) - amount,
                0
              );
              break;
          }
        }
      }

      await updateDoc(doc(db, "students", studentId), {
        transactions: updatedTransactions,
        allFee: updatedFees,
      });

      setStudent((prev) => ({ ...prev, allFee: updatedFees }));
      setTransactions(updatedTransactions);
      Swal.fire("Success!", "Transaction status updated", "success");
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };
  const validateAcademicYear = (currentYear, newYear) => {
    console.log({ currentYear, newYear });
    const [currentStart, currentEnd] = currentYear.split("-").map(Number);
    console.log({ currentStart, currentEnd });
    const [newStart, newEnd] = newYear.split("-").map(Number);
    console.log({ newStart, newEnd });
    return newStart === currentStart + 1 && newEnd === currentEnd + 1;
  };

  const getNewClassFees = async (newClass, targetAcademicYear) => {
    try {
      const fsRef = doc(db, "feeStructures", userData.schoolCode);
      const fsSnap = await getDoc(fsRef);

      if (!fsSnap.exists()) {
        console.error("Fee structure document not found");
        return {
          originalFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          },
          studentFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          }
        }
      }

      const structures = fsSnap.data().structures || [];
      let yearStructure = structures.find((s) => s.year === targetAcademicYear);

      // Fallback to latest available structure if target year not found
      if (!yearStructure && structures.length > 0) {
        // Sort structures by academic year in descending order
        const sortedStructures = [...structures].sort((a, b) => {
          // Extract starting year from academic year format "YY-YY"
          const getStartYear = (year) => {
            const [start] = year?.split("-") || ["00"];
            return parseInt(start) || 0;
          };

          return getStartYear(b.year) - getStartYear(a.year);
        });

        yearStructure = sortedStructures[0];
        console.warn(
          `Using latest available structure for ${yearStructure.year}`
        );
      }

      if (!yearStructure) {
        console.warn("No fee structures available");
        return {
          originalFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          },
          studentFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          }
        }
      }

      const classStructure = yearStructure.classes?.find(
        (c) => c.name?.trim().toLowerCase() === newClass.trim().toLowerCase()
      );

      if (!classStructure) {
        console.warn(`No fee structure found for class ${newClass}`);
        return {
          originalFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          },
          studentFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          }
        }
      }
      const studentType = classStructure.studentType?.find(
        (st) =>
          st.name?.trim().toLowerCase() === student.type?.trim().toLowerCase()
      );

      if (!studentType) {
        console.warn(`No fee structure found for student type ${student.type}`);
        return {
          originalFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          },
          studentFees: {
            AdmissionFee: 0,
            TutionFee: 0,
            total: 0,
          }
        }
      }

      // student fees details (new)
      const feeStructure = studentType.feeStructure || {};
      const AdmissionFee = Number(feeStructure.AdmissionFee) || 0;
      const tutionFee = Number(feeStructure.TutionFee) || 0;
      // orignal fee details
      const originalFees = classStructure.studentType?.find(
        (st) => st.name?.trim().toLowerCase() === "ds"
      );
      const originalFeeStructure = originalFees.feeStructure || {};
      const originalAdmissionFee = Number(originalFeeStructure.AdmissionFee) || 0;
      const originalTutuionFee = Number(originalFeeStructure.TutionFee) || 0;

      return {
        originalFees: {
          AdmissionFee: originalAdmissionFee,
          TutionFee: originalTutuionFee,
          total: originalAdmissionFee + originalTutuionFee,
        },
        studentFees: {
          AdmissionFee: AdmissionFee,
          TutionFee: tutionFee,
          total: AdmissionFee + tutionFee,
        }
      };
    } catch (error) {
      console.error("Error fetching fee structure:", error);
      return {
        originalFees: {
          AdmissionFee: 0,
          TutionFee: 0,
          total: 0,
        },
        studentFees: {
          AdmissionFee: 0,
          TutionFee: 0,
          total: 0,
        }
      }
    }
  };

  const goToNextAcademicYear = async () => {

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "Student Fee will rollerover lastYearBalance = pending (mess + hostel + tution) & lastYearTransport = pending(transport) , next class tution fee will assign",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Move To Next Class!'
    })
    if (result.isConfirmed) {
      const classOrder = schoolData?.class?.length > 0 ? schoolData.class : [
        "Nursery",
        "JRKG",
        "SRKG",
        "1st",
        "2nd",
        "3rd",
        "4th",
        "5th",
        "6th",
        "7th",
        "8th",
      ];
      console.log({ classOrder })
      try {
        // 1) Build the next academic‐year string
        const [curStart, curEnd] = student.academicYear
          .split("-")
          .map((s) => parseInt(s, 10));
        const nextAcademicYear = `${curStart + 1}-${curEnd + 1}`;

        // 2) Figure out the next class in the sequence
        const curClass = student.class;
        const idx = classOrder.findIndex((c) => c?.trim() === curClass?.trim());
        const nextClass =
          idx >= 0 && idx < classOrder.length - 1
            ? classOrder[idx + 1]?.trim()
            : curClass; // fallback to same if not found
        console.log({ nextClass })
        // if next class doesn't exist than don't update academicYear & fees details
        if (nextClass.toLowerCase() === curClass.toLowerCase()) {
          return Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `class after ${nextClass} not present in fee structure. Please add class in fee structure first.`
          });
        }

        const transactions = student.transactions || [];
        const currentFees = student.allFee || {};

        // 3) Compute unpaid for current year from transactions
        const unpaidOf = (feeKey) => {
          // calculate total fees 
          const totalDue =
            feeKey === "SchoolFee"
              ? currentFees.schoolFees?.total || 0
              : currentFees[feeKey] || 0;
          console.log({ totalDue })
          // calculate total paid in this academic year
          const paid = transactions
            .filter((t) => t.academicYear === student.academicYear && t.feeType === feeKey && t.status === "completed")
            .reduce((sum, t) => sum + t.amount, 0);
          return Math.max(totalDue - paid, 0);
        };

        const unpaidHostel = unpaidOf("hostelFee");
        const unpaidMess = unpaidOf("messFee");
        const unpaidSchool = unpaidOf("SchoolFee");
        const unpaidTransport = unpaidOf("transportFee");


        // 4) Roll those into last‐year balances
        const newLastYearBalance =
          (currentFees.lastYearBalanceFee || 0) +
          unpaidHostel +
          unpaidMess +
          unpaidSchool;
        const newLastYearTransport =
          (currentFees.lastYearTransportFee || 0) + unpaidTransport;

        // 5) If status was "new", flip to "current"
        const newStatus = student.status === "new" ? "current" : student.status;

        // 6) Fetch next‐year fees from your structure util
        const rawFees = await getNewClassFees(nextClass, nextAcademicYear);
        // If the student is now "current", admission fee is zero:
        const admissionFee = newStatus === "current" ? 0 : rawFees.studentFees.AdmissionFee;
        const tuitionFee = rawFees.studentFees.TutionFee;
        // tuition discount will calculate from DS student
        const originalAdmissionFee = newStatus === "current" ? 0 : rawFees.originalFees.AdmissionFee;
        const originalTutuionFee = rawFees.originalFees.TutionFee;

        const newTuitionFeeDiscount = (originalAdmissionFee + originalTutuionFee) - (admissionFee + tuitionFee);

        // leave transport and its discount untouched:
        const transportFee = currentFees.transportFee || 0;
        const transportDiscount = currentFees.transportFeeDiscount || 0;

        // 7) Build the updated fee object
        const updatedAllFee = {
          ...currentFees,
          lastYearBalanceFee: newLastYearBalance,
          lastYearTransportFee: newLastYearTransport,
          lastYearTransportFeeDiscount: transportDiscount,
          lastYearDiscount: currentFees.tutionFeesDiscount || 0,
          // reset current‐year paid amounts
          hostelFee: 0,
          messFee: 0,
          transportFee,
          transportFeeDiscount: transportDiscount,
          // set the new schoolFees and discounts
          schoolFees: {
            AdmissionFee: admissionFee,
            TutionFee: tuitionFee,
            total: admissionFee + tuitionFee,
          },
          tutionFeesDiscount: newTuitionFeeDiscount,
        };

        // 8) Persist to Firestore
        const updatedStudent = {
          ...student,
          academicYear: nextAcademicYear,
          class: nextClass,
          status: newStatus,
          allFee: updatedAllFee,
        };
        await updateDoc(doc(db, "students", studentId), updatedStudent);

        // 9) Update local state & notify
        setStudent(updatedStudent);
        setFormData((f) => ({ ...f, ...updatedStudent }));
        Swal.fire("Success!", "Moved to next academic year.", "success");
      } catch (error) {
        Swal.fire("Error", error.message, "error");
      }
    }
  };

  const handleStudentDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete this student?',
      text: "This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        await Swal.fire('Deleted!', 'Student has been removed.', 'success');
        navigate('/students');  // Adjust to your list route
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  return (
    <>{
      loading ?
        <StudentDetailsLoader /> :
        <div className="py-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6 relative">
            <StudentProfile
              student={student}
              formData={formData}
              setFormData={setFormData}
              handleStudentUpdate={handleStudentUpdate}
              handleStudentDelete={handleStudentDelete}
              goToNextAcademicYear={goToNextAcademicYear}
            />

            <div className="md:w-2/3">
              <div className="flex border-b mb-6">
                {[
                  "Student Details",
                  "Fee Details",
                  "Transactions",
                  "Documents",
                ].map((tab, idx) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(idx)}
                    className={`px-6 py-3 font-medium ${activeTab === idx
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-500 hover:text-purple-500"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 0 && (
                <PersonalInfo
                  formData={formData}
                  setFormData={setFormData}
                  studentId={student}
                  handleFeeUpdate={handleFeeUpdate}
                  schoolData={schoolData}
                />
              )}

              {activeTab === 1 && (
                <div className="space-y-6">
                  <FeeManagement
                    student={student}
                    transactions={transactions}
                    formData={formData}
                    setFormData={setFormData}
                    handleFeeUpdate={handleFeeUpdate}
                  />
                  <TransactionForm
                    newTransaction={newTransaction}
                    setNewTransaction={setNewTransaction}
                    schoolData={schoolData}
                    formData={formData}
                    setFormData={setFormData}
                    handleTransactionSubmit={handleTransactionSubmit}
                    student={student}
                  />
                </div>
              )}

              {activeTab === 2 && (
                <TransactionHistory
                  student={student}
                  transactions={transactions}
                  setTransactions={setTransactions}
                  onClearTransaction={handleTransactionStatusUpdate}
                />
              )}
              {activeTab === 3 && (
                <StudentDocumentTab
                  student={student}
                  setStudent={setStudent}
                />
              )}
            </div>
          </div>
        </div>
    }
    </>);
}

function StudentDetailsLoader() {
  return (
    <div className="animate-pulse p-6">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Profile Card Skeleton */}
        <div className="w-full md:w-72 lg:w-80 space-y-4">
          <div className="bg-gray-200 rounded-full w-32 h-32 mx-auto"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-8 bg-gray-200 rounded-lg w-full mt-4"></div>
            <div className="h-8 bg-gray-200 rounded-lg w-full"></div>
          </div>
        </div>

        {/* Details Skeleton */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info Section */}
          <div className="col-span-2 space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/5"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/5"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Info Section */}
          <div className="space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Family Info Section */}
          <div className="space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}