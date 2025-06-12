import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Printer, Download, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useInstitution } from '../../../../contexts/InstitutionContext';

export default function BonafideGenerator({ student, setStudent }) {
    const { studentId } = useParams();
    const { school } = useInstitution()
    const [showGenerator, setShowGenerator] = useState(false);
    const [bonafideList, setBonafideList] = useState([]);
    const previewRef = useRef();
    const [form, setForm] = useState({
        studentName: `${student.fname} ${student.lname}`,
        className: student.class || '',
        academicYear: '',
        examType: '',
        examResult: 'passed',
        dob: student.dob || '',
        issueDate: new Date().toISOString().slice(0, 10),
        certificateNumber: `BON-${Date.now().toString().slice(-6)}`
    });
    const [studentImage, setStudentImage] = useState(null);
    const certificateRef = useRef();

    useEffect(() => {
        setBonafideList(student.bonafide || []);
    }, [student.bonafide]);

    const handleChange = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

    // Update the file input handler
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setStudentImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePrint = async () => {
        if (!certificateRef.current) return;

        // Clone the node to isolate print styles
        const clone = certificateRef.current.cloneNode(true);
        clone.classList.add('print-container');
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
            scale: 3,
            useCORS: true,
            logging: true,
            backgroundColor: null,
            width: 148 * 3.78,  // Convert mm to pixels (1mm = 3.78px)
            height: 210 * 3.78,
            windowWidth: 148 * 3.78,
            windowHeight: 210 * 3.78
        });

        document.body.removeChild(clone);

        const dataUrl = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
        <html>
            <head>
                <title>Certificate Print</title>
                <style>
                    @page { 
                        size: A5 portrait;
                        margin: 0;
                    }
                    body { 
                        margin: 0; 
                        padding: 0; 
                        -webkit-print-color-adjust: exact; 
                    }
                    img { 
                        width: 100%; 
                        height: 100%; 
                        object-fit: contain; 
                    }
                </style>
            </head>
            <body>
                <img src="${dataUrl}" />
            </body>
        </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };
    const handleDownload = async () => {
        if (!certificateRef.current) return;

        const canvas = await html2canvas(certificateRef.current, {
            useCORS: true,
            scale: 2,
            logging: true,
            backgroundColor: null,
            allowTaint: true
        });

        const link = document.createElement('a');
        link.download = `bonafide-${form.certificateNumber}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };


    return (<>
        <style media="print">{`
    @page {
        size: A5 portrait;
        margin: 0;
    }
    
    body * {
        visibility: hidden;
    }
    
    .print-container, .print-container * {
        visibility: visible;
        box-shadow: none !important;
        background: white !important;
    }
    
    .print-container {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 148mm !important;  /* A5 width */
        min-height: 210mm !important;  /* A5 height */
        margin: 0 !important;
        padding: 10mm !important;
        transform: scale(1) !important;
    }
    
    .student-photo {
        width: 100px !important;
        height: 100px !important;
        object-fit: cover;
    }
`}</style>
        <div className="space-y-6">
            <div className="space-y-6">
                {/* Form Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-[#be185d]">Generate Certificate</h2>
                        <button onClick={() => setShowGenerator(false)} className="text-gray-500"><X size={20} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            ['studentName', 'Student Name', 'text'],
                            ['className', 'Class', 'text'],
                            ['academicYear', 'Academic Year', 'text'],
                            ['examType', 'Exam Held In', 'text'],
                            ['examResult', 'Result', 'select'],
                            ['dob', 'Date of Birth', 'date'],
                            ['issueDate', 'Issue Date', 'date'],
                            ['no', 'No.', 'number'],
                            ['subject', 'Failed/Passed Subject.', 'text'],
                        ].map(([key, label, type]) => (
                            <div key={key} className="flex flex-col">
                                <label className="text-sm font-medium text-[#374151]">{label}</label>
                                {type === 'select' ? (
                                    <select value={form[key]} onChange={handleChange(key)} className="mt-1 p-2 border border-gray-300 rounded">
                                        <option>passed</option>
                                        <option>failed</option>
                                    </select>
                                ) : (
                                    <input type={type} value={form[key]} onChange={handleChange(key)} required className="mt-1 p-2 border border-gray-300 rounded" />
                                )}
                            </div>
                        ))}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-[#374151]">Student image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="mt-1 p-2 border border-gray-300 rounded"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button onClick={handlePrint} className="px-4 py-2 border rounded">
                            <Printer size={16} /> Print
                        </button>
                        <button onClick={handleDownload} className="px-4 py-2 border rounded">
                            <Download size={16} /> Download
                        </button>
                    </div>
                </div>
                {/* Certificate Preview integrated UI */}
                <div
                    ref={certificateRef}
                    className="print-container relative certificate-container flex flex-col items-center w-full max-w-2xl mx-auto bg-white p-6 border-4 border-[#be185d]"
                    style={{
                        transform: 'scale(1)',
                        transformOrigin: 'top center'
                    }}
                >
                    {/* Top Receipt Section */}
                    <div className="w-full border-4 border-[#be185d] p-4 mb-6">
                        <div className="border-2 border-[#be185d] p-3">
                            <h2 className="text-center font-bold text-xl text-[#be185d]">
                                Shri Tuljabhavani B.S.S.Vetalwadi's
                            </h2>
                            <h1 className="text-center font-bold text-3xl text-[#be185d] capitalize">
                                {school?.schoolName || ""}, {school?.location?.taluka || ""}
                            </h1>
                            <p className="text-center text-[#be185d] font-semibold mt-1">
                                Tq. {school?.location?.taluka || ""}, Dist- {school?.location?.district || ""}
                            </p>
                            <div className="mt-6 flex justify-between text-[#be185d]">
                                <span>{student?.gender == "Male" ? "Mr." : "Miss."} <u className="px-2">{form.studentName}</u></span>
                                <span>Fee Rs. 20/-</span>
                                <span>Date: <u className="px-2">{form.issueDate}</u></span>
                            </div>
                            <div className="mt-4 flex justify-between text-[#be185d]">
                                <span>No. {form.no || ""}</span>
                                <span>Signature <u className="px-4" /></span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Certificate Section */}
                    <div className="w-full border-4 border-[#be185d] p-4">
                        <div className="relative border-2 border-[#be185d] p-3">
                            <div className="flex justify-start mb-24">
                                <span className="text-[#be185d] font-semibold">No. {form.no || ""}</span>
                            </div>
                            {studentImage && (
                                <img
                                    src={studentImage}
                                    alt="Student"
                                    className="absolute top-4 right-4 w-20 h-20 object-cover border-2 border-[#be185d]"
                                />
                            )}
                            <h2 className="text-center font-bold text-xl text-[#be185d]">
                                Shri Tuljabhavani B.S.S.Vetalwadi's
                            </h2>
                            <h1 className="text-center font-bold text-3xl text-[#be185d]">
                                SAI PUBLIC SCHOOL, MADHA
                            </h1>
                            <p className="text-center text-[#be185d] font-semibold mt-1">
                                Tq. Madha, Dist- Solapur
                            </p>
                            <div className="text-center mt-4">
                                <h3 className="font-bold text-2xl text-[#be185d]">BONAFIDE CERTIFICATE</h3>
                            </div>
                            <div className="mt-6 space-y-3 text-[#be185d]">
                                <p className='text-lg'>
                                    This is to certify that {student?.gender == "Male" ? "Mr." : "Miss"}
                                    <span className='underline'>&nbsp;{form.studentName}</span>
                                    &nbsp;is/was a Bonafide Student studying in &nbsp;
                                    <span className='underline'>&nbsp;{form.className}</span>
                                    class during the year
                                    <span className='underline text-nowrap'>&nbsp;{form.academicYear}</span>
                                    &nbsp;{student?.gender == "Male" ? "He" : "She"}
                                    <span className='underline'>&nbsp;{form.examResult || ""}</span>
                                    <span className='underline'>&nbsp;{form?.subject || ""}</span>
                                    &nbsp;examination held in
                                    <span className='underline'>&nbsp;{form.examType}</span>
                                    &nbsp;To the best of my knowledge&nbsp;{student?.gender == "Male" ? "he" : "she"}bears a good moral character.</p>
                            </div>
                            <p className='text-[#be185d] py-2'>Date of Birth: <u>{form.dob}</u></p>
                            <div className="grid grid-cols-2 gap-4 mt-8 text-[#be185d]">
                                <div>
                                    <p>Date: <u>{form.issueDate}</u></p>
                                </div>
                                <div className="text-right">
                                    <div className=" w-32 mx-auto pt-2">
                                        <p className="font-semibold">Principal</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    </>);
}