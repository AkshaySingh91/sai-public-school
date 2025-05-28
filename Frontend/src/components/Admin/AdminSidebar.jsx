import { AnimatePresence, motion } from "framer-motion";
import { FiActivity, FiUsers, FiBook, FiSettings, FiLogOut, FiHome, FiChevronDown, FiChevronRight } from "react-icons/fi";
import Swal from "sweetalert2";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useRef, useState } from "react"; // ✅ useEffect & useRef
import { TbBus } from "react-icons/tb";
import { MdOutlineInventory2 } from "react-icons/md";
import { useSchool } from "../../contexts/SchoolContext";
import { AiOutlineMenuUnfold } from "react-icons/ai";

const menuItems = [
  { icon: FiActivity, text: "Dashboard", path: "/" },
  {
    icon: FiUsers,
    text: "Students",
    path: "/students",
    subItems: [
      { text: "All Student", path: "/students" },
      { text: "Daily Book", path: "/students/daily-book" },
      { text: "Outstanding Fees", path: "/students/outstanding-fee" },
      { text: "Add Student", path: "/students/add" },
      { text: "Import Student", path: "/students/import" },
    ],
  },
  {
    icon: FiHome,
    text: "School",
    path: "/school",
    subItems: [
      { text: "Payment Structure", path: "/school/payment-structure" },
      { text: "Fee Structure", path: "/school/fee-structure" },
    ],
  },
  { icon: FiBook, text: "Employee", path: "/employee" },
  {
    icon: TbBus,
    text: "Bus",
    path: "/bus",
    subItems: [
      { text: "Bus List", path: "/buslist" },
      { text: "Bus Destination", path: "/busdest" },
      { text: "Bus Allocation", path: "/busallocate" },
    ],
  },
  {
    icon: MdOutlineInventory2,
    text: "Stock Management",
    path: "/stock",
    subItems: [
      { text: "Stock Master", path: "/stocklist" },
      { text: "Stock Group", path: "/stockgroup" },
      { text: "Stock Allocation", path: "/stockallocate" },
      { text: "Stock Daily Book", path: "/stock/daily-book" },
    ],
  },
  { icon: FiSettings, text: "Settings", path: "/settings" },
];

const AdminSidebar = () => {
  const { logout } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const sidebarRef = useRef();
  const { school } = useSchool();
  const toggleSubmenu = (path) => {
    setOpenSubmenu(openSubmenu === path ? null : path);
  };

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, logout!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        Swal.fire("Logged out!", "You have been logged out.", "success");
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Backdrop for mobile */}
      {isSidebarOpen && !isDesktop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        />
      )}
      <button className={` lg:hidden fixed top-4 left-4 z-50  bg-white hover:bg-gray-50 active:bg-gray-100 p-3 rounded-lg shadow-lg border border-gray-200 text-violet-600 hover:text-violet-700 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <AiOutlineMenuUnfold size={20} className="font-bold" />
      </button>

      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        initial={false}
        animate={{
          x: (!isDesktop && !isSidebarOpen) ? -320 : 0,
          opacity: (!isDesktop && !isSidebarOpen) ? 0 : 1
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.3
        }}
        className={`h-full w-62  bg-white shadow-xl border-r border-gray-200 overflow-y-auto overflow-x-hidden ${isDesktop ? 'relative' : 'fixed top-0 left-0 z-50 '}
      `}
        style={{
          scrollbarWidth: "none",
          scrollbarColor: "#e5e7eb transparent"
        }}
      >
        {/* Close button for mobile */}
        {!isDesktop && (
          <div className="flex justify-end p-4 pb-0">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* School logo and name */}
        <div className="flex items-center px-6 py-4 mb-6 border-b border-gray-100">
          <div className="flex-shrink-0 mr-3">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt="School logo"
                className="w-12 h-12 object-cover rounded-lg shadow-sm"
                onError={(e) => {
                  e.target.src = "https://placehold.co/40x40/6366f1/white?text=S";
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">
                  {school.schoolName?.charAt(0) || "S"}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate leading-tight ">
              {school.schoolName || "Sai Public School"}
            </h2>
            {school?.location?.taluka && (
              <p className="text-sm text-gray-500 truncate">
                {school.location.taluka}
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 pb-6">
          <ul className="space-y-1">
            {menuItems.map((item, index) => (
              <motion.li
                key={item.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {item.subItems ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSubmenu(item.path)}
                      className={` w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ease-in-out hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${openSubmenu === item.path ? "text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm" : "text-gray-700 hover:text-blue-600"
                        }
                    `}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <item.icon className="mr-3 text-xl flex-shrink-0" />
                        <span className="font-medium truncate">{item.text}</span>
                      </div>
                      <motion.div
                        animate={{ rotate: openSubmenu === item.path ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0 ml-2"
                      >
                        <FiChevronRight className="text-lg" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {openSubmenu === item.path && (
                        <motion.ul
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-12 space-y-1 overflow-hidden"
                        >
                          {item.subItems.map((subItem) => (
                            <motion.li
                              key={subItem.text}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <NavLink
                                to={subItem.path}
                                onClick={() => !isDesktop && setSidebarOpen(false)}
                                className={({ isActive }) =>
                                  `block p-2 rounded-lg transition-all duration-200 truncate
                                ${isActive
                                    ? "text-blue-600 bg-blue-50 font-medium shadow-sm"
                                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                                  }`
                                }
                              >
                                {subItem.text}
                              </NavLink>
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    onClick={() => !isDesktop && setSidebarOpen(false)}
                    end
                    className={({ isActive }) =>
                      `flex items-center p-3 rounded-xl transition-all duration-200 ease-in-out
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
                    focus:ring-opacity-50
                    ${isActive
                        ? "text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 font-medium shadow-sm"
                        : "text-gray-700 hover:text-blue-600"}`}
                  >
                    <item.icon className="mr-3 text-xl flex-shrink-0" />
                    <span className="font-medium truncate">{item.text}</span>
                  </NavLink>
                )}
              </motion.li>
            ))}

            {/* Logout Button */}
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: menuItems.length * 0.05 }}
              className="pt-4 mt-4 border-t border-gray-200"
            >
              <button
                onClick={() => {
                  handleLogout();
                  !isDesktop && setSidebarOpen(false);
                }}
                className=" w-full flex items-center p-3 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 ease-in-out focus:outline-none ">
                <FiLogOut className="mr-3 text-xl flex-shrink-0" />
                <span className="font-medium">Logout</span>
              </button>
            </motion.li>
          </ul>
        </nav>
      </motion.div>
    </>
  );
};

export default AdminSidebar;
