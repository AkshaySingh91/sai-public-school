import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase"; // adjust path if needed
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import { motion } from "framer-motion"
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import TableLoader from ".././../../components/TableLoader"

function BusAllocation() {
  const [students, setStudents] = useState([]);
  const [busData, setBusData] = useState({});
  const [destinationData, setDestinationData] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedBus, setSelectedBus] = useState("All");
  const [selectedDestination, setSelectedDestination] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [studentsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const users = useAuth().userData;
  const { school } = useSchool();
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchData = async () => {
      try {
        let studentSnapshot;
        if (users.schoolCode) {
          const q = query(
            collection(db, "students"),
            where("schoolCode", "==", users.schoolCode)
          );
          studentSnapshot = await getDocs(q);
        }
        const studentList = studentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const activeStudents = studentList.filter(
          (student) => student.status === "new" || student.status === "current"
        );

        const years = [...new Set(activeStudents.map((s) => s.academicYear))];

        const busesSnapshot = await getDocs(collection(db, "allBuses"));
        const busesList = busesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const busIdToPlate = {};
        busesList.forEach((bus) => {
          if (bus.id && bus.numberPlate) {
            busIdToPlate[bus.id] = bus.numberPlate;
          }
        });

        const destSnapshot = await getDocs(collection(db, "allDestinations"));
        const destList = destSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setStudents(activeStudents);
        setFilteredStudents(activeStudents);
        setBusData(busIdToPlate);
        setDestinationData(destList);
        setAcademicYears(years);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = students;

    if (selectedYear !== "All") {
      filtered = filtered.filter(
        (student) => student.academicYear === selectedYear
      );
    }

    if (selectedBus !== "All") {
      filtered = filtered.filter((student) => {
        const busId = student.transportDetails?.busId || "";
        return busData[busId] === selectedBus;
      });
    }

    if (selectedDestination !== "All") {
      filtered = filtered.filter((student) => {
        return (
          (student.busStop || "").toLowerCase() ===
          selectedDestination.toLowerCase()
        );
      });
    }

    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((student) => {
        const fullName = `${student.fname || ""} ${student.lname || ""
          }`.toLowerCase();
        const busStop = (student.busStop || "").toLowerCase();
        const busId = student.transportDetails?.busId || "";
        const numberPlate = (busData[busId] || "").toLowerCase();
        const outstandingFee = calculateOutstandingFee(student).toString();

        return (
          fullName.includes(searchTerm.toLowerCase()) ||
          busStop.includes(searchTerm.toLowerCase()) ||
          numberPlate.includes(searchTerm.toLowerCase()) ||
          outstandingFee.includes(searchTerm)
        );
      });
    }

    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [
    students,
    selectedYear,
    selectedBus,
    selectedDestination,
    searchTerm,
    busData,
  ]);
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map(student => ({
      "Academic Year": student.academicYear,
      "Name": `${student.fname} ${student.lname}`,
      "Class": student.class,
      "Division": student.div,
      "Fee ID": student.feeId,
      "Bus Stop": destinationData.find(dest => dest.id === student.transportDetails?.destinationId)?.name || "-",
      "Bus Number": busData[student.transportDetails?.busId] || "-",
      "Total Fee": student.allFee?.transportFee || 0,
      "Discount": student.allFee?.transportFeeDiscount || 0,
      "Outstanding": calculateOutstandingFee(student)
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bus Allocations");
    XLSX.writeFile(workbook, "bus_allocations.xlsx");
  };

  const exportToPDF = async () => {
    const input = document.getElementById("bus-allocation-table");
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("landscape");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("bus_allocations.pdf");
  };
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(
    indexOfFirstStudent,
    indexOfLastStudent
  );
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  return (<>
    {currentStudents.length ?
      <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
        <div className="max-w-7xl mx-auto">

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-white p-6 rounded-2xl shadow-xl border border-purple-100">
            {[
              {
                label: "Academic Year",
                value: selectedYear,
                options: ["All", ...academicYears],
                onChange: (e) => setSelectedYear(e.target.value)
              },
              {
                label: "Bus Number",
                value: selectedBus,
                options: ["All", ...Object.values(busData)],
                onChange: (e) => setSelectedBus(e.target.value)
              },
              {
                label: "Destination",
                value: selectedDestination,
                options: ["All", ...destinationData.map(dest => dest.name)],
                onChange: (e) => setSelectedDestination(e.target.value)
              },
              {
                label: "Search",
                isInput: true,
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value)
              }
            ].map((filter, idx) => (
              <div key={idx} className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-800">
                  {filter.label}
                </label>
                {filter.isInput ? (
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filter.value}
                    onChange={filter.onChange}
                    className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                  />
                ) : (
                  <select
                    value={filter.value}
                    onChange={filter.onChange}
                    className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                  >
                    {filter.options.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl shadow-xl border border-purple-100">
            <table className="min-w-full divide-y divide-purple-100">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                <tr>
                  {["Academic Year", "Name", "Class", "Div", "Fee ID", "Bus Stop", "Bus",
                    "After Discount", "Discount", "Paid", "Outstanding"].map((header, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left text-sm font-semibold tracking-wide border-r border-purple-500/30 last:border-r-0"
                      >
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-purple-100">
                {currentStudents.map((student) => {
                  const fullName = `${student.fname || ""} ${student.lname || ""}`;
                  const busId = student.transportDetails?.busId || "-";
                  const destinationId = student.transportDetails?.destinationId || null;
                  const busFee = student.allFee?.transportFee || 0;
                  const discountFee = student.allFee?.transportFeeDiscount || 0;
                  const outstandingFee = calculateOutstandingFee(student);
                  const paidFee = 0;
                  const numberPlate = busData[busId] || "-";
                  const destinationName = destinationId
                    ? destinationData.find((dest) => dest.id === destinationId)?.name || "-"
                    : "-";

                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-purple-50/80 transition-colors duration-300"
                    >
                      <td className="px-4 py-3 font-medium text-violet-900">
                        {student.academicYear || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{fullName}</td>
                      <td className="px-4 py-3 text-gray-700">{student.class}</td>
                      <td className="px-4 py-3 text-gray-700">{student.div || "-"}</td>
                      <td className="px-4 py-3 font-mono text-purple-800">{student.feeId}</td>
                      <td className="px-4 py-3 text-gray-700">{destinationName}</td>
                      <td className="px-4 py-3 font-semibold text-violet-900">{numberPlate}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">₹{busFee}</td>
                      <td className="px-4 py-3 font-bold text-red-600">-₹{discountFee}</td>
                      <td className="px-4 py-3 font-bold text-green-700">₹{paidFee}</td>
                      <td className="px-4 py-3 font-bold text-red-600">₹{outstandingFee}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between px-4">
            <div className="text-sm text-violet-800/90">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, currentStudents.length)} of{" "}
              {currentStudents.length} entries
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </motion.button>
              <span className="px-4 py-2 text-sm font-medium text-violet-800">
                Page {currentPage} of {totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      : <TableLoader />
    }
  </>);
}

function calculateOutstandingFee(student) {
  const schoolFeesTotal = student.schoolFees?.total || 0;
  const transportFee = student.transportDetails?.finalTransportFee || 0;
  const hostelFee = student.hostelFee || 0;
  const paidFee = student.currentPaidFee || 0;
  const total = schoolFeesTotal + transportFee + hostelFee;
  return total - paidFee;
}

export default BusAllocation;
