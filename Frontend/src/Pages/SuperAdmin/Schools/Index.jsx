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
import { FiPlus, FiTrash2, FiUserPlus, FiRefreshCw, FiHome, FiChevronRight } from "react-icons/fi";
import { FaSchool, FaUserTie } from "react-icons/fa";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const MangeInsitute = () => {
  const navigate = useNavigate();
  const { school, switchSchool } = useInstitution();
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;
  const [institutionsList, setInstitutionsList] = useState([]); // just schools+colleges 
  // pre hard coded roles for school & college
  const [roles, setRoles] = useState(["Accountants", "Head-Master", "Teacher"])

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
    console.log(inst)
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
      const url = VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/superadmin/settings/${collectionName}/${inst.id}` : `${VITE_DOMAIN_PROD}/api/superadmin/settings/${collectionName}/${inst.id}`;

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

  const handleSwitchSchool = (inst) => {
    Swal.fire({
      title: `Switch to ${inst.type === "school" ? inst.schoolName : inst.collegeName}, ${inst.location?.taluka}?`,
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
        switchSchool(inst);
        navigate("/school");
        Swal.fire({
          title: "School Changed!",
          text: `You're now viewing ${inst.schoolName}`,
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
            Institute Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage Institutions and their accountants
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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">Loading schools...</p>
        </div>
      ) : institutionsList.filter(i => (i.type?.toLowerCase() === "school")).length === 0 ? (
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
      ) : (<>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {institutionsList.filter((i) => (i.type?.toLowerCase() === "school")).map((s) => (
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
                    onClick={() => handleDeleteInstitution(s)}
                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                    title="Delete School"
                  >
                    <FiTrash2 />
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedSchool(s)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center"
                  >
                    <FiUserPlus className="mr-1" />
                    Add
                  </motion.button>
                  <UserList collection={"schools"} id={s.id} />
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
      </>)}
      {/* {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">Loading schools...</p>
        </div>
      ) : institutionsList.filter(i => (i.type?.toLowerCase() === "college")).length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <FaSchool className="text-3xl text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No college Found</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Get started by adding your first school to manage accountants and college details.
          </p>
          <button
            onClick={() => setShowSchoolModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg shadow-md transition-all flex items-center mx-auto"
          >
            <FiPlus className="mr-2" />
            Add First college
          </button>
        </div>
      ) : (<>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {institutionsList.filter((i) => (i.type?.toLowerCase() === "college")).map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl ${c.collegeName} ${school.schoolName} ${c.id} transition-all border-2 ${c.id === school.id
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
                      <h3 className="text-xl font-bold text-gray-800">{c.collegeName}</h3>
                    </div>
                    <div className="ml-12 mt-2">
                      <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full inline-block">
                        Code: {s.Code}
                      </p>
                      <div className="mt-2 text-sm text-gray-500">
                        <p className="flex items-center">
                          <FiHome className="mr-2 opacity-70" />
                          {c.location?.taluka}, {c.location?.district}
                        </p>
                        <p className="mt-1">
                          Academic Year: <span className="font-medium">{c.academicYear}</span>
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

                  <UserList schoolCode={c.Code} />
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
                    {c.id === school.id ? "Current School" : "Switch to this School"}
                  </motion.button>

                  {c.id === school.id && (
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
      </>)} */}

      {/* Modals */}
      {showSchoolModal &&
        <SchoolModal
          isOpen={showSchoolModal}
          onClose={() => setShowSchoolModal(false)}
          onSchoolAdded={fetchAllInstitutions}
        />
      }

      <UserModal
        isOpen={!!selectedSchool}
        school={selectedSchool}
        onClose={() => setSelectedSchool(null)}
        onUserAdded={fetchAllInstitutions}
      />
    </div>
  );
};

const UserList = ({ collection, id }) => {
  console.log(collection, id)
  const [Users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!user) {
    throw new Error("User not authenticated");
  }
  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (collection != "schools" || collection != "colleges") {
        throw new Error("Invalid collection");
      }
      const q = query(
        collection(db, "Users"),
        where("institutionId", "==", id),
        where("institutionType", "==", collection === "schools" ? "school" : "college")
      );
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      console.log(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (error) {
      console.error("Error fetching users:", error);
      Swal.fire("Error", "Failed to load users", "error");
    }
    setLoading(false);
  };

  const handleDeleteUser = async (u, institutionId) => {
    const result = await Swal.fire({
      title: "Remove User?",
      text: "This will permanently delete their access!",
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
      // 1) Call our backend endpoint:
      const url = VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/superadmin/settings/user/${institutionId}/${u.id}` : `${VITE_DOMAIN_PROD}/api/superadmin/settings/${institutionId}/${u.id}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ uid: u.id, institutionId }),
      }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      // 2) Refresh the list in the UI
      await fetchUsers();

      Swal.fire({
        title: "Deleted!",
        text: "User has been removed.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error deleting accountant:", error);
      Swal.fire("Error", error.message || "Failed to delete accountant", "error");
    }
  };


  useEffect(() => {
    fetchUsers();
  }, [collection, id]);

  const openProfilePhotoModal = () => {
    setIsProfileModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeProfilePhotoModal = () => {
    setIsProfileModalOpen(false);
    document.body.style.overflow = 'unset';
  };
  return (<>
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
      ) : Users.length === 0 ? (
        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No User assigned</p>
        </div>
      ) : (<>

        <AnimatePresence>
          {Users.map((u) => (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <FaUserTie className="text-gray-600 mr-2" />
                  <h4 className="font-medium text-gray-700 capitalize">{u.role || "Invalid Role"}</h4>
                </div>
              </div>
              <motion.div
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden cursor-pointer">
                    {u && u.profileImage ? (
                      <img
                        onClick={openProfilePhotoModal}
                        src={u.profileImage}
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
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-sm text-gray-600 truncate max-w-[120px]">{u.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteUser(u, u.institutionId)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors cursor-pointer bg-red-100 "
                  title="Remove Accountant"
                >
                  <FiTrash2 />
                </button>
              </motion.div>
            </>
          ))}
        </AnimatePresence>
      </>)}

    </div>
  </>);
};

export default MangeInsitute;