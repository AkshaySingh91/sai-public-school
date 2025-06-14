import { useEffect } from "react"
import { Outlet, Route, Routes } from "react-router-dom";
import AdminSidebar from "../../components/Admin/AdminSidebar";
import CollegeAdminDashboard from "./Dashboard/CollegeAdminDashboard"
import { useAuth } from "../../contexts/AuthContext";
import NotFound from "../../components/NotFound";
import CollegeSettings from "./Settings";
import { ThemeProvider, useTheme } from "../../contexts/ThemeContext";
import { useInstitution } from "../../contexts/InstitutionContext";

const AdminLayout = () => {
    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar Container */}
                <div className="flex-shrink-0">
                    <AdminSidebar />
                </div>

                {/* Main Content Container */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="max-w-full">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
const withReadOnly = (Component) => {
    return (props) => {
        const { userData } = useAuth();
        return <Component {...props} readOnly={userData.privilege?.toLowerCase() === "read"} />;
    };
};
const ReadOnlyDashboard = withReadOnly(CollegeAdminDashboard);

// Inner component that uses theme context (must be inside ThemeProvider)
const AdminRoutes = () => {
    const { userData } = useAuth();
    const { applyTheme } = useTheme();
    const { school: college } = useInstitution();

    // Apply theme when college brand colors change
    useEffect(() => {
        if (college?.brandColors) {
            applyTheme(college.brandColors);
        }
    }, [college?.brandColors, applyTheme]);

    return (
        <Routes>
            <Route element={<AdminLayout />}>
                {userData.privilege?.toLowerCase() === "both" ? (
                    <>
                        <Route path="/" element={<CollegeAdminDashboard />} />
                        <Route path="/settings" element={<CollegeSettings />} />
                        <Route path="*" element={<NotFound />} />
                    </>
                ) : (
                    <>
                        <Route path="/" element={<ReadOnlyDashboard />} />
                        <Route path="*" element={<NotFound />} />
                    </>
                )}
            </Route>
        </Routes>
    );
};

const CollegeAdminIndex = () => {
    const { school: college } = useInstitution();

    return (
        <ThemeProvider college={college}>
            <AdminRoutes />
        </ThemeProvider>
    );
};

export default CollegeAdminIndex