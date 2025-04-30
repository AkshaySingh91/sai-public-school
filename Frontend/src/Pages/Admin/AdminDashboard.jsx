import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiUsers, FiTrendingUp, FiClock, FiBook } from "react-icons/fi"
import { useAuth } from '../../contexts/AuthContext';
import EventCalendar from './Dashboard/EventCalander';
import { HeaderSummary } from './Dashboard/HeaderSummary';
import StudentEmployeeAnalytics from "./Dashboard/StudentEmployeeAnalytics"
import WeeklyCollectionChart from './Dashboard/WeeklyCollectionChart';
import DayHourLineChart from './Dashboard/DayHourLineChart';
import SchoolMetricsCards from './Dashboard/SchoolMetricsCards';

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
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalEmployees: 0,
        totalEarnings: 0,
    });
    const [loading, setLoading] = useState(true);
    const [genderData, setGenderData] = useState({ male: 0, female: 0 });

    useEffect(() => {
        async function fetchData() {
            if (!userData?.schoolCode) return;
            const code = userData.schoolCode;

            // load the school’s own document to get the real academicYear
            const schoolQ = query(
                collection(db, "schools"),
                where("Code", "==", code)
            );
            const schoolSnap = await getDocs(schoolQ);
            if (schoolSnap.empty) {
                console.warn("No school found for code", code);
                return;
            }
            const schoolData = schoolSnap.docs[0].data();
            const currentYear = schoolData.academicYear;

            //   Active students
            const studentSnap = await getDocs(
                query(
                    collection(db, "students"),
                    where("schoolCode", "==", code),
                    where("status", "==", "active")
                )
            );
            const totalStudents = studentSnap.size;

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
            studentSnap.docs.forEach(docSnap => {
                const student = docSnap.data();
                const txs = Array.isArray(student.transactions) ? student.transactions : [];
                txs.forEach(t => {
                    if (t.academicYear === currentYear) {
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
    }, [userData]);


    return (
        <div className="bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen space-y-6">
            {/* Top Metrics Row */}
            <div className="">
                <HeaderSummary
                    totalStudents={stats.totalStudents}
                    totalTeachers={stats.totalTeachers}
                    totalEmployees={stats.totalEmployees}
                    totalEarnings={stats.totalEarnings}
                />
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    className="bg-white rounded-3xl p-6 shadow-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <FiUsers className="text-purple-600" />
                        Community Analytics
                    </h2>
                    <StudentEmployeeAnalytics />
                    <motion.div
                        className="bg-white rounded-3xl "
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                            <FiBook className="text-purple-600" />
                            Academic Calendar
                        </h2>
                        <EventCalendar />
                    </motion.div>
                </motion.div>

                <div className="grid grid-rows-1 md:grid-rows-2 lg:grid-rows-3 gap-4">
                    <motion.div
                        className="bg-white rounded-3xl p-6 shadow-xl"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                <FiTrendingUp className="text-purple-600" />
                                Weekly Collection Trend
                            </h2>
                        </div>
                        <WeeklyCollectionChart />
                    </motion.div>

                    <motion.div
                        className="bg-white rounded-3xl p-6 "
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <DayHourLineChart />
                    </motion.div>
                    <SchoolMetricsCards />
                </div>
            </div>



        </div>
    );
};
export default AdminDashboard