import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiUsers, FiTrendingUp, FiClock, FiBook, FiCalendar } from "react-icons/fi"
import { useAuth } from '../../contexts/AuthContext';
import EventCalendar from './Dashboard/EventCalander';
import { HeaderSummary } from './Dashboard/HeaderSummary';
import StudentEmployeeAnalytics from "./Dashboard/StudentEmployeeAnalytics"
import WeeklyCollectionChart from './Dashboard/WeeklyCollectionChart';
import DayHourLineChart from './Dashboard/DayHourLineChart';
import SchoolMetricsCards from './Dashboard/SchoolMetricsCards';
import StudentDemographics from './Dashboard/StudentDemographics';
import handWave from "../../assets/handWave.svg"
import { useSchool } from '../../contexts/SchoolContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
// Color palette
const colors = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#a855f7',
    background: '#f8fafc',
    text: '#1e293b'
};

const AdminDashboard = () => {
    const { userData } = useAuth();
    const { school } = useSchool();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalEmployees: 0,
        totalEarnings: 0,
    });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function fetchData() {
            if (!school?.Code) return;
            // if (!userData?.schoolCode) return;
            const code = school.Code;
            const newStudentsSnap = await getDocs(
                query(collection(db, "students"), where("schoolCode", "==", code))
            );
            // Combine results
            const studentSnap = [
                ...newStudentsSnap.docs,
            ];
            const totalStudents = studentSnap.length;
            //   Employees & teachers
            const empSnap = await getDocs(
                query(
                    collection(db, "Employees"),
                    where("schoolCode", "==", code)
                )
            );
            const totalEmployees = empSnap.size;
            const totalTeachers = empSnap.docs
                .filter(d => d.data().type === "Teaching")
                .length;

            //   Sum up “current‐year” earnings by walking each student’s array
            let totalEarnings = 0;
            const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const toDate = new Date();

            studentSnap.forEach(docSnap => {
                const student = docSnap.data();
                // remove student that has added from external system, show pending transaction also 
                const filteredTxs = (student.transactions || []).filter((t) => {
                    return !isNaN(Number(t.receiptId)) || (isNaN(Number(t.receiptId)) && t.status !== "completed");
                })
                filteredTxs.forEach((t) => {
                    const txDate = new Date(t.timestamp);
                    if (txDate >= fromDate && txDate <= toDate) {
                        totalEarnings += Number(t.amount) || 0;
                    }
                });
            });
            // Finally, stash it all in state
            setStats({
                totalStudents,
                totalTeachers,
                totalEmployees,
                totalEarnings,
            });
            setLoading(false);
        }

        fetchData();
    }, [school, userData]);

    return (
        <div className="bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen space-y-6 p-2">
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-6 py-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Left Section */}
                    <div className="flex  items-center gap-4 flex-wrap">
                        <img
                            className=" w-14 h-14 animate-wiggle"
                            src={handWave}
                            alt="Welcome"
                        />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                Welcome Back, {userData?.name?.toLowerCase() || ""}!
                            </h1>
                            <p className="text-gray-600 italic mt-1 text-sm md:text-base">
                                "Education is the most powerful weapon which you can use to change the world."
                                <span className="block text-xs text-gray-400 mt-1">- Nelson Mandela</span>
                            </p>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-4 z-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                        {/* Profile Image with Fallback */}
                        <div className="relative">
                            {/* Photo Container */}
                            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-black/20 shadow-xl">
                                {userData.profileImage ? (
                                    <img
                                        src={userData.profileImage}
                                        className="w-full h-full object-cover"
                                        alt="Profile"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                                        <span>{userData?.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Shine Effect */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                        </div> 
                        {/* User Info */}
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">{userData?.name || ""}</span>
                            <span className="text-sm text-purple-600 font-medium">{userData.role}</span>
                        </div>
                    </div>
                </div>

                {/* Optional: Quote Rotator (Add more quotes for rotation) */}
                <div className="mt-4 text-center md:text-right">
                    <p className="text-sm text-gray-500 italic">
                        {[
                            "The art of teaching is the art of assisting discovery.",
                            "Education is not preparation for life; education is life itself.",
                            "Teaching kids to count is fine, but teaching them what counts is best."
                        ][Math.floor(Math.random() * 3)]}
                    </p>
                </div>
            </div>
            {/* Top Metrics Row */}
            <HeaderSummary
                totalStudents={stats.totalStudents}
                totalTeachers={stats.totalTeachers}
                totalEmployees={stats.totalEmployees}
                totalEarnings={stats.totalEarnings}
            />

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <motion.div
                        className="bg-gradient-to-r from-slate-50 to-indigo-50  rounded-3xl p-6 shadow-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <FiUsers className="text-purple-600 text-2xl" />
                            <h2 className="text-2xl font-bold text-gray-800">Community Analytics</h2>
                        </div>
                        <StudentEmployeeAnalytics />
                    </motion.div>

                    <motion.div
                        className="bg-gradient-to-r from-slate-50 to-indigo-50  rounded-3xl p-6 shadow-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <FiBook className="text-purple-600 text-2xl" />
                            <h2 className="text-2xl font-bold text-gray-800">Student Demographics</h2>
                        </div>
                        <StudentDemographics />
                    </motion.div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <motion.div
                        className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-3xl p-6 shadow-xl"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <FiTrendingUp className="text-purple-600 text-2xl" />
                                <h2 className="text-2xl font-bold text-gray-800">Weekly Collection Trend</h2>
                            </div>
                        </div>
                        <WeeklyCollectionChart />
                    </motion.div>

                    <motion.div
                        className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-3xl p-6 shadow-xl"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <DayHourLineChart />
                    </motion.div>

                    <motion.div
                        className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-3xl p-6 shadow-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                    >
                        <SchoolMetricsCards />
                    </motion.div>
                    <motion.div
                        className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-3xl p-6 shadow-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <FiCalendar className="text-purple-600 text-2xl" />
                            <h2 className="text-2xl font-bold text-gray-800">Academic Calendar</h2>
                        </div>
                        <EventCalendar />
                    </motion.div>
                </div>
            </div>

        </div>
    );
};
export default AdminDashboard