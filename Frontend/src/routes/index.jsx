// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import SuperAdminRoutes from "../Pages/SuperAdmin/SuperAdminRoutes";
import AdminRoutes from "../Pages/Admin/AdminRoutes";
// Import other components as needed
import { useAuth } from "../contexts/AuthContext";

const AppRoutes = () => {
  const { role } = useAuth();
  // Render a shared layout with Navbar if needed.
  return (
    <>
      {/* <Navbar /> */}
      <main className="container w-full overflow-x-hidden">
        <Routes>
          {role === "superadmin" && (
            <>
              <Route path="/*" element={<SuperAdminRoutes />} />
            </>
          )}
          {role === "accountant" && (
            <>
              <Route path="/*" element={<AdminRoutes />} />
              {/* <Route path="/student-info" element={<StudentList />} />
              <Route path="/student-info/new" element={<StudentForm />} /> */}
              {/* Other accountant-specific routes */}
            </>
          )}
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
};

export default AppRoutes;
