// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SchoolProvider } from "./contexts/SchoolContext";
import Login from "./components/Login";
import { useAuth } from "./contexts/AuthContext";
import { useSchool } from "./contexts/SchoolContext";
import LoadingScreen from "./components/Loader";
import SuperAdminRoutes from "./Pages/SuperAdmin/SuperAdminRoutes";
import AdminRoutes from "./Pages/Admin/AdminRoutes";
import NotFound from "./components/NotFound"
import EmployeeFormWithToken from "./Pages/Admin/Employee/EmployeeFormWithToken"; // Add this

const App = () => {
  return (
    <AuthProvider>
      <SchoolProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* this is form send to unauthorized employee to fill there details */}
            <Route path="/employee-form" element={<EmployeeFormWithToken />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </SchoolProvider>
    </AuthProvider>
  );
};

const ProtectedRoutes = () => {
  const { currentUser, role } = useAuth();
  const { school, loading: schoolLoading } = useSchool();

  // first check if user logged in & exist in database
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  // check is school of which user is logged in is exist in database
  if (schoolLoading) {
    return <LoadingScreen />;
  }
  // user may be superadmin thus he will not give schoolCode thus school will null but role should be superadmin
  if (!school && role !== "superadmin") {
    return <Navigate to="/login" replace />;
  }

  return (<>
    <Routes>
      {role === "superadmin" && <Route path="/*" element={<SuperAdminRoutes />} />}
      {role === "accountant" && <Route path="/*" element={<AdminRoutes />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>);
};

export default App;