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
import { useNavigate } from "react-router-dom";
import { useSchool } from "../../../contexts/SchoolContext";
import { FiPlus, FiTrash2, FiUserPlus, FiRefreshCw, FiLogOut, FiHome, FiChevronRight } from "react-icons/fi";
import { FaSchool, FaUserTie } from "react-icons/fa";

const ManageSchools = () => {
  const navigate = useNavigate();
  const { school, switchSchool } = useSchool();
  const [schools, setSchools] = useState([]);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "schools"));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchools(list);
      // Set first school as selected by default
      if (list.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(list[0].id);
      }
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
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true
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
      Swal.fire({
        title: "Deleted!",
        text: "School and associated accountants have been deleted.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error deleting school:", error);
      Swal.fire("Error", "Failed to delete school and associated accountants", "error");
    }
  };
  const handleSwitchSchool = (school) => {
    Swal.fire({
      title: `Switch to ${school.schoolName}?`,
      text: "You'll be redirected to this school's dashboard",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Switch School",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      background: "#f9fafb",
      backdrop: "rgba(0,0,0,0.1)"
    }).then((result) => {
      if (result.isConfirmed) {
        // Use the context function to switch schools
        switchSchool(school);
        setSelectedSchoolId(school.id);
        navigate("/");
        Swal.fire({
          title: "School Changed!",
          text: `You're now viewing ${school.schoolName}`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FaSchool className="mr-3 text-indigo-600" />
            School Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage schools and their accountants
          </p>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchSchools}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSchoolModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg shadow-md transition-all flex items-center"
          >
            <FiPlus className="mr-2" />
            Add School
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">Loading schools...</p>
        </div>
      ) : schools.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <FaSchool className="text-3xl text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Schools Found</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Get started by adding your first school to manage accountants and school details.
          </p>
          <button
            onClick={() => setShowSchoolModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg shadow-md transition-all flex items-center mx-auto"
          >
            <FiPlus className="mr-2" />
            Add First School
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {schools.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl ${s.schoolName} ${school.schoolName} ${s.id} transition-all border-2 ${s.id === school.id
                  ? "border-indigo-500 shadow-indigo-100"
                  : "border-gray-100"
                  }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                        <FaSchool className="text-indigo-600 text-lg" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">{s.schoolName}</h3>
                    </div>
                    <div className="ml-12 mt-2">
                      <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full inline-block">
                        Code: {s.Code}
                      </p>
                      <div className="mt-2 text-sm text-gray-500">
                        <p className="flex items-center">
                          <FiHome className="mr-2 opacity-70" />
                          {s.location?.taluka}, {s.location?.district}
                        </p>
                        <p className="mt-1">
                          Academic Year: <span className="font-medium">{s.academicYear}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSchool(s.id, s.Code)}
                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                    title="Delete School"
                  >
                    <FiTrash2 />
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <FaUserTie className="text-gray-600 mr-2" />
                      <h4 className="font-medium text-gray-700">Accountants</h4>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedSchool(s)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center"
                    >
                      <FiUserPlus className="mr-1" />
                      Add
                    </motion.button>
                  </div>

                  <AccountantList schoolCode={s.Code} />
                </div>

                <div className="mt-6 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSwitchSchool(s)}
                    className={`flex-1 text-center  rounded-lg whitespace-nowrap font-medium px-2 p-1.5 transition-colors ${s.id === school.id
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    {s.id === school.id ? "Current School" : "Switch to this School"}
                  </motion.button>

                  {s.id === school.id && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/")}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-lg flex items-center"
                    >
                      Go to Dashboard
                      <FiChevronRight className="ml-1" />
                    </motion.button>
                  )}
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
    setLoading(true);
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
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      // Delete Firestore document
      await deleteDoc(doc(db, "Users", accountant.id));
      // Delete Authentication user
      await deleteUser(auth, accountant.uid);

      fetchAccountants();
      Swal.fire({
        title: "Deleted!",
        text: "Accountant has been removed.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
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
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4 p-3 bg-gray-100 rounded-lg">
              <div className="rounded-full bg-gray-300 h-10 w-10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : accountants.length === 0 ? (
        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No accountants assigned</p>
        </div>
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
              <div className="flex items-center">
                {/* <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center mr-3">
                  <FaUserTie className="text-indigo-600" />
                </div> */}
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  {acc && acc.avatar && acc.avatar.avatarUrl ? (
                    <img
                      src={acc.avatar.avatarUrl}
                      className="w-full h-full object-cover"
                      alt="Profile"
                    />
                  ) : (
                    <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto my-auto">
                      <FaUserTie className="text-indigo-600" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{acc.name}</p>
                  <p className="text-sm text-gray-600 truncate max-w-[120px]">{acc.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteAccountant(acc)}
                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Remove Accountant"
              >
                <FiTrash2 />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ManageSchools;