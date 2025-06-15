// src/components/SuperAdmin/Index.jsx
import { Routes, Route, Outlet } from 'react-router-dom';
import AdminDashboard from '../SchoolAdmin/AdminDashboard';
import MangeInsitute from './Schools/Index';
import Sidebar from '../../components/Sidebar';
// employee
import EmployeeList from '../SchoolAdmin/Employee/EmployeeList';
import EmployeeDetail from '../SchoolAdmin/Employee/EmployeeDetail';
// students
import StudentList from '../SchoolAdmin/Student/StudentManagement/StudentList';
import { StudentDetail } from '../SchoolAdmin/Student/StudentManagement/StudentDetail';
import DailyBook from '../SchoolAdmin/Student/DailyBook/DailyBook';
import FeeReportContainer from '../SchoolAdmin/Student/FeeManagement/FeeReportContainer';
import BusList from '../SchoolAdmin/Student/BusManagement/BusList';
import BusDestination from '../SchoolAdmin/Student/BusManagement/BusDestination';
import BusAllocation from '../SchoolAdmin/Student/BusManagement/BusAllocation';
import StockList from '../SchoolAdmin/Student/StockMangement/StockList';
import StockGroup from '../SchoolAdmin/Student/StockMangement/StockGroup';
import StockAllocate from '../SchoolAdmin/Student/StockMangement/StockAllocate';
import Settings from "../SchoolAdmin/Settings/Settings"
import StudentStockAllocation from '../SchoolAdmin/Student/StockMangement/StudentStockAllocation';
import StockFeeReceiptPage from '../SchoolAdmin/Student/StockMangement/StockFeeReceiptPage';
import StockDailyBook from '../SchoolAdmin/Student/StockMangement/StockDailyBook';
import EmployeeForm from '../SchoolAdmin/Employee/EmployeeForm';
import { useInstitution } from '../../contexts/InstitutionContext';
import FeeReceiptPage from '../SchoolAdmin/Student/Transactions/FeeReceiptPage';
import PaymentStructure from '../SchoolAdmin/Schools/SchoolPaymentStructure';
import FeeStructure from '../SchoolAdmin/Schools/FeeStructure';
// college
import CollegeAdminDashboard from '../CollegeAdmin/Dashboard/CollegeAdminDashboard';
import NotFound from '../../components/NotFound';
import AddStudent from '../SchoolAdmin/Student/StudentManagement/AddStudent';
import ImportExistingStudent from '../SchoolAdmin/Student/StudentManagement/ImportExistingStudent';
import CollegeSettings from '../CollegeAdmin/Settings/index';
import CollegeStudentTable from '../CollegeAdmin/Students/CollegeStudentTable/CollegeStudentTable';
import AppliedStudentList from '../CollegeAdmin/Admission/AppliedStudentList';
import AppliedStudentDetails from '../CollegeAdmin/Admission/AppliedStudentDetails';

const SuperAdminLayout = () => {
  const { school } = useInstitution();
  return (
    <div className={`bg-gradient-to-br ${school.type === "school" ? "from-purple-50 to-blue-50" : "from-green-50 to-emerald-50"}  min-h-screen`}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Container */}
        <div className="flex-shrink-0">
          <Sidebar />
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

const SuperAdminIndex = () => {
  const { school } = useInstitution();
  return (
    <Routes>
      <Route element={<SuperAdminLayout />}>
        {
          school.type?.toLowerCase() == "school" ?
            <>
              <Route path="/school/" element={<AdminDashboard />} />
              {/* student */}
              <Route path="/school/students" element={<StudentList />} />
              <Route path="/school/students/add" element={<AddStudent />} />
              <Route path="/school/student/:studentId" element={<StudentDetail />} />
              <Route path="/school/students/daily-book" element={<DailyBook />} />
              {/* employee */}
              <Route path="/school/employee" element={<EmployeeList />} />
              <Route path="/school/employee/:uid" element={<EmployeeDetail />} />
              <Route path="/school/employee/add" element={<EmployeeForm />} />
              <Route path="/school/payment-structure" element={<PaymentStructure />} />
              <Route path="/school/fee-structure" element={<FeeStructure />} />
              <Route path="/school/students/outstanding-fee" element={<FeeReportContainer />} />
              <Route path="/school/students/import" element={<ImportExistingStudent />} />
              <Route path="/school/student/:studentId/receipt/:receiptType/:receiptId" element={<FeeReceiptPage />} />
              <Route path="/school/settings" element={<Settings />} />
              <Route path="/school/buslist" element={<BusList />} />
              <Route path='/school/busdest' element={<BusDestination />} />
              <Route path='/school/busallocate' element={<BusAllocation />} />
              <Route path='/school/stocklist' element={<StockList />} />
              <Route path='/school/stockgroup' element={<StockGroup />} />
              <Route path='/school/stockallocate' element={<StockAllocate />} />
              <Route path='/school/stockallocate/:studentId' element={<StudentStockAllocation />} />
              <Route path='/school/stockallocate/:studentId/receipt/:receiptId' element={<StockFeeReceiptPage />} />
              <Route path='/school/stock/daily-book' element={<StockDailyBook />} />
              <Route path="*" element={<NotFound />} />
            </>
            : (school.type?.toLowerCase() == "college" ?
              <>
                <Route path="/college" element={<CollegeAdminDashboard />} />
                <Route path="/college/students" element={<CollegeStudentTable />} />
                <Route path="/college/applied-students" element={<AppliedStudentList />} />
                <Route path="/college/applied-student/:studentId" element={<AppliedStudentDetails />} />
                <Route path="/college/settings" element={<CollegeSettings />} />
                <Route path="*" element={<NotFound />} />
              </>
              :
              <Route path="*" element={<NotFound />} />)
        }
        <Route path='/manage-institute' element={<MangeInsitute />} />
      </Route>
    </Routes>
  );
};

export default SuperAdminIndex