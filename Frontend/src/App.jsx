// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes/index";
import Login from "./components/Login";

function ProtectedApp() {
  const { currentUser, role } = useAuth();
  if (!currentUser || !role) {
    // Show only login page if not logged in.
    return <Navigate to="/login" replace />;
  }
  // new line
  // now user have firebase auth access & he also exisit in user schema , we just need to check role
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar now receives role from context */}
      <AppRoutes/>
    </div>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* All other routes protected */}
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
