// src/components/Admin/AdminRoutes.jsx
import { Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import AdminDashboard from './AdminDashboard';
import EmployeeList from './Employee/EmployeeList';
import EmployeeDetail from './Employee/EmployeeDetail';
import FeeStructure from './Schools/FeeStructure';
import PaymentStructure from './Schools/SchoolPaymentStructure';

import StudentList from './Student/StudentManagement/StudentList';
import AddStudent from './Student/StudentManagement/AddStudent';
import { StudentDetail } from './Student/StudentManagement/StudentDetail';
import FeeReceiptPage from './Student/Transactions/FeeReceiptPage';
import DailyBook from './Student/DailyBook/DailyBook';
import FeeReportContainer from './Student/FeeManagement/FeeReportContainer';
import BusList from './Student/BusManagement/BusList';
import BusDestination from './Student/BusManagement/BusDestination';
import BusAllocation from './Student/BusManagement/BusAllocation';
import StockList from './Student/StockMangement/StockList';
import StockGroup from './Student/StockMangement/StockGroup';
import StockAllocate from './Student/StockMangement/StockAllocate';
import Settings from "./Settings/Settings"
import StudentStockAllocation from './Student/StockMangement/StudentStockAllocation';
import StockFeeReceiptPage from './Student/StockMangement/StockFeeReceiptPage';
import StockDailyBook from './Student/StockMangement/StockDailyBook';
import ImportExistingStudent from './Student/StudentManagement/ImportExistingStudent';
import EmployeeForm from './Employee/EmployeeForm';

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

const AdminIndex = () => {


  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/employee" element={<EmployeeList />} />
        <Route path="/employee/:uid" element={<EmployeeDetail />} />
        <Route path="/employee/add" element={<EmployeeForm />} />
        <Route path="/school/payment-structure" element={<PaymentStructure />} />
        <Route path="/school/fee-structure" element={<FeeStructure />} />
        <Route path="/students" element={<StudentList />} />
        <Route path="/students/add" element={<AddStudent />} />
        <Route path="/student/:studentId" element={<StudentDetail />} />
        <Route path="/students/daily-book" element={<DailyBook />} />
        <Route path="/students/outstanding-fee" element={<FeeReportContainer />} />
        <Route path="/students/import" element={<ImportExistingStudent />} />
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
        <Route path='/stockallocate/:studentId' element={<StudentStockAllocation />} />
        <Route path='/stockallocate/:studentId/receipt/:receiptId' element={<StockFeeReceiptPage />} />
        <Route path='/stock/daily-book' element={<StockDailyBook />} />
      </Route>
    </Routes>
  );
};

export default AdminIndex