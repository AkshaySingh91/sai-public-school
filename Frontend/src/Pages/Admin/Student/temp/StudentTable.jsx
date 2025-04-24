import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useFirestore } from "../../../../contexts/FirestoreContext";
import { FaPlus, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { db } from "../../../../config/firebase"; // Update if your context path is different


const StudentTable = () => {
  const [students, setStudents] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      const querySnapshot = await getDocs(collection(db, "students"));
      const studentList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(studentList);
    };
    fetchStudents();
  }, [db]);

  const handleExpand = (student) => {
    setExpanded(student.id === expanded ? null : student.id);
    setFormData(student); // Set formData to student data when expanding the row
  };

  const handleUpdate = async (id) => {
    const studentRef = doc(db, "students", id);
    await updateDoc(studentRef, formData);
    alert("✅ Student info updated!");
    setExpanded(null); // Close the expanded row after update
  };

  const handleAvatarClick = (studentId) => {
    navigate(`/fee-details/${studentId}`);
  };

  return (
    <div className="p-6 overflow-x-auto bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Admitted Students
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
            <th className="p-3 border-b">Avatar</th>
            <th className="p-3 border-b">Name</th>
            <th className="p-3 border-b">Class</th>
            <th className="p-3 border-b">Gender</th>
            <th className="p-3 border-b">Type</th>
            <th className="p-3 border-b">Academic Year</th>
            <th className="p-3 border-b">Contact</th>
            <th className="p-3 border-b">Bus Stop</th>
            <th className="p-3 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <React.Fragment key={student.id}>
              <tr className="hover:bg-gray-50 transition-all">
                <td
                  className="p-3 text-center cursor-pointer"
                  onClick={() => handleAvatarClick(student.id)}
                >
                  <FaUserCircle
                    size={24}
                    className="text-green-600 hover:text-green-800 transition"
                    title="View Fee Details"
                  />
                </td>
                <td className="p-3">
                  {student.firstName} {student.lastName}
                </td>
                <td className="p-3">{student.class}</td>
                <td className="p-3">{student.gender}</td>
                <td className="p-3">{student.studentType || "N/A"}</td>
                <td className="p-3">{student.academicYear || "N/A"}</td>
                <td className="p-3">{student.mobile}</td>
                <td className="p-3">
                  {student.busDestination || (
                    <span className="italic text-gray-400">No Stop</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <FaPlus
                    className="inline-block text-blue-600 hover:text-blue-800 cursor-pointer transition"
                    title="Add/Update Info"
                    onClick={() => handleExpand(student)}
                  />
                </td>
              </tr>

              {expanded === student.id && (
                <tr>
                  <td colSpan="9" className="p-4 bg-gray-50 border-t">
                    <form
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate(student.id);
                      }}
                    >
                      {/* Academic Year */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Academic Year
                        </label>
                        <input
                          value={formData.academicYear || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              academicYear: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                          placeholder="2025-26"
                        />
                      </div>

                      {/* Student Type */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Student Type
                        </label>
                        <select
                          value={formData.studentType || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              studentType: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select</option>
                          <option value="DS">DS</option>
                          <option value="DSS">DSS</option>
                          <option value="DSR">DSR</option>
                        </select>
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.dob || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, dob: e.target.value })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Gender
                        </label>
                        <select
                          value={formData.gender || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, gender: e.target.value })
                          }
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Class */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Class
                        </label>
                        <input
                          value={formData.class || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, class: e.target.value })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Division */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Division
                        </label>
                        <input
                          value={formData.div || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, div: e.target.value })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Blood Group */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Blood Group
                        </label>
                        <input
                          value={formData.bloodGroup || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bloodGroup: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                          placeholder="A+, B-, O+, etc."
                        />
                      </div>

                      {/* Student Mobile */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Student Mobile
                        </label>
                        <input
                          value={formData.mobile || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, mobile: e.target.value })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Father's Mobile */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Father Mobile
                        </label>
                        <input
                          value={formData.fatherMobile || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fatherMobile: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Mother's Mobile */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Mother Mobile
                        </label>
                        <input
                          value={formData.motherMobile || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              motherMobile: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Aadhaar Number */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Aadhaar Number
                        </label>
                        <input
                          value={formData.aadharNo || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              aadharNo: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Bus Destination */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Bus Destination
                        </label>
                        <input
                          value={formData.busDestination || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              busDestination: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                        />
                      </div>

                      {/* Meal Service */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Meal Service
                        </label>
                        <select
                          value={formData.mealService || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              mealService: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Address Line 1 */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Address Line 1
                        </label>
                        <input
                          value={formData.address1 || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address1: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                          placeholder="Street, Area"
                        />
                      </div>

                      {/* Address Line 2 */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Address Line 2
                        </label>
                        <input
                          value={formData.address2 || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address2: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md"
                          placeholder="City, Pincode, State"
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end mt-2">
                        <button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow transition"
                        >
                          ✅ Update Info
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable; 