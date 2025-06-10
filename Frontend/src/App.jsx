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

  // 1. Not logged in → login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 2. Still fetching school info → keep loader
  if (schoolLoading) {
    return <LoadingScreen />;
  }

  // 3. If the school record doesn't exist and the user isn't a superadmin, force relogin
  if (!school && role !== "superadmin") {
    return <Navigate to="/login" replace />;
  }
  return (<>
    <Routes>
      <Route
        index
        element={
          <Navigate
            to={institutionType?.toLowerCase() === "college" ? "/college" : "/school"}
            replace
          />
        }
      />
      {role === "superadmin" && <Route path="/*" element={<SuperAdminRoutes />} />}
      {institutionType?.toLowerCase() === "school" && <Route path="/school/*" element={<SchoolAdminRoutes />} />}
      {institutionType?.toLowerCase() === "college" && <Route path="/college/*" element={<CollegeAdminRoutes />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>);
};

export default App;