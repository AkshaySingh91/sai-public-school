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
import FeeReceiptPage from './Student/FeeReceiptPage';
import DailyBook from './Student/DailyBook';
import FeeReportContainer from './Student/FeeReportContainer';
import BusList from './Student/BusList';
import BusDestination from './Student/BusDestination';
import BusAllocation from './Student/BusAllocation';
import StockList from './Student/StockList';
import StockGroup from './Student/StockGroup';
import StockAllocate from './Student/StockAllocate';
import Settings from "./Settings/Settings"

const AdminLayout = () => {
  return (
    <div className="bg-gray-50 min-h-screen overflow-hidden">
      <div className="">
        <AdminSidebar />
        <div className="pr-5 pl-5 ml-20 lg:ml-64 h-screen overflow-y-auto w-auto">
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
        <Route path="/students/daily-book" element={<DailyBook />} />
        <Route path="/students/outstanding-fee" element={<FeeReportContainer />} />
        <Route
          path="/student/:studentId/receipt/:receiptId"
          element={<FeeReceiptPage />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="/buslist" element={<BusList />} />
        <Route path='/busdest' element={<BusDestination />} />
        <Route path='/busallocate' element={<BusAllocation />} />
        <Route path='/stocklist' element={<StockList />} />
        <Route path='/stockgroup' element={<StockGroup />} />
        <Route path='/stockallocate' element={<StockAllocate />} />
      </Route>
    </Routes>
  );
};

export default AdminIndex