import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import ClassFeeSummary from "./ClassFeeSummary";

const StudentFeePage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "students"));
        console.log("querySnapshot", querySnapshot);
        const studentsData = querySnapshot.docs.map(doc => doc.data());
        console.log("objects", studentsData);
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) return <div className="p-4 text-lg font-medium">Loading students...</div>;

  return (
    <div className="p-4">
      <ClassFeeSummary students={students} />
    </div>
  );
};

export default StudentFeePage;