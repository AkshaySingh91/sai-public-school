// src/components/SuperAdmin/Index.jsx
import { Routes, Route, Outlet, useNavigate } from 'react-router-dom';

import AdminDashboard from '../Admin/AdminDashboard';
import ManageSchools from './Schools/Index';
import AdminSidebar from '../../components/Admin/AdminSidebar';
// employee
import EmployeeList from '../Admin/Employee/EmployeeList';
import EmployeeDetail from '../Admin/Employee/EmployeeDetail';
// students
import StudentList from '../Admin/Student/StudentManagement/StudentList';
import { StudentDetail } from '../Admin/Student/StudentManagement/StudentDetail';
import DailyBook from '../Admin/Student/DailyBook/DailyBook';
import FeeReportContainer from '../Admin/Student/FeeManagement/FeeReportContainer';
import BusList from '../Admin/Student/BusManagement/BusList';
import BusDestination from '../Admin/Student/BusManagement/BusDestination';
import BusAllocation from '../Admin/Student/BusManagement/BusAllocation';
import StockList from '../Admin/Student/StockMangement/StockList';
import StockGroup from '../Admin/Student/StockMangement/StockGroup';
import StockAllocate from '../Admin/Student/StockMangement/StockAllocate';
import Settings from "../Admin/Settings/Settings"
import StudentStockAllocation from '../Admin/Student/StockMangement/StudentStockAllocation';
import StockFeeReceiptPage from '../Admin/Student/StockMangement/StockFeeReceiptPage';
import StockDailyBook from '../Admin/Student/StockMangement/StockDailyBook';
import EmployeeForm from '../Admin/Employee/EmployeeForm';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import FeeReceiptPage from '../Admin/Student/Transactions/FeeReceiptPage';
import PaymentStructure from '../Admin/Schools/SchoolPaymentStructure';
import FeeStructure from '../Admin/Schools/FeeStructure';

const SuperAdminLayout = () => {
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
};

// super admin routes
const withReadOnly = (Component) => {
  return (props) => {
    const { role } = useAuth();
    return <Component {...props} readOnly={role === "superadmin"} />;
  };
};

// dashboard
const ReadOnlyDashboard = withReadOnly(AdminDashboard);
// employee
const ReadOnlyEmployeeList = withReadOnly(EmployeeList);
const ReadOnlyEmployeeDetail = withReadOnly(EmployeeDetail);
// students
const ReadOnlyStudentList = withReadOnly(StudentList);
const ReadOnlyDailyBook = withReadOnly(DailyBook);  //daily transactions
const ReadOnlyFeeReportContainer = withReadOnly(FeeReportContainer);  //for outstanding fee for all class & student
const ReadOnlyFeeReceiptPage = withReadOnly(FeeReceiptPage);  //for outstanding fee for all class & student
// bus
const ReadOnlyBusList = withReadOnly(BusList); // all buses of school
const ReadOnlyBusDestination = withReadOnly(BusDestination); // all destionation coverd by bus  
const ReadOnlyBusAllocation = withReadOnly(BusAllocation); // all student allocated to bus
// stock
const ReadOnlyStockList = withReadOnly(StockList); // all stock of school
const ReadOnlyStockGroup = withReadOnly(StockGroup); // all stock group of school
const ReadOnlyStockAllocate = withReadOnly(StockAllocate); // all student purchase to stock
const ReadOnlyStockDailyBook = withReadOnly(StockDailyBook); // daily transaction of stock
const ReadOnlyStudentStockAllocation = withReadOnly(StudentStockAllocation); // daily transaction of stock
const ReadOnlyStockFeeReceiptPage = withReadOnly(StockFeeReceiptPage); // daily transaction of stock
// school struc
const ReadOnlyFeeStructure = withReadOnly(FeeStructure); // daily transaction of stock
const ReadOnlyPaymentStructure = withReadOnly(PaymentStructure); // daily transaction of stock
const ReadOnlySettings = withReadOnly(Settings); // daily transaction of stock

const SuperAdminIndex = () => {
  return (
    <Routes>
      <Route element={<SuperAdminLayout />}>
        {/* dashboard  */}
        <Route path="/" element={<ReadOnlyDashboard />} />
        {/* manage school, super admin have seprate component */}
        <Route path="/schools" element={<ManageSchools />} />
        <Route path="/school/fee-structure" element={<ReadOnlyFeeStructure />} />
        <Route path="/school/payment-structure" element={<ReadOnlyPaymentStructure />} />
        {/* employee */}
        <Route path="/employee" element={<ReadOnlyEmployeeList />} />
        <Route path="/employee/:uid" element={<ReadOnlyEmployeeDetail />} />
        {/* students */}
        <Route path="/students" element={<ReadOnlyStudentList />} />
        <Route path="/students/daily-book" element={<ReadOnlyDailyBook />} />
        <Route path="/students/outstanding-fee" element={<ReadOnlyFeeReportContainer />} />
        {/* studentfee receipt */}
        <Route
          path="/student/:studentId/receipt/:receiptId"
          element={<ReadOnlyFeeReceiptPage />}
        />
        {/* setting - for profile or personal data update & school data readonly */}
        <Route path="/settings" element={<ReadOnlySettings />} />
        {/* bus */}
        <Route path="/buslist" element={<ReadOnlyBusList />} />
        <Route path='/busdest' element={<ReadOnlyBusDestination />} />
        <Route path='/busallocate' element={<ReadOnlyBusAllocation />} />
        {/* stock */}
        <Route path='/stocklist' element={<ReadOnlyStockList />} />
        <Route path='/stockgroup' element={<ReadOnlyStockGroup />} />
        <Route path='/stockallocate' element={<ReadOnlyStockAllocate />} />
        <Route path='/stockallocate/:studentId' element={<ReadOnlyStudentStockAllocation />} />
        <Route path='/stockallocate/:studentId/receipt/:receiptId' element={<ReadOnlyStockFeeReceiptPage />} />
        <Route path='/stock/daily-book' element={<ReadOnlyStockDailyBook />} />
      </Route>
    </Routes>
  );
};

export default SuperAdminIndex