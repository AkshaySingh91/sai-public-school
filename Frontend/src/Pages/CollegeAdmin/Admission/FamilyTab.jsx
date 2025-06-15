import React from 'react'

function FamilyTab({ handleInputChange, studentData }) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Family Information</h3>

            {/* Father Info */}
            <fieldset className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
                <legend className="text-sm font-semibold text-gray-500 px-2">
                    Father Information
                </legend>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={studentData.fatherInfo.name}
                            onChange={(e) =>
                                handleInputChange('fatherInfo', e.target.value, 'name')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Qualification */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Qualification
                        </label>
                        <input
                            type="text"
                            value={studentData.fatherInfo.qualification}
                            onChange={(e) =>
                                handleInputChange('fatherInfo', e.target.value, 'qualification')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Occupation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Occupation
                        </label>
                        <input
                            type="text"
                            value={studentData.fatherInfo.occupation}
                            onChange={(e) =>
                                handleInputChange('fatherInfo', e.target.value, 'occupation')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={studentData.fatherInfo.phone}
                            onChange={(e) =>
                                handleInputChange('fatherInfo', e.target.value, 'phone')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={studentData.fatherInfo.email}
                            onChange={(e) =>
                                handleInputChange('fatherInfo', e.target.value, 'email')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Office Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Office Phone
                        </label>
                        <input
                            type="tel"
                            value={studentData.fatherInfo.officePhone}
                            onChange={(e) =>
                                handleInputChange('fatherInfo', e.target.value, 'officePhone')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Office Address */}
                <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Office Address
                    </label>
                    <textarea
                        rows={2}
                        value={studentData.fatherInfo.officeAddress}
                        onChange={(e) =>
                            handleInputChange('fatherInfo', e.target.value, 'officeAddress')
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            </fieldset>

            {/* Mother Info */}
            <fieldset className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
                <legend className="text-sm font-semibold text-gray-500 px-2">
                    Mother Information
                </legend>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={studentData.motherInfo.name}
                            onChange={(e) =>
                                handleInputChange('motherInfo', e.target.value, 'name')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Qualification */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Qualification
                        </label>
                        <input
                            type="text"
                            value={studentData.motherInfo.qualification}
                            onChange={(e) =>
                                handleInputChange('motherInfo', e.target.value, 'qualification')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Occupation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Occupation
                        </label>
                        <input
                            type="text"
                            value={studentData.motherInfo.occupation}
                            onChange={(e) =>
                                handleInputChange('motherInfo', e.target.value, 'occupation')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={studentData.motherInfo.phone}
                            onChange={(e) =>
                                handleInputChange('motherInfo', e.target.value, 'phone')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={studentData.motherInfo.email}
                            onChange={(e) =>
                                handleInputChange('motherInfo', e.target.value, 'email')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Office Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Office Phone
                        </label>
                        <input
                            type="tel"
                            value={studentData.motherInfo.officePhone}
                            onChange={(e) =>
                                handleInputChange('motherInfo', e.target.value, 'officePhone')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Office Address */}
                <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Office Address
                    </label>
                    <textarea
                        rows={2}
                        value={studentData.motherInfo.officeAddress}
                        onChange={(e) =>
                            handleInputChange('motherInfo', e.target.value, 'officeAddress')
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            </fieldset>

            {/* Guardian Info */}
            <fieldset className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
                <legend className="text-sm font-semibold text-gray-500 px-2">
                    Guardian Information
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
                        <input
                            type="text"
                            value={studentData.guardianName}
                            onChange={(e) => handleInputChange('guardianName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                        <input
                            type="text"
                            value={studentData.guardianRelation}
                            onChange={(e) => handleInputChange('guardianRelation', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                        <input
                            type="text"
                            value={studentData.relativeContactNo}
                            onChange={(e) => handleInputChange('relativeContactNo', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </fieldset>

            {/* Annual Income */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
                <input
                    type="text"
                    value={studentData.annualIncome}
                    onChange={(e) => handleInputChange('annualIncome', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>
        </div>
    )
}

export default FamilyTab
