// src/components/SuperAdmin/Index.jsx
import { Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { SuperAdminSidebar } from '../../components/SuperAdmin/SuperAdminSidebar';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import ManageSchools from './Schools/Index';
const SuperAdminLayout = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="flex">
        <SuperAdminSidebar />
        <div className="flex-1 p-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
};


const SuperAdminIndex = () => {
  return (
    <Routes>
      <Route element={<SuperAdminLayout />}>
        <Route path="/" element={<SuperAdminDashboard />} />
        <Route path="/schools" element={<ManageSchools />} />
        <Route path="/students" element={<SuperAdminDashboard />} />
        <Route path="/employee" element={<SuperAdminDashboard />} />
        <Route path="/analytics" element={<SuperAdminDashboard />} />
        <Route path="/help-center" element={<SuperAdminDashboard />} />
        <Route path="/notice" element={<SuperAdminDashboard />} />
        <Route path="/schools" element={<SuperAdminDashboard />} />
        <Route path="/settings" element={<SuperAdminDashboard />} />
      </Route>
    </Routes>
  );
};

export default SuperAdminIndex