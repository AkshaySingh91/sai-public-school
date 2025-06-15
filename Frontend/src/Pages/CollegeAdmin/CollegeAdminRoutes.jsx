import { useEffect } from "react"
import { Outlet, Route, Routes } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import CollegeAdminDashboard from "./Dashboard/CollegeAdminDashboard"
import { useAuth } from "../../contexts/AuthContext";
import NotFound from "../../components/NotFound";
import CollegeSettings from "./Settings";
import { useTheme } from "../../contexts/ThemeContext";
import { useInstitution } from "../../contexts/InstitutionContext";
import AppliedStudentList from "./Admission/AppliedStudentList";
import AppliedStudentDetails from "./Admission/AppliedStudentDetails";
import CollegeStudentTable from "./Students/CollegeStudentTable/CollegeStudentTable"

const AdminLayout = () => {
    return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar Container */}
                <div className="flex-shrink-0">
                    <Sidebar />
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

const CollegeAdminIndex = () => {
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
                        <Route path="/students" element={<CollegeStudentTable />} />
                        <Route path="/applied-students" element={<AppliedStudentList />} />
                        <Route path="/applied-student/:studentId" element={<AppliedStudentDetails />} />
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

export default CollegeAdminIndex