import { Camera, Trash2, User, X } from "lucide-react";
import { useState } from "react"
import { useAuth } from "../../../../contexts/AuthContext";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useInstitution } from "../../../../contexts/InstitutionContext";
import { FiUser } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion"

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

function StudentProfilePhoto({ formData, setFormData }) {
    const [localLoading, setLocalLoading] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const { school } = useInstitution();
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const { studentId } = useParams();
    const { currentUser } = useAuth();
    const { userData } = useAuth();

    const validateFile = (file) => {
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

            const oldKey = formData?.profileImagePath || null;
            const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/school/student/avatar/upload-url/${studentId}/${school.id}?fileType=${file.type}&fileName=${file.name}`
                : `${VITE_DOMAIN_PROD}/api/school/student/avatar/upload-url/${studentId}/${school.id}?fileType=${file.type}&fileName=${file.name}`;

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
                ? `http://localhost:${VITE_PORT}/api/school/student/avatar/update/${studentId}`
                : `${VITE_DOMAIN_PROD}/api/school/student/avatar/update/${studentId}`;
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
            setFormData(prev => ({ ...prev, profileImage, profileImagePath, updatedAt }));

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
            const key = formData?.profileImagePath || null;
            const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/school/student/avatar/${studentId}`
                : `${VITE_DOMAIN_PROD}/api/school/student/avatar/${studentId}`;

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
            setFormData(prev => ({
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
    const openProfilePhotoModal = () => {
        setIsProfileModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeProfilePhotoModal = () => {
        setIsProfileModalOpen(false);
        document.body.style.overflow = 'unset';
    };
    return (
        <>
            <div className="relative group w-fit mx-auto mb-4">
                <div
                    className="w-20 h-20 rounded-full overflow-hidden  border-white/20  cursor-pointer transition-all duration-300  hover:scale-105 mx-auto"
                    onClick={openProfilePhotoModal}
                >
                    {formData.profileImage && formData.profileImagePath ? (
                        <img
                            src={formData.profileImage}
                            className="w-full h-full object-cover"
                            alt="Profile"
                        />
                    ) : (
                        <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                            <User className="w-10 h-10 text-purple-600" />
                        </div>
                    )}
                </div>
                {
                    userData.privilege?.toLowerCase() === "both" &&
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg cursor-pointer">
                        <label className=" text-purple-600 hover:text-purple-700 cursor-pointer">
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
                    formData.profileImage && formData.profileImagePath ? (
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
            </div >
            {/* Profile Photo Modal */}
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
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800">
                                    {formData.fname || ""}'s Profile
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
                                    {formData.profileImage ? (
                                        <img
                                            src={formData.profileImage}
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
                                        {formData.fname || ""}
                                    </h2>
                                    <p className="text-gray-600 mt-1">{formData.fatherMobile || ""}</p>

                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                                            {formData.class || ""}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                            {formData?.div || ""}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default StudentProfilePhoto
