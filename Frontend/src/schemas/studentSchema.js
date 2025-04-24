// Student Schema Definition
export const studentSchema = {
  academicYear: String,
  type: String, // DSS, DS, DSR
  firstName: String,
  fatherName: String,
  motherName: String,
  surname: String,
  status: String, // Current, Left, etc.
  dob: Date,
  bloodGroup: String,
  sex: String, // M, F
  class: String, // Nursery, JRKG, SRKG, 1-12
  division: String,
  fatherMobile: String,
  motherMobile: String,
  studentMobile: String,
  busDestination: String,
  mealService: Boolean,
  feeId: String,
  rollNo: String,
  email: String,
  address: String,
  documents: {
    birthCertificate: String, // URL or path
    leavingCertificate: String,
    bonafideCertificate: String
  },
  studentFee: [{
    feeType: String,
    amount: Number
  }],
  createdAt: Date,
  updatedAt: Date
};

// Helper function to generate a new student object
export const createNewStudent = (data) => {
  return {
    academicYear: data.academicYear || '',
    type: data.type || 'DS',
    firstName: data.firstName || '',
    fatherName: data.fatherName || '',
    motherName: data.motherName || '',
    surname: data.surname || '',
    status: 'Current',
    dob: data.dob || null,
    bloodGroup: data.bloodGroup || '',
    sex: data.sex || 'M',
    class: data.class || '',
    division: data.division || '',
    fatherMobile: data.fatherMobile || '',
    motherMobile: data.motherMobile || '',
    studentMobile: data.studentMobile || '',
    busDestination: data.busDestination || '',
    mealService: data.mealService || false,
    feeId: data.feeId || '',
    rollNo: data.rollNo || '',
    email: data.email || '',
    address: data.address || '',
    documents: {
      birthCertificate: '',
      leavingCertificate: '',
      bonafideCertificate: ''
    },
    studentFee: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Helper function to validate student data
export const validateStudent = (student) => {
  const errors = [];
  
  if (!student.firstName) errors.push('First name is required');
  if (!student.fatherName) errors.push('Father name is required');
  if (!student.class) errors.push('Class is required');
  if (!student.division) errors.push('Division is required');
  if (!student.fatherMobile) errors.push('Father mobile is required');
  if (!student.sex) errors.push('Gender is required');
  if (!student.dob) errors.push('Date of birth is required');
  
  return errors;
}; 