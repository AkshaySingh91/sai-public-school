import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { Camera, User, X } from "lucide-react";
import { useState } from "react"
import { useAuth } from "../../../../contexts/AuthContext";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../../../../config/firebase";

function StudentProfilePhoto({ formData, setFormData }) {
    const [localLoading, setLocalLoading] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const storage = getStorage();
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const [uploading, setUploading] = useState(false);
    const validateFile = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Only JPG, PNG, and WEBP images are allowed');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit');
        }
    };
    const { studentId } = useParams();
    const { currentUser } = useAuth();
    const handleAvatarUpload = async (file) => {
        if (!file) return;
        try {
            setLocalLoading(true);
            validateFile(file);

            const timestamp = Date.now();
            const fileExt = file.name.split('.').pop();
            const newFileName = `admin/${currentUser.uid}/students/${studentId}/${timestamp}.${fileExt}`;
            const storageRef = ref(storage, newFileName);
            // Show progress dialog
            let progressDialog;
            const showProgress = (progress) => {
                progressDialog = Swal.fire({
                    title: 'Uploading...',
                    html: `<div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%"></div>
              </div>
              <div class="mt-2">${Math.round(progress)}% Complete</div>`,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                });
            };

            // Handle existing image deletion
            let oldImageDeleted = false;
            if (formData.avatar && formData.avatar.avatarUrl) {
                try {
                    await deleteObject(ref(storage, formData?.avatar?.avatarUrl));
                    oldImageDeleted = true;
                } catch (deleteErr) {
                    console.warn('Old image deletion warning:', deleteErr);
                    if (deleteErr.code !== 'storage/object-not-found') throw deleteErr;
                }
            }

            // Upload with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    showProgress(progress);
                },
                (error) => {
                    Swal.close();
                    throw error;
                }
            );

            await uploadTask;
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            // Atomic Firestore update
            const batch = writeBatch(db);
            const studentRef = doc(db, "students", studentId);
            batch.update(studentRef, {
                avatar: {
                    avatarUrl: downloadURL,
                    avatarImagePath: newFileName,
                    updatedAt: new Date().toISOString()
                }
            }); 
            await batch.commit();
            // Update local state
            setFormData(prev => ({
                ...prev,
                avatar: {
                    avatarUrl: downloadURL,
                    avatarImagePath: newFileName,
                    updatedAt: new Date().toISOString()
                }
            }));
            Swal.fire({
                icon: 'success',
                title: 'Avatar Image Updated!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            console.error('Upload Error:', err);
            // Handle specific storage errors
            let errorMessage = err.message;
            if (err.code === 'storage/canceled') {
                errorMessage = 'Upload was canceled';
            } else if (err.code === 'storage/retry-limit-exceeded') {
                errorMessage = 'Upload failed after multiple attempts';
            }
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                html: `<div class="text-red-600">${errorMessage}</div>`,
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
