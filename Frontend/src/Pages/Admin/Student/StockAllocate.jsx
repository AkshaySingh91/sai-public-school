import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Loader1 from "../../../components/Loader1"; // Custom loader
import AddPaymentTable from "./AddPaymentTable";

function StockAllocate() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filters, setFilters] = useState({
    class: "",
    div: "",
    gender: "",
    search: "",
  });
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentStock, setStudentStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const studentsCollection = collection(db, "students");
      try {
        const studentsSnapshot = await getDocs(studentsCollection);
        const studentsList = studentsSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          schoolCode: doc.data().schoolCode, // Get schoolCode from the student
        }));
        console.log("studentsList",studentsList);

        // Now we need to find the schoolId based on schoolCode
        const schoolsCollection = collection(db, "schools");
        const updatedStudents = await Promise.all(
          studentsList.map(async (student) => {
            const schoolQuery = query(
              schoolsCollection,
              where("Code", "==", student.schoolCode)
            );
            console.log("schoolQuery",schoolQuery);
            const schoolSnapshot = await getDocs(schoolQuery);
            console.log("schoolSnapshot",schoolSnapshot);
            const schoolDoc = schoolSnapshot.docs[0];
            console.log("schoolDoc",schoolDoc.id);
            return {
              ...student,
              schoolId: schoolDoc ? schoolDoc.id : null, // Attach schoolId to student
            };
          })
        );

        setStudents(updatedStudents);
        console.log("updatedStudents",updatedStudents);
        setFilteredStudents(updatedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (expandedStudent) {
      const fetchStock = async () => {
        setLoadingStock(true);
        const stockCollection = collection(db, "allStocks");
        const formattedClass = expandedStudent.class.replace("Class ", "");
        const q = query(
          stockCollection,
          where("className", "==", formattedClass)
        );
        try {
          const stockSnapshot = await getDocs(q);
          const stockList = stockSnapshot.docs.map((doc) => doc.data());
          const updatedStockList = stockList.map((stock) => ({
            ...stock,
            quantity: 1,
          }));
          setStudentStock(updatedStockList);
        } catch (error) {
          console.error("Error fetching stock:", error);
        }
        setLoadingStock(false);
      };
      fetchStock();
    }
  }, [expandedStudent]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    const filtered = students.filter((student) => {
      return (
        (newFilters.class ? student.class === newFilters.class : true) &&
        (newFilters.div ? student.div === newFilters.div : true) &&
        (newFilters.gender ? student.gender === newFilters.gender : true) &&
        (newFilters.search
          ? student.fname
              .toLowerCase()
              .includes(newFilters.search.toLowerCase())
          : true)
      );
    });
    setFilteredStudents(filtered);
  };

  const handleStudentClick = (student) => {
    if (expandedStudent && expandedStudent.id === student.id) {
      setExpandedStudent(null);
    } else {
      setExpandedStudent(student);
    }
  };

  const handleQuantityChange = (index, value) => {
    const updatedStock = [...studentStock];
    updatedStock[index].quantity = parseInt(value) || 1;
    setStudentStock(updatedStock);
  };

  const handleDeleteItem = (index) => {
    const updatedStock = studentStock.filter((_, i) => i !== index);
    setStudentStock(updatedStock);
  };

  const calculateTotalPrice = () => {
    return studentStock.reduce((total, stock) => {
      return total + stock.sellingPrice * stock.quantity;
    }, 0);
  };

  const classOptions = [
    "Nursery",
    "JRKG",
    "SRKG",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
  ];

  const getTextColorByStatus = (status) => {
    switch (status) {
      case "Completed":
        return "text-green-500";
      case "In Progress":
        return "text-yellow-500";
      case "Pending":
        return "text-red-500";
      default:
        return "text-gray-800";
    }
  };

  return (
    <div className="p-8 space-y-10">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6 opacity-90">
        📦 Stock Allocation
      </h1>

      {/* Filters */}
      <div className="filters mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <select
          name="class"
          onChange={handleFilterChange}
          value={filters.class}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
        >
          <option value="">Select Class</option>
          {classOptions.map((classOption, index) => (
            <option key={index} value={classOption}>
              {classOption}
            </option>
          ))}
        </select>

        <select
          name="div"
          onChange={handleFilterChange}
          value={filters.div}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
        >
          <option value="">Select Division</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>

        <select
          name="gender"
          onChange={handleFilterChange}
          value={filters.gender}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          type="text"
          name="search"
          placeholder="Search by name"
          value={filters.search}
          onChange={handleFilterChange}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
        />
      </div>

      {/* Students List */}
      <div className="student-list p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-xl">
        <h3 className="text-4xl font-extrabold mb-8 text-gray-800 opacity-90 tracking-wide">
          Students
        </h3>

        <table className="min-w-full table-auto border-separate border-spacing-y-4">
          <thead>
            <tr className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
              <th className="px-6 py-4 text-left font-semibold text-lg rounded-tl-xl">
                Name
              </th>
              <th className="px-6 py-4 text-left font-semibold text-lg">
                Class
              </th>
              <th className="px-6 py-4 text-left font-semibold text-lg">
                Division
              </th>
              <th className="px-6 py-4 text-left font-semibold text-lg">
                Gender
              </th>
              <th className="px-6 py-4 text-left font-semibold text-lg rounded-tr-xl">
                Fee ID
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((student) => (
              <React.Fragment key={student.id}>
                <tr
                  onClick={() => handleStudentClick(student)}
                  className="cursor-pointer hover:bg-indigo-100 transition-all duration-300 text-gray-800 font-medium text-base rounded-lg"
                >
                  <td
                    className={`px-6 py-4 border-b ${getTextColorByStatus(
                      student.taskStatus
                    )} font-bold text-lg`}
                  >
                    {student.fname} {student.lname}
                  </td>
                  <td className="px-6 py-4 border-b">{student.class}</td>
                  <td className="px-6 py-4 border-b">{student.div}</td>
                  <td className="px-6 py-4 border-b">{student.gender}</td>
                  <td className="px-6 py-4 border-b">{student.feeId}</td>
                </tr>

                {expandedStudent && expandedStudent.id === student.id && (
                  <tr>
                    <td colSpan="5" className="bg-gray-50 p-8 rounded-b-2xl">
                      {loadingStock ? (
                        <div className="flex justify-center py-6">
                          <Loader1 />
                        </div>
                      ) : studentStock.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-lg font-medium">
                          No stock available.
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <table className="min-w-full table-auto bg-white shadow-lg rounded-xl overflow-hidden">
                            <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
                              <tr>
                                <th className="px-6 py-4 text-left text-indigo-800 font-bold text-sm uppercase">
                                  Item Name
                                </th>
                                <th className="px-6 py-4 text-center text-indigo-800 font-bold text-sm uppercase">
                                  Quantity
                                </th>
                                <th className="px-6 py-4 text-center text-indigo-800 font-bold text-sm uppercase">
                                  Unit Price
                                </th>
                                <th className="px-6 py-4 text-center text-indigo-800 font-bold text-sm uppercase">
                                  Total Price
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentStock.map((stock, index) => (
                                <tr key={index} className="hover:bg-indigo-50">
                                  <td className="px-6 py-4 text-sm text-gray-700">{stock.itemName}</td>
                                  <td className="px-6 py-4 text-center text-sm">
                                    <input
                                      type="number"
                                      value={stock.quantity}
                                      onChange={(e) =>
                                        handleQuantityChange(index, e.target.value)
                                      }
                                      className="w-20 px-4 py-2 text-center border-2 border-gray-300 rounded-md focus:outline-none focus:border-[#9810fa]"
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm">
                                    {stock.sellingPrice}
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm">
                                    {stock.sellingPrice * stock.quantity}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <AddPaymentTable studentId={student.id} schoolId={student.schoolId} studentClass={student.class}/>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {expandedStudent && (
          <div className="mt-6 flex justify-end text-lg font-semibold text-indigo-800">
            <span>Total Price: ₹{calculateTotalPrice()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StockAllocate;


