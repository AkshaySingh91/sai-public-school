import { motion } from "framer-motion";
import {
    FiActivity, FiUsers, FiBook, FiSettings, FiLogOut, FiHome,
    FiChevronDown, FiChevronRight
} from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect } from "react";
import { TbBus } from "react-icons/tb";
import { MdOutlineInventory2 } from "react-icons/md";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';


const menuItems = [
    { icon: FiActivity, text: "Dashboard", path: "/" },
    {
        icon: FiUsers,
        text: "Students",
        path: "/students",
        subItems: [
            { text: "All Student", path: "/students" },
            { text: "Add Student", path: "/students/add" },
            { text: "Daily Book", path: "/students/daily-book" },
            { text: "Outstanding Fees", path: "/students/outstanding-fee" },
        ]
    },
    {
        icon: FiHome,
        text: "School",
        path: "/school",
        subItems: [
            { text: "Payment Structure", path: "/school/payment-structure" },
            { text: "Fee Structure", path: "/school/fee-structure" },
        ]
    },
    { icon: FiBook, text: "Employee", path: "/employee" },
    {
        icon: TbBus,
        text: "Transport",
        path: "/transport",
        subItems: [
            { text: "Bus List", path: "/buslist" },
            { text: "Bus Destination", path: "/busdest" },
            { text: "Bus Allocation", path: "/busallocate" },
        ]
    },
    {
        icon: MdOutlineInventory2,
        text: "Stock Management",
        path: "/stock",
        subItems: [
            { text: "Stock Master", path: "/stocklist" },
            { text: "Stock Group", path: "/stockgroup" },
            { text: "Stock Allocation", path: "/stockallocate" },
        ]
    },
    { icon: FiSettings, text: "Settings", path: "/settings" },
];

const AdminSidebar = () => {
    const { logout } = useAuth();
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const { userData } = useAuth();
    const [school, setSchool] = useState([]);

    useEffect(() => {
        const fetchSchoolClasses = async () => {
            if (userData?.schoolCode) {
                const schoolQuery = query(
                    collection(db, "schools"),
                    where("Code", "==", userData.schoolCode)
                );
                const schoolSnapshot = await getDocs(schoolQuery);
                if (schoolSnapshot.empty) {
                    throw new Error("School not found");
                }
                const schoolData = schoolSnapshot.docs[0].data();
                console.log({ schoolData })
                setSchool({
                    id: schoolSnapshot.docs[0].id,
                    ...schoolData,
                });
            }
        };
        fetchSchoolClasses();
    }, [userData?.schoolCode]);

    const toggleSubmenu = (path) => {
        setOpenSubmenu(openSubmenu === path ? null : path);
    };

    return (
        <motion.div
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            className="lg:w-64 w-16 bg-white h-screen overflow-y-auto  p-5 fixed top-0 left-0 transition-all duration-300"
            style={{ "scrollbar-width": "none", "-ms-overflow-style": "none" }}
        >
            <div className="flex items-center mb-10">
                <img
                    src="https://placehold.co/40x40"
                    alt="Educo logo"
                    className="mr-3 rounded-lg"
                />
                <span className="text-xl font-bold hidden lg:block capitalize">{school.schoolName || "Sai Public School"}, {school?.location?.taluka || ""}</span>
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
                            {item.subItems ? (
                                <>
                                    <div
                                        onClick={() => toggleSubmenu(item.path)}
                                        className={`flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 cursor-pointer ${openSubmenu === item.path ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <item.icon className="lg:mr-3 text-lg" />
                                            <span className="hidden lg:block">{item.text}</span>
                                        </div>
                                        <span className="hidden lg:block">
                                            {openSubmenu === item.path ? <FiChevronDown /> : <FiChevronRight />}
                                        </span>
                                    </div>

                                    {openSubmenu === item.path && (
                                        <motion.ul
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="pl-8 mt-2 space-y-2"
                                        >
                                            {item.subItems.map((subItem) => (
                                                <motion.li
                                                    key={subItem.text}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                >
                                                    <NavLink
                                                        to={subItem.path}
                                                        className={({ isActive }) =>
                                                            `flex items-center p-2 rounded-lg hover:bg-blue-50 ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                                                            }`
                                                        }
                                                    >
                                                        <span className="hidden lg:block">{subItem.text}</span>
                                                    </NavLink>
                                                </motion.li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </>
                            ) : (
                                <NavLink
                                    to={item.path}
                                    end
                                    className={({ isActive }) =>
                                        `flex items-center p-3 rounded-lg hover:bg-blue-50 ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                                        }`
                                    }
                                >
                                    <item.icon className="lg:mr-3 text-lg" />
                                    <span className="hidden lg:block">{item.text}</span>
                                </NavLink>
                            )}
                        </motion.li>
                    ))}
                    <button
                        onClick={() => logout()}
                        className="flex items-center p-3 w-full rounded-lg hover:bg-blue-50 text-gray-600"
                    >
                        <FiLogOut className="lg:mr-3 text-lg" />
                        <span className="hidden lg:block">Logout</span>
                    </button>
                </ul>
            </nav>
        </motion.div>
    );
};

export default AdminSidebar;