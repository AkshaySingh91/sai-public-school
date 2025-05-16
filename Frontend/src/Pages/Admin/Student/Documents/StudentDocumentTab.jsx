import { useState } from 'react';
import Swal from 'sweetalert2';
import { Save, Upload, Trash2, Download, Plus } from 'lucide-react';
import BonafideGenerator from "../Documents/BonafideGenerator"

const StudentDocumentTab = ({ student, setStudent }) => {
    const [newDoc, setNewDoc] = useState({ name: '', file: null });
    const [uploading, setUploading] = useState(false);
    const [activeSection, setActiveSection] = useState('documents'); // 'documents' or 'bonafide'

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!newDoc.name || !newDoc.file) {
            Swal.fire('Error', 'Please fill all fields and select a file', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('studentId', student.id);
        formData.append('docType', newDoc.name);
        formData.append('document', newDoc.file);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE}/student/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');

            setStudent(prev => ({
                ...prev,
                documents: [...prev.documents, data.document]
            }));
            setNewDoc({ name: '', file: null });
            Swal.fire('Success', 'Document uploaded successfully', 'success');
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (idx) => {
        const confirmed = await Swal.fire({
            title: 'Delete?'
            , text: "This cannot be undone"
            , icon: 'warning'
            , showCancelButton: true
        }).then(r => r.isConfirmed);

        if (!confirmed) return;
        try {
            const docToDelete = student.documents[idx];
            const res = await fetch(`${import.meta.env.VITE_API_BASE}/student/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: student.id, document: docToDelete })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Deletion failed');

            setStudent(prev => ({
                ...prev,
                documents: prev.documents.filter((_, i) => i !== idx)
            }));
            Swal.fire('Deleted', 'Document removed', 'success');
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    };

    return (<>
        <div className="space-y-6">
            <div className="flex border-b border-gray-200">
                {['Documents', 'Generate Bonafide'].map((section, idx) => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(idx === 0 ? 'documents' : 'bonafide')}
                        className={`px-6 py-3 font-medium ${activeSection === (idx === 0 ? 'documents' : 'bonafide')
                            ? "text-purple-600 border-b-2 border-purple-600"
                            : "text-gray-500 hover:text-purple-500"
                            }`}
                    >
                        {section}
                    </button>
                ))}
            </div>
            {activeSection === 'documents' ? (
                <div className="space-y-6">
                    {/* Upload Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-600">
                            <Plus size={20} /> Upload New Document
                        </h3>
                        <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-4">
                            <input
                                type="text"
                                placeholder="Document Type"
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
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
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
                                {student?.documents?.length || 0}
                            </span>
                        </div>
                        {student.documents && student.documents.length && student.documents.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No documents found</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">File</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {student.documents && student.documents.length && student.documents.map((doc, i) => (
                                            <tr key={doc.storageKey || i}>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{doc.type}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 truncate">{doc.fileName}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 flex gap-3">
                                                    <a href={doc.url} target="_blank" rel="noopener" className="flex items-center gap-1 text-purple-600">
                                                        <Download size={16} /> Download
                                                    </a>
                                                    <button onClick={() => handleDeleteDocument(i)} className="flex items-center gap-1 text-red-600">
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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
