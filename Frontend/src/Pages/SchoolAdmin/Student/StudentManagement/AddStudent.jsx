// src/Pages/SchoolAdmin/Students/AddStudent.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import Swal from 'sweetalert2';
import { User, Users, BookOpen, GraduationCap, Calendar, Clock, Wallet, Hash } from 'lucide-react';
import { SelectField } from '../SelectField';
import { InputField } from "../InputField"
import { useInstitution } from '../../../../contexts/InstitutionContext';
import showStudentSummary from "./ShowStudentSummary"

export default function AddStudent() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { school, setSchool } = useInstitution();
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const [formData, setFormData] = useState({
    fname: '',
    fatherName: '',
    lname: '',
    motherName: '',
    class: '',
    div: '',
    type: '',
    gender: '',
    dob: "2025-05-29",
    academicYear: school?.academicYear || "25-26",
    penNo: "",
    grNo: "",
    saralId: "",
    status: "new",
    fatherMobile: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      if (school) {
        const c = school.class && school.class.length ? school.class.map(c => c.toLowerCase()) : ["nursery", "jrkg", "srkg", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
        setClasses(c)
        const d = school.divisions && school.divisions.length ? school.divisions.map(c => c.toLowerCase()) : ["a", "b", "c", "d", "semi"];
        setDivisions(d)
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "error",
        text: error.message
      })
    }
  }, [school])

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const loadingToast = Swal.fire({
      title: 'Processing...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const getNewClassFees = async (newClass, targetAcademicYear, englishMedium) => {
      try {
        const fsRef = doc(db, "feeStructures", userData.schoolCode);
        const fsSnap = await getDoc(fsRef);
        if (!fsSnap.exists()) {
          console.error("Fee structure document not found");
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Fee structure document not found',
          })
          return { AdmissionFee: 0, tuitionFee: 0, total: 0 };
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
          return { AdmissionFee: 0, tuitionFee: 0, total: 0 };
        }
        // here we will get class
        let classStructure = yearStructure.classes?.find(
          (c) => c.name?.trim().toLowerCase() === newClass.trim().toLowerCase()
        );
        if (!classStructure || !classStructure.studentType || !classStructure.studentType.length) {
          console.warn(`No fee structure found for class ${newClass}`);
          return { AdmissionFee: 0, tuitionFee: 0, total: 0 };
        }
        // herer we will filter based on division
        classStructure = classStructure.studentType.filter(c => (c.englishMedium === undefined && englishMedium) || c.englishMedium === englishMedium)
        return classStructure;
      } catch (error) {
        console.error("Error fetching fee structure:", error);
        return { AdmissionFee: 0, tuitionFee: 0, total: 0 };
      }
    };

    try {
      // Calculate base fees
      function isValidAcademicYear(str) {
        if (!/^\d{2}-\d{2}$/.test(str)) return false;

        const [first, second] = str.split('-').map(Number);
        return second === first + 1;
      }
      if (!isValidAcademicYear(formData.academicYear)) {
        return Swal.fire({
          icon: 'error',
          title: 'Academic year is invalid',
          text: "Academic Year should be of type '24-25' where 24 is the year and the second year is the next year",
          confirmButtonColor: '#6366f1'
        });
      }
      const classStructure = await getNewClassFees(formData.class, formData.academicYear, formData.div?.toLowerCase() !== "semi")
      const studentType = classStructure?.find(
        (st) =>
          st.name?.trim().toLowerCase() === formData.type?.trim().toLowerCase()
      );
      if (!studentType) {
        return Swal.fire({
          icon: 'error',
          title: `No fee structure found for student type ${formData.type}`,
          confirmButtonColor: '#6366f1'
        });
      }

      const feeStructure = studentType.feeStructure || {};
      let AdmissionFee = 0;
      let tuitionFee = 0;
      if (formData?.status?.toLowerCase() === "new") {
        // for dsr no addmission fee & tuition
        AdmissionFee = Number(feeStructure.AdmissionFee) || 0;
        tuitionFee = Number(feeStructure.TuitionFee) || 0;
      } else {
        tuitionFee = Number(feeStructure.TuitionFee) || 0;
      }
      const tuitionFees = {
        AdmissionFee: AdmissionFee,
        tuitionFee: tuitionFee,
        total: AdmissionFee + tuitionFee,
      };
      // Calculate DSS discount if applicable
      let tuitionFeesDiscount = 0;
      // to calculate dis if student is new than we will subtract it from total of DS ie (tuition+addminssion) else ig current than only subtract from tuition because we dont take admissionFee.
      if (formData.type?.toLowerCase() === 'dsr' || formData.type?.toLowerCase() === 'dss') {
        const dsStructure = classStructure.find(st => st.name?.toLowerCase() === 'ds');
        if (!dsStructure) {
          throw new Error('DS fee structure not found for discount calculation');
        }
        let dsTotal = 0;
        if (formData?.status?.toLowerCase() === "new") {
          // addmission + tuition
          dsTotal = Object.values(dsStructure.feeStructure).reduce((a, b) => a + b, 0);
        } else {
          // tuition
          dsTotal = dsStructure?.feeStructure?.tuitionFee || 0;
        }
        const dssTotal = tuitionFees.total;
        tuitionFeesDiscount = Math.max(dsTotal - dssTotal, 0);
      }
      // feeId will total feeId + 1
      const feeId = (Number(school.feeIdCount) || 0) + 1;
      // Prepare student data with fees
      // from here we have verified all data correctly mostly fees calc 
      const studentData = {
        ...formData,
        schoolCode: userData.schoolCode,
        feeId: feeId,
        allFee: {
          lastYearBalanceFee: 0,
          lastYearDiscount: 0,
          lastYearBusFee: 0,
          lastYearBusFeeDiscount: 0,
          tuitionFees: {
            AdmissionFee: AdmissionFee,
            tuitionFee: tuitionFee,
            total: AdmissionFee + tuitionFee,
          },
          tuitionFeesDiscount,
          busFee: 0,
          busFeeDiscount: 0,
          messFee: 0,
          hostelFee: 0,
        },
        transactions: [],
        createdAt: new Date()
      };
      const isConfirmed = await showStudentSummary(studentData);
      if (!isConfirmed) return;

      const newStudent = await addDoc(collection(db, 'students'), studentData)
      // update school feeIdCount
      await updateDoc(doc(db, 'schools', school.id), {
        feeIdCount: feeId
      });
      setSchool(prev => ({ ...prev, feeIdCount: feeId }))
      Swal.fire({
        icon: 'success',
        title: 'Student Added!',
        text: 'Student record created successfully',
        confirmButtonColor: '#6366f1'
      });
      navigate(`/school/student/${newStudent.id}`);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: error.message,
        confirmButtonColor: '#6366f1'
      });
    } finally {
      setSubmitting(false);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="p-6 max-w-3xl mx-auto animate-pulse">
      <div className="h-8 bg-purple-100 rounded w-1/4 mb-6"></div>
      <div className="grid grid-cols-2 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 bg-purple-50 rounded-lg"></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-purple-50 p-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-2xl mb-4">
            <User className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">New Student Registration</h2>
          <p className="text-gray-600">Fill in the student details below</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField
                  icon={<User className="w-5 h-5" />}
                  label="First Name"
                  value={formData.fname}
                  onChange={e => setFormData({ ...formData, fname: e.target.value?.toLowerCase() })}
                  required
                />
                <InputField
                  label="Middle Name"
                  value={formData.fatherName}
                  onChange={e => setFormData({ ...formData, fatherName: e.target.value?.toLowerCase() })}
                />
                <InputField
                  label="Last Name"
                  value={formData.lname}
                  onChange={e => setFormData({ ...formData, lname: e.target.value?.toLowerCase() })}
                  required
                />
                <SelectField
                  label="Gender"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value?.toLowerCase() })}
                  options={['male', 'female', 'other']}
                  required
                />
                <InputField
                  icon={<Calendar className="w-5 h-5" />}
                  label="Date of Birth"
                  type="date"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Parent Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                Parent Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Father's Name"
                  value={formData.fatherName}
                  onChange={e => setFormData({ ...formData, fatherName: e.target.value?.toLowerCase() })}
                  required
                />
                <InputField
                  label="Mother's Name"
                  value={formData.motherName}
                  onChange={e => setFormData({ ...formData, motherName: e.target.value?.toLowerCase() })}
                  required
                />
              </div>
            </div>

            {/* Academic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                Academic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField
                  icon={<GraduationCap className="w-5 h-5" />}
                  label="Class"
                  value={formData.class}
                  onChange={e => setFormData({ ...formData, class: e.target.value?.toLowerCase() })}
                  options={classes}
                  required
                  className="capitalize w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none transition-all z-0"
                />
                <SelectField
                  icon={<Hash className="w-5 h-5" />}
                  label="Division"
                  value={formData.div}
                  onChange={e => setFormData({ ...formData, div: e.target.value?.toLowerCase() })}
                  options={divisions}
                  className="capitalize w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none transition-all z-0"
                />
                <SelectField
                  icon={<Wallet className="w-5 h-5" />}
                  label="Student Type"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value?.toLowerCase() })}
                  options={(school.studentsType || []).map(t => t?.toLowerCase())}
                  className="capitalize w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none transition-all z-0"
                  required
                />
                <InputField
                  icon={<Clock className="w-5 h-5" />}
                  label="Status"
                  value={formData.status}
                  required
                  disabled={true}
                />
                <InputField
                  label="Father Mobile"
                  value={formData.fatherMobile}
                  onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                  required
                />
                <InputField
                  label="Academic Year"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  required
                />
                <InputField
                  label="General Regestration No."
                  value={formData.grNo}
                  onChange={e => setFormData({ ...formData, grNo: e.target.value })}
                />
                <InputField
                  label="PEN no."
                  value={formData.penNo}
                  onChange={e => setFormData({ ...formData, penNo: e.target.value })}
                />
                <InputField
                  label="saral id"
                  value={formData.saralId}
                  onChange={e => setFormData({ ...formData, saralId: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="border-t pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  Register Student
                </>
              )}
            </button>
          </div>
        </form>
      </div >
    </div >
  );
}
