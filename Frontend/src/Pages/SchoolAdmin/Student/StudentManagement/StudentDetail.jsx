// src/Pages/SchoolAdmin/Students/StudentDetail.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, query, collection, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase.js";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { nanoid } from "nanoid";
import { useInstitution } from "../../../../contexts/InstitutionContext.jsx"
import FeeManagement from "../FeeManagement/FeeManagementTab.jsx";
import StudentProfile from "./StudentProfileCard";
import TransactionHistory from "../Transactions/TransactionHistoryTab.jsx";
import TransactionForm from "../FeeManagement/TransactionForm.jsx";
import PersonalInfo from "./PersonalInfo.jsx";
import StudentDocumentTab from "../Documents/StudentDocumentTab.jsx"
import { motion, AnimatePresence } from 'framer-motion'
import { ReceiptText, History } from 'lucide-react'
import NotFound from "../../../../components/NotFound.jsx"


export const getNewClassFees = async (schoolCode, newClass, targetAcademicYear, student, englishMedium) => {
  try {
    const fsRef = doc(db, "feeStructures", schoolCode);
    const fsSnap = await getDoc(fsRef);

    if (!fsSnap.exists()) {
      console.error("Fee structure document not found");
      return {
        originalFees: {
          AdmissionFee: 0,
          tuitionFee: 0,
          total: 0,
        },
        studentFees: {
          AdmissionFee: 0,
          tuitionFee: 0,
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
          tuitionFee: 0,
          total: 0,
        },
        studentFees: {
          AdmissionFee: 0,
          tuitionFee: 0,
          total: 0,
        }
      }
    }

    let classStructure = yearStructure.classes?.find(
      (c) => c.name?.trim().toLowerCase() === newClass?.trim()?.toLowerCase()
    );
    if (!classStructure || !classStructure.studentType || !classStructure.studentType.length) {
      console.warn(`No fee structure found for class ${newClass}`);
      return {
        originalFees: {
          AdmissionFee: 0,
          tuitionFee: 0,
          total: 0,
        },
        studentFees: {
          AdmissionFee: 0,
          tuitionFee: 0,
          total: 0,
        }
      }
    }
    // it is for semi student
    // if this condition is false it means student next class does not have semi fee structure thus normal fees will assign
    if (!englishMedium && classStructure.studentType.find(c => c.englishMedium === englishMedium) && classStructure.studentType.find(c => c.name?.toLowerCase() === student.type?.toLowerCase())) {
      classStructure.studentType = classStructure.studentType.filter(c => c.englishMedium === englishMedium)
    }
    const studentType = classStructure.studentType?.find(
      (st) => st.name?.trim().toLowerCase() === student.type?.trim().toLowerCase()
    );
    if (!studentType) {
      console.warn(`No fee structure found for student type ${student.type}`);
      return {
        originalFees: {
          AdmissionFee: 0,
          tuitionFee: 0,
          total: 0,
        },
        studentFees: {
          AdmissionFee: 0,
          tuitionFee: 0,
          total: 0,
        }
      }
    }

    // student fees details (new)
    const feeStructure = studentType.feeStructure || {};
    const AdmissionFee = Number(feeStructure.AdmissionFee) || 0;
    const tuitionFee = Number(feeStructure.TuitionFee) || 0;
    // orignal fee details
    const originalFees = classStructure.studentType?.find(
      (st) => st.name?.trim().toLowerCase() === "ds"
    );
    const originalFeeStructure = originalFees.feeStructure || {};
    const originalAdmissionFee = Number(originalFeeStructure.AdmissionFee) || 0;
    const originalTutuionFee = Number(originalFeeStructure.TuitionFee) || 0;

    return {
      originalFees: {
        AdmissionFee: originalAdmissionFee,
        tuitionFee: originalTutuionFee,
        total: originalAdmissionFee + originalTutuionFee,
      },
      studentFees: {
        AdmissionFee: AdmissionFee,
        tuitionFee: tuitionFee,
        total: AdmissionFee + tuitionFee,
      }
    };
  } catch (error) {
    console.error("Error fetching fee structure:", error);
    return {
      originalFees: {
        AdmissionFee: 0,
        tuitionFee: 0,
        total: 0,
      },
      studentFees: {
        AdmissionFee: 0,
        tuitionFee: 0,
        total: 0,
      }
    }
  }
};

