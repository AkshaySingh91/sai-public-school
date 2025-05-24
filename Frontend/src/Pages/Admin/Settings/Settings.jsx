import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { User, Loader, School, RefreshCw, AlertCircle } from 'lucide-react';
import Swal from "sweetalert2";
import ProfileSettings from "./ProfileSettings/ProfileSettings";
import SchoolSettings from "./SchoolSettings/SchoolSettings";
import { auth, db, storage } from "../../../config/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs
} from "firebase/firestore";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateProfile
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const Settings = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      if (!currentUser) throw new Error("User not authenticated");
      setLoading(true);

      // Fetch user profile
      const userRef = doc(db, "Users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User profile not found");
      const userData = userSnap.data();
      setProfile(userData);

      // Fetch school data
      if (userData.schoolCode) {
        const schoolsRef = collection(db, "schools");
        const q = query(schoolsRef, where("Code", "==", userData.schoolCode));
        const schoolSnap = await getDocs(q);

        if (!schoolSnap.empty) {
          const docData = schoolSnap.docs[0].data();
          setSchool({ id: schoolSnap.docs[0].id, ...docData });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleProfileUpdate = async (updatedData) => {
    try {
      const userRef = doc(db, "Users", currentUser.uid);
      await updateDoc(userRef, {
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
      setProfile(prev => ({ ...prev, ...updatedData }));
      Swal.fire({ icon: 'success', title: 'Profile updated', timer: 1500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Update failed', text: err.message });
    }
  };

  const handlePasswordChange = async (currentPassword, newPassword) => {
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );

      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      Swal.fire({ icon: 'success', title: 'Password updated', timer: 1500 });
      return true;
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Password change failed', text: err.message });
      return false;
    }
  };

  const handleSchoolUpdate = async (updatedData) => {
    try {
      const schoolRef = doc(db, "schools", school.id);
      await updateDoc(schoolRef, {
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
      setSchool(prev => ({ ...prev, ...updatedData }));
      Swal.fire({ icon: 'success', title: 'School updated', timer: 1500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Update failed', text: err.message });
    }
  };

  const handleImageUpload = async (file) => {
    try {
      setLoading(true);

      // Delete old image if exists
      if (profile?.profileImage) {
        const oldImageRef = ref(storage, profile.profileImage);
        await deleteObject(oldImageRef);
      }

      // Upload new image
      const filePath = `profile-images/${currentUser.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update profile
      const userRef = doc(db, "Users", currentUser.uid);
      await updateDoc(userRef, {
        profileImage: downloadURL,
        updatedAt: new Date().toISOString()
      });

      setProfile(prev => ({ ...prev, profileImage: downloadURL }));
      Swal.fire({ icon: 'success', title: 'Image uploaded', timer: 1500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload failed', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      if (!profile?.profileImage) return;

      const imageRef = ref(storage, profile.profileImage);
      await deleteObject(imageRef);

      const userRef = doc(db, "Users", currentUser.uid);
      await updateDoc(userRef, {
        profileImage: null,
        updatedAt: new Date().toISOString()
      });

      setProfile(prev => ({ ...prev, profileImage: null }));
      Swal.fire({ icon: 'success', title: 'Image removed', timer: 1500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Removal failed', text: err.message });
    }
  };

  if (loading) return <div className="p-6"><Loader className="animate-spin" /></div>;
  if (error) return (
    <div className="p-6 text-red-500">
      <AlertCircle className="inline mr-2" />
      {error}
      <button onClick={fetchData} className="ml-4 text-blue-500">
        <RefreshCw size={16} className="inline" /> Retry
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-2 px-4 ${activeTab === 'profile' ? 'border-b-2 border-blue-500' : ''}`}
        >
          <User size={18} className="inline mr-2" />
          Profile Settings
        </button>
        <button
          onClick={() => setActiveTab("school")}
          className={`pb-2 px-4 ${activeTab === 'school' ? 'border-b-2 border-blue-500' : ''}`}
        >
          <School size={18} className="inline mr-2" />
          School Settings
        </button>
      </div>

      {activeTab === "profile" ? (
        <ProfileSettings
          profile={profile}
          onUpdate={handleProfileUpdate}
          onPasswordChange={handlePasswordChange}
          onImageUpload={handleImageUpload}
          onDeleteImage={handleDeleteImage}
          loading={loading}
        />
      ) : (
        <SchoolSettings
          school={school}
          setSchool={setSchool}
          onUpdate={handleSchoolUpdate} // Add this prop
        />
      )}
    </div>
  );
};

export default Settings
// ProfileSettings Component
// const ProfileSettings = ({ profile, onUpdate, onPasswordChange, onImageUpload, onDeleteImage, loading }) => {
//   const [formData, setFormData] = useState({ name: '', phone: '' });
//   const [passwordData, setPasswordData] = useState({ current: '', new: '' });

//   useEffect(() => {
//     if (profile) {
//       setFormData({
//         name: profile.name || '',
//         phone: profile.phone || ''
//       });
//     }
//   }, [profile]);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     onUpdate(formData);
//   };

//   const handlePasswordSubmit = async (e) => {
//     e.preventDefault();
//     const success = await onPasswordChange(passwordData.current, passwordData.new);
//     if (success) setPasswordData({ current: '', new: '' });
//   };

//   const handleFileChange = async (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       if (!file.type.startsWith('image/')) {
//         Swal.fire({ icon: 'error', title: 'Invalid file type', text: 'Please upload an image file' });
//         return;
//       }
//       await onImageUpload(file);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center gap-6">
//         <div className="relative">
//           <img
//             src={profile?.profileImage || "/default-avatar.png"}
//             className="w-24 h-24 rounded-full object-cover"
//             alt="Profile"
//           />
//           <label className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm cursor-pointer">
//             <input type="file" className="hidden" onChange={handleFileChange} />
//             <RefreshCw size={18} />
//           </label>
//           {profile?.profileImage && (
//             <button
//               onClick={onDeleteImage}
//               className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-sm"
//             >
//               ×
//             </button>
//           )}
//         </div>
//         <div>
//           <h2 className="text-xl font-semibold">{profile?.name}</h2>
//           <p className="text-gray-600">{profile?.email}</p>
//         </div>
//       </div>

//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium mb-1">Full Name</label>
//           <input
//             type="text"
//             value={formData.name}
//             onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//             className="w-full p-2 border rounded"
//             required
//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium mb-1">Phone Number</label>
//           <input
//             type="tel"
//             value={formData.phone}
//             onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <button
//           type="submit"
//           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//           disabled={loading}
//         >
//           {loading ? 'Saving...' : 'Save Changes'}
//         </button>
//       </form>

//       <div className="pt-6">
//         <h3 className="text-lg font-semibold mb-4">Change Password</h3>
//         <form onSubmit={handlePasswordSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium mb-1">Current Password</label>
//             <input
//               type="password"
//               value={passwordData.current}
//               onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">New Password</label>
//             <input
//               type="password"
//               value={passwordData.new}
//               onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
//               className="w-full p-2 border rounded"
//               required
//               minLength="6"
//             />
//           </div>
//           <button
//             type="submit"
//             className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//             disabled={loading}
//           >
//             {loading ? 'Updating...' : 'Change Password'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };
