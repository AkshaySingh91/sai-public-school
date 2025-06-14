import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useInstitution } from '../../../../contexts/InstitutionContext';
import { Copy, Download, Share2, X, MessageCircle, Mail, Phone } from 'lucide-react';
import Swal from 'sweetalert2';

const AdmissionQR = () => {
    const { school: college } = useInstitution();
    const [showShareModal, setShowShareModal] = useState(false);

    const collegeCode = college?.Code;
    const admissionUrl = `${window.location.origin}/admission/${collegeCode}`;
    const collegeName = college?.collegeName || 'Our Institution';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(admissionUrl);
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: 'Admission link copied to clipboard',
            timer: 1500
        });
    };

    const downloadQRCode = () => {
        // Create a canvas element to convert SVG to image
        const svg = document.querySelector('.qr-code-svg');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Set canvas size
        canvas.width = 240;
        canvas.height = 240;

        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            // Fill white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the QR code
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Convert to blob and download
            canvas.toBlob((blob) => {
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `${collegeName.replace(/\s+/g, '_')}_Admission_QR.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);
            }, 'image/png');

            URL.revokeObjectURL(url);
        };

        img.src = url;
    };

    const shareViaWhatsApp = () => {
        const message = `🎓 Apply for admission to ${collegeName}!\n\nUse this link to access our admission form:\n${admissionUrl}\n\nJoin us and be part of our academic excellence! 📚✨`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setShowShareModal(false);
    };

    const shareViaEmail = () => {
        const subject = `Admission Application - ${collegeName}`;
        const body = `Dear Student,
            I hope this message finds you well.
            I'm excited to share with you the admission application link for ${collegeName}. We invite you to apply and become part of our academic community.
            Admission Application Link: ${admissionUrl}
            Our institution is committed to providing quality education and fostering academic excellence. We would be delighted to have you join us.
            For any queries regarding the admission process, please feel free to contact us.
            Best regards,
            ${collegeName} Admissions Team`;

        const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = emailUrl;
        setShowShareModal(false);
    };

    const shareViaSMS = () => {
        const message = `Apply for admission to ${collegeName}! Access our admission form: ${admissionUrl}`;
        const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
        setShowShareModal(false);
    };

    return (
        <>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Admission QR Code</h2>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <QRCodeSVG
                            value={admissionUrl}
                            size={200}
                            includeMargin={true}
                            className="qr-code-svg"
                        />
                    </div>
                    <div className="flex-1">
                        <p className="text-gray-600 mb-3">
                            Scan this QR code to access the admission form for {collegeName}
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                            <p className="text-sm text-gray-600 break-all">{admissionUrl}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <Copy size={16} className="mr-2" />
                                Copy Link
                            </button>
                            <button
                                onClick={downloadQRCode}
                                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                <Download size={16} className="mr-2" />
                                Download QR
                            </button>
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                            >
                                <Share2 size={16} className="mr-2" />
                                Share
                            </button>
                        </div>
                    </div>
                </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800">Share Admission Link</h3>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            <p className="text-gray-600 mb-6 text-center">
                                Choose how you'd like to share the admission link for {collegeName}
                            </p>

                            <div className="space-y-3">
                                {/* WhatsApp */}
                                <button
                                    onClick={shareViaWhatsApp}
                                    className="w-full flex items-center p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors group"
                                >
                                    <div className="p-3 bg-green-500 rounded-full mr-4">
                                        <MessageCircle size={24} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-800">WhatsApp</h4>
                                        <p className="text-sm text-gray-600">Share via WhatsApp message</p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    </div>
                                </button>

                                {/* Email */}
                                <button
                                    onClick={shareViaEmail}
                                    className="w-full flex items-center p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors group"
                                >
                                    <div className="p-3 bg-blue-500 rounded-full mr-4">
                                        <Mail size={24} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-800">Email</h4>
                                        <p className="text-sm text-gray-600">Send via email client</p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                </button>

                                {/* SMS */}
                                <button
                                    onClick={shareViaSMS}
                                    className="w-full flex items-center p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors group"
                                >
                                    <div className="p-3 bg-orange-500 rounded-full mr-4">
                                        <Phone size={24} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-800">SMS</h4>
                                        <p className="text-sm text-gray-600">Share via text message</p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 pb-6">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 text-center break-all">
                                    {admissionUrl}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdmissionQR;