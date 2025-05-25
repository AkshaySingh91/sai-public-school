// Settings.js (Parent Component)
import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { User, School, Upload, Trash2, Loader } from "lucide-react";
import Swal from "sweetalert2";
import ProfileSettings from "./ProfileSettings/ProfileSettings";
import SchoolSettings from "./SchoolSettings/SchoolSettings";
import { AlertCircle, RefreshCw } from "lucide-react";
import { auth } from "../../../config/firebase";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const Settings = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      // Get the authenticated user
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
      const userToken = await user.getIdToken();

      const [profileRes, schoolRes] = await Promise.all([
        fetch(VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/admin/settings/profile` : `${VITE_DOMAIN_PROD}/api/admin/settings/profile`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          }),
        fetch(VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/admin/settings/school` : `${VITE_DOMAIN_PROD}/api/admin/settings/school`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }),
      ]);
      if (!profileRes.ok || !schoolRes.ok) {
        const errorText = await profileRes
          .text()
          .catch(() => "Failed to fetch profile");
        throw new Error(errorText || "Failed to fetch data");
      }

      const [profileData, schoolData] = await Promise.all([
        profileRes.json(),
        schoolRes.json(),
      ]);
      console.log(profileData)
      setProfile(profileData);
      setSchool(schoolData);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleProfileUpdate = async (profileData, imageFile) => {
    try {
      setLoading(true);
      let imageUrl = profileData.profileUrl;

      // 1. Upload image if new file is selected
      if (imageFile) {
        const userToken = await auth.currentUser.getIdToken();
        const formData = new FormData();
        formData.append('profileImage', imageFile);

        const uploadResponse = await fetch(
          VITE_NODE_ENV === "Development"
            ? `http://localhost:${VITE_PORT}/api/admin/settings/upload-profile`
            : `${VITE_DOMAIN_PROD}/api/admin/settings/upload-profile`,
          {
            method: 'POST',
            body: formData,
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          }
        );

        if (!uploadResponse.ok) throw new Error('Image upload failed');
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.imageUrl;
      }

      // 2. Update profile data with new image URL
      const updateResponse = await fetch(
        VITE_NODE_ENV === "Development"
          ? `http://localhost:${VITE_PORT}/api/admin/settings/profile`
          : `${VITE_DOMAIN_PROD}/api/admin/settings/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
          },
          body: JSON.stringify({
            ...profileData,
            profileUrl: imageUrl
          }),
        }
      );

      if (!updateResponse.ok) throw new Error('Profile update failed');

      Swal.fire('Success!', 'Profile updated successfully', 'success');
      return true;
    } catch (err) {
      Swal.fire('Error!', err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      setLoading(true);

      const userToken = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append("profileImage", file); // Key must match server field name

      let response = await fetch(
        VITE_NODE_ENV === "Development"
          ? `http://localhost:${VITE_PORT}/api/admin/settings/upload-profile`
          : `${VITE_DOMAIN_PROD}/api/admin/settings/upload-profile`,
        {
          method: "POST",
          body: formData,  
          headers: {
            Authorization: `Bearer ${userToken}`, 
          },
        }
      );

      response = await response.json();
      console.log("response", response);

      // Update profile with new image URL
      setProfile((prev) => ({
        ...prev,
        profileImage: response.imageUrl,
      }));
    } catch (err) {
      setError(err.message || "Failed to upload image");
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: err.message || "Something went wrong during upload",
      });
    } finally {
      setLoading(false);
    }
  };




  if (loading) return <SkeletonLoader type="settings" />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <TabButton
          active={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          icon={<User size={18} />}
          label="Profile Settings"
        />
        <TabButton
          active={activeTab === "school"}
          onClick={() => setActiveTab("school")}
          icon={<School size={18} />}
          label="School Settings"
        />
      </div>

      {activeTab === "profile" ? (
        <ProfileSettings
          profile={profile}
          setProfile={setProfile}
          handleProfileUpdate={handleProfileUpdate}
          onImageUpload={handleImageUpload}
          loading={loading}
        />
      ) : (
        <SchoolSettings
          school={school}
          setSchool={setSchool}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 flex items-center gap-2 transition-colors ${active
      ? "border-b-2 border-purple-600 text-purple-600"
      : "text-gray-500 hover:text-purple-500"
      }`}
  >
    {icon} {label}
  </button>
);

// SkeletonLoader.jsx
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
const ErrorDisplay = ({ message, onRetry }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 rounded-xl p-6 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-600" />
          <h3 className="text-lg font-medium text-red-800">
            Something went wrong
          </h3>
          <p className="text-red-700 text-sm">{message}</p>

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default Settings;
