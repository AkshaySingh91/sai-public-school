import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Loader1 from "../../../components/Loader1"; // Custom loader
import AddPaymentTable from "./AddPaymentTable";
import { useAuth } from "../../../contexts/AuthContext";
import StudentsStockPaymentHistory from "./StudentsStockPaymentHistory";

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
  const [selectedItems, setSelectedItems] = useState([]);
  const users = useAuth().userData;

  useEffect(() => {
    const fetchStudents = async () => {
      const studentsCollection = collection(db, "students");
      try {
        const studentsSnapshot = await getDocs(studentsCollection);
        const studentsList = studentsSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          schoolCode: doc.data().schoolCode,
        }));

        const schoolsCollection = collection(db, "schools");
        const updatedStudents = await Promise.all(
          studentsList.map(async (student) => {
            const schoolQuery = query(
              schoolsCollection,
              where("Code", "==", student.schoolCode)
            );
            const schoolSnapshot = await getDocs(schoolQuery);
            const schoolDoc = schoolSnapshot.docs[0];
            return {
              ...student,
              schoolId: schoolDoc ? schoolDoc.id : null,
            };
          })
        );

        const schoolcodefromuser = users?.schoolCode;
        const filterstudent = updatedStudents.filter(
          (student) => student.schoolCode === schoolcodefromuser
        );

        setStudents(filterstudent);
        setFilteredStudents(filterstudent);
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
          where("className", "==", formattedClass),
          where("schoolCode", "==", users?.schoolCode)
        );
        try {
          const stockSnapshot = await getDocs(q);
          const stockList = stockSnapshot.docs.map((doc) => doc.data());
          const updatedStockList = stockList.map((stock) => ({
            ...stock,
            quantity: 1,
            selected: false,
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
  console.log("student", students);
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
    setExpandedStudent((prev) =>
      prev && prev.id === student.id ? null : student
    );
  };

  const handleCheckboxChange = (index) => {
    const updatedStock = [...studentStock];
    updatedStock[index].selected = !updatedStock[index].selected;
    setStudentStock(updatedStock);
    updateSelectedItems(updatedStock);
  };

  const updateSelectedItems = (updatedStock) => {
    const selected = updatedStock.filter((stock) => stock.selected);
    setSelectedItems(selected);
  };

  const handleDeleteItem = (index) => {
    const updatedStock = studentStock.filter((_, i) => i !== index);
    setStudentStock(updatedStock);
  };

  const calculateTotalPrice = () => {
    return studentStock.reduce(
      (total, stock) =>
        stock.selected ? total + stock.sellingPrice * stock.quantity : total,
      0
    );
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <select
          name="class"
          onChange={handleFilterChange}
          value={filters.class}
          className="px-5 py-3 border-2 border-gray-300 rounded-xl"
        >
          <option value="">Select Class</option>
          {classOptions.map((classOption) => (
            <option key={classOption} value={classOption}>
              {classOption}
            </option>
          ))}
        </select>

        <select
          name="div"
          onChange={handleFilterChange}
          value={filters.div}
          className="px-5 py-3 border-2 border-gray-300 rounded-xl"
        >
          <option value="">Select Division</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>

        <select
          name="gender"
          onChange={handleFilterChange}
          value={filters.gender}
          className="px-5 py-3 border-2 border-gray-300 rounded-xl"
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
          className="px-5 py-3 border-2 border-gray-300 rounded-xl"
        />
      </div>

      {/* Student List */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <table className="min-w-full table-auto">
          <thead className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
            <tr>
              <th className="px-6 py-4 text-left">Name</th>
              <th className="px-6 py-4 text-left">Class</th>
              <th className="px-6 py-4 text-left">Division</th>
              <th className="px-6 py-4 text-left">Gender</th>
              <th className="px-6 py-4 text-left">Fee ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <React.Fragment key={student.id}>
                <tr
                  onClick={() => handleStudentClick(student)}
                  className="cursor-pointer hover:bg-indigo-100"
                >
                  <td
                    className={`px-6 py-4 ${getTextColorByStatus(
                      student.taskStatus
                    )} font-bold`}
                  >
                    {student.fname} {student.lname}
                  </td>
                  <td className="px-6 py-4">{student.class}</td>
                  <td className="px-6 py-4">{student.div}</td>
                  <td className="px-6 py-4">{student.gender}</td>
                  <td className="px-6 py-4">{student.feeId}</td>
                </tr>

                {expandedStudent && expandedStudent.id === student.id && (
                  <tr>
                    <td colSpan="5" className="bg-gray-100 p-6 rounded-b-xl">
                      {loadingStock ? (
                        <Loader1 />
                      ) : (
                        <>
                          {/* ... existing stock table UI ... */}
                          {studentStock.length === 0 ? (
                            <div className="text-center text-gray-500 py-6">
                              No stock available
                            </div>
                          ) : (
                            <>
                              <table className="w-full table-auto mb-8 border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                                <thead className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                                  <tr>
                                    <th className="px-6 py-3 text-left border-b border-gray-300">
                                      Item Name
                                    </th>
                                    <th className="px-6 py-3 text-left border-b border-gray-300">
                                      Price
                                    </th>
                                    <th className="px-6 py-3 text-center border-b border-gray-300">
                                      Select
                                    </th>
                                    <th className="px-6 py-3 text-center border-b border-gray-300">
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="text-gray-700 text-sm">
                                  {studentStock.map((stock, index) => (
                                    <tr
                                      key={index}
                                      className="hover:bg-gray-50 transition duration-150 ease-in-out"
                                    >
                                      <td className="px-6 py-4 border-b border-gray-100">
                                        {stock.itemName}
                                      </td>
                                      <td className="px-6 py-4 border-b border-gray-100">
                                        ₹{stock.sellingPrice}
                                      </td>
                                      <td className="px-6 py-4 border-b border-gray-100 text-center">
                                        <input
                                          type="checkbox"
                                          checked={stock.selected}
                                          onChange={() =>
                                            handleCheckboxChange(index)
                                          }
                                          className="w-4 h-4 text-indigo-600"
                                        />
                                      </td>
                                      <td className="px-6 py-4 border-b border-gray-100 text-center">
                                        <button
                                          onClick={() =>
                                            handleDeleteItem(index)
                                          }
                                          className="text-red-600 hover:text-red-800 hover:underline font-medium"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  {studentStock.length === 0 && (
                                    <tr>
                                      <td
                                        colSpan="4"
                                        className="text-center py-6 text-gray-400 font-medium"
                                      >
                                        No items available.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>

                              <div className="text-right font-semibold text-lg mb-4">
                                Total Price: ₹{calculateTotalPrice()}
                              </div>
                            </>
                          )}

                          <AddPaymentTable
                            selectedItems={selectedItems}
                            studentId={student.id}
                            schoolId={student.schoolId}
                            studentClass={student.class}
                          />

                          {/* ✅ Add this line to show history for selected student */}
                          <StudentsStockPaymentHistory student={student} />
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockAllocate;
