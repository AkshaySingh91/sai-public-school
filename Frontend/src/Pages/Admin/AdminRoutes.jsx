// src/components/Admin/AdminRoutes.jsx
import { Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import AdminDashboard from './AdminDashboard';
import EmployeeList from './Employee/EmployeeList';
import EmployeeDetail from './Employee/EmployeeDetail';
import FeeStructure from './Schools/FeeStructure';
import PaymentStructure from './Schools/SchoolPaymentStructure';

import StudentList from './Student/StudentList';
import AddStudent from './Student/AddStudent';
import StudentDetail from './Student/StudentDetail';

const AdminLayout = () => {
  return (
    <div className="bg-gray-50 min-h-screen overflow-hidden">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-5 ml-20 lg:ml-64 h-screen overflow-y-auto w-screen">
          <Outlet />
        </div>
      </div>
    </div>
  );
};


const AdminIndex = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/employee" element={<EmployeeList />} />
        <Route path="/employee/:uid" element={<EmployeeDetail />} />
        <Route path="/school/payment-structure" element={<PaymentStructure />} />
        <Route path="/school/fee-structure" element={<FeeStructure />} />
        <Route path="/students" element={<StudentList />} />
        <Route path="/students/add" element={<AddStudent />} />
        <Route path="/student/:studentId" element={<StudentDetail />} />
      </Route>
    </Routes>
  );
};

export default AdminIndex