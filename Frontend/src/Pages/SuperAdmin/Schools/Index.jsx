// src/Pages/SuperAdmin/Schools/ManageSchools.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import SchoolForm from "./SchoolForm";
import AccountantForm from "./AccountantForm";
import AccountantList from "./AccountantList";

const ManageSchools = () => {
  const [schools, setSchools] = useState([]);
  const [activeSchoolId, setActiveSchoolId] = useState(null); // For toggling the Add Accountant form for a specific school

  // Fetch schools from Firestore "schools" collection.
  const fetchSchools = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "schools"));
      const list = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setSchools(list);
      console.log({ list });
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleDeleteSchool = async (schoolId) => {
    try {
      await deleteDoc(doc(db, "schools", schoolId));
      fetchSchools();
    } catch (error) {
      console.error("Error deleting school:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Manage Schools</h1>
      {/* Form for adding new school */}
      <SchoolForm onSchoolAdded={fetchSchools} />

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Existing Schools</h2>
        {schools.length === 0 ? (
          <p>No schools available.</p>
        ) : (
          <div className="space-y-4">
            {schools.map((school) => (
              <div key={school.id} className="border p-4 rounded shadow">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="text-xl font-bold">{school.schoolName}</h3>
                    <p className="text-gray-600">Location: {school?.location?.taluka || ""}</p>
                    <p className="text-gray-600">Code: {school.Code}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteSchool(school.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Delete School
                  </button>
                </div>
                {/* Display the logo if present */}
                {school.logoURL && (
                  <img
                    src={school.logoURL}
                    alt={`${school.schoolName} logo`}
                    className="w-24 h-24 object-cover rounded mb-4"
                  />
                )}
                {/* Button to toggle the Add Accountant form */}
                <button
                  onClick={() =>
                    setActiveSchoolId(activeSchoolId === school.id ? null : school.id)
                  }
                  className="bg-blue-600 text-white px-3 py-1 rounded mb-4"
                >
                  {activeSchoolId === school.id ? "Hide Add Accountant" : "Add Accountant"}
                </button>
                {activeSchoolId === school.id && (
                  <AccountantForm
                    schoolId={school.id}
                    schoolCode={school.Code}
                    onAccountantAdded={fetchSchools}
                  />
                )}
                {/* List assigned accountants for this school */}
                <AccountantList schoolCode={school.Code} onAccountantChange={fetchSchools} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSchools;
