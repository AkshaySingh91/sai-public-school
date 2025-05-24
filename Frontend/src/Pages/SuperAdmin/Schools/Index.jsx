// src/Pages/SuperAdmin/Schools/ManageSchools.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch } from "firebase/firestore";
import { db, auth } from "../../../config/firebase";
import { motion, AnimatePresence } from "framer-motion";
import SchoolModal from "./SchoolModal";
import AccountantModal from "./AccountantModal";
import { deleteUser } from "firebase/auth";
import Swal from "sweetalert2";
import TableLoader from "../../../components/TableLoader";

const ManageSchools = () => {
  const [schools, setSchools] = useState([]);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "schools"));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchools(list);
    } catch (error) {
      console.error("Error fetching schools:", error);
      Swal.fire("Error", "Failed to load schools", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleDeleteSchool = async (schoolId, schoolCode) => {
    const result = await Swal.fire({
      title: "Delete School?",
      text: "This will also delete all associated accountants!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete"
    });

    if (!result.isConfirmed) return;

    try {
      // Delete school document
      await deleteDoc(doc(db, "schools", schoolId));

      // Delete associated accountants
      const accountantsQuery = query(
        collection(db, "Users"),
        where("schoolCode", "==", schoolCode),
        where("role", "==", "accountant")
      );

      const batch = writeBatch(db);
      const accountantSnapshot = await getDocs(accountantsQuery);

      accountantSnapshot.forEach(async (doc) => {
        batch.delete(doc.ref);
        try {
          await deleteUser(auth, doc.data().uid);
        } catch (error) {
          console.error("Error deleting auth user:", error);
        }
      });

      await batch.commit();
      fetchSchools();
      Swal.fire("Deleted!", "School and associated accountants have been deleted.", "success");
    } catch (error) {
      console.error("Error deleting school:", error);
      Swal.fire("Error", "Failed to delete school and associated accountants", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">School Management</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSchoolModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow-md transition-colors"
        >
          Add New School
        </motion.button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <TableLoader headers={2} rows={3} />
        </div>
      ) : schools.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No schools found. Add your first school!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {schools.map((school) => (
              <motion.div
                key={school.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{school.schoolName}</h3>
                    <p className="text-sm text-gray-600">Code: {school.Code}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Location: {school.location?.taluka}, {school.location?.district}</p>
                      <p>Academic Year: {school.academicYear}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSchool(school.id, school.Code)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete School
                  </button>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-700">Accountants</h4>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedSchool(school)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Add Accountant
                    </motion.button>
                  </div>

                  <AccountantList schoolCode={school.Code} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      {showSchoolModal &&
        <SchoolModal
          isOpen={showSchoolModal}
          onClose={() => setShowSchoolModal(false)}
          onSchoolAdded={fetchSchools}
        />
      }

      <AccountantModal
        isOpen={!!selectedSchool}
        school={selectedSchool}
        onClose={() => setSelectedSchool(null)}
        onAccountantAdded={fetchSchools}
      />
    </div>
  );
};

const AccountantList = ({ schoolCode }) => {
  const [accountants, setAccountants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAccountants = async () => {
    try {
      const q = query(
        collection(db, "Users"),
        where("schoolCode", "==", schoolCode),
        where("role", "==", "accountant")
      );
      const snapshot = await getDocs(q);
      setAccountants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching accountants:", error);
      Swal.fire("Error", "Failed to load accountants", "error");
    }
    setLoading(false);
  };

  const handleDeleteAccountant = async (accountant) => {
    const result = await Swal.fire({
      title: "Remove Accountant?",
      text: "This will permanently delete their access!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete"
    });

    if (!result.isConfirmed) return;

    try {
      // Delete Firestore document
      await deleteDoc(doc(db, "Users", accountant.id));

      // Delete Authentication user
      await deleteUser(auth, accountant.uid);

      fetchAccountants();
      Swal.fire("Deleted!", "Accountant has been removed.", "success");
    } catch (error) {
      console.error("Error deleting accountant:", error);
      Swal.fire("Error", "Failed to delete accountant", "error");
    }
  };

  useEffect(() => {
    fetchAccountants();
  }, [schoolCode]);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-center py-2">
          <TableLoader headers={3} rows={3} />
        </div>
      ) : accountants.length === 0 ? (
        <p className="text-gray-500 text-sm">No accountants assigned</p>
      ) : (
        <AnimatePresence>
          {accountants.map((acc) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-800">{acc.name}</p>
                <p className="text-sm text-gray-600">{acc.email}</p>
                <p className="text-xs text-gray-500">{acc.phone}</p>
              </div>
              <button
                onClick={() => handleDeleteAccountant(acc)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ManageSchools;