import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../../../config/firebase";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useAuth } from "../../../contexts/AuthContext";
import { User, Camera, X, Trash2 } from 'lucide-react';
import { useInstitution } from "../../../contexts/InstitutionContext";
import { AnimatePresence, motion } from "framer-motion";
import { FiUser } from "react-icons/fi";

const MySwal = withReactContent(Swal);
const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const EmployeeDetail = () => {
  const { uid } = useParams(); //employee uid
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    email: "",
    contact: "",
    address: "",
    designation: "",
    type: "",
    department: "",
    doj: "",
    class: "",
    div: "",
    addharCardNo: "",
    webAccess: "",
    active: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const { school } = useInstitution();

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

  const fetchEmployee = async () => {
    try {
      const docRef = doc(db, "Employees", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEmployee({ uid, ...data });
        setIsCustomDesignation(designationOptions.find(d => d.toLowerCase() === data?.designation?.toLowerCase()) ? false : true);
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
        title: "Confirm Update",
        text: "Are you sure you want to update this employee?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#7c3aed",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, update it!",
      });

      if (result.isConfirmed) {
        const docRef = doc(db, "Employees", uid);
        await updateDoc(docRef, employee);
        await MySwal.fire({
          icon: "success",
          title: "Updated!",
          text: "Employee details updated successfully",
          confirmButtonColor: "#7c3aed",
        });
        navigate("/school/employee")
        fetchEmployee();

      }
    } catch (err) {
      MySwal.fire({
        icon: "error",
        title: "Error",
        text: `Error updating employee: ${err.message}`,
        confirmButtonColor: "#7c3aed",
      });
    }
  };

  const handleDelete = async () => {
    const result = await MySwal.fire({
      title: "Delete Employee",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "Employees", uid));
        await MySwal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Employee has been deleted",
          confirmButtonColor: "#7c3aed",
        });
        navigate("/school/employee");
      } catch (err) {
        MySwal.fire({
          icon: "error",
          title: "Error",
          text: `Error deleting employee: ${err.message}`,
          confirmButtonColor: "#7c3aed",
        });
      }
    }
  };

  const handleChange = (field, value) => {
    setEmployee((prev) => ({ ...prev, [field]: value }));
  };
  // avatar upload section
  // file upload
  const validateFile = (file) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Only JPG, PNG, and WEBP images are allowed');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }
  };
  const handleAvatarUpload = async (file) => {
    if (!file) return;
    let uploadBarModal;
    try {
      setLocalLoading(true);
      // 1. Show a spinner while we request the signed URL
      uploadBarModal = Swal.fire({
        title: 'Preparing upload…',
        html: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      const userToken = await currentUser.getIdToken();
      validateFile(file);

      const oldKey = employee.profileImagePath || null;
      const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
        ? `http://localhost:${VITE_PORT}/api/school/employee/avatar/upload-url/${uid}/${school.id}?fileType=${file.type}&fileName=${file.name}`
        : `${VITE_DOMAIN_PROD}/api/school/employee/avatar/upload-url/${uid}/${school.id}?fileType=${file.type}&fileName=${file.name}`;

      const urlResponse = await fetch(uploadUrlEndpoint, {
        headers: { Authorization: 'Bearer ' + userToken }
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { signedUrl, key: newKey } = await urlResponse.json();

      // 2. Close the spinner modal and open the progress‐bar modal
      Swal.close();
      Swal.fire({
        title: 'Uploading…',
        html: `
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div id="upload-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
          </div>
          <div class="mt-2 text-sm">
            <span id="uploaded-size">0KB</span> / 
            <span id="total-size">${(file.size / 1024).toFixed(1)}KB</span>
          </div>
          <div class="mt-1" id="upload-percent">0% Complete</div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false
      });

      // 3. Perform the actual PUT upload with progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          document.getElementById('upload-bar').style.width = `${percent}%`;
          document.getElementById('upload-percent').innerText = `${percent}% Complete`;
          document.getElementById('uploaded-size').innerText = `${(event.loaded / 1024).toFixed(1)}KB`;
        };

        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });

      // 4. Update Firestore & cleanup
      const updateEndpoint = VITE_NODE_ENV === "Development"
        ? `http://localhost:${VITE_PORT}/api/school/employee/avatar/update/${uid}`
        : `${VITE_DOMAIN_PROD}/api/school/employee/avatar/update/${uid}`;
      const response = await fetch(updateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + userToken
        },
        body: JSON.stringify({ newKey, oldKey })
      });
      if (!response.ok) throw new Error('Failed to update profile');

      const { profileImage, profileImagePath, updatedAt } = await response.json();
      setEmployee(prev => ({ ...prev, profileImage, profileImagePath, updatedAt }));

      Swal.fire({
        icon: 'success',
        title: 'Upload Successful!',
        timer: 1500,
        showConfirmButton: false
      });
    }
    catch (err) {
      console.error('Upload Error:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message
      });
    }
    finally {
      setLocalLoading(false);
    }
  };
  const handleDeleteAvatar = async () => {
    const res = await Swal.fire({
      title: "Are you sure?",
      text: "You want to delete avatar ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete!",
      cancelButtonText: "Cancel",
    })
    if (!res.isConfirmed) return;
    try {
      setLocalLoading(true);
      const userToken = await currentUser.getIdToken();
      const key = employee?.profileImagePath || null;
      const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
        ? `http://localhost:${VITE_PORT}/api/school/employee/avatar/${uid}`
        : `${VITE_DOMAIN_PROD}/api/school/employee/avatar/${uid}`;

      const urlResponse = await fetch(uploadUrlEndpoint, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + userToken
        },
        body: JSON.stringify({ key })
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }
      setEmployee(prev => ({
        ...prev,
        profileImagePath: null,
        profileImage: null
      }))
    } catch (err) {
      console.error('Upload Error:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message
      });
    } finally {
      setLocalLoading(false);
    }
  }
  if (loading) return <SkeletonLoader type="settings" />;
  if (error) return <p className="text-red-500 text-center py-12">{error}</p>;


  const openProfilePhotoModal = () => {
    setIsProfileModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeProfilePhotoModal = () => {
    setIsProfileModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-25 via-white to-purple-25 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Profile Card - Now with better organization and visual hierarchy */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent z-0"></div>
                <div className="relative z-10 flex items-center gap-4">

                  <div className="relative group">
                    <div
                      className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:border-white/40 hover:shadow-xl hover:scale-105"
                      onClick={openProfilePhotoModal}
                    >
                      {employee.profileImage && employee.profileImagePath ? (
                        <img
                          src={employee.profileImage}
                          className="w-full h-full object-cover"
                          alt="Profile"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/20 flex items-center justify-center">
                          <User size={32} className="text-white" />
                        </div>
                      )}
                    </div>
                    {
                      userData.privilege?.toLowerCase() === "both" &&
                      <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                        <label className="cursor-pointer text-purple-600 hover:text-purple-700">
                          <Camera size={16} />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleAvatarUpload(e.target.files[0])}
                            accept="image/*"
                            disabled={localLoading}
                          />
                        </label>
                      </div>
                    }
                    {
                      userData.privilege?.toLowerCase() === "both" && employee.profileImage && employee.profileImagePath ? (
                        <div className="absolute -bottom-2 -left-2 bg-white rounded-full p-2 shadow-lg" >
                          <label className=" text-purple-600 hover:text-purple-700 ">
                            <button
                              className="bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center cursor-pointer gap-2"
                              onClick={handleDeleteAvatar}
                              disabled={localLoading}
                            >
                              <Trash2 size={16} />
                            </button>
                          </label>
                        </div>
                      ) : null
                    }
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h2>
                    <p className="opacity-90 text-sm">{employee.designation}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${employee.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        {employee.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-violet-100 p-2 rounded-lg text-violet-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium">{employee.department || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-medium">{employee.type || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">School Code</p>
                    <p className="font-medium">{employee.schoolCode || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="font-medium">{employee.doj ? new Date(employee.doj).toLocaleDateString() : 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5 border-t border-gray-100">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${employee.webAccess ? 'bg-green-500' : 'bg-gray-400'} text-white`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Web Access</p>
                      <p className={`font-semibold ${employee.webAccess ? 'text-green-600' : 'text-gray-500'}`}>
                        {employee.webAccess ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-violet-500 text-white rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Experience</p>
                      <p className="font-semibold text-violet-600">
                        {employee.doj ? Math.floor((new Date() - new Date(employee.doj)) / (365.25 * 24 * 60 * 60 * 1000)) : 0} years
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section - Improved with better tabs and form layout */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              {/* Improved Tabs */}
              <div className="border-b border-gray-100">
                <div className="flex overflow-x-auto no-scrollbar">
                  <button
                    className={`px-6 py-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'personal' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('personal')}
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Personal Info
                    </div>
                  </button>
                  <button
                    className={`px-6 py-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'contact' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('contact')}
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Contact
                    </div>
                  </button>
                  <button
                    className={`px-6 py-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'employment' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('employment')}
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                      </svg>
                      Employment
                    </div>
                  </button>
                  <button
                    className={`px-6 py-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'additional' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('additional')}
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Additional
                    </div>
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                {activeTab === 'personal' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="text"
                          value={employee.firstName}
                          onChange={(e) => handleChange('firstName', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-0"
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="text"
                          value={employee.lastName}
                          onChange={(e) => handleChange('lastName', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-0"
                          placeholder="Enter last name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="text"
                          value={employee.middleName || ""}
                          onChange={(e) => handleChange('middleName', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Enter middle name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="date"
                          value={employee.dob || ""}
                          onChange={(e) => handleChange('dob', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          value={employee.gender}
                          onChange={(e) => handleChange('gender', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-white"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                        <select
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          value={employee.maritalStatus}
                          onChange={(e) => handleChange('maritalStatus', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-white"
                        >
                          <option value="">Select Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="email"
                          value={employee.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="tel"
                          value={employee.contact}
                          onChange={(e) => handleChange('contact', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Enter contact number"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          value={employee.address}
                          onChange={(e) => handleChange('address', e.target.value)}
                          placeholder="Enter full address"
                          rows="3"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'employment' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                      </svg>
                      Employment Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation <span className="text-red-500">*</span></label>
                        <div className="flex flex-col gap-2">
                          <select
                            disabled={userData.privilege?.toLowerCase() === "read"}
                            value={isCustomDesignation ? 'Other' : employee.designation}
                            onChange={(e) => {
                              if (e.target.value === 'Other') {
                                setIsCustomDesignation(true);
                                handleChange('designation', '');
                              } else {
                                setIsCustomDesignation(false);
                                handleChange('designation', e.target.value);
                              }
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-white"
                          >
                            <option value="">Select Designation</option>
                            {designationOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {isCustomDesignation && (
                            <input
                              disabled={userData.privilege?.toLowerCase() === "read"}
                              value={employee.designation}
                              onChange={(e) => handleChange('designation', e.target.value)}
                              placeholder="Enter custom designation"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type <span className="text-red-500">*</span></label>
                        <select
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          value={employee.type}
                          onChange={(e) => handleChange('type', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-white"
                        >
                          <option value="">Select Type</option>
                          <option value="Teaching">Teaching</option>
                          <option value="Non-Teaching">Non-Teaching</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="text"
                          value={employee.department}
                          onChange={(e) => handleChange('department', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all "
                          placeholder="Enter department"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="date"
                          value={employee.doj}
                          onChange={(e) => handleChange('doj', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="text"
                          value={employee.class}
                          onChange={(e) => handleChange('class', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Enter class"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="text"
                          value={employee.div}
                          onChange={(e) => handleChange('div', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          placeholder="Enter division"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'additional' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Additional Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                        <input
                          disabled={userData.privilege?.toLowerCase() === "read"}
                          type="text"
                          value={employee.addharCardNo}
                          onChange={(e) => handleChange('addharCardNo', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-0"
                          placeholder="Enter Aadhar number"
                        />
                      </div>
                      <div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Web Access</label>
                            <div
                              onClick={() => handleChange('webAccess', !employee.webAccess)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${employee.webAccess ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${employee.webAccess ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Active Status</label>
                            <div
                              onClick={() => handleChange('active', !employee.active)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${employee.active ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${employee.active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              {
                userData.privilege?.toLowerCase() === "both" &&
                <div className="border-t border-gray-100 p-6 flex justify-end gap-3">
                  <button
                    onClick={handleDelete}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    Delete
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors shadow-md">
                    Save Changes
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
        <AnimatePresence>
          {isProfileModalOpen && (
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
                <div className="p-5 border-b border-gray-100 flex justify-between items-center capitalize">
                  <h3 className="font-semibold text-gray-800">
                    {employee.firstName || ""}'s Profile
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
                    {employee.profileImage ? (
                      <img
                        src={employee.profileImage}
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
                    <h2 employee="text-xl font-bold text-gray-800 capitalize">
                      {employee.firstName || ""}
                    </h2>
                    <p className="text-gray-600 mt-1">{employee.email || ""}</p>
                    <p className="text-gray-600 mt-1">{employee.contact || ""}</p>

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                        {employee.type || ""}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 capitalize">
                        {employee?.designation || ""}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};


export default EmployeeDetail;
const SkeletonLoader = ({ type = "default" }) => {
  const skeletonSettings = {
    settings: (
      <div className="max-w-4xl mx-auto p-6 animate-pulse">
        {/* Tabs Skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Section */}
            <div className="w-full md:w-1/3">
              <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto"></div>
              <div className="flex gap-2 justify-center mt-4">
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
              </div>
            </div>

            {/* Form Section */}
            <div className="flex-1 space-y-4">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 w-1/4 rounded"></div>
                <div className="h-10 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 w-1/4 rounded"></div>
                <div className="h-10 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-10 bg-purple-200 w-32 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    ),
    default: (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    ),
  };

  return skeletonSettings[type] || skeletonSettings.default;
};