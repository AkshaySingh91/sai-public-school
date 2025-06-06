// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SchoolProvider } from "./contexts/InstitutionContext";
import Login from "./components/Login";
import { useAuth } from "./contexts/AuthContext";
import { useInstitution } from "./contexts/InstitutionContext";
import LoadingScreen from "./components/Loader";
import SuperAdminRoutes from "./Pages/SuperAdmin/SuperAdminRoutes";
import SchoolAdminRoutes from "./Pages/SchoolAdmin/SchoolAdminRoutes";
import CollegeAdminRoutes from "./Pages/CollegeAdmin/CollegeAdminRoutes";
import NotFound from "./components/NotFound"
import EmployeeFormWithToken from "./Pages/SchoolAdmin/Employee/EmployeeFormWithToken"; // Add this

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
  const { currentUser, role, userData } = useAuth();
  const { institutionType } = userData;
  const { school, loading: schoolLoading } = useInstitution();

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
  console.log(institutionType)
  return (<>
    <Routes>
      {role === "superadmin" && <Route path="/*" element={<SuperAdminRoutes />} />}
      {institutionType?.toLowerCase() === "school" && <Route path="/school/*" element={<SchoolAdminRoutes />} />}
      {institutionType?.toLowerCase() === "college" && <Route path="/college/*" element={<CollegeAdminRoutes />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>);
};

export default App;