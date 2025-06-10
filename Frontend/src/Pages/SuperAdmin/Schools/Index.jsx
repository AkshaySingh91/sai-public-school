// src/Pages/SuperAdmin/Schools/MangeInsitute.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch } from "firebase/firestore";
import { db, auth } from "../../../config/firebase";
import { motion, AnimatePresence } from "framer-motion";
import SchoolModal from "./SchoolModal";
import UserModal from "./UserModal";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { useInstitution } from "../../../contexts/InstitutionContext";
import { FiPlus, FiTrash2, FiUserPlus, FiRefreshCw, FiHome, FiChevronRight, FiUser } from "react-icons/fi";
import { FaSchool, FaUniversity, FaUserTie } from "react-icons/fa";
import CollegeModal from "./CollegeModal";
import { User, X } from "lucide-react";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const MangeInsitute = () => {
  const navigate = useNavigate();
  const { school, switchSchool } = useInstitution();
  const user = auth.currentUser;

  const [institutionsList, setInstitutionsList] = useState([]); // just schools+colleges 
  const [loading, setLoading] = useState(false);

  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [showCollegeModal, setShowCollegeModal] = useState(false);

  const fetchAllInstitutions = async () => {
    setLoading(true);
    try {
      const schoolsSnap = await getDocs(collection(db, "schools"));
      const collegesSnap = await getDocs(collection(db, "colleges"));

      const combined = [
        ...schoolsSnap.docs.map((d) => ({ id: d.id, type: "school", ...d.data() })),
        ...collegesSnap.docs.map((d) => ({ id: d.id, type: "college", ...d.data() })),
      ];

      setInstitutionsList(combined);

    } catch (error) {
      console.error("Error fetching schools:", error);
      Swal.fire("Error", "Failed to load schools", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllInstitutions();
  }, []);

  const handleDeleteInstitution = async (inst) => {
    if (!user) {
      Swal.fire("Error", "You must be logged in", "error");
      return;
    }
    const result = await Swal.fire({
      title: `Delete ${inst.type}?`,
      text: "This will also delete all associated accountants!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    const userToken = await user.getIdToken();
    try {
      const isSchool = inst.type === "school";

      const collectionName = isSchool ? "schools" : "colleges";
      const url = VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/superadmin/${collectionName}/${inst.id}` : `${VITE_DOMAIN_PROD}/api/superadmin/${collectionName}/${inst.id}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete institution");
      }
      await fetchAllInstitutions();
      // If this was the current institution, clear it and pick a new default
      if (school?.id === inst.id) {
        localStorage.removeItem("selectedInstitution");
        const newDefault = institutionsList.find((i) => i.id !== inst.id) || null;
        if (newDefault) {
          switchSchool({
            id: newDefault.id,
            type: newDefault.type,
            name:
              newDefault.type === "school"
                ? newDefault.schoolName
                : newDefault.collegeName,
            code: newDefault.Code,
            ...newDefault,
          });
        } else {
          switchSchool(null);
        }
      }
      Swal.fire({
        title: "Deleted!",
        text: `${isSchool ? "School" : "College"} and associated users deleted.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error deleting institution:", error);
      Swal.fire("Error", error.message || "Failed to delete institution", "error");
    }
  };

  const handleSwitchInstitution = (inst) => {
    Swal.fire({
      title: `Switch to ${inst.type === "school" ? inst.schoolName : inst.collegeName}, ${inst.location?.taluka}?`,
      text: `You'll be redirected to this ${inst.type}'s dashboard`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Switch ${inst.type}`,
      cancelButtonText: "Cancel",
      reverseButtons: true,
      background: "#f9fafb",
      backdrop: "rgba(0,0,0,0.1)"
    }).then((result) => {
      if (result.isConfirmed) {
        // Use the context function to switch schools
        switchSchool(inst);
        navigate(inst.type === "school" ? "/school" : "/college", { replace: true });
        Swal.fire({
          title: `${inst.type === "school" ? inst.schoolName : inst.collegeName} Selected!`,
          text: `You're now viewing this ${inst.type}.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FaUniversity className="mr-3 text-indigo-600" />
            Institution Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage schools, colleges, and their users
          </p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchAllInstitutions}
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

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCollegeModal(true)}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-2 rounded-lg shadow-md transition-all flex items-center"
          >
            <FiPlus className="mr-2" />
            Add College
          </motion.button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">Loading institutions...</p>
        </div>
      )}

      {/* SCHOOLS SECTION */}
      {!loading && (
        <>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Schools</h2>
          {institutionsList.filter((i) => i.type === "school").length === 0 ? (
            <div className="text-center py-12 bg-indigo-50 rounded-lg border border-indigo-100 mb-8">
              <p className="text-gray-600">No schools found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <AnimatePresence>
                {institutionsList
                  .filter((i) => i.type === "school")
                  .map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border-2 ${school?.id === s.id
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
                            <h3 className="text-xl font-bold text-gray-800 capitalize">
                              {s.schoolName}
                            </h3>
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
                                Academic Year:{" "}
                                <span className="font-medium">
                                  {s.academicYear}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteInstitution(s)}
                          className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete School"
                        >
                          <FiTrash2 />
                        </button>
                      </div>

                      <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedInstitute(s)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center"
                        >
                          <FiUserPlus className="mr-1" />
                          Add User
                        </motion.button>
                        <UserList collectionName="schools" instId={s.id} />
                      </div>

                      <div className="mt-6 flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSwitchInstitution(s)}
                          className={`flex-1 text-center rounded-lg whitespace-nowrap font-medium px-2 py-1.5 transition-colors ${school?.id === s.id
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          {school?.id === s.id
                            ? "Current School"
                            : "Switch to this School"}
                        </motion.button>

                        {school?.id === s.id && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate("/school")}
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

          {/* COLLEGES SECTION */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Colleges</h2>
          {institutionsList.filter((i) => i.type === "college").length === 0 ? (
            <div className="text-xl font-bold text-center py-12 bg-blue-50 rounded-lg border border-green-100 mb-8">
              <p className="text-gray-600">No colleges found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <AnimatePresence>
                {institutionsList
                  .filter((i) => i.type === "college")
                  .map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border-2 ${school?.id === c.id
                        ? "border-indigo-500 shadow-indigo-100"
                        : "border-gray-100"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <FaUniversity className="text-green-600 text-lg" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 capitalize">
                              {c.collegeName}
                            </h3>
                          </div>
                          <div className="ml-12 mt-2">
                            <p className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full inline-block">
                              Code: {c.Code}
                            </p>
                            <div className="mt-2 text-sm text-gray-500">
                              <p className="flex items-center">
                                <FiHome className="mr-2 opacity-70" />
                                {c.location?.taluka}, {c.location?.district}
                              </p>
                              <p className="mt-1">
                                Academic Year:{" "}
                                <span className="font-medium">
                                  {c.academicYear}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteInstitution(c)}
                          className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete College"
                        >
                          <FiTrash2 />
                        </button>
                      </div>

                      <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedInstitute(c)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center"
                        >
                          <FiUserPlus className="mr-1" />
                          Add User
                        </motion.button>
                        <UserList collectionName="colleges" instId={c.id} />
                      </div>

                      <div className="mt-6 flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSwitchInstitution(c)}
                          className={`flex-1 text-center rounded-lg whitespace-nowrap font-medium px-2 py-1.5 transition-colors ${school?.id === c.id
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          {school?.id === c.id
                            ? "Current College"
                            : "Switch to this College"}
                        </motion.button>

                        {school?.id === c.id && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate("/college")}
                            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-lg flex items-center"
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
        </>
      )}

      {/* Modals */}
      {showSchoolModal && (
        <SchoolModal
          isOpen={showSchoolModal}
          onClose={() => setShowSchoolModal(false)}
          onSchoolAdded={fetchAllInstitutions}
        />
      )}
      {showCollegeModal && (
        <CollegeModal
          isOpen={showCollegeModal}
          onClose={() => setShowCollegeModal(false)}
          onCollegeAdded={fetchAllInstitutions}
        />
      )}
      {selectedInstitute && (
        <UserModal
          isOpen={!!selectedInstitute}
          institute={selectedInstitute}
          onClose={() => setSelectedInstitute(null)}
          onUserAdded={fetchAllInstitutions}
        />
      )}
    </div>
  );
}

const UserList = ({ collectionName, instId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (collectionName !== "schools" && collectionName !== "colleges") {
        throw new Error("Invalid collection");
      }
      const instType = collectionName === "schools" ? "school" : "college";
      const q = query(
        collection(db, "Users"),
        where("institutionId", "==", instId),
        where("institutionType", "==", instType)
      );

      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching users:", error);
      Swal.fire("Error", "Failed to load users", "error");
    }
    setLoading(false);
  };

  const handleDeleteUser = async (u) => {
    const result = await Swal.fire({
      title: "Remove User?",
      html: `<p class="py-2">This will permanently remove <b>${u.name}</b>'s access!</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete User",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'px-4 py-2 rounded-lg',
        cancelButton: 'px-4 py-2 rounded-lg'
      }
    });

    if (!result.isConfirmed) return;

    const userToken = await user.getIdToken();
    try {
      const url =
        import.meta.env.VITE_NODE_ENV === "Development"
          ? `http://localhost:${import.meta.env.VITE_PORT}/api/superadmin/user/${instId}/${u.id}`
          : `${import.meta.env.VITE_DOMAIN_PROD}/api/superadmin/user/${instId}/${u.id}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      await fetchUsers();

      Swal.fire({
        title: "Deleted!",
        text: `${u.name} has been removed.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-xl'
        }
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      Swal.fire("Error", error.message || "Failed to delete user", "error");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [collectionName, instId]);

  const openProfilePhotoModal = (user) => {
    setSelectedUser(user);
    document.body.style.overflow = "hidden";
  };

  const closeProfilePhotoModal = () => {
    setSelectedUser(null);
    document.body.style.overflow = "unset";
  };

  return (
    <div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                  </div>
                </div>
                <div className="rounded-full bg-gray-200 h-8 w-8"></div>
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="mx-auto bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-3">
            <FiUser className="text-gray-500 text-2xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-800">No users found</h3>
          <p className="text-gray-500 mt-1">Add new users to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <AnimatePresence>
            {users.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div
                      onClick={() => openProfilePhotoModal(u)}
                      className="cursor-pointer"
                    >
                      {u.profileImage ? (
                        <img
                          src={u.profileImage}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                          alt="Profile"
                        />
                      ) : (
                        <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center">
                          <FiUser className="text-indigo-600 text-xl" />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="Remove User"
                    >
                      <FiTrash2 className="text-lg" />
                    </button>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-semibold text-gray-800 capitalize truncate">{u.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize whitespace-nowrap">
                        {u.role}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap">
                        {u?.privilege?.toLowerCase() === "read" ? "Read Only" : "Read & Write"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Profile Photo Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={closeProfilePhotoModal}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative z-10 max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">
                  {selectedUser.name}'s Profile
                </h3>
                <button
                  onClick={closeProfilePhotoModal}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center">
                <div className="relative">
                  {selectedUser.profileImage ? (
                    <img
                      src={selectedUser.profileImage}
                      className="w-64 h-64 rounded-full object-cover border-4 border-white shadow-xl"
                      alt="Profile"
                    />
                  ) : (
                    <div className="w-64 h-64 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-white shadow-xl">
                      <FiUser className="text-indigo-600 text-6xl" />
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <h2 className="text-xl font-bold text-gray-800 capitalize">
                    {selectedUser.name}
                  </h2>
                  <p className="text-gray-600 mt-1">{selectedUser.email}</p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                      {selectedUser.role}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {selectedUser?.privilege?.toLowerCase() === "read"
                        ? "Read Only"
                        : "Read & Write"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default MangeInsitute;