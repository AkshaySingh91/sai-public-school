import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, getDocs, where, query } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { toast } from 'react-toastify';
import { FaUser, FaEnvelope, FaPhone, FaBriefcase, FaBuilding, FaCalendarAlt, FaVenusMars, FaHeart, FaHome, FaIdCard, FaToggleOn, FaSave, FaSchool } from 'react-icons/fa';

const EmployeeForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [validToken, setValidToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    email: '',
    contact: '',
    address: '',
    designation: '',
    type: 'Teaching',
    department: '',
    class: '',
    div: '',
    doj: '',
    webAccess: true,
    addharCardNo: "",
    active: true,
  });
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenData, setTokenData] = useState({});
  const designationOptions = [
    "Teacher",
    "Clerk",
    "Principal",
    "Accountant",
    "Security",
    "Sports Coach",
    "Librarian",
    "Other",
  ];

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token');

    if (tokenParam) {
      setToken(tokenParam);
      validateToken(tokenParam);
    } else {
      setLoading(false);
    }
  }, [location]);

  const validateToken = async (token) => {
    try {
      const tokenDoc = await getDoc(doc(db, 'shareTokens', token));
      if (!tokenDoc.exists()) {
        throw new Error('Invalid token');
      }
      // check if token in database exist
      const tokenData = tokenDoc.data();
      setTokenData(tokenData);
      // Check expiration
      const now = new Date();
      const expiresAt = tokenData.expiresAt.toDate();
      if (now > expiresAt) {
        throw new Error('Token has expired');
      }
      // Check if token has been used
      if (tokenData.used) {
        throw new Error('Token has already been used');
      }

      // check if school with give code exist 
      const schoolsRef = collection(db, "schools");
      const q = query(schoolsRef, where("Code", "==", tokenData.schoolCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('School not found');
      } else {
        const doc = querySnapshot.docs[0];
        setSchool({
          id: doc.id,
          ...doc.data()
        });
      }
      setValidToken(true);
    } catch (error) {
      console.log(error.message)
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Save employee data to Firestore
      await addDoc(collection(db, "Employees"), {
        ...formData,
        schoolCode: tokenData.schoolCode,
        createdAt: new Date()
      });

      // Mark token as used
      await updateDoc(doc(db, 'shareTokens', token), {
        used: true
      });

      toast.success('Employee details submitted successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error('Failed to submit employee details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-lg text-indigo-800 font-medium">Verifying your access...</p>
          <p className="mt-2 text-gray-600">Please wait while we validate your link</p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              The link you are trying to access is invalid or has expired.
              Please contact your administrator for a new link.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-5 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* School Information Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl overflow-hidden mb-10">
          <div className="p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row items-center">
              <div className="bg-white/20 rounded-full p-4 mb-4 md:mb-0 md:mr-6">
                <FaSchool className="text-3xl" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{school.schoolName}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 text-sm">
                  <div className="bg-white/20 px-3 py-1 rounded-full flex items-center">
                    <FaBuilding className="mr-1" />
                    <span>{school.location?.district || 'District not specified'}</span>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full flex items-center">
                    <FaHome className="mr-1" />
                    <span>{school.location?.taluka || 'Taluka not specified'}</span>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full flex items-center">
                    <span>{school.location?.landmark || 'Landmark not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Employee Information Form</h1>
              <p className="text-gray-600">
                Please fill out your details to complete your employee profile
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information Section */}
              <div className="space-y-6 bg-indigo-50 rounded-xl p-6">
                <div className="flex items-center">
                  <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    <FaUser className="text-indigo-600 text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900">Personal Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaUser className="mr-2 text-indigo-600" /> First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      required
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="John"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => handleChange("middleName", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Middle"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaUser className="mr-2 text-indigo-600" /> Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      required
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Doe"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaCalendarAlt className="mr-2 text-indigo-600" /> Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleChange("dob", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaVenusMars className="mr-2 text-indigo-600" /> Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleChange("gender", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaHeart className="mr-2 text-indigo-600" /> Marital Status
                    </label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => handleChange("maritalStatus", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-6 bg-indigo-50 rounded-xl p-6">
                <div className="flex items-center">
                  <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    <FaPhone className="text-indigo-600 text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900">Contact Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaEnvelope className="mr-2 text-indigo-600" /> Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaPhone className="mr-2 text-indigo-600" /> Contact Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.contact}
                      onChange={(e) => handleChange("contact", e.target.value)}
                      required
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="md:col-span-2 bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaHome className="mr-2 text-indigo-600" /> Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows="3"
                      placeholder="Enter your full address"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details Section */}
              <div className="space-y-6 bg-indigo-50 rounded-xl p-6">
                <div className="flex items-center">
                  <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    <FaBriefcase className="text-indigo-600 text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900">Employment Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaBriefcase className="mr-2 text-indigo-600" /> Designation *
                    </label>
                    <select
                      value={isCustomDesignation ? "Other" : formData.designation}
                      onChange={(e) => {
                        if (e.target.value === "Other") {
                          setIsCustomDesignation(true);
                          handleChange("designation", "");
                        } else {
                          setIsCustomDesignation(false);
                          handleChange("designation", e.target.value);
                        }
                      }}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {designationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {isCustomDesignation && (
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => handleChange("designation", e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg mt-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter custom designation"
                        required
                      />
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleChange("type", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Teaching">Teaching</option>
                      <option value="Non-Teaching">Non-Teaching</option>
                    </select>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleChange("department", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Department name"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class
                    </label>
                    <input
                      type="text"
                      value={formData.class}
                      onChange={(e) => handleChange("class", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Class name"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Division
                    </label>
                    <input
                      type="text"
                      value={formData.div}
                      onChange={(e) => handleChange("div", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Division"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaCalendarAlt className="mr-2 text-indigo-600" /> Date of Joining
                    </label>
                    <input
                      type="date"
                      value={formData.doj}
                      onChange={(e) => handleChange("doj", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-6 bg-indigo-50 rounded-xl p-6">
                <div className="flex items-center">
                  <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    <FaIdCard className="text-indigo-600 text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900">Additional Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FaIdCard className="mr-2 text-indigo-600" /> Aadhar Number
                    </label>
                    <input
                      type="text"
                      value={formData.addharCardNo}
                      onChange={(e) => handleChange("addharCardNo", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="1234-5678-9012"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium disabled:opacity-75"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-3" />
                      Submit Employee Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Your information will be securely stored and only accessible to {school.schoolName} administrators.</p>
          <p className="mt-1">Form will expire after submission.</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeForm;
/*
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Save employee data to Firestore
      const employeesRef = collection(db, `schools/${schoolCode}/employees`);
      await addDoc(employeesRef, {
        ...formData,
        createdAt: new Date()
      });

      // Mark token as used
      await addDoc(collection(db, "Employees"), {
        ...formData,
        middleName: null,
        active: true,
        department: null,
        class: null,
        address: null,
        webAccess: "no",
        div: null,
        schoolCode: schoolCode || null, // You can assign if needed or get from somewhere
        addharCardNo: null,
        dob: null,
        doj: serverTimestamp(),
        maritalStatus: null,
      });
      await updateDoc(doc(db, 'shareTokens', token), {
        used: true
      });

      toast.success('Employee details submitted successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error('Failed to submit employee details');
    } finally {
      setSubmitting(false);
    }
  };
*/ 