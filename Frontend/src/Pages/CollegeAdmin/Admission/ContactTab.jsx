
function ContactTab({ studentData, handleInputChange }) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Mobile</label>
                    <input
                        type="text"
                        value={studentData.collegeCommunicationMobileNo[0] || ''}
                        onChange={(e) => {
                            const newNumbers = [...studentData.collegeCommunicationMobileNo];
                            newNumbers[0] = e.target.value;
                            handleInputChange('collegeCommunicationMobileNo', newNumbers);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Mobile</label>
                    <input
                        type="text"
                        value={studentData.collegeCommunicationMobileNo[1] || ''}
                        onChange={(e) => {
                            const newNumbers = [...studentData.collegeCommunicationMobileNo];
                            newNumbers[1] = e.target.value;
                            handleInputChange('collegeCommunicationMobileNo', newNumbers);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={studentData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                    <input
                        type="text"
                        value={studentData.studentWhatsAppNo}
                        onChange={(e) => handleInputChange('studentWhatsAppNo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                    <input
                        type="text"
                        value={studentData.aadharNo}
                        onChange={(e) => handleInputChange('aadharNo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Linked Mobile</label>
                    <input
                        type="text"
                        value={studentData.aadharLinkedMobileNo}
                        onChange={(e) => handleInputChange('aadharLinkedMobileNo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            </div>
        </div>
    )
}

export default ContactTab
