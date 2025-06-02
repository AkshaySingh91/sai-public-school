import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { FiActivity, FiUsers, FiBook, FiSettings, FiLogOut, FiHome, FiChevronRight, FiShield, FiMenu, FiX } from "react-icons/fi";
import Swal from "sweetalert2";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { TbBus } from "react-icons/tb";
import { MdOutlineInventory2 } from "react-icons/md";
import { useSchool } from "../../contexts/SchoolContext";
import { AiOutlineMenuUnfold, AiOutlineMenuFold } from "react-icons/ai";
import { ChevronsLeftIcon, ChevronsLeftRight, ChevronsRight, ChevronsRightIcon } from "lucide-react";

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
  const { logout, role } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef();
  const { school } = useSchool();

  // Filter menu items based on role
  const filteredMenuItems = menuItems.map(item => {
    // For superadmin, remove add/import options from Students
    if (role === "superadmin" && item.text === "Students") {
      return {
        ...item,
        subItems: item.subItems.filter(
          subItem => !["Add Student", "Import Student"].includes(subItem.text)
        )
      };
    }
    // For superadmin, add School management
    if (role === "superadmin" && item.text === "School") {
      return {
        ...item,
        subItems: [{ text: "Manage Schools", path: "/schools" }, ...item.subItems]
      };
    }
    return item;
  }).filter(Boolean);

  const toggleSubmenu = (path) => {
    if (isCollapsed && isDesktop) {
      setIsCollapsed(false);
    }
    setOpenSubmenu(openSubmenu === path ? null : path);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    setOpenSubmenu(null); // Close all submenus when collapsing
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

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
        setIsCollapsed(false); // Reset collapse on mobile
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle clicks outside sidebar for mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && !isDesktop) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDesktop]);

  const sidebarWidth = isCollapsed && isDesktop ? 'w-20' : 'w-64';

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className={`lg:hidden fixed top-4 left-4 z-50 bg-white hover:bg-gray-50 active:bg-gray-100 p-3 rounded-xl shadow-lg border border-gray-200 text-violet-600 hover:text-violet-700 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${isSidebarOpen ? 'opacity-0 pointer-events-none translate-x-64' : 'opacity-100 translate-x-0'}`}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <AiOutlineMenuUnfold size={22} className="font-bold" />
      </button>

      {/* Mobile Backdrop */}
      {isSidebarOpen && !isDesktop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 bg-opacity-60 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        initial={false}
        animate={{
          x: (!isDesktop && !isSidebarOpen) ? -320 : 0,
          width: isDesktop ? (isCollapsed ? 80 : 256) : 256,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.4
        }}
        className={`h-screen bg-white shadow-2xl border-r border-gray-200  ${isDesktop ? 'relative' : 'fixed top-0 left-0 z-50'} ${sidebarWidth}`}
      >
        {/* Scrollable Content */}
        <div className="" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>

          {/* Header Section */}
          <div className="sticky top-0 bg-white border-b border-gray-100">
            {/* Mobile Close Button */}
            {!isDesktop && (
              <div className="flex justify-end p-4 pb-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200"
                  aria-label="Close menu"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* School/Admin Info */}
            <div className={`px-4 py-4 ${isCollapsed && isDesktop ? 'text-center' : ''}`}>
              {role === "superadmin" ? (
                <div className="space-y-4">
                  {isDesktop && isCollapsed && (
                    <button
                      onClick={toggleCollapse}
                      className="bg-gray-200 hover:bg-gray-100 p-2 rounded-xl shadow-lg border border-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200 z-20 cursor-pointer outline-0"
                      aria-label="Expand sidebar"
                    >
                      <ChevronsLeftIcon className="w-5 h-5" />
                    </button>
                    // <div className="absolute -top-4 -right-4 ">
                    // </div>
                  )}
                  {(!isCollapsed || !isDesktop) && school && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">
                          {school?.logoUrl ? (
                            <img
                              src={school.logoUrl}
                              alt="School logo"
                              className="w-10 h-10 object-cover rounded-lg shadow-sm"
                              onError={(e) => {
                                e.target.src = "https://placehold.co/40x40/6366f1/white?text=S";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                              <span className="text-white font-bold text-lg">
                                {school?.schoolName?.charAt(0) || "S"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-800 truncate">
                            {school?.schoolName || "Current School"}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {school?.location?.taluka || "Location"}
                          </p>
                          <h2 className="text-md font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            SuperAdmin
                          </h2>
                          <p className="text-xs text-gray-500">All School Access</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`flex ${isCollapsed && isDesktop ? 'flex-col items-center space-y-2' : 'items-center space-x-3'}`}>
                  <div className="flex-shrink-0">
                    {school?.logoUrl ? (
                      <img
                        src={school.logoUrl}
                        alt="School logo"
                        className="w-12 h-12 object-cover rounded-xl shadow-lg border-2 border-white"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/56x56/6366f1/white?text=S";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                        <span className="text-white font-bold text-xl">
                          {school?.schoolName?.charAt(0) || "S"}
                        </span>
                      </div>
                    )}
                  </div>

                  {(!isCollapsed || !isDesktop) && (
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-gray-900 truncate">
                        {school?.schoolName || "School Management"}
                      </h2>
                      {school?.location?.taluka && (
                        <p className="text-xs text-gray-500 truncate flex items-center mt-1">
                          <FiHome className="w-3 h-3 mr-1" />
                          {school.location.taluka}
                        </p>
                      )}
                      <div className="flex items-center mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          School Admin
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="px-2 pb-6 pt-2 relative">
            {/* Absolute positioned collapse button */}
            {isDesktop && (
              <div className="absolute -top-4 -right-4 ">
                <button
                  onClick={toggleCollapse}
                  className="bg-gray-200 hover:bg-gray-100 p-2 rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200 z-20 cursor-pointer outline-0"
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {
                    !isCollapsed &&
                    <ChevronsRightIcon className="w-5 h-5" />
                  }
                  {
                    role !== "superadmin" && isCollapsed &&
                    <ChevronsLeftIcon className="w-5 h-5" />
                  }
                </button>
              </div>
            )}

            <ul className="space-y-1">
              {filteredMenuItems.map((item, index) => (
                <motion.li
                  key={item.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {item.subItems ? (
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleSubmenu(item.path)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 ease-in-out hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 group ${openSubmenu === item.path ? "text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm" : "text-gray-700 hover:text-blue-600"}`}
                        title={isCollapsed && isDesktop ? item.text : undefined}
                      >
                        <div className={`flex items-center min-w-0 ${isCollapsed && isDesktop ? 'justify-center w-full' : 'flex-1'}`}>
                          <item.icon className={`text-xl flex-shrink-0 ${isCollapsed && isDesktop ? '' : 'mr-3'}`} />
                          {(!isCollapsed || !isDesktop) && (
                            <span className="font-medium truncate text-sm">{item.text}</span>
                          )}
                        </div>
                        {(!isCollapsed || !isDesktop) && (
                          <motion.div
                            animate={{ rotate: openSubmenu === item.path ? 90 : 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex-shrink-0 ml-2"
                          >
                            <FiChevronRight className="text-lg" />
                          </motion.div>
                        )}
                      </button>

                      <AnimatePresence>
                        {openSubmenu === item.path && (!isCollapsed || !isDesktop) && (
                          <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="pl-10 space-y-1 overflow-hidden"
                          >
                            {item.subItems.map((subItem, subIndex) => (
                              <motion.li
                                key={subItem.text}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: subIndex * 0.1 }}
                              >
                                <NavLink
                                  to={subItem.path}
                                  onClick={() => !isDesktop && setSidebarOpen(false)}
                                  className={({ isActive }) =>
                                    `block py-2 pl-3 pr-2 rounded-lg transition-all duration-200 truncate text-sm group
                          ${isActive
                                      ? "text-blue-600 bg-blue-50 font-medium shadow-sm  border-blue-500"
                                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50  "
                                    }`
                                  }
                                >
                                  <span className="flex items-center">
                                    {subItem.text}
                                  </span>
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
                        `flex items-center p-3 rounded-xl transition-all duration-300 ease-in-out
              hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 group
              ${isActive
                          ? "text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 font-medium shadow-sm"
                          : "text-gray-700 hover:text-blue-600"
                        } ${isCollapsed && isDesktop ? 'justify-center' : ''}`}
                      title={isCollapsed && isDesktop ? item.text : undefined}
                    >
                      <item.icon className={`text-xl flex-shrink-0 ${isCollapsed && isDesktop ? '' : 'mr-3'}`} />
                      {(!isCollapsed || !isDesktop) && (
                        <span className="font-medium truncate text-sm">{item.text}</span>
                      )}
                    </NavLink>
                  )}
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Logout Button - Sticky at bottom */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredMenuItems.length * 0.1 }}
              onClick={() => {
                handleLogout();
                !isDesktop && setSidebarOpen(false);
              }}
              className={`w-full flex items-center p-3 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 group ${isCollapsed && isDesktop ? 'justify-center' : ''}`}
              title={isCollapsed && isDesktop ? "Logout" : undefined}
            >
              <FiLogOut className={`text-xl flex-shrink-0 ${isCollapsed && isDesktop ? '' : 'mr-3'}`} />
              {(!isCollapsed || !isDesktop) && (
                <span className="font-medium text-sm">Logout</span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div >
    </>
  );
};

export default AdminSidebar;