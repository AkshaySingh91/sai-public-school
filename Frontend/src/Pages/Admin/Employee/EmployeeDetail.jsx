import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { motion } from "framer-motion";
import { FaUserCircle, FaSave, FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

const EmployeeDetail = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);

  const designationOptions = [
    "Teacher", "Clerk", "Principal", "Accountant",
    "Security", "Sports Coach", "Librarian", "Other"
  ];

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const fetchEmployee = async () => {
    try {
      const docRef = doc(db, "Employees", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEmployee({ uid, ...data });
        setIsCustomDesignation(!designationOptions.includes(data.designation));
      } else {
        setError("Employee not found.");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployee();
  }, [uid]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const result = await MySwal.fire({
        title: 'Confirm Update',
        text: "Are you sure you want to update this employee?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, update it!'
      });

      if (result.isConfirmed) {
        const docRef = doc(db, "Employees", uid);
        await updateDoc(docRef, employee);
        await MySwal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Employee details updated successfully',
          confirmButtonColor: '#7c3aed'
        });
        fetchEmployee();
      }
    } catch (err) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: `Error updating employee: ${err.message}`,
        confirmButtonColor: '#7c3aed'
      });
    }
  };

  const handleDelete = async () => {
    const result = await MySwal.fire({
      title: 'Delete Employee',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "Employees", uid));
        await MySwal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Employee has been deleted',
          confirmButtonColor: '#7c3aed'
        });
        navigate("/employee");
      } catch (err) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: `Error deleting employee: ${err.message}`,
          confirmButtonColor: '#7c3aed'
        });
      }
    }
  };

  const handleChange = (field, value) => {
    setEmployee(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div></div>;
  if (error) return <p className="text-red-500 text-center py-12">{error}</p>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 p-8"
    >
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 relative">
          {/* Profile Card (Simplified) */}
          <div className="lg:col-span-1 bg-violet-50 rounded-xl p-6 text-center sticky top-0 left-0">
            <div className="mb-6">
              <FaUserCircle className="w-32 h-32 text-violet-600 mx-auto" />
              <h2 className="text-2xl font-bold text-violet-900 mt-4">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-violet-600 font-medium mt-2">{employee.designation}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${employee.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {employee.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-violet-700">Department:</span> {employee.department}</p>
              <p><span className="font-semibold text-violet-700">Type:</span> {employee.type}</p>
              <p><span className="font-semibold text-violet-700">School Code:</span> {employee.schoolCode}</p>
            </div>
          </div>

          {/* Employee Form with All Details */}
          <div className="lg:col-span-2">
            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-violet-900 border-b border-violet-100 pb-2">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      value={employee.firstName || ""}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Middle Name</label>
                    <input
                      type="text"
                      value={employee.middleName || ""}
                      onChange={(e) => handleChange("middleName", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={employee.lastName || ""}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={employee.dob || ""}
                      onChange={(e) => handleChange("dob", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Gender</label>
                    <select
                      value={employee.gender || ""}
                      onChange={(e) => handleChange("gender", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Marital Status</label>
                    <select
                      value={employee.maritalStatus || ""}
                      onChange={(e) => handleChange("maritalStatus", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
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
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-violet-900 border-b border-violet-100 pb-2">
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={employee.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Contact Number *</label>
                    <input
                      type="tel"
                      value={employee.contact || ""}
                      onChange={(e) => handleChange("contact", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-violet-700 mb-2">Address</label>
                    <textarea
                      value={employee.address || ""}
                      onChange={(e) => handleChange("address", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-violet-900 border-b border-violet-100 pb-2">
                  Employment Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Designation *</label>
                    <select
                      value={isCustomDesignation ? "Other" : employee.designation}
                      onChange={(e) => {
                        if (e.target.value === "Other") {
                          setIsCustomDesignation(true);
                          handleChange("designation", "");
                        } else {
                          setIsCustomDesignation(false);
                          handleChange("designation", e.target.value);
                        }
                      }}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    >
                      {designationOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {isCustomDesignation && (
                      <input
                        type="text"
                        value={employee.designation}
                        onChange={(e) => handleChange("designation", e.target.value)}
                        className="w-full p-3 border border-violet-200 rounded-lg mt-2 focus:ring-2 focus:ring-violet-500"
                        placeholder="Enter custom designation"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Employee Type *</label>
                    <select
                      value={employee.type || "Teaching"}
                      onChange={(e) => handleChange("type", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="Teaching">Teaching</option>
                      <option value="Non-Teaching">Non-Teaching</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Department</label>
                    <input
                      type="text"
                      value={employee.department || ""}
                      onChange={(e) => handleChange("department", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Class</label>
                    <input
                      type="text"
                      value={employee.class || ""}
                      onChange={(e) => handleChange("class", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Division</label>
                    <input
                      type="text"
                      value={employee.div || ""}
                      onChange={(e) => handleChange("div", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Date of Joining</label>
                    <input
                      type="date"
                      value={employee.doj || ""}
                      onChange={(e) => handleChange("doj", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-violet-900 border-b border-violet-100 pb-2">
                  Additional Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Aadhar Number</label>
                    <input
                      type="text"
                      value={employee.addharCardNo || ""}
                      onChange={(e) => handleChange("addharCardNo", e.target.value)}
                      className="w-full p-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Web Access</label>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleChange("webAccess", !employee.webAccess)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${employee.webAccess ? 'bg-violet-600' : 'bg-gray-200'
                          }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${employee.webAccess ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                      </button>
                      <span className="text-sm">{employee.webAccess ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-2">Active Status</label>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleChange("active", !employee.active)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${employee.active ? 'bg-green-600' : 'bg-red-600'
                          }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${employee.active ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                      </button>
                      <span className="text-sm">{employee.active ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <FaTrash className="mr-2" />
                  Delete Employee
                </button>
                <button
                  type="submit"
                  className="flex items-center px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <FaSave className="mr-2" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeDetail;