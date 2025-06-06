// src/components/StudentEmployeeAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstitution } from '../../../contexts/InstitutionContext';

export default function StudentEmployeeAnalytics() {
    const { userData } = useAuth();
    const { school } = useInstitution();
    const [loading, setLoading] = useState(true);
    const [animateChart, setAnimateChart] = useState(false);
    const [studentCounts, setStudentCounts] = useState({ male: 0, female: 0, other: 0 });
    const [employeeCounts, setEmployeeCounts] = useState({ teaching: 0, other: 0 });
    const [selectedClass, setSelectedClass] = useState('');

    useEffect(() => {
        const code = school.Code;
        if (!code) return;
        const fetchData = async () => {
            const studentQueries = [
                query(
                    collection(db, "students"),
                    where("schoolCode", "==", code),
                    ...(selectedClass ? [where("class", "==", selectedClass.toLowerCase())] : [])
                )
            ];
            const [newStudentsSnap] = await Promise.all([
                getDocs(studentQueries[0])
            ]);

            const studentsSnap = [...newStudentsSnap.docs];

            const sexes = { male: 0, female: 0, other: 0 };
            studentsSnap.forEach(doc => {
                const g = (doc.data().gender || '').toLowerCase();
                if (g === 'male') sexes.male++;
                else if (g === 'female') sexes.female++;
                else sexes.other++;
            });
            setStudentCounts(sexes);

            const empSnap = await getDocs(
                query(
                    collection(db, 'Employees'),
                    where('schoolCode', '==', code),
                    where('active', '==', true)
                )
            );
            let teaching = 0;
            empSnap.docs.forEach(doc => {
                if (doc.data().type === 'Teaching') teaching++;
            });
            setEmployeeCounts({ teaching, other: empSnap.size - teaching });

            setLoading(false);
            setTimeout(() => setAnimateChart(true), 300);
        };

        fetchData();
    }, [userData, selectedClass, school]);

    if (loading) {
        return <div className="text-center py-8">Loading analytics…</div>;
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    const makeSegments = (counts) => {
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 0;
        const segments = [];
        let offset = 0;
        Object.entries(counts).forEach(([key, val], idx) => {
            const pct = total ? (val / total) * 100 : 0;
            const dash = pct ? (pct / 100) * circumference : 0;
            segments.push({
                key,
                value: val,
                percentage: pct,
                dasharray: animateChart ? `${dash} ${circumference}` : `0 ${circumference}`,
                dashoffset: animateChart ? -offset : 0,
            });
            offset += dash;
        });
        return { segments, total };
    };

    const studentData = makeSegments(studentCounts);
    const employeeData = makeSegments(employeeCounts);

    const studentColors = {
        male: '#6366f1',
        female: '#8b5cf6',
        other: '#c4b5fd'
    };

    const employeeColors = {
        teaching: '#7c3aed',
        other: '#a78bfa'
    };

    const renderDonut = (data, colors, title) => {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow w-full">
                <h2 className="text-md text-center font-bold text-gray-800 mb-6 border-b border-violet-100 pb-3">{title}</h2>
                <div className="relative w-32 h-32 mx-auto">
                    <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                        {data?.segments && data.segments.length &&
                            data.segments.filter((seg) => seg.value !== 0).map((seg, i) => (
                                <circle
                                    key={seg.key}
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="transparent"
                                    stroke={colors[seg.key]}
                                    strokeWidth="16"
                                    strokeDasharray={seg.dasharray}
                                    strokeDashoffset={seg.dashoffset}
                                    className="transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800">{data.total}</span>
                        <span className="text-sm text-gray-500">Total</span>
                    </div>
                </div>
                {renderLegend(data, colors)}
            </div>
        );
    };

    const renderLegend = (data, colors) => (
        <div className="mt-6 grid grid-cols-1 gap-2">
            {data.segments.map((seg) => (
                <div
                    key={seg.key}
                    className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center">
                        <div
                            className="w-4 h-4 rounded-sm mr-3 shadow-sm"
                            style={{ backgroundColor: colors[seg.key] }}
                        />
                        <span className="text-sm text-gray-600 capitalize">{seg.key}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                        {seg.value} ({seg.percentage.toFixed(1)}%)
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="w-full px-4 py-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    <option value="">All Classes</option>
                    {(school.class?.length ? school.class : [
                        "Nursery", "JRKG", "SRKG", "1st", "2nd", "3rd", "4th",
                        "5th", "6th", "7th", "8th", "9th"
                    ]).map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Donut */}
                {renderDonut(studentData, studentColors, "Student Gender Distribution")}

                {/* Employee Donut */}
                {renderDonut(employeeData, employeeColors, "Employee Role Distribution")}
            </div>
        </div>
    );
}
