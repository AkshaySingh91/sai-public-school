// src/Pages/Admin/Students/AddStudent.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, addDoc, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';
import { User, Users, BookOpen, GraduationCap, Calendar, VenusAndMars, Wallet } from 'lucide-react';
import { SelectField } from './SelectField';
import { InputField } from "./InputField"

export default function AddStudent() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fname: '',
    mname: '',
    lname: '',
    fatherName: '',
    motherName: '',
    class: '',
    type: '',
    gender: '',
    dob: '',
    academicYear: '24-25'
  });
  const [schoolData, setSchoolData] = useState({ classes: [], studentTypes: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  console.log({ userData })
  // Fetch school data
  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        // 1. Fix Firestore field name case (likely should be lowercase 'code')
        const schoolQ = query(
          collection(db, "schools"),
          where("Code", "==", userData.schoolCode) // Changed "Code" to "code"
        );

        const schoolSnap = await getDocs(schoolQ);

        if (schoolSnap.empty) throw new Error("School not found");

        // 2. Get the document properly
        const schoolDoc = schoolSnap.docs[0]; // Get the document snapshot
        const schoolData = schoolDoc.data(); // Get the data from the document

        // 3. Use the correct variable name (schoolDoc instead of schoolData)
        setSchoolData({
          classes: schoolData.class || [], // Changed schoolDoc.data() to schoolData
          studentTypes: schoolData.studentsType || [] // Changed schoolDoc.data() to schoolData
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching school data:", err);
        Swal.fire('Error', 'Failed to load school data', 'error');
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [userData.schoolCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Fetch fee structure document for the school
      const feeStructureRef = doc(db, 'feeStructures', userData.schoolCode);
      const feeStructureSnap = await getDoc(feeStructureRef);

      if (!feeStructureSnap.exists()) {
        throw new Error('Fee structure not found for this school');
      }

      const feeStructureData = feeStructureSnap.data();
      const structures = feeStructureData.structures || [];

      // Find matching academic year structure
      const yearStructure = structures.find(s => s.year === formData.academicYear);
      if (!yearStructure) {
        throw new Error(`No fee structure found for academic year ${formData.academicYear}`);
      }

      // Find matching class structure
      const classStructure = yearStructure.classes.find(c => c.name === formData.class);
      if (!classStructure) {
        throw new Error(`No fee structure found for class ${formData.class}`);
      }

      // Find matching student type structure
      const studentTypeStructure = classStructure.studentType.find(st => st.name === formData.type);
      if (!studentTypeStructure) {
        throw new Error(`No fee structure found for student type ${formData.type}`);
      }
      console.log({ studentTypeStructure })
      // Calculate base fees
      const schoolFees = {
        ...studentTypeStructure.feeStructure,
        total: Object.values(studentTypeStructure.feeStructure).reduce((a, b) => a + b, 0)
      };

      // Calculate DSS discount if applicable
      let schoolFeesDiscount = 0;
      console.log({ formData })
      if (formData.type === 'DSS') {
        const dsStructure = classStructure.studentType.find(st => st.name === 'DS');
        console.log({ dsStructure })
        if (!dsStructure) {
          throw new Error('DS fee structure not found for discount calculation');
        }

        const dsTotal = Object.values(dsStructure.feeStructure).reduce((a, b) => a + b, 0);
        const dssTotal = schoolFees.total;
        console.log({ dssTotal })
        schoolFeesDiscount = Math.max(dsTotal - dssTotal, 0);
        console.log({ schoolFeesDiscount })
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
          schoolFeesDiscount,
          transportFee: 0,
          transportFeeDiscount: 0,
          messFee: 0,
          hostelFee: 0,
        },
        transaction: [],
        status: 'active',
        createdAt: new Date()
      };

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
                  options={schoolData.classes}
                  required
                />
                <SelectField
                  icon={<Wallet className="w-5 h-5" />}
                  label="Student Type"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  options={schoolData.studentTypes}
                  required
                />
                <SelectField
                  icon={<Calendar className="w-5 h-5" />}
                  label="Academic Year"
                  value={formData.academicYear}
                  onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                  options={['24-25', '25-26', '26-27']}
                  required
                />
              </div>
            </div>

            {/* Personal Details */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                <VenusAndMars className="w-5 h-5 mr-2 text-purple-600" />
                Personal Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}
