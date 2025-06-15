import React from 'react'

function DocumentSelectTab({ studentData, documentLists, documentStatus, handleDocumentCheck, handleInputChange }) {
    return (

        <div className="space-y-6">
            {/* Document Checklist */}
            <div>
                <h3 className="text-md font-medium text-gray-800 mb-4">
                    Required Documents for {studentData.course.toUpperCase()}
                </h3>
                <div className="space-y-3">
                    {documentLists[studentData.course]?.map((docName, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`doc-${index}`}
                                    checked={documentStatus[docName] || false}
                                    onChange={(e) => handleDocumentCheck(docName, e.target.checked)}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`doc-${index}`} className="ml-3 text-sm font-medium text-gray-900">
                                    {docName}
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Documents Toggle */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-lg font-medium text-gray-900">
                        All Documents Submitted
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {/* YES option */}
                    <label
                        htmlFor="isAllDocSubmitedYes"
                        className={`flex items-center gap-4 p-4 rounded-xl border ${studentData.isAllDocSubmited
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 bg-white"
                            } cursor-pointer transition-all hover:shadow-sm`}
                    >
                        <input
                            id="isAllDocSubmitedYes"
                            type="radio"
                            name="isAllDocSubmited"
                            className="w-5 h-5 text-green-600 accent-green-600 scale-150 cursor-pointer"
                            checked={studentData.isAllDocSubmited}
                            onChange={() => handleInputChange("isAllDocSubmited", true)}
                        />
                        <span className="text-base font-medium text-gray-800">Yes</span>
                    </label>

                    {/* NO option */}
                    <label
                        htmlFor="isAllDocSubmitedNo"
                        className={`flex items-center gap-4 p-4 rounded-xl border ${!studentData.isAllDocSubmited
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 bg-white"
                            } cursor-pointer transition-all hover:shadow-sm`}
                    >
                        <input
                            id="isAllDocSubmitedNo"
                            type="radio"
                            name="isAllDocSubmited"
                            className="w-5 h-5 text-green-600 accent-green-600 scale-150 cursor-pointer"
                            checked={!studentData.isAllDocSubmited}
                            onChange={() => handleInputChange("isAllDocSubmited", false)}
                        />
                        <span className="text-base font-medium text-gray-800">No</span>
                    </label>
                </div>
            </div>
        </div>
    )
}

export default DocumentSelectTab
