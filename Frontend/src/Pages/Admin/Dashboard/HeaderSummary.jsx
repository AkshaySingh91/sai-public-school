import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, UserCircle, IndianRupee } from 'lucide-react';

export function HeaderSummary({
    totalStudents,
    totalTeachers,
    totalEmployees,
    totalEarnings,
}) {
    const [animated, setAnimated] = useState({
        students: 0,
        teachers: 0,
        employees: 0,
        earnings: 0,
    });
    useEffect(() => {
        const duration = 2000;
        const steps = 50;
        const incStudent = Math.ceil(totalStudents / steps);
        const incTeacher = Math.ceil(totalTeachers / steps);
        const incEmployee = Math.ceil(totalEmployees / steps);
        const incEarnings = Math.ceil(totalEarnings / steps);
        let s = 0, t = 0, e = 0, g = 0;

        const timer = setInterval(() => {
            s = Math.min(s + incStudent, totalStudents);
            t = Math.min(t + incTeacher, totalTeachers);
            e = Math.min(e + incEmployee, totalEmployees);
            g = Math.min(g + incEarnings, totalEarnings);
            // console.log(s, t, e, g)

            setAnimated({ students: s, teachers: t, employees: e, earnings: g });
            if (s === totalStudents && t === totalTeachers && e === totalEmployees && g === totalEarnings) {
                clearInterval(timer);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [totalStudents, totalTeachers, totalEmployees, totalEarnings]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard icon={<GraduationCap className="w-6 h-6 text-blue-600" />}
                title="Total Students"
                value={animated.students} />
            <SummaryCard icon={<Users className="w-6 h-6 text-green-600" />}
                title="Total Teachers"
                value={animated.teachers} />
            <SummaryCard icon={<UserCircle className="w-6 h-6 text-purple-600" />}
                title="Total Employees"
                value={animated.employees} />
            <SummaryCard icon={<IndianRupee className="w-6 h-6 text-amber-600" />}
                title="Total Earnings"
                value={animated.earnings}
                isCurrency />
        </div>
    );
}

function SummaryCard({ icon, title, value, isCurrency = false }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition h-full flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg mr-4">{icon}</div>
            <div>
                <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                <p className="text-2xl font-semibold text-gray-900">
                    {isCurrency && '₹'}{value.toLocaleString()}
                </p>
            </div>
        </div>
    );
}
