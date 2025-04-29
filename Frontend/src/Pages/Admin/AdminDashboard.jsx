import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiDollarSign, FiPieChart, FiBook, FiClock, FiTrendingUp } from 'react-icons/fi';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from 'react-loading-skeleton';
import EventCalendar from './Dashboard/EventCalander';
import { HeaderSummary } from './Dashboard/HeaderSummary';
import StudentEmployeeAnalytics from "./Dashboard/StudentEmployeeAnalytics"

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


    const StatCard = ({ title, value, icon, trend }) => (
        <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ y: -5 }}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${trend}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                    <p className="text-2xl font-bold text-gray-800">
                        {loading ? <Skeleton width={100} /> : value?.toLocaleString()}
                    </p>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
            {/* Top Section */}
            <HeaderSummary
                totalStudents={stats.totalStudents}
                totalTeachers={stats.totalTeachers}
                totalEmployees={stats.totalEmployees}
                totalEarnings={stats.totalEarnings}
            />
            <StudentEmployeeAnalytics />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Key Metrics */}
                {/* <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard
                        title="Total Students"
                        value={stats.totalStudents}
                        icon={<FiUsers className="w-6 h-6 text-white" />}
                        trend="from-indigo-500 to-purple-500"
                    />
                    <StatCard
                        title="Total Staff"
                        value={stats.totalStaff}
                        icon={<FiUsers className="w-6 h-6 text-white" />}
                        trend="from-violet-500 to-fuchsia-500"
                    />
                    <StatCard
                        title="Today's Collection"
                        value={stats.todaysCollection}
                        icon={<FiDollarSign className="w-6 h-6 text-white" />}
                        trend="from-blue-500 to-cyan-500"
                    />
                    <StatCard
                        title="Pending Fees"
                        value={(stats.expectedCollection || 0) - (stats.collectedFee || 0)}
                        icon={<FiTrendingUp className="w-6 h-6 text-white" />}
                        trend="from-rose-500 to-pink-500"
                    />
                </div> */}


                {/* Event Calendar */}
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Event Calendar</h2>
                    <EventCalendar />
                </div>
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gender Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Gender Distribution</h3>
                    <div className="h-72">
                        {loading ? <Skeleton height={288} /> : (
                            <Doughnut
                                data={{
                                    labels: ['Male', 'Female'],
                                    datasets: [{
                                        data: [genderData.male, genderData.female],
                                        backgroundColor: ['#6366f1', '#a855f7'],
                                        borderWidth: 0
                                    }]
                                }}
                                options={{
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { color: colors.text }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => `${ctx.label}: ${ctx.raw} (${ctx.formattedValue}%)`
                                            }
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Fee Collection Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Fee Collection Trend</h3>
                    <div className="h-72">
                        {loading ? <Skeleton height={288} /> : (
                            <Bar
                                data={{
                                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                                    datasets: [{
                                        label: 'Collection (₹)',
                                        data: [12000, 19000, 3000, 5000, 2000, 3000],
                                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                                        borderRadius: 6,
                                        borderSkipped: false
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        legend: { display: false },
                                        title: { display: false }
                                    },
                                    scales: {
                                        x: {
                                            grid: { display: false },
                                            ticks: { color: colors.text }
                                        },
                                        y: {
                                            beginAtZero: true,
                                            grid: { color: '#e2e8f0' },
                                            ticks: {
                                                color: colors.text,
                                                callback: (value) => `₹${value / 1000}k`
                                            }
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Fee Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Fee Distribution</h3>
                    <div className="h-72">
                        {loading ? <Skeleton height={288} /> : (
                            <Doughnut
                                data={{
                                    labels: ['Academic', 'Transport', 'Hostel', 'Mess'],
                                    datasets: [{
                                        data: [stats.expectedCollection * 0.6, stats.expectedCollection * 0.2, stats.expectedCollection * 0.15, stats.expectedCollection * 0.05],
                                        backgroundColor: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'],
                                        borderWidth: 0
                                    }]
                                }}
                                options={{
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { color: colors.text }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => `₹${ctx.raw.toLocaleString()} (${ctx.formattedValue}%)`
                                            }
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-1 gap-6">
                    <StatCard
                        title="Expected Collection"
                        value={stats.expectedCollection}
                        icon={<FiDollarSign className="w-6 h-6 text-white" />}
                        trend="from-purple-500 to-indigo-500"
                    />
                    <StatCard
                        title="Discounted Amount"
                        value={stats.discountedAmount}
                        icon={<FiPieChart className="w-6 h-6 text-white" />}
                        trend="from-fuchsia-500 to-pink-500"
                    />
                    <StatCard
                        title="Last Year Balance"
                        value={stats.lastYearBalance}
                        icon={<FiClock className="w-6 h-6 text-white" />}
                        trend="from-violet-500 to-blue-500"
                    />
                </div>
            </div>
        </div>
    );
};
export default AdminDashboard