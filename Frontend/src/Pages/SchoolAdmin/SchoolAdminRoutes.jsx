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
import { useAuth } from '../../contexts/AuthContext';
import NotFound from '../../components/NotFound';

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
const withReadOnly = (Component) => {
  return (props) => {
    const { userData } = useAuth();
    return <Component {...props} readOnly={userData.privilege?.toLowerCase() === "read"} />;
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
const ReadOnlyBusDestination = withReadOnly(BusDestination); // all destination coverd by bus  
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



const SchoolAdminIndex = () => {
  const { userData } = useAuth();
  console.log(userData)
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {
          userData.privilege?.toLowerCase() === "both" ?
            <>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/employee" element={<EmployeeList />} />
              <Route path="/employee/:uid" element={<EmployeeDetail />} />
              <Route path="/employee/add" element={<EmployeeForm />} />
              <Route path="/payment-structure" element={<PaymentStructure />} />
              <Route path="/fee-structure" element={<FeeStructure />} />
              <Route path="/students" element={<StudentList />} />
              <Route path="/students/add" element={<AddStudent />} />
              <Route path="/student/:studentId" element={<StudentDetail />} />
              <Route path="/students/daily-book" element={<DailyBook />} />
              <Route path="/students/outstanding-fee" element={<FeeReportContainer />} />
              <Route path="/students/import" element={<ImportExistingStudent />} />
              <Route path="/student/:studentId/receipt/:receiptId" element={<FeeReceiptPage />} />
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
              <Route path="*" element={<NotFound />} />)

            </> : (userData.privilege?.toLowerCase() === "read" ?
              <>
                {/* dashboard  */}
                <Route path="/" element={<ReadOnlyDashboard />} />
                {/* students */}
                <Route path="/students" element={<ReadOnlyStudentList />} />
                <Route path="/students/daily-book" element={<ReadOnlyDailyBook />} />
                <Route path="/students/outstanding-fee" element={<ReadOnlyFeeReportContainer />} />
                {/* studentfee receipt */}
                <Route
                  path="/student/:studentId/receipt/:receiptId"
                  element={<ReadOnlyFeeReceiptPage />}
                />
                {/* employee */}
                <Route path="/employee" element={<ReadOnlyEmployeeList />} />
                <Route path="/employee/:uid" element={<ReadOnlyEmployeeDetail />} />
                <Route path="/fee-structure" element={<ReadOnlyFeeStructure />} />
                <Route path="/payment-structure" element={<ReadOnlyPaymentStructure />} />
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
                {/* <Route path="*" element={<NotFound />} /> */}
              </> : <Route path="*" element={<NotFound />} />
            )
        }
      </Route>
    </Routes>
  );
};

export default SchoolAdminIndex