import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import { Switch } from "@headlessui/react";
import { Save, Trash2, User, CalendarDays, Banknote } from "lucide-react";
import { motion } from 'framer-motion'

export default function StudentProfile({
  student,
  formData,
  setFormData,
  handleStudentUpdate,
  handleStudentDelete,
  goToNextAcademicYear
}) {
  const handleToggleStatus = async (val) => {
    const transactions = student.transactions || [];
    const academicYears = transactions.map((tx) => tx.academicYear);
    const uniqueYears = [...new Set(academicYears)];

    let newStatus = "inactive";
    if (val) {
      if (transactions.length === 0 || uniqueYears.length === 1) {
        newStatus = "new";
      } else {
        newStatus = "current";
      }
    }

    setFormData((prev) => ({ ...prev, status: newStatus }));

    try {
      const studentRef = doc(db, "students", student.id);
      await updateDoc(studentRef, { status: newStatus });
    } catch (err) {
      console.error("Error updating toggled status:", err);
    }
  };

  const handleStudentUpdateClick = async () => {
    const transactions = student.transactions || [];
    const academicYears = transactions.map((tx) => tx.academicYear);
    const uniqueYears = [...new Set(academicYears)];

    let status = "inactive";
    if (
      formData.status === "active" ||
      formData.status === "new" ||
      formData.status === "current"
    ) {
      if (transactions.length === 0 || uniqueYears.length === 1) {
        status = "new";
      } else {
        status = "current";
      }
    }

    const updatedData = {
      ...formData,
      status,
    };

    try {
      const studentRef = doc(db, "students", student.id);
      await updateDoc(studentRef, updatedData);
      setFormData(updatedData);
    } catch (err) {
      console.error("Error updating student:", err);
    }

    if (handleStudentUpdate) {
      handleStudentUpdate()
    };
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="md:w-1/3 space-y-6 sticky top-6 h-fit overflow-y-auto"    >
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {student.fname} {student.fatherName || ""} {student.lname}
          </h2>
          <p className="text-gray-600 mt-1 font-medium">
            Class : <span className="uppercase">{student.class}</span> &ndash; Division : <span className="uppercase">{student.div}</span>
          </p>
          <p className="text-sm text-violet-700 font-mono mt-2">
            FeeID: {student.feeId}
          </p>
        </div>

        {/* Details List */}
        <div className="space-y-4">
          <DetailItem icon={<CalendarDays />} label="Academic Year" value={student.academicYear} />
          <DetailItem icon={<User />} label="Student Type" value={student.type?.toUpperCase()} />

          <DetailItem icon={<Banknote />} label="Status">
            <div className="flex items-center">
              <Switch
                checked={formData.status !== 'inactive'}
                onChange={handleToggleStatus}
                className={`
                  ${formData.status !== 'inactive' ? 'bg-purple-600' : 'bg-gray-200'}
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${formData.status !== 'inactive' ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </Switch>
            </div>
          </DetailItem>

          <DetailItem icon={<CalendarDays />} label="Created At">
            {student.createdAt?.seconds
              ? new Date(student.createdAt.seconds * 1000).toLocaleDateString()
              : '-'}
          </DetailItem>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleStudentUpdateClick}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium py-2.5 rounded-xl transition-all"
          >
            <Save className="w-5 h-5" /> Update Details
          </button>
          <button
            onClick={goToNextAcademicYear}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all"
          >
            <Save className="w-5 h-5" /> Next Academic Year
          </button>
          <button
            onClick={handleStudentDelete}
            className="w-full flex items-center justify-center gap-2 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 font-medium py-2.5 rounded-xl transition-all"
          >
            <Trash2 className="w-5 h-5" /> Delete Student
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

// DetailItem component
const DetailItem = ({ icon, label, value, children }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center text-gray-600">
      <span className="mr-2 text-purple-500">{icon}</span>
      {label}
    </div>
    {children || <span className="font-medium">{value || "-"}</span>}
  </div>
); 