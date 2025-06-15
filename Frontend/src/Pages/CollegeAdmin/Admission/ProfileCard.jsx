import {
    Book,
    Calendar,
    User,
    Phone,
    Mail,
    CheckCircle,
    XCircle,
    Save,
} from "lucide-react"
function ProfileCard({ studentData, handleSave, handleApprove, handleReject, }) {
    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };
    return (
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 sticky top-6">
                {/* Student Avatar */}
                <div className="text-center mb-6">
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-green-100 mb-4">
                        {studentData.profileImagePath && studentData.profileImage ? (
                            <img
                                src={studentData.profileImage}
                                alt={`${studentData.fName} ${studentData.surname}`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User className="w-12 h-12 text-green-600" />
                            </div>
                        )}
                    </div>
                    <h3 className="capitalize text-xl font-bold text-gray-900">
                        {studentData.fName} {studentData.middleName} {studentData.surname}
                    </h3>
                    <p className="text-sm text-gray-500">Student ID: {studentData.id}</p>
                </div>

                {/* Key Details */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Book className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm text-gray-500">Course</p>
                            <p className="font-medium">{studentData.course.toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm text-gray-500">Applied On</p>
                            <p className="font-medium">{formatDateTime(studentData.updatedAt)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm text-gray-500">Category</p>
                            <p className="font-medium">{studentData.category}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm text-gray-500">Contact</p>
                            <p className="font-medium">{studentData.collegeCommunicationMobileNo[0]}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-xs">{studentData.email}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                    <button
                        onClick={handleSave}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>

                    <button
                        onClick={handleApprove}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                    </button>

                    <button
                        onClick={handleReject}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        Reject
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProfileCard
