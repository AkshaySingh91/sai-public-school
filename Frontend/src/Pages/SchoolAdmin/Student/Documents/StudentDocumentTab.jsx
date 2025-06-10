import { useState } from 'react';
import Swal from 'sweetalert2';
import { Save, Upload, Trash2, Download, Plus, Image } from 'lucide-react';
import BonafideGenerator from "../Documents/BonafideGenerator"
import { useParams } from 'react-router-dom';
import { useInstitution } from "../../../../contexts/InstitutionContext"
import { useAuth } from "../../../../contexts/AuthContext"
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const VITE_NODE_ENV = import.meta.env.VITE_NODE_ENV;
const VITE_PORT = import.meta.env.VITE_PORT;
const VITE_DOMAIN_PROD = import.meta.env.VITE_DOMAIN_PROD;

const StudentDocumentTab = ({ student, setStudent }) => {
    const [newDoc, setNewDoc] = useState({ name: '', file: null });
    const [uploading, setUploading] = useState(false);
    const [deletingDoc, setDeletingDoc] = useState(null);
    const [activeSection, setActiveSection] = useState('documents');
    const { studentId } = useParams();
    const { school } = useInstitution();
    const { currentUser } = useAuth();
    const validateDocument = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Allowed formats: PDF, JPG, PNG');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds 5MB limit');
        }
    };
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!newDoc.name.trim() || !newDoc.file) {
            Swal.fire('Error', 'Please provide document name and select a file', 'error');
            return;
        }
        let uploadBarModal;
        try {
            setUploading(true);
            // 1. Show a spinner while we request the signed URL
            uploadBarModal = Swal.fire({
                title: 'Preparing upload…',
                html: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
            });

            const userToken = await currentUser.getIdToken();
            validateDocument(newDoc.file);
            const uploadUrlEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/school/student/document/upload-url/${studentId}/${school.id}?fileType=${newDoc.file.type}&orignalFileName=${newDoc.file.name}&fileName=${newDoc.name}`
                : `${VITE_DOMAIN_PROD}/api/school/student/document/upload-url/${studentId}/${school.id}?fileType=${newDoc.file.type}&orignalFileName=${newDoc.file.name}&fileName=${newDoc.name}`;

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
          <span id="total-size">${(newDoc.file.size / 1024).toFixed(1)}KB</span>
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
                xhr.setRequestHeader('Content-Type', newDoc.file.type);

                xhr.upload.onprogress = (event) => {
                    if (!event.lengthComputable) return;
                    const percent = Math.round((event.loaded / event.total) * 100);
                    document.getElementById('upload-bar').style.width = `${percent}%`;
                    document.getElementById('upload-percent').innerText = `${percent}% Complete`;
                    document.getElementById('uploaded-size').innerText = `${(event.loaded / 1024).toFixed(1)}KB`;
                };

                xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`)));
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(newDoc.file);
            });

            // 4. Update Firestore & cleanup
            const updateEndpoint = VITE_NODE_ENV === "Development"
                ? `http://localhost:${VITE_PORT}/api/school/student/document/update/${studentId}`
                : `${VITE_DOMAIN_PROD}/api/school/student/document/update/${studentId}`;
            const response = await fetch(updateEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + userToken
                },
                body: JSON.stringify({ newKey, fileName: newDoc.name, orignalFileName: newDoc.file.name, fileType: newDoc.file.type })
            });
            if (!response.ok) throw new Error('Failed to update profile');

            const { metaData } = await response.json();
            // 5. Create document data and update local state as before
            const documentData = {
                name: metaData.name,
                storagePath: metaData.storagePath,
                url: metaData.url,
                type: metaData.type,
                uploadedAt: metaData.uploadedAt,
            };
            setStudent((prev) => ({
                ...prev,
                documents: [...(prev.documents || []), documentData],
            }));

            // 6. Show success notification
            Swal.fire({
                icon: 'success',
                title: 'Document Uploaded!',
                text: 'File has been successfully added.',
                showConfirmButton: false,
                timer: 1500,
            });

            // 7. Reset form state
            setNewDoc({ name: '', file: null });
        } catch (err) {
            console.error('Upload Error:', err);
            // Close loader if still visible
            if (Swal.isVisible()) {
                Swal.close();
            }
            // Handle specific storage errors
            let errorMessage = err.message;
            if (err.code === 'storage/canceled') {
                errorMessage = 'Upload was canceled by the user';
            } else if (err.code === 'storage/retry-limit-exceeded') {
                errorMessage = 'Upload failed after multiple retries';
            } else if (err.code === 'storage/unauthorized') {
                errorMessage = "You don't have permission to upload files";
            }

            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                html: `<div class="text-red-600">${errorMessage}</div>`,
            });
        } finally {
            setUploading(false);
        }

    };

    const handleDeleteDocument = async (storagePath) => {
        const confirmed = await Swal.fire({
            title: 'Delete Document?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
        });

        if (!confirmed.isConfirmed) return;
        setDeletingDoc(storagePath);
        try {
            if (!(student.documents && student.documents.length && student.documents.find(doc => doc.storagePath === storagePath))) return;
            // 1) Identify the document metadata
            const documentToDelete = student.documents.find(doc => doc.storagePath === storagePath);

            if (!documentToDelete.storagePath || !documentToDelete.name || !documentToDelete.url || !documentToDelete.type || !documentToDelete.uploadedAt || typeof documentToDelete.storagePath !== 'string') {
                return Swal.fire({
                    icon: "error",
                    title: "Fail To delete document",
                    text: "Incomplete details of deleting Object",
                })
            }            // 2. Make DELETE request to our backend
            const userToken = await currentUser.getIdToken();
            const url =
                VITE_NODE_ENV === 'Development'
                    ? `http://localhost:${VITE_PORT}/api/school/student/document/${studentId}`
                    : `${VITE_DOMAIN_PROD}/api/school/student/document/${studentId}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + userToken,
                },
                body: JSON.stringify({ documentToDelete }),
            });
            if (!response.ok) {
                const errorJson = await response.json().catch(() => ({}));
                throw new Error(errorJson.error || 'Failed to delete document');
            }
            //3. Update local state
            setStudent((prev) => {
                const newDocs = [...(prev.documents || [])].filter(doc => doc.storagePath !== storagePath);
                return { ...prev, documents: newDocs };
            });

            Swal.fire('Deleted!', 'Document has been removed.', 'success');
        } catch (err) {
            console.error('Delete error:', err);
            Swal.fire('Error', err.message || 'Could not delete document', 'error');
        } finally {
            setDeletingDoc(null);
        }
    };
    const handlePreview = (url, type) => {
        if (type.startsWith('image/')) {
            Swal.fire({
                html: `
                <div class="preview-container">
                    <img 
                        src="${url}" 
                        alt="Document preview" 
                        class="preview-image"
                        loading="lazy"
                    />
                </div>
            `,
                showConfirmButton: false,
                showCloseButton: true,
                closeButtonHtml: `
                <svg class="close-icon text-white" fill="white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            `,
                background: 'rgba(0,0,0,0.2)',
                width: '90%',
                padding: '0',
                customClass: {
                    popup: 'custom-preview-popup',
                    closeButton: 'custom-close-button',
                    image: 'custom-preview-image'
                },
                didOpen: () => {
                    // Prevent background scroll
                    document.body.style.overflow = 'hidden';
                },
                willClose: () => {
                    // Restore background scroll
                    document.body.style.overflow = 'auto';
                }
            });
        } else {
            window.open(url, '_blank');
        }
    };

    return (<>
        <style>
            {`
            .preview-image{
            width: 100%;
            }  
/* Accessibility */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}

/* Close button styles */
.close-button {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255);
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
}

.close-button:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: scale(1.1);
}

.close-button:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
}

.close-icon {
    width: 24px;
    height: 24px;
    color: white;
    fill: none;
    stroke: currentColor;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .close-button {
        width: 36px;
        height: 36px;
    }
    
    .close-icon {
        width: 20px;
        height: 20px;
    }
} 
            .close-button:focus-visible {
                outline: 2px solid white;
            outline-offset: 2px;
            } 
  
            }
            `}
        </style>
        <div className="space-y-6">
            <div className="flex border-b border-gray-200">
                {['Documents', 'Generate Bonafide'].map((section, idx) => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(idx === 0 ? 'documents' : 'bonafide')}
                        className={`px-3 py-2 font-medium ${activeSection === (idx === 0 ? 'documents' : 'bonafide')
                            ? "text-purple-600 border-b-2 border-purple-600"
                            : "text-gray-500 hover:text-purple-500"
                            }`}
                    >
                        {section}
                    </button>
                ))}
            </div>
            {activeSection === 'documents' ? (
                <div className="space-y-4">
                    {/* Upload Section */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-600">
                            <Plus size={20} /> Upload New Document
                        </h3>
                        <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-4">
                            <input
                                type="text"
                                placeholder="Bonafide, Aadhar, Leaving Certificate..."
                                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                value={newDoc.name}
                                onChange={e => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
                                disabled={uploading}
                            />
                            <label className="flex items-center gap-2 cursor-pointer border-dashed border-2 border-gray-200 p-2 rounded-lg hover:border-purple-300 transition-colors">
                                <Upload size={18} className="text-purple-600" />
                                <span>{newDoc.file?.name || 'Choose File'}</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={e => setNewDoc(prev => ({ ...prev, file: e.target.files[0] }))}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    disabled={uploading}
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={!newDoc.name || !newDoc.file || uploading}
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                <Save size={18} /> {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </form>
                    </div>

                    {/* Documents List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-purple-600">Uploaded Documents</h3>
                            <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-sm">
                                {student.documents?.length || 0}
                            </span>
                        </div>
                        {student.documents?.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No documents found</div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200 ">
                                    <thead className="bg-gray-50 text-left">
                                        <tr>
                                            <th scope="col" className="px-3 py-2  text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Document Type
                                            </th>
                                            <th scope="col" className="px-3 py-2  text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                File Name
                                            </th>
                                            <th scope="col" className="px-3 py-2  text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Upload Date
                                            </th>
                                            <th scope="col" className="px-3 py-2  text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Preview
                                            </th>
                                            <th scope="col" className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Delete
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 text-left">
                                        {student.documents?.length > 0 ? (
                                            student.documents.map((doc, i) => (
                                                <tr
                                                    key={doc.storagePath}
                                                    className="hover:bg-gray-50 transition-colors duration-150"
                                                    aria-label={`Document: ${doc.name}`}
                                                >
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-purple-100 rounded-md">
                                                                {doc.type.startsWith('image/') ? (
                                                                    <Image className="h-5 w-5 text-purple-600" aria-hidden="true" />
                                                                ) : (
                                                                    <Download className="h-5 w-5 text-purple-600" aria-hidden="true" />
                                                                )}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900 capitalize">
                                                                    {doc.name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {doc.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 truncate max-w-[200px] capitalize">
                                                            {doc.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {new Date(doc.uploadedAt).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium w-auto">
                                                        <div className="flex items-center space-x-3 ">
                                                            <button
                                                                onClick={() => handlePreview(doc.url, doc.type)}
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 cursor-pointer"
                                                                aria-label={`${doc.type.startsWith('image/') ? 'Preview' : 'Download'} ${doc.name}`}
                                                            >
                                                                {doc.type.startsWith('image/') ? (
                                                                    <>
                                                                        <Image className="-ml-0.5 mr-1.5 h-4 w-4" aria-hidden="true" />
                                                                        Preview
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Download className="-ml-0.5 mr-1.5 h-4 w-4" aria-hidden="true" />
                                                                        Download
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleDeleteDocument(doc.storagePath)}
                                                            disabled={deletingDoc === doc.storagePath}
                                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            aria-label={`Delete ${doc.name}`}
                                                        >
                                                            <Trash2 className="-ml-0.5 mr-1.5 h-4 w-4 text-red-500" aria-hidden="true" />
                                                            {deletingDoc === doc.storagePath ? 'Deleting...' : 'Delete'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-3 py-2 text-center text-sm text-gray-500">
                                                    No documents found. Upload your first document above.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <BonafideGenerator student={student} setStudent={setStudent} />
            )}
        </div>
    </>);
};

export default StudentDocumentTab;
