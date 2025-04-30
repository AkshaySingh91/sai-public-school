
// src/components/StudentEmployeeAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';

export default function StudentEmployeeAnalytics() {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [animateChart, setAnimateChart] = useState(false);
    const [studentCounts, setStudentCounts] = useState({ male: 0, female: 0, other: 0 });
    const [employeeCounts, setEmployeeCounts] = useState({ teaching: 0, other: 0 });

    // Fetch data on mount
    useEffect(() => {
        if (!userData?.schoolCode) return;
        const fetchData = async () => {
            const code = userData.schoolCode;

            const newStudentsSnap = await getDocs(
                query(collection(db, "students"), where("schoolCode", "==", code), where("status", "==", "new"))
            );

            const currentStudentsSnap = await getDocs(
                query(collection(db, "students"), where("schoolCode", "==", code), where("status", "==", "current"))
            );
            // Combine results
            const studentsSnap = [
                ...newStudentsSnap.docs,
                ...currentStudentsSnap.docs
            ];

            const sexes = { male: 0, female: 0, other: 0 };
            studentsSnap.forEach(doc => {
                const g = (doc.data().gender || '').toLowerCase();
                if (g === 'male') sexes.male++;
                else if (g === 'female') sexes.female++;
                else sexes.other++;
            });
            setStudentCounts(sexes);

            // 2) Active employees
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
            // trigger chart animation
            setTimeout(() => setAnimateChart(true), 300);
        };

        fetchData();
    }, [userData]);

    if (loading) {
        return <div className="text-center py-8">
            Loading analytics…
        </div>;
    }

    // Utility: donut geometry
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    const makeSegments = (counts) => {
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        const segments = [];
        let offset = 0;
        Object.entries(counts).forEach(([key, val], idx) => {
            const pct = (val / total) * 100;
            const dash = (pct / 100) * circumference;
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

    // Color maps
    const studentColors = {
        male: '#6366f1',    // Indigo-600
        female: '#8b5cf6',  // Violet-500
        other: '#c4b5fd'    // Violet-300
    };

    const employeeColors = {
        teaching: '#7c3aed', // Violet-700
        other: '#a78bfa'     // Violet-400
    };

    const renderDonut = (data, colors, title) => {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <h2 className="text-md text-center  font-bold text-gray-800 mb-6 border-b border-violet-100 pb-3">
                    {title}
                </h2>
                <div className="relative w-32 h-32 mx-auto">
                    <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                        {data?.segments && data.segments.length &&
                            data.segments.filter((seg) => seg.value).map((seg, i) => (
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
        )
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
                        <span className="text-sm text-gray-600 capitalize">
                            {seg.key}
                        </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                        {seg.value} ({seg.percentage.toFixed(1)}%)
                    </span>
                </div>
            ))}
        </div>
    );

    console.log(studentData, studentColors)
    return (
        <div className="grid grid-rows-1 md:grid-rows-2 gap-6 max-w-4xl mx-auto p-4">
            {/* Students Breakdown */}
            {renderDonut(studentData, studentColors, "Student Gender Distribution")}

            {/* Employees Breakdown */}
            {renderDonut(employeeData, employeeColors, "Employee Role Distribution")}
        </div>
    );
}