export function StudentDetail() {
  const { studentId } = useParams();
  const { school } = useInstitution();
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
  const { school: schoolData, setSchool } = useInstitution();
  const navigate = useNavigate();
  const tabLabels = ["Student Details", "Fee Details", "Transactions", "Documents"]
  const [error, setError] = useState(null);
  // first the student data will fetch using id /student/id using student data we will set form, student previous transaction, school details
  const fetchData = async () => {
    setLoading(true);
    try {
      const studentDoc = await getDoc(doc(db, "students", studentId));
      if (studentDoc.exists()) {
        const studentData = { id: studentDoc.id, ...studentDoc.data() };
        if (studentData.schoolCode !== school.Code) {
          setStudent(null);
          setError("Student not found or unauthorized access"); // Set error state
          return null; // Return null instead of JSX
        }
        setStudent(studentData);
        setFormData(studentData);

        setNewTransaction((prev) => ({
          ...prev,
          academicYear: studentData.academicYear,
          paymentMode: schoolData.paymentModes?.[0] || "",
          account: schoolData.accounts?.[0]?.AccountNo || "",
          feeType: "",
        }));

        // Fetch transactions
        if (studentData.transactions) {
          setTransactions(studentData.transactions);
        }
        return studentData;
      } else {
        setStudent(null);
        setError("Student not found");
        return null;
      }
    } catch (error) {
      setStudent(null);
      setError(error.message);
      Swal.fire("Error", error.message, "error");
      return null;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [studentId, school.Code]);
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
      fetchData()
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
    const validFeeTypes = ["AdmissionFee", "TuitionFee", "MessFee", "HostelFee", "BusFee"];
    if (!validFeeTypes.includes(newTransaction.feeType)) {
      Swal.fire("Validation Error", "Please select a valid Fee Type", "error");
      return;
    }

    try {
      const isCurrentYear = newTransaction.academicYear === student.academicYear;
      const [curStart, curEnd] = student.academicYear.split("-").map((s) => parseInt(s, 10));
      const isPrevAcademicYear = newTransaction.academicYear === `${curStart - 1}-${curEnd - 1}`;


      const feeType = newTransaction.feeType;
      const paymentAmount = parseFloat(newTransaction.amount);
      const transactionDate = new Date(newTransaction.date);

      // 1. Determine fee context and initial values
      let initialFee = 0;
      let applicableDiscount = 0;

      // 1. Calculate previous payments, it will usefull to check if transaction is valid or not
      let previousPayments = 0;
      previousPayments = transactions
        .filter(tx =>
          tx.feeType?.toLowerCase() === feeType?.toLowerCase() &&
          tx.academicYear === newTransaction.academicYear &&
          tx.status?.toLowerCase() === 'completed'
        )
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      // if we are paying tuition fee than include prev admission fee also 
      previousPayments = previousPayments + transactions
        .filter(tx =>
          (feeType?.toLowerCase() === "tuitionfee") && tx.feeType?.toLowerCase() === "admissionfee" &&
          tx.academicYear === newTransaction.academicYear &&
          tx.status?.toLowerCase() === 'completed'
        )
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      // check if admission fee already paid

      if (feeType?.toLowerCase() === "admissionfee") {
        const isAdmissionFeePaid = transactions.find(tx =>
          tx.feeType?.toLowerCase() === "admissionfee" && tx.academicYear === newTransaction.academicYear && tx.status?.toLowerCase() === 'completed'
        )
        if (isAdmissionFeePaid) {
          Swal.fire("Error", "Admission fee are already paid.", "error");
          return
        }
      }
      // check if payemnt is admissionfee for new student 
      if (feeType?.toLowerCase() === "admissionfee") {
        previousPayments = 0;
        if (paymentAmount > 1000) {
          Swal.fire("Error", "Payment amount for Addmission fee should be 1000", "error");
          return
        }
      }
      if (student.status?.toLowerCase() !== "new" && feeType?.toLowerCase() === "admissionfee") {
        Swal.fire("Error", "Addmission fee will only paid for new student", "error");
        return
      }
      if (student.type?.toLowerCase() === "dsr" && feeType?.toLowerCase() === "admissionfee") {
        Swal.fire("Error", "Addmission fee is not applicable for DSR student.", "error");
        return
      }
      if (isCurrentYear) {
        // as this is fee from student.allfee is unchangable this adding previousPayments not required  
        const fee = feeType.toLowerCase();
        switch (fee) {
          // student will  initially pay admission fee
          case 'admissionfee':
            // initial fee is total fee need to pay without discount
            initialFee = (student.allFee.tuitionFees?.total || 0);
            applicableDiscount = 0;
            break;
          case 'tuitionfee':
            initialFee = (student.allFee.tuitionFees?.total || 0);
            applicableDiscount = student.allFee.tuitionFeesDiscount;
            break;
          case 'busfee':
            initialFee = (student.allFee.busFee || 0);
            applicableDiscount = student.allFee.busFeeDiscount || 0;
            break;
          case 'messfee':
            initialFee = student.allFee.messFee || 0;
            break;
          case 'hostelfee':
            initialFee = student.allFee.hostelFee || 0;
            break;
        }
      } else if (isPrevAcademicYear) {
        const fee = feeType.toLowerCase();
        switch (fee) {
          // last year fees input field change thus to know what is initial we have to add previousPayments
          case 'tuitionfee':
            // initial fee is total fee need to pay without discount
            initialFee = previousPayments + (student.allFee.lastYearBalanceFee || 0);
            applicableDiscount = student.allFee.lastYearDiscount || 0;
            break;
          case 'busfee':
            initialFee = previousPayments + (student.allFee.lastYearBusFee || 0);
            applicableDiscount = (student.allFee.lastYearBusFeeDiscount || 0);
            break;
          default:
            Swal.fire("error", "For Last year , you can make payment of Bus & Tuition fee only.", "error");
            return;
        }
      } else {
        Swal.fire("Invalid Academic Year", "You can make payment of this or previous year only", "error");
        return;
      }
      // 3. Calculate remaining balances
      const remainingBefore = Math.max(initialFee - previousPayments, 0);
      const remainingAfter = Math.max(remainingBefore - paymentAmount, 0);

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
        feeCategory: feeType.replace('Fee', '') // Tuition/Bus/Mess/Hostel
      };
      // 5. Create transaction object
      // if mode !== cheque , than receiptId will be total reciept in this year + 1 
      // check if transaction if of bus or tuition
      let receiptId;
      if (feeType?.toLowerCase() == "busfee") {
        receiptId = (Number(schoolData.busReceiptCount) || 0) + 1;
      } else {
        receiptId = (Number(schoolData.tuitionReceiptCount) || 0) + 1;
      }
      // return
      const transaction = {
        ...newTransaction,
        ...(newTransaction.paymentMode.toLowerCase() !== 'cheque'
          ? { receiptId }
          : { tempReceiptId: `${student.feeId}-${nanoid(4)}` }
        ),
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
        const f = feeType?.toLocaleLowerCase();
        if (isPrevAcademicYear && (f === 'tuitionfee' || f === 'busfee')) {
          switch (f) {
            case 'tuitionfee':
              updatedFees.lastYearBalanceFee = Math.max(
                updatedFees.lastYearBalanceFee - paymentAmount,
                0
              );
              break;
            case 'busfee':
              updatedFees.lastYearBusFee = Math.max(
                updatedFees.lastYearBusFee - paymentAmount,
                0
              );
              break;
            default:
              updatedFees.lastYearBalanceFee = Math.max(
                updatedFees.lastYearBalanceFee - paymentAmount,
                0
              );
          }
        } else if (isPrevAcademicYear) {
          Swal.fire("Invalid Feetype", `For previous year fee type should be either "tuitionfee" or "busFee"`, "error");
          return;
        }
      }
      // till now every this correct & we need to update in firestore
      Swal.fire({
        title: 'Processing...',
        html: `
          <div style="
            border: 3px solid rgba(102, 117, 255, 0.2);
            border-radius: 50%;
            border-top: 3px solid #6675ff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          "></div>
          <p style="margin-top: 1rem; color: #4a5568; font-weight: 400;">
            Securely processing your transaction...
          </p>
        `,
        background: 'linear-gradient(135deg, #f0f2ff 0%, #f8f5ff 100%)', // Soft blue/purple
        color: '#2d3748', // Dark text
        allowOutsideClick: false,
        showConfirmButton: false
      });
      const updatedTransactions = [...transactions, transaction];
      // 7. Update Firestore
      await updateDoc(doc(db, "students", studentId), {
        transactions: updatedTransactions,
        ...(transaction.status === 'completed' && { allFee: updatedFees })
      });
      // 8. update total recipt if not cheque
      const schoolsRef = collection(db, "schools");
      const q = query(schoolsRef, where("Code", "==", school.Code));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error("School not found");
      const schoolDoc = querySnapshot.docs[0];

      if (newTransaction.paymentMode.toLowerCase() !== 'cheque') {
        if (feeType?.toLowerCase() == "busfee") {
          await updateDoc(doc(db, 'schools', schoolDoc.id), {
            busReceiptCount: receiptId
          });
        } else {
          await updateDoc(doc(db, 'schools', schoolDoc.id), {
            tuitionReceiptCount: receiptId
          });
        }
      }
      // update receipt count in school context
      if (newTransaction.paymentMode.toLowerCase() !== 'cheque') {
        if (feeType?.toLowerCase() == "busfee") {
          setSchool(prev => ({ ...prev, busReceiptCount: prev.busReceiptCount + 1 }));
        } else {
          setSchool(prev => ({ ...prev, tuitionReceiptCount: prev.tuitionReceiptCount + 1 }));
        }
      }
      setTransactions(prev => ([...prev, transaction]));
      fetchData()
      setStudent(prev => ({ ...prev, allFee: updatedFees }));
      Swal.fire("Success!", "Transaction recorded with historical context", "success");
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };
  // this fx will only call when if transaction is cheque & status will either completed or rejected
  const handleTransactionStatusUpdate = async (tempReceiptId, newStatus) => {
    try {
      const transaction = transactions.find((t) => t.tempReceiptId === tempReceiptId);
      if (!transaction) throw new Error("Transaction not found");

      let receiptId;
      if (transaction.feeType.toLowerCase() === "busfee") {
        receiptId = Number(schoolData.busReceiptCount || 0) + 1;
      } else {
        receiptId = Number(schoolData.tuitionReceiptCount || 0) + 1;
      }

      const updatedTransactions = transactions.map((t) =>
        t.tempReceiptId === tempReceiptId ? {
          // update status
          ...t, status: newStatus,
          // add orignal id if completed in transaction 
          ...(newStatus === "completed" ? { receiptId } : {})
        } : t
      );
      const updatedFees = { ...student.allFee };


      if (newStatus === "completed") {
        const { amount, feeType, academicYear } = transaction;
        // for last year transaction we have to reduce the amount from allFee , but for this year we just need to update status
        if (academicYear !== student.academicYear) {
          const f = feeType.toLowerCase();
          switch (f) {
            case "tuitionfee":
              updatedFees.lastYearBalanceFee = Math.max(
                (updatedFees.lastYearBalanceFee || 0) - amount,
                0
              );
              break;
            case "busfee":
              updatedFees.lastYearBusFee = Math.max(
                (updatedFees.lastYearBusFee || 0) - amount,
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
      // return
      if (newStatus === "completed") {
        // we have to assign receiptId & update total receiptId
        const schoolsRef = collection(db, 'schools');
        const q = query(schoolsRef, where("Code", "==", school.Code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) throw new Error("School not found");

        const schoolDoc = querySnapshot.docs[0];
        if (transaction.feeType?.toLowerCase() == "busfee") {
          await updateDoc(doc(db, 'schools', schoolDoc.id), {
            busReceiptCount: receiptId
          });
          // update school context
          setSchool(prev => ({ ...prev, busReceiptCount: prev.busReceiptCount + 1 }));
        } else {
          await updateDoc(doc(db, 'schools', schoolDoc.id), {
            tuitionReceiptCount: receiptId
          });
          // update school context
          setSchool(prev => ({ ...prev, tuitionReceiptCount: prev.tuitionReceiptCount + 1 }));
        }
      }

      setStudent((prev) => ({ ...prev, allFee: updatedFees }));
      setTransactions(updatedTransactions);
      Swal.fire("Success!", "Transaction status updated", "success");
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const goToNextAcademicYear = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "Student Fee will rollerover lastYearBalance = pending (mess + hostel + tuition) & lastYearTransport = pending(bus) , next class tuition fee will assign",
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
      try {
        // 1) Build the next academic‐year string
        const [curStart, curEnd] = student.academicYear
          .split("-")
          .map((s) => parseInt(s, 10));
        const nextAcademicYear = `${curStart + 1}-${curEnd + 1}`;

        // 2) Figure out the next class in the sequence
        const curClass = student.class;
        const idx = classOrder.findIndex((c) => c?.trim()?.toLowerCase() === curClass?.trim()?.toLowerCase());
        const nextClass =
          idx >= 0 && idx < classOrder.length - 1
            ? classOrder[idx + 1]?.trim()
            : curClass; // fallback to same if not found
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
        const unpaidOf = (key) => {
          const due = key?.toLowerCase() === "tuitionfee" ? currentFees.tuitionFees?.total || 0 : currentFees[key] || 0;
          let paid = 0;
          // for tuition fee we also have to take sum of admissionfee
          if (key?.toLowerCase() === "tuitionfee") {
            paid = transactions.filter(t => {
              return (t.academicYear === student.academicYear) && (t?.feeType?.toLowerCase() === key.toLowerCase() || t?.feeType?.toLowerCase() === "admissionfee") && t.status === "completed"
            })
              .reduce((a, t) => a + t.amount, 0);
          } else {
            paid = transactions.filter(t => {
              return (t.academicYear === student.academicYear) && t?.feeType?.toLowerCase() === key.toLowerCase() && t.status === "completed"
            })
              .reduce((a, t) => a + t.amount, 0);
          }
          return Math.max(due - paid, 0);
        };

        // 4) Roll those into last‐year balances  
        const newLastYearBalance = (currentFees.lastYearBalanceFee || 0) + unpaidOf('hostelFee') + unpaidOf('messFee') + unpaidOf('tuitionFee');
        const newLastYearTransport = (currentFees.lastYearBusFee || 0) + unpaidOf('busFee');
        // 5) If status was "new", flip to "current"
        const newStatus = student.status === "new" ? "current" : student.status;

        // 6) Fetch next‐year fees from your structure util
        const rawFees = await getNewClassFees(school.Code, nextClass, nextAcademicYear, student, student.div?.toLowerCase() !== "semi");
        // If the student is now "current", admission fee is zero:
        const admissionFee = newStatus === "current" ? 0 : rawFees.studentFees.AdmissionFee;
        const tuitionFee = rawFees.studentFees.tuitionFee;
        // tuition discount will calculate from DS student
        const originalAdmissionFee = newStatus === "current" ? 0 : rawFees.originalFees.AdmissionFee;
        const originalTutuionFee = rawFees.originalFees.tuitionFee;

        const newTuitionFeeDiscount = (originalAdmissionFee + originalTutuionFee) - (admissionFee + tuitionFee);

        // leave bus and its discount untouched:
        const busFee = currentFees.busFee || 0;
        const busDiscount = currentFees.busFeeDiscount || 0;

        // 7) Build the updated fee object
        const updatedAllFee = {
          ...currentFees,
          lastYearBalanceFee: newLastYearBalance,
          lastYearBusFee: newLastYearTransport,
          lastYearBusFeeDiscount: busDiscount,
          lastYearDiscount: currentFees.tuitionFeesDiscount || 0,
          // reset current‐year paid amounts
          hostelFee: 0,
          messFee: 0,
          busFee,
          busFeeDiscount: busDiscount,
          // set the new tuitionFees and discounts
          tuitionFees: {
            AdmissionFee: admissionFee,
            tuitionFee: tuitionFee,
            total: admissionFee + tuitionFee,
          },
          tuitionFeesDiscount: newTuitionFeeDiscount,
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
        fetchData()
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
        navigate('/school/students');  // Adjust to your list route
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };
  const rollBackStudent = async () => {
    const result = await Swal.fire({
      title: 'Update student academic year?',
      text: "This action will update the student's academic year with in same class, those who failed in class & add pending balance to previous year & updating current balance to 0",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, update',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // 1) Build the next academic‐year string
        const [curStart, curEnd] = student.academicYear
          .split("-")
          .map((s) => parseInt(s, 10));
        const nextAcademicYear = `${curStart + 1}-${curEnd + 1}`;

        // 2) Figure out the next class in the sequence
        const transactions = student.transactions || [];
        const currentFees = student.allFee || {};

        // 3) Compute unpaid for current year from transactions
        const unpaidOf = (key) => {
          const due = key?.toLowerCase() === "tuitionfee" ? currentFees.tuitionFees?.total || 0 : currentFees[key] || 0;
          let paid = 0;
          // for tuition fee we also have to take sum of admissionfee
          if (key?.toLowerCase() === "tuitionfee") {
            paid = transactions.filter(t => {
              return (t.academicYear === student.academicYear) && (t?.feeType?.toLowerCase() === key.toLowerCase() || t?.feeType?.toLowerCase() === "admissionfee") && t.status === "completed"
            })
              .reduce((a, t) => a + t.amount, 0);
          } else {
            paid = transactions.filter(t => {
              return (t.academicYear === student.academicYear) && t?.feeType?.toLowerCase() === key.toLowerCase() && t.status === "completed"
            })
              .reduce((a, t) => a + t.amount, 0);
          }
          return Math.max(due - paid, 0);
        };

        // 4) Roll those into last‐year balances  
        const newLastYearBalance = (currentFees.lastYearBalanceFee || 0) + unpaidOf('hostelFee') + unpaidOf('messFee') + unpaidOf('tuitionFee');
        const newLastYearTransport = (currentFees.lastYearBusFee || 0) + unpaidOf('busFee');
        // 5) If status was "new", flip to "current"
        const newStatus = student.status === "new" ? "current" : student.status;
        // If the student is now "current", admission fee is zero:
        const admissionFee = newStatus === "current" ? 0 : currentFees.AdmissionFee;
        const tuitionFee = currentFees.tuitionFees.tuitionFee;
        // leave bus and its discount untouched:
        const busFee = currentFees.busFee || 0;
        const busDiscount = currentFees.busFeeDiscount || 0;

        // 7) Build the updated fee object
        const updatedAllFee = {
          ...currentFees,
          lastYearBalanceFee: newLastYearBalance,
          lastYearBusFee: newLastYearTransport,
          lastYearBusFeeDiscount: busDiscount,
          lastYearDiscount: currentFees.tuitionFeesDiscount || 0,
          // reset current‐year paid amounts
          hostelFee: 0,
          messFee: 0,
          busFee,
          busFeeDiscount: busDiscount,
          // set the new tuitionFees and discounts
          tuitionFees: {
            AdmissionFee: admissionFee,
            tuitionFee: tuitionFee,
            total: admissionFee + tuitionFee,
          },
        };

        // 8) Persist to Firestore
        const updatedStudent = {
          ...student,
          academicYear: nextAcademicYear,
          status: newStatus,
          allFee: updatedAllFee,
        };
        await updateDoc(doc(db, "students", studentId), updatedStudent);

        // 9) Update local state & notify
        setStudent(updatedStudent);
        setFormData((f) => ({ ...f, ...updatedStudent }));
        fetchData()
        Swal.fire("Success!", "Moved to next academic year, with in class", "success");
      } catch (error) {
        console.log(error)
        Swal.fire("Error", error.message, "error");
      }
    }
  }
  if (!student && !loading) {
    return <NotFound />;
  }
  return (
    <>{
      loading ?
        <StudentDetailsLoader /> :
        <div className="py-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:gap-4 relative justify-evenly">
            <StudentProfile
              student={student}
              formData={formData}
              setFormData={setFormData}
              handleStudentUpdate={handleStudentUpdate}
              handleStudentDelete={handleStudentDelete}
              goToNextAcademicYear={goToNextAcademicYear}
            />

            <div className="md:w-2/3">
              {/* Animated Tabs */}
              <div className="relative border-b-2 border-purple-200 mb-6">
                <div className="flex">
                  {tabLabels.map((label, idx) => (
                    <button
                      key={label}
                      onClick={() => setActiveTab(idx)}
                      className="relative flex-1 py-3 text-center"
                    >
                      <motion.span
                        className={`flex items-center justify-center gap-2 text-sm font-medium ${activeTab === idx
                          ? 'text-purple-600'
                          : 'text-gray-500 hover:text-purple-500'
                          }`}
                        whileHover={activeTab === idx ? {} : { scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                      >
                        {idx === 0 && <ReceiptText className="w-5 h-5" />}
                        {idx === 2 && <History className="w-5 h-5" />}
                        {label}
                      </motion.span>

                      {activeTab === idx && (
                        <motion.div
                          layoutId="tab-underline"
                          className="absolute bottom-0 left-0 w-full h-1 bg-purple-600 rounded-t"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <AnimatePresence exitBeforeEnter>
                {activeTab === 0 && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PersonalInfo
                      formData={formData}
                      setFormData={setFormData}
                      studentId={student}
                      schoolData={schoolData}
                      fetchStudent={fetchData}
                      rollBackStudent={rollBackStudent}
                    />
                  </motion.div>
                )}


                {activeTab === 1 && (
                  <motion.div
                    key="fees"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
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
                  </motion.div>
                )}
                {activeTab === 2 && (
                  <motion.div
                    key="transactions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <TransactionHistory
                      student={student}
                      transactions={transactions}
                      setTransactions={setTransactions}
                      handleTransactionStatusUpdate={handleTransactionStatusUpdate}
                      fetchData={fetchData}
                    />
                  </motion.div>
                )}
                {activeTab === 3 && (
                  <motion.div
                    key="docs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <StudentDocumentTab
                      student={student}
                      setStudent={setStudent}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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