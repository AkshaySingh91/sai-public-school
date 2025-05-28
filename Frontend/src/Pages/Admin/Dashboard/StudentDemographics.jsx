import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { Users, GraduationCap, Hash, Layers } from 'lucide-react';
import { useSchool } from '../../../contexts/SchoolContext';

export default function StudentDemographics() {
    const { userData } = useAuth();
    const { school } = useSchool();
    // const [school, setSchool] = useState(null);
    const [studentTypes, setStudentTypes] = useState([]);
    const [classStrength, setClassStrength] = useState([]);
    const [loading, setLoading] = useState(true);
    const divisions = school.divisions ? school.divisions : ['A', 'B', 'C', 'D', 'E', 'SEMI'];

    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.schoolCode) return;

            try {
                // Fetch student type counts 
                const types = school.studentsType && school.studentsType.length ? school.studentsType.map(t => t.toLowerCase()) : [];
                const typeCounts = await Promise.all(types.map(async (type) => {
                    const q = query(
                        collection(db, 'students'),
                        where('schoolCode', '==', userData.schoolCode),
                        where('type', '==', type)
                    );
                    const snap = await getDocs(q);
                    return { type, count: snap.size };
                }));
                setStudentTypes(typeCounts);

                // Fetch class division counts
                const classes = school.class || [];
                const strengthData = await Promise.all(classes.map(async (cls) => {
                    const divisionCounts = await Promise.all(divisions.map(async (div) => {
                        const q = query(
                            collection(db, 'students'),
                            where('schoolCode', '==', userData.schoolCode),
                            where('class', '==', cls?.toLowerCase()),
                            where('div', '==', div?.toLowerCase())
                        );
                        const snap = await getDocs(q);
                        return snap.size > 0 ? snap.size : '-';
                    }));

                    const total = divisionCounts.reduce((sum, val) =>
                        typeof val === 'number' ? sum + val : sum, 0);

                    return { class: cls, divisions: divisionCounts, total };
                }));
                ({ strengthData })
                setClassStrength(strengthData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userData]);

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-600">
                Loading demographic data...
            </div>
        );
    }

    return (
        <div className="space-y-8 py-6">
            {/* Student Type Card */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-xl border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <Users className="text-purple-600" size={24} />
                        <h2 className="text-xl font-semibold text-gray-800">
                            Student Type Distribution
                        </h2>
                    </div>
                </div>

                <div className="overflow-x-auto uppercase">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                                    Total Students
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {studentTypes.length > 0 ? (
                                studentTypes.map(({ type, count }, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-800 font-medium">{type}</td>
                                        <td className="px-6 py-4 text-right text-gray-700">
                                            {count.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                                        No student types configured
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Class Strength Card */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-xl border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <GraduationCap className="text-emerald-600" size={24} />
                        <h2 className="text-xl font-semibold text-gray-800">
                            Class-wise Student Strength
                        </h2>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Class</th>
                                {divisions.map((div) => (
                                    <th key={div} className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                                        {div}
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {classStrength.length > 0 ? (
                                classStrength.map(({ class: className, divisions, total }, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 text-gray-800 font-medium w-fit">{className}</td>
                                        {divisions.map((count, idx) => (
                                            <td key={idx} className="px-4 py-4 text-center text-gray-700">
                                                {count}
                                            </td>
                                        ))}
                                        <td className="px-6 py-2 text-right text-gray-700 font-medium">
                                            {total.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                        No classes configured
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <Layers className="text-gray-500" size={16} />
                    <span>Division marked with '-' indicates no students</span>
                </div>
                <div className="flex items-center gap-2">
                    <Hash className="text-gray-500" size={16} />
                    <span>Totals include all divisions</span>
                </div>
            </div>
        </div>
    );
}