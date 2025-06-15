import React from 'react'

function OtherDetailTab({ studentData, handleInputChange }) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Other Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                    <select
                        value={studentData.bloodGroup}
                        onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isHandicap"
                        checked={studentData.isHandicap}
                        onChange={(e) => handleInputChange('isHandicap', e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isHandicap" className="ml-2 block text-sm text-gray-900">
                        Is Handicap
                    </label>
                </div>
            </div>

            {studentData.isHandicap && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nature</label>
                    <textarea
                        value={studentData.handicapDetails.nature}
                        onChange={(e) => handleInputChange('handicapDetails', e.target.value, 'nature')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            )}
        </div>
    )
}

export default OtherDetailTab
