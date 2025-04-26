import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase"; // adjust path if needed

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Students
        const studentSnapshot = await getDocs(collection(db, "students"));
        const studentList = studentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const activeStudents = studentList.filter(
          (student) => student.status === "active"
        );

        // Academic Years
        const years = [...new Set(activeStudents.map((s) => s.academicYear))];

        // Buses
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

        // Destinations
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
        const fullName = `${student.fname || ""} ${
          student.lname || ""
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

  // Pagination Logic
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(
    indexOfFirstStudent,
    indexOfLastStudent
  );
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Bus Allocation - Students List
      </h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <label className="font-medium mr-2">Academic Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="All">All</option>
            {academicYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Bus Number:</label>
          <select
            value={selectedBus}
            onChange={(e) => setSelectedBus(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="All">All</option>
            {Object.values(busData).map((numberPlate) => (
              <option key={numberPlate} value={numberPlate}>
                {numberPlate}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Destination:</label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="All">All</option>
            {destinationData.map((dest) => (
              <option key={dest.id} value={dest.name}>
                {dest.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-grow">
          <input
            type="text"
            placeholder="Search by Name, Bus Stop, Number Plate, Outstanding Fee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border w-full px-3 py-2 rounded-lg"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2">Academic Year</th> {/* Moved here */}
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Div</th>
              <th className="px-4 py-2">Fee ID</th>
              <th className="px-4 py-2">Bus Stop</th>
              <th className="px-4 py-2">Bus</th>
              <th className="px-4 py-2">After Discount Fee</th>
              <th className="px-4 py-2">Discount Fee</th>
              <th className="px-4 py-2">Paid Fee</th> {/* New Column */}
              <th className="px-4 py-2">Outstanding Fee</th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.map((student) => {
              const fullName = `${student.fname || ""} ${student.lname || ""}`;
              const busStop = student.busStop || "-";
              const busId = student.transportDetails?.busId || "-";
              const busFee = student.allFee?.transportFee || 0;
              const discountFee = student.allFee?.transportFeeDiscount || 0;
              const outstandingFee = calculateOutstandingFee(student);
              const numberPlate = busData[busId] || "-";

              // You will calculate the paidFee later, for now just a dummy 0
              const paidFee = 0;

              return (
                <tr key={student.id} className="text-center border-b">
                  <td className="px-4 py-2">{student.academicYear || "-"}</td>{" "}
                  {/* Academic Year first */}
                  <td className="px-4 py-2">{fullName}</td>
                  <td className="px-4 py-2">{student.class}</td>
                  <td className="px-4 py-2">{student.div || "-"}</td>
                  <td className="px-4 py-2">{student.feeId}</td>
                  <td className="px-4 py-2">{busStop}</td>
                  <td className="px-4 py-2">{numberPlate}</td>
                  <td className="px-4 py-2">{busFee}</td>
                  <td className="px-4 py-2">{discountFee}</td>
                  <td className="px-4 py-2">{paidFee}</td>{" "}
                  {/* New Paid Fee Column */}
                  <td className="px-4 py-2">{outstandingFee}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-end mt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Prev
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function
function calculateOutstandingFee(student) {
  const schoolFeesTotal = student.schoolFees?.total || 0;
  const transportFee = student.transportDetails?.finalTransportFee || 0;
  const hostelFee = student.hostelFee || 0;
  const messFee = student.messFee || 0;
  const lastYearBalance = student.lastYearBalanceFee || 0;
  const schoolFeesDiscount = student.schoolFeesDiscount || 0;
  const transportFeeDiscount = student.transportFeeDiscount || 0;

  const totalFee =
    schoolFeesTotal + transportFee + hostelFee + messFee + lastYearBalance;
  const totalDiscount =
    schoolFeesDiscount +
    transportFeeDiscount +
    (student.lastYearDiscount || 0) +
    (student.lastYearTransportFeeDiscount || 0);

  const finalOutstanding = totalFee - totalDiscount;
  return finalOutstanding > 0 ? finalOutstanding : 0;
}

export default BusAllocation;
