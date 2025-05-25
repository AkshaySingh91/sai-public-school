// src/student/Dashboard/WeeklyCollectionChart.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { ChevronDown, RefreshCw, Info } from 'lucide-react';

export default function WeeklyCollectionChart() {
    const { userData } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('All Classes');
    const [academicYear, setAcademicYear] = useState(null);
    const [bars, setBars] = useState(Array(7).fill({ percent: 0 }));
    const [loading, setLoading] = useState(true);
    const [animate, setAnimate] = useState(false);

    // Load school info
    useEffect(() => {
        async function loadSchool() {
            if (!userData?.schoolCode) return;
            const q = query(collection(db, 'schools'), where('Code', '==', userData.schoolCode));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                setClasses(data.class || []);
                setAcademicYear(data.academicYear);
            }
        }
        loadSchool();
    }, [userData]);
    // Fetch data with animations
    useEffect(() => {
        if (!academicYear) return;
        setAnimate(false);
        const timer = setTimeout(() => {
            fetchWeeklyData().then(() => {
                setTimeout(() => setAnimate(true), 50);
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [academicYear, selectedClass]);


    async function fetchWeeklyData() {
        setLoading(true);

        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            return {
                key: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString('en-US', { weekday: 'short' })
            };
        });

        let studQ = query(
            collection(db, 'students'),
            where('schoolCode', '==', userData.schoolCode),
            where('academicYear', '==', academicYear)
        );
        if (selectedClass !== 'All Classes') studQ = query(studQ, where('class', 'in', selectedClass));

        const studSnap = await getDocs(studQ);
        const sums = days.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {});
        studSnap.docs.forEach(d => {
            (d.data().transactions || []).forEach(tx => {
                // it means we exclude transaction of studnet imported from other system
                if (!isNaN(Number(tx.receiptId))) {
                    const date = tx.timestamp?.slice(0, 10);
                    if (date in sums) sums[date] += Number(tx.amount) || 0;
                }
            });
        });

        const maxAmount = Math.max(...Object.values(sums), 1);
        const barData = days.map(({ key, label }) => ({
            key,
            label,
            amount: sums[key],
            percent: (sums[key] / maxAmount) * 100
        }));
        setBars(barData);
        setLoading(false);
    }
    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 max-w-3xl mx-auto  transition-shadow">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-800 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text flex">
                        Refresh
                    </h2>
                    <button
                        onClick={fetchWeeklyData}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Refresh data"
                    >
                        <RefreshCw size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="relative group">
                    <select
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    >
                        <option>All Classes</option>
                        {classes.map(cls => <option key={cls}>{cls}</option>)}
                    </select>
                    <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-purple-600 transition-colors"
                        size={16}
                    />
                </div>
            </div>

            {loading ? (
                <div className="h-48 flex flex-col justify-end gap-4 relative overflow-hidden">
                    {/* Animated shimmer overlay */}
                    <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />

                    <div className="flex justify-between items-end h-full gap-3">
                        {Array(7).fill().map((_, i) => (
                            <div key={i} className="flex flex-col items-center flex-1 group">
                                {/* Animated gradient bar */}
                                <div
                                    className="w-10 bg-gradient-to-b from-gray-200 via-gray-100 to-gray-200 
                                         rounded-t-lg animate-pulse-slow"
                                    style={{
                                        height: `${80 - (i * 7)}%`,
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                >
                                    {/* Inner shimmer effect */}
                                    <div className="h-full w-full bg-gradient-to-t from-white/30 to-transparent rounded-t-lg" />
                                </div>

                                {/* Placeholder label */}
                                <div className="mt-3 h-4 w-12 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Bottom loading status */}
                    <div className="mt-6 flex justify-between items-center">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
            ) : (
                // Updated chart rendering section
                <div className="flex items-end justify-between h-48 gap-3 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-50/50 to-transparent pointer-events-none" />

                    {bars.map(({ key, label, amount, percent }, i) => {
                        const hasValue = amount > 0;
                        return (
                            <div key={key} className="flex flex-col items-center flex-1 group h-full">
                                <div className="relative h-full w-10">
                                    {/* Background bar (always visible) */}
                                    <div
                                        className="absolute bottom-0 w-full bg-gray-200 rounded-t-lg transition-all duration-300"
                                        style={{ height: '100%' }}
                                    />

                                    {/* Foreground value bar */}
                                    {hasValue && (
                                        <div
                                            className={`absolute bottom-0 w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg
                                shadow-lg hover:shadow-purple-200 transition-all duration-700 ease-out
                                ${animate ? 'opacity-100' : 'opacity-0 translate-y-10'}`}
                                            style={{
                                                height: animate ? `${percent}%` : '0%',
                                                transitionDelay: `${i * 75}ms`
                                            }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                                                    ₹{amount.toLocaleString()}
                                                    <div className="absolute w-2 h-2 bg-gray-800 rotate-45 -bottom-1 left-1/2 -translate-x-1/2" />
                                                </div>
                                            </div>
                                            {hasValue && (
                                                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/90 font-medium">
                                                    {percent.toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className={`mt-3 text-sm font-medium ${hasValue ? 'text-purple-600' : 'text-gray-400'}`}>
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-6 flex justify-between items-center text-sm text-gray-500">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Info size={16} className="text-purple-600" />
                        <span>Hover bars for exact amounts</span>
                    </div>
                    {/* tell them that we dont show cheque pending amount */}
                    <div className="flex items-center gap-2">
                        <Info size={16} className="text-purple-600" />
                        <span>Only completed anount will shown</span>
                    </div>
                </div>
                <span className="font-medium">
                    Total: ₹ {bars.reduce((sum, bar) => sum + bar.amount, 0).toLocaleString()}
                </span>
            </div>
        </div>
    );
}