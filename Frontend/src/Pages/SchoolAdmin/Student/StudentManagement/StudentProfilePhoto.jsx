import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { Camera, User, X } from "lucide-react";
import { useState } from "react"
import { useAuth } from "../../../../contexts/AuthContext";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { doc, writeBatch } from "firebase/firestore";
import { db, auth } from "../../../../config/firebase";

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

function StudentProfilePhoto({ formData, setFormData }) {
    const [localLoading, setLocalLoading] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const storage = getStorage();
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const { studentId } = useParams();
    const { currentUser } = useAuth();

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
        try {
            const userToken = await currentUser.getIdToken();
            setLocalLoading(true);
            validateFile(file);
            const formData = new FormData();
            formData.append('avatar', file);
            // Show initial progress dialog
            Swal.fire({
                title: 'Uploading...',
                html: `
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div id="upload-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                    </div>
                    <div class="mt-2" id="upload-percent">0% Complete</div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false,
            });
            // Use XMLHttpRequest to track upload progress and get back the JSON
            const url = VITE_NODE_ENV === "Development" ? `http://localhost:${VITE_PORT}/api/admin/school/students/avatar/${studentId}` : `${VITE_DOMAIN_PROD}/api/admin/school/students/avatar/${studentId}`
            const uploadResult = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url);
                xhr.setRequestHeader('Authorization', 'Bearer ' + userToken);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        const bar = document.getElementById('upload-bar');
                        const pctText = document.getElementById('upload-percent');
                        if (bar) bar.style.width = `${percent}%`;
                        if (pctText) pctText.innerText = `${percent}% Complete`;
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const json = JSON.parse(xhr.responseText);
                            resolve(json);
                        } catch (parseErr) {
                            reject(new Error('Invalid JSON from server'));
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(formData);
            });

            Swal.close();

            const { avatar } = uploadResult;
            const batch = writeBatch(db);
            const studentRef = doc(db, "students", studentId);
            batch.update(studentRef, {
                avatar: {
                    avatarUrl: avatar.avatarUrl,
                    avatarImagePath: avatar.avatarImagePath,
                    updatedAt: avatar.updatedAt
                }
            });
            await batch.commit();
            // Update local state
            setFormData(prev => ({
                ...prev,
                avatar: {
                    avatarUrl: avatar.avatarUrl,
                    avatarImagePath: avatar.avatarImagePath,
                    updatedAt: avatar.updatedAt
                }
            }));
            Swal.fire({
                icon: 'success',
                title: 'Avatar Image Updated!',
                showConfirmButton: false,
                timer: 1500,
            });
        } catch (err) {
            console.error('Upload Error:', err);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                html: `<div class="text-red-600">${err.message}</div>`,
            });
        } finally {
            setLocalLoading(false);
        }
    };


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
                    {formData.avatar && formData.avatar.avatarUrl ? (
                        <img
                            src={formData.avatar.avatarUrl}
                            className="w-full h-full object-cover"
                            alt="Profile"
                        />
                    ) : (
                        <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                            <User className="w-10 h-10 text-purple-600" />
                        </div>
                    )}
                </div>
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
            </div>
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute rounded-md bg-clip-padding backdrop-filter  border border-gray-100  inset-0 z-10 flex items-center justify-center px-4 sm:px-6 md:px-8 backdrop-blur-sm "
                        onClick={closeProfilePhotoModal}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative z-50 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300 ">
                        {/* Close Button */}
                        <button
                            onClick={closeProfilePhotoModal}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200 hover:scale-110"
                        >
                            <X size={20} />
                        </button>

                        {/* Profile Photo */}
                        <div className="flex flex-col items-center">
                            <div className="relative mb-6">
                                {/* Photo Container */}
                                <div className="relative w-96 h-96 rounded-full overflow-hidden border-2 border-white/30 shadow-xl">
                                    {formData.avatar && formData.avatar.avatarUrl ? (
                                        <img
                                            src={formData.avatar.avatarUrl}
                                            className="w-full h-full object-cover"
                                            alt="Profile"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                            <User size={64} className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Shine Effect */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default StudentProfilePhoto
