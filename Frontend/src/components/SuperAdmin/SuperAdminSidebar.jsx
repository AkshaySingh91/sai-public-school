import { motion } from "framer-motion";
import {
    FiActivity, FiUsers, FiBook, FiCalendar, FiPieChart,
    FiHelpCircle, FiBell, FiSettings, FiLogOut, FiMail, FiHome
} from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext"

const menuItems = [
    { icon: FiActivity, text: "Dashboard", path: "/" },
    { icon: FiUsers, text: "Students", path: "/students" },
    { icon: FiBook, text: "Employee", path: "/employee" },
    { icon: FiPieChart, text: "Analytics", path: "/analytics" },
    { icon: FiHelpCircle, text: "Help center", path: "/help-center" },
    { icon: FiBell, text: "Notice", path: "/notice" },
    { icon: FiHome, text: "Schools", path: "/schools" },
    { icon: FiSettings, text: "Settings", path: "/settings" },
];

export const SuperAdminSidebar = () => {
    const { logout } = useAuth()


    return (
        <motion.div
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            className="lg:w-64 w-20 bg-white h-screen p-5 fixed lg:relative transition-all duration-300"
        >
            <div className="flex items-center mb-10">
                <img
                    src="https://placehold.co/40x40"
                    alt="Educo logo"
                    className="mr-3 rounded-lg"
                />
                <span className="text-xl font-bold hidden lg:block">Sai Public School</span>
            </div>

            <nav>
                <ul className="space-y-4">
                    {menuItems.map((item, index) => (
                        <motion.li
                            key={item.text}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <NavLink
                                to={item.path}
                                className={`flex items-center p-3 rounded-lg hover:bg-blue-50 ${index === 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                                    }`}
                            >
                                <item.icon className="lg:mr-3 text-lg" />
                                <span className="hidden lg:block">{item.text}</span>
                            </NavLink>
                        </motion.li>
                    ))}
                    <button
                        onClick={() => logout()}
                        className={`flex items-center p-3 rounded-lg hover:bg-blue-50 'text-blue-600 bg-blue-50'}`}
                    >
                        <FiLogOut className="lg:mr-3 text-lg" />
                        <span className="hidden lg:block">Logout</span>
                    </button>
                </ul>
            </nav>
        </motion.div>
    );
};