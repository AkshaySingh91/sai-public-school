// src/Pages/Admin/Students/AddStudent.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, addDoc, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';
import { User, Users, BookOpen, GraduationCap, Calendar, Clock, Wallet, Hash } from 'lucide-react';
import { SelectField } from '../SelectField';
import { InputField } from "../InputField"
import { useSchool } from '../../../../contexts/SchoolContext';

export default function AddStudent() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { school } = useSchool();
  const [formData, setFormData] = useState({
    fname: '',
    mname: '',
    lname: '',
    fatherName: '',
    motherName: '',
    class: '',
    div: '',
    type: '',
    gender: '',
    dob: '',
    academicYear: school?.academicYear || "",
    penNo: "",
    grNo: "",
    saralId: "",
    status: "new"
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Fetch school data

  console.log({ school })

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const getNewClassFees = async (newClass, targetAcademicYear) => {
      try {
        const fsRef = doc(db, "feeStructures", userData.schoolCode);
        const fsSnap = await getDoc(fsRef);

        if (!fsSnap.exists()) {
          console.error("Fee structure document not found");
          return { AdmissionFee: 0, TutionFee: 0, total: 0 };
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
          return { AdmissionFee: 0, TutionFee: 0, total: 0 };
        }

        // Rest of the original logic remains the same
        const classStructure = yearStructure.classes?.find(
          (c) => c.name?.trim().toLowerCase() === newClass.trim().toLowerCase()
        );

        if (!classStructure) {
          console.warn(`No fee structure found for class ${newClass}`);
          return { AdmissionFee: 0, TutionFee: 0, total: 0 };
        }

        return classStructure;
      } catch (error) {
        console.error("Error fetching fee structure:", error);
        return { AdmissionFee: 0, TutionFee: 0, total: 0 };
      }
    };
    try {
      // Calculate base fees
      const classStructure = await getNewClassFees(formData.class, formData.academicYear)


      const studentType = classStructure.studentType?.find(
        (st) =>
          st.name?.trim().toLowerCase() === formData.type?.trim().toLowerCase()
      );
      if (!studentType) {
        console.warn(`No fee structure found for student type ${formData.type}`);
        return { AdmissionFee: 0, TutionFee: 0, total: 0 };
      }
      // very important if student is new than we dont have to assign addmission fee only tution fee required
      const feeStructure = studentType.feeStructure || {};
      let AdmissionFee = 0;
      let tutionFee = 0;
      if (formData?.status?.toLowerCase() === "new") {
        AdmissionFee = Number(feeStructure.AdmissionFee) || 0;
        tutionFee = Number(feeStructure.TutionFee) || 0;
      } else {
        tutionFee = Number(feeStructure.TutionFee) || 0;
      }
      const schoolFees = {
        AdmissionFee: AdmissionFee,
        TutionFee: tutionFee,
        total: AdmissionFee + tutionFee,
      };
      // Calculate DSS discount if applicable
      let tutionFeesDiscount = 0;
      // to calculate dis if student is new than we will subtract it from total of DS ie (tution+addminssion) else ig current than only subtract from tution because we dont take addmission fee.
      if (formData.type === 'DSR' || formData.type === 'DSS') {
        const dsStructure = classStructure.studentType.find(st => st.name === 'DS');
        if (!dsStructure) {
          throw new Error('DS fee structure not found for discount calculation');
        }
        let dsTotal = 0;
        if (formData?.status?.toLowerCase() === "new") {
          // addmission + tution
          dsTotal = Object.values(dsStructure.feeStructure).reduce((a, b) => a + b, 0);
        } else {
          // tution
          dsTotal = dsStructure?.feeStructure?.TutionFee || 0;
        }
        const dssTotal = schoolFees.total;
        tutionFeesDiscount = Math.max(dsTotal - dssTotal, 0);
      }

      // Prepare student data with fees
      const studentData = {
        ...formData,
        schoolCode: userData.schoolCode,
        feeId: `FEE-${nanoid(6).toUpperCase()}`,
        allFee: {
          lastYearBalanceFee: 0,
          lastYearDiscount: 0,
          lastYearTransportFee: 0,
          lastYearTransportFeeDiscount: 0,
          schoolFees,
          tutionFeesDiscount,
          transportFee: 0,
          transportFeeDiscount: 0,
          messFee: 0,
          hostelFee: 0,
        },
        transactions: [],
        createdAt: new Date()
      };
      console.log(studentData)
      // Save to Firestore
      await addDoc(collection(db, 'students'), studentData);

      Swal.fire({
        icon: 'success',
        title: 'Student Added!',
        text: 'Student record created successfully',
        confirmButtonColor: '#6366f1'
      });
      navigate('/students');
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
                  onChange={e => setFormData({ ...formData, fname: e.target.value })}
                  required
                />
                <InputField
                  label="Middle Name"
                  value={formData.mname}
                  onChange={e => setFormData({ ...formData, mname: e.target.value })}
                />
                <InputField
                  label="Last Name"
                  value={formData.lname}
                  onChange={e => setFormData({ ...formData, lname: e.target.value })}
                  required
                />
                <SelectField
                  label="Gender"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  options={['Male', 'Female', 'Other']}
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
                  onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                  required
                />
                <InputField
                  label="Mother's Name"
                  value={formData.motherName}
                  onChange={e => setFormData({ ...formData, motherName: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, class: e.target.value })}
                  options={school.class}
                  required
                />
                <SelectField
                  icon={<Hash className="w-5 h-5" />}
                  label="Division"
                  value={formData.div}
                  onChange={e => setFormData({ ...formData, div: e.target.value })}
                  options={school.divisions}
                />
                <SelectField
                  icon={<Wallet className="w-5 h-5" />}
                  label="Student Type"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  options={school.studentsType}
                  required
                />
                <SelectField
                  icon={<Clock className="w-5 h-5" />}
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={["new", "current", "inactive"]}
                  required
                />
               
                <InputField
                  label="Academic Year"
                  value={formData.academicYear}
                  disabled={true}
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
