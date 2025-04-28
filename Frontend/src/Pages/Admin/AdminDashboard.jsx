import { motion } from "framer-motion";
import { FiSearch, FiBell, FiMail, FiPlus } from "react-icons/fi";

const stats = [
    { title: "Total Students", value: "2500", icon: "👨🎓" },
    { title: "Total Teachers", value: "150", icon: "👩🏫" },
    { title: "Total Employee", value: "600", icon: "💼" },
    { title: "Total Earnings", value: "$10,000", icon: "💰" },
];

const notices = [
    { title: "School annual sports day", date: "20 July, 2023", views: "20k" },
    { title: "Annual Function celebration", date: "05 July, 2023", views: "15k" },
    { title: "Mid term exam routine", date: "15 June, 2023", views: "22k" },
    { title: "Painting competition", date: "18 May, 2023", views: "18k" },
];

const AdminDashboard = () => {
    return (
        <div className="p-5">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center mb-5">
                <motion.h1
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    className="text-2xl font-bold mb-4 lg:mb-0"
                >
                    Welcome Back <span className="wave">👋</span>
                </motion.h1>

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <FiSearch className="absolute top-3 left-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="border rounded-full py-2 pl-10 pr-4 w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex space-x-4">
                        <button className="relative p-2 hover:bg-gray-100 rounded-full">
                            <FiBell className="text-xl" />
                            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs px-1">2</span>
                        </button>

                        <button className="relative p-2 hover:bg-gray-100 rounded-full">
                            <FiMail className="text-xl" />
                            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs px-1">3</span>
                        </button>
                    </div>

                    <div className="flex items-center">
                        <img
                            src="https://placehold.co/40x40"
                            alt="Profile"
                            className="rounded-full mr-2"
                        />
                        <div className="hidden lg:block">
                            <p className="font-bold">Jane Cooper</p>
                            <p className="text-gray-500 text-sm">Admin</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center">
                            <span className="text-2xl mr-3">{stat.icon}</span>
                            <div>
                                <p className="text-gray-500 text-sm">{stat.title}</p>
                                <p className="text-2xl font-bold">{stat.value}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Total Students by Gender</h2>
                    <div className="aspect-square bg-gray-100 rounded-xl animate-pulse"></div>
                    <div className="flex justify-between mt-4 text-sm">
                        <span>Boys: 1500</span>
                        <span>Girls: 1000</span>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default AdminDashboard