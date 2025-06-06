import { Outlet, Route, Routes } from "react-router-dom";
import AdminSidebar from "../../components/Admin/AdminSidebar";
import CollegeAdminDashboard from "./Dashboard/CollegeAdminDashboard"
import { useAuth } from "../../contexts/AuthContext";

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

const CollegeAdminIndex = () => {
    const { userData } = useAuth();
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                {
                    userData.privilege?.toLowerCase() === "both" ?
                        <>
                            <Route path="/" element={<CollegeAdminDashboard />} />
                        </> :
                        <>
                            {/* dashboard  */}
                            <Route path="/" element={<ReadOnlyDashboard />} />
                        </>
                }
            </Route>
        </Routes>
    );
};

export default CollegeAdminIndex