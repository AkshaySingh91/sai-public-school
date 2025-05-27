import { useState } from 'react';
import { User, Phone, } from 'lucide-react';

const StudentStockProfilCard = ({ student }) => {
    console.log(student)
    const getStatusBadge = (status) => {
        const statusConfig = {
            current: { bg: 'bg-green-100', text: 'text-green-700', label: 'Current' },
            inactive: { bg: 'bg-red-100', text: 'text-red-700', label: 'Inactive' },
            new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
            transferred: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Rolled' }
        };

        const config = statusConfig[status?.toLowerCase()] || statusConfig.current;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        try {
            const [day, month, year] = dateString.split('-');
            return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const InfoCard = ({ label, value, className = "" }) => (
        <div className={`bg-gradient-to-br from-gray-50 to-gray-100 p-2 rounded-lg border border-gray-200 hover:shadow-md transition-all w-auto ${className}`}>
            <div className="mb-2 text-xs text-gray-500 font-medium whitespace-nowrap text-center ">{label}</div>
            <div className="font-semibold text-gray-800 text-sm leading-tight text-center capitalize">{value || '-'}</div>
        </div>
    );
    return (
        <aside className="lg:w-1/3 w-full h-fit lg:sticky lg:top-6">
            <div className="rounded-xl space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:scrollbar-thin lg:scrollbar-thumb-purple-200 lg:scrollbar-track-transparent">
                {/* Main Profile Card */}
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30">
                                <User size={40} className="text-white" />
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-1 capitalize">
                                    {student.fname} {student.fatherName} {student.lname}
                                </h2>
                                <p className="text-purple-100 mb-3">
                                    Class {student.class} - Division {student.div?.toUpperCase()}
                                </p>
                                <div className="flex justify-center">
                                    {getStatusBadge(student.status)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Basic Info Grid */}
                    <div className="p-2">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <InfoCard
                                label="Date of Birth"
                                value={formatDate(student.dob)}
                            />
                            <InfoCard
                                label="Gender"
                                value={student.gender}
                            />
                            <InfoCard
                                label="Academic Year"
                                value={student.academicYear}
                            />
                            <InfoCard
                                label="Student Type"
                                value={student?.type?.toUpperCase()}
                            />
                        </div>

                        {/* Quick Contact */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 mb-4">
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Phone size={16} className="text-blue-600" />
                                Quick Contact
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between ">
                                    <span className="text-gray-600">Father:</span>
                                    <a href={`tel:${student.fatherMobile}`} className="text-blue-600 hover:underline font-medium">
                                        {student.fatherMobile}
                                    </a>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Mother:</span>
                                    <a href={`tel:${student.motherMobile}`} className="text-blue-600 hover:underline font-medium">
                                        {student.motherMobile || "-"}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default StudentStockProfilCard;