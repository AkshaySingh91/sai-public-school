// Fee Type Schema
export const feeTypeSchema = {
  name: String,
  description: String,
  isActive: Boolean
};

// Fee Structure Schema
export const feeStructureSchema = {
  academicYear: String,
  classes: [{
    name: String,
    studentType: [{
      name: String, // DS, DSS, DSR
      feeStructure: {
        // Dynamic fee types with amounts
        // [key: String]: Number
      }
    }]
  }]
};

// Fee Transaction Schema
export const feeTransactionSchema = {
  studentId: String,
  academicYear: String,
  date: Date,
  amount: Number,
  feeType: String,
  mode: String, // Cash, Cheque, Online, GPAY
  account: {
    accountNo: String,
    bankName: String,
    branch: String,
    ifsc: String
  },
  receiptNo: String,
  remarks: String,
  createdAt: Date,
  createdBy: String
};

// School Account Schema
export const schoolAccountSchema = {
  accountNo: String,
  ifsc: String,
  bankName: String,
  branch: String,
  isActive: Boolean
};

// Helper function to calculate total fees for a student
export const calculateTotalFees = (studentFee) => {
  return studentFee.reduce((total, fee) => total + fee.amount, 0);
};

// Helper function to calculate total paid fees
export const calculatePaidFees = (transactions) => {
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
};

// Helper function to get fee structure for a student
export const getStudentFeeStructure = (feeStructure, academicYear, className, studentType) => {
  const yearStructure = feeStructure.find(s => s.academicYear === academicYear);
  if (!yearStructure) return null;

  const classStructure = yearStructure.classes.find(c => c.name === className);
  if (!classStructure) return null;

  const typeStructure = classStructure.studentType.find(t => t.name === studentType);
  return typeStructure ? typeStructure.feeStructure : null;
}; 