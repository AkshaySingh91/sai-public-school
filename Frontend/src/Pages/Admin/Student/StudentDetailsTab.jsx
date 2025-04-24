import React from 'react'

function StudentDetailsTab({ formData, setFormData, schoolData }) {
    return (
        <>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField
                                icon={<User className="w-5 h-5" />}
                                label="First Name"
                                value={formData.fname}
                                onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                            />
                            <InputField
                                icon={<User className="w-5 h-5" />}
                                label="Middle Name"
                                value={formData.mname}
                                onChange={(e) => setFormData({ ...formData, mname: e.target.value })}
                            />
                            <InputField
                                icon={<User className="w-5 h-5" />}
                                label="Last Name"
                                value={formData.lname}
                                onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                            />
                            <InputField
                                icon={<CalendarDays className="w-5 h-5" />}
                                label="Date of Birth"
                                type="date"
                                value={formData.dob}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                            />
                            <SelectField
                                icon={<VenusAndMars className="w-5 h-5" />}
                                label="Gender"
                                options={['Male', 'Female', 'Other']}
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                            Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                icon={<Mail className="w-5 h-5" />}
                                label="Student Email"
                                type="email"
                                value={formData.studentEmail}
                                onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                            />
                            <InputField
                                icon={<Phone className="w-5 h-5" />}
                                label="Student Mobile"
                                value={formData.studentMobile}
                                onChange={(e) => setFormData({ ...formData, studentMobile: e.target.value })}
                            />
                            <InputField
                                icon={<Phone className="w-5 h-5" />}
                                label="Father's Mobile"
                                value={formData.fatherMobile}
                                onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                            />
                            <InputField
                                icon={<Phone className="w-5 h-5" />}
                                label="Mother's Mobile"
                                value={formData.motherMobile}
                                onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                            Academic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                icon={<GraduationCapIcon className="w-5 h-5" />}
                                label="Class"
                                value={formData.class}
                                disabled
                            />
                            <InputField
                                icon={<Hash className="w-5 h-5" />}
                                label="Division"
                                value={formData.div}
                                onChange={(e) => setFormData({ ...formData, div: e.target.value })}
                            />
                            <InputField
                                icon={<CalendarDays className="w-5 h-5" />}
                                label="Academic Year"
                                value={formData.academicYear}
                                disabled
                            />
                            <InputField
                                icon={<Ticket className="w-5 h-5" />}
                                label="Coupon Code"
                                value={formData.couponCode}
                                onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
                            Additional Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                icon={<HomeIcon className="w-5 h-5" />}
                                label="Address"
                                textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                            <InputField
                                icon={<CreditCardIcon className="w-5 h-5" />}
                                label="Aadhar Number"
                                value={formData.addharNo}
                                onChange={(e) => setFormData({ ...formData, addharNo: e.target.value })}
                            />
                            <SelectField
                                icon={<Utensils className="w-5 h-5" />}
                                label="Meal Service"
                                options={['Yes', 'No']}
                                value={formData.mealService}
                                onChange={(e) => setFormData({ ...formData, mealService: e.target.value })}
                            />
                            <InputField
                                icon={<Bus className="w-5 h-5" />}
                                label="Bus Stop"
                                value={formData.busStop}
                                onChange={(e) => setFormData({ ...formData, busStop: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
// Reusable Components
const InputField = ({ icon, label, textarea = false, ...props }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center">
            <span className="mr-2 text-purple-500">{icon}</span>
            {label}
        </label>
        {textarea ? (
            <textarea
                {...props}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                rows="3"
            />
        ) : (
            <input
                {...props}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
        )}
    </div>
);
export default StudentDetailsTab
