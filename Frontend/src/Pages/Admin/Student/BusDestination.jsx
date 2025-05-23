
import React, { useEffect, useState, useRef } from "react";
import { MdOutlineFileUpload, MdOutlinePictureAsPdf } from "react-icons/md";
import { FaPlus, FaTimes, FaFileExcel, FaSearch } from "react-icons/fa";
import * as XLSX from "xlsx";
import { db } from "../../../config/firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import TableLoader from "../../../components/TableLoader";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import Swal from "sweetalert2";


function BusDestination() {
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [newDestination, setNewDestination] = useState({ name: "", fee: "" });
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [buses, setBuses] = useState([]);
  const [assignedMap, setAssignedMap] = useState({});
  const [busFilter, setBusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingDestinationId, setUpdatingDestinationId] = useState(null);

  const { userData } = useAuth();
  const { school } = useSchool();
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Pagination variables
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDestinations = filteredDestinations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const ref = collection(db, "allDestinations");
      const snap = await getDocs(ref);
      const dests = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d) => d.schoolCode === userData.schoolCode);
      setDestinations(dests);
      setFilteredDestinations(dests);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      })
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const ref = collection(db, "allBuses");
      const snap = await getDocs(ref);
      const busesData = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((bus) => bus.schoolCode === userData.schoolCode);
      setBuses(busesData);

      const map = {};
      busesData.forEach((bus) => {
        (bus.destinations || []).forEach((dest) => {
          map[dest.name] = { busDocId: bus.id, active: dest.active ?? true };
        });
      });
      setAssignedMap(map);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      })
    } finally {
      setLoading(false);
    }
  };

  const addDestination = async () => {
    if (!newDestination.name || !newDestination.fee) return;
    const formattedName = newDestination.name.trim().toLowerCase();
    const exists = destinations.some(d => d.name.toLowerCase() === formattedName);
    if (exists) {
      alert("Destination already exists!");
      return;
    }
    await addDoc(collection(db, "allDestinations"), {
      name: newDestination?.name?.toLowerCase(),
      fee: parseFloat(newDestination.fee),
      academicYear: school.academicYear,
      schoolCode: userData.schoolCode,
    });
  }
  const assignBus = async (destination, busDocId) => {
    const destRef = doc(db, "allDestinations", destination.id);
    const destSnap = await getDoc(destRef);
    if (!destSnap.exists()) return;

    const fullDest = destSnap.data();
    const destWithId = { ...fullDest, id: destination.id, active: true };

    const previousAssignment = assignedMap[destination.name];
    if (previousAssignment) {
      const prevBusRef = doc(db, "allBuses", previousAssignment.busDocId);
      const prevBusSnap = await getDoc(prevBusRef);
      if (prevBusSnap.exists()) {
        const prevBusData = prevBusSnap.data();
        const updatedPrevDestinations = (prevBusData.destinations || []).filter(
          (d) => d.name !== destination.name
        );
        await updateDoc(prevBusRef, { destinations: updatedPrevDestinations });
      }
    }

    const busRef = doc(db, "allBuses", busDocId);
    const busSnap = await getDoc(busRef);
    if (!busSnap.exists()) return;

    const busData = busSnap.data();
    const updatedDestinations = [...(busData.destinations || []), destWithId];
    await updateDoc(busRef, { destinations: updatedDestinations });

    setAssignedMap((prev) => ({
      ...prev,
      [fullDest.name]: { busDocId, active: true },
    }));
  };

  const toggleStatus = async (destination) => {
    const assignment = assignedMap[destination.name];
    if (!assignment) return Promise.reject();

    const busRef = doc(db, "allBuses", assignment.busDocId);
    const busSnap = await getDoc(busRef);
    if (!busSnap.exists()) return Promise.reject();

    const busData = busSnap.data();
    const updatedList = (busData.destinations || []).map((dest) =>
      dest.name === destination.name
        ? { ...dest, active: !assignment.active }
        : dest
    );

    return updateDoc(busRef, { destinations: updatedList })
      .then(() => {
        setAssignedMap((prev) => ({
          ...prev,
          [destination.name]: {
            ...assignment,
            active: !assignment.active,
          },
        }));
      });
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const existingDestSnap = await getDocs(collection(db, "allDestinations"));
      const existingDestNames = existingDestSnap.docs
        .filter(doc => doc.data().schoolCode === userData.schoolCode)
        .map(doc => doc.data().name.toLowerCase().trim());

      const reader = new FileReader();
      reader.onload = async (e) => {
        const bstr = e.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        // Show loading Swal
        const swalInstance = Swal.fire({
          title: 'Processing Excel File',
          html: 'Validating and uploading destinations...',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => Swal.showLoading()
        });

        try {
          // Validate column headers
          const requiredHeaders = ["Destination", "Fee"];
          const actualHeaders = Object.keys(data[0] || {});
          const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));
          if (missingHeaders.length > 0) {
            Swal.fire({
              title: "Error",
              text: `Missing required headers: ${missingHeaders.join(", ")}`,
              html: `<div class = "flex flex-col gap-3"> 
            <h1>Required columns: ${requiredHeaders.join(", ")}</h1>
            <h1>Missing required headers: ${missingHeaders.join(", ")}</h1>
            </div>
            `,
              icon: "error",
            })
            throw new Error(
              `Missing required columns: ${missingHeaders.join(", ")}.\n\n` +
              `Required columns: ${requiredHeaders.join(", ")}`
            );
          }

          const errors = [];
          const batch = [];
          const addedDestinations = [];

          data.forEach((row, index) => {
            const rowNumber = index + 2; // +2 for header row and 0-based index
            try {
              const name = row["Destination"]?.toString().trim().toUpperCase();
              const fee = parseFloat(row["Fee"]);

              // Validate row data
              if (!name) throw new Error("Destination name is required");
              if (isNaN(fee)) throw new Error("Invalid fee value");
              if (fee <= 0) throw new Error("Fee must be greater than 0");

              // Check for duplicates
              const normalizedName = name.toLowerCase();
              if (existingDestNames.includes(normalizedName)) {
                throw new Error("Destination already exists");
              }
              if (addedDestinations.includes(normalizedName)) {
                throw new Error("Duplicate in uploaded file");
              }

              batch.push({
                name,
                fee,
                academicYear: school.academicYear,
                schoolCode: userData.schoolCode
              });
              addedDestinations.push(normalizedName);
            } catch (err) {
              errors.push(`Row ${rowNumber}: ${err.message}`);
            }
          });

          if (errors.length > 0) {
            throw new Error(
              `Found ${errors.length} error(s) in spreadsheet:\n\n${errors.join("\n")}`
            );
          }

          if (batch.length === 0) {
            throw new Error("No valid destinations found in spreadsheet");
          }

          // Batch write to Firestore
          const batchPromises = batch.map(dest =>
            addDoc(collection(db, "allDestinations"), dest)
          );
          await Promise.all(batchPromises);
          // Close loader and show success
          Swal.close();
          Swal.fire({
            title: 'Upload Successful!',
            html: `
          <div class="text-left">
            <p>Added ${batch.length} new destinations:</p>
            <ul class="list-disc pl-5 mt-2 max-h-40 overflow-y-auto">
              ${batch.map(d => `<li>${d.name} (₹${d.fee})</li>`).join("")}
            </ul>
          </div>
        `,
            icon: 'success',
            confirmButtonColor: '#2563eb'
          });

          setShowExcelModal(false);
          fetchDestinations();
        } catch (err) {
          Swal.fire({
            title: 'Upload Error',
            html: `
        <div class="text-left">
          <p class="font-medium">${err.message.split("\n")[0]}</p>
          <div class="mt-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
            ${err.message.split("\n").slice(1).join("<br/>")}
          </div>
        </div>
      `,
            icon: 'error',
            confirmButtonColor: '#2563eb'
          });
        }
      }
      reader.readAsBinaryString(file);
    } catch (err) {
      Swal.fire({
        title: 'Upload Error',
        html: `
        <div class="text-left">
          <p class="font-medium">${err.message.split("\n")[0]}</p>
          <div class="mt-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
            ${err.message.split("\n").slice(1).join("<br/>")}
          </div>
        </div>
      `,
        icon: 'error',
        confirmButtonColor: '#2563eb'
      });
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      destinations.map(d => ({
        Destination: d.name,
        Fee: d.fee,
        "Academic Year": d.academicYear,
        Status: assignedMap[d.name]?.active ? "Active" : "Inactive"
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Destinations");
    XLSX.writeFile(workbook, "destinations.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [['Destination', 'Fee', 'Academic Year', 'Status']],
      body: destinations.map(d => [
        d.name,
        `₹${d.fee}`,
        d.academicYear,
        assignedMap[d.name]?.active ? 'Active' : 'Inactive'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { top: 20 }
    });
    doc.save('destinations.pdf');
  };

  useEffect(() => {
    fetchDestinations();
    fetchBuses();
  }, []);

  useEffect(() => {
    let filtered = destinations;
    if (searchTerm) {
      filtered = filtered.filter((dest) =>
        dest.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (busFilter !== "All") {
      filtered = filtered.filter((dest) => {
        const assignment = assignedMap[dest.name];
        return assignment?.busDocId === busFilter;
      });
    }
    setFilteredDestinations(filtered);
  }, [searchTerm, destinations, busFilter, assignedMap]);

  return (
    <>
      <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
        {
          (loading) ? <TableLoader /> :
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex gap-3 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDestinationModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 w-full sm:w-auto text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Destination
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white w-full sm:w-auto px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    onClick={() => setShowExcelModal(true)}
                  >
                    <MdOutlineFileUpload className="w-5 h-5" />                    Bulk Upload
                  </motion.button>
                </div>

                <div className="ml-auto flex gap-3 w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-5 py-2.5 w-1/2  text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg"
                    onClick={exportToExcel}
                  >
                    <FaFileExcel /> Excel
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm w-1/2 font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                    onClick={exportToPDF}
                  >
                    <MdOutlinePictureAsPdf /> PDF
                  </motion.button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="bg-white p-1.5 rounded-xl shadow-sm border border-purple-100 ">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search destinations..."
                    className="w-full p-4 py-2.5 border-2 border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute right-4 top-1/4 text-xl text-purple-400" />
                </div>
              </div>
              {/* Table Section */}
              <div className="overflow-x-auto rounded-xl border border-purple-100 shadow-lg overflow-y-hidden">
                {
                  currentDestinations.length ?
                    <table className="min-w-full divide-y divide-purple-100 overflow-y-hidden">
                      <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white text-sm">
                        <tr>
                          {["Destination", "Fee", "Academic Year", "Assigned Bus", "Status"].map(
                            (header, index) => (
                              <th
                                key={index}
                                className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap border-r border-purple-500/30 last:border-r-0"
                              >
                                {header}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100 bg-white">
                        {currentDestinations.map((dest, index) => {
                          const assignment = assignedMap[dest.name] || {};
                          const isUpdating = updatingDestinationId === dest.id;
                          return (
                            <motion.tr
                              key={dest.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-purple-50/50 even:bg-purple-100/50 hover:bg-purple-200/50 transition-colors duration-150">
                              {/* Destination Cells */}
                              <td className="px-4 py-3 font-medium text-violet-900">{dest.name}</td>
                              <td className="px-4 py-3 font-medium text-violet-900 align-middle">₹{dest.fee}</td>
                              <td className="px-4 py-3 font-medium text-violet-900 align-middle">{dest.academicYear}</td>

                              {/* Bus Assignment Dropdown */}
                              <td className="p-4 align-middle">
                                <select
                                  className="border-2 border-purple-200 w-full rounded-xl p-2 text-sm text-purple-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                                  value={assignment.busDocId || ""}
                                  onChange={(e) => assignBus(dest, e.target.value)}
                                >
                                  <option
                                    className="text-purple-900"
                                    value="">Select Bus</option>
                                  {buses.map(bus => (
                                    <option key={bus.id} value={bus.id}>
                                      {bus.busNo} ({bus.driverName})
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Status Toggle */}
                              <td className="px-4 py-3 font-medium text-violet-900 align-middle">
                                <div className="flex items-center justify-center h-full">
                                  {isUpdating ? (
                                    <div className="w-20 flex justify-center">
                                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                    </div>
                                  ) : (
                                    <label
                                      className={` relative inline-flex items-center gap-2 ${!assignment.busDocId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'} `}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!!assignment.busDocId && assignment.active}
                                        onChange={() => {
                                          if (assignment.busDocId) {
                                            setUpdatingDestinationId(dest.id);
                                            toggleStatus(dest).finally(() => setUpdatingDestinationId(null));
                                          }
                                        }}
                                        disabled={!assignment.busDocId}
                                        className="sr-only peer"
                                        aria-label={`Toggle status for ${dest.name}`}
                                      />
                                      {/* Track */}
                                      <div
                                        className={` relative w-11 h-6 rounded-full transition-colors duration-200 ${assignment.active ? 'bg-blue-600' : 'bg-gray-400'} ${!assignment.busDocId ? 'bg-gray-300' : ''}`}
                                      >
                                        {/* Thumb */}
                                        <div
                                          className={` absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${assignment.active ? 'translate-x-full' : 'translate-x-0'} ${!assignment.busDocId ? 'translate-x-0' : ''}`}
                                        />
                                      </div>
                                      {/* Status Text */}
                                      <span
                                        className={`text-sm font-medium ${!assignment.busDocId ? 'text-gray-500' : assignment.active ? 'text-green-700' : 'text-red-700'}`}>
                                        {assignment.busDocId
                                          ? (assignment.active ? 'Active' : 'Inactive')
                                          : 'Disabled'
                                        }
                                      </span>
                                    </label>
                                  )}
                                </div>
                              </td>

                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table> :
                    <div className="text-center text-xl font-semibold py-6 text-gray-400">No Bus Destination Found</div>
                }
                {/* pagination */}
                <div className="flex justify-between items-center p-4 border-t border-gray-400">
                  <span className="text-gray-600">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDestinations.length)} of {filteredDestinations.length} entries
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-violet-800/90">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
        }
        {/* Add Destination Modal */}
        <AnimatePresence>
          {showDestinationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowDestinationModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl border border-purple-100"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">Add New Destination</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                      value={newDestination.name}
                      onChange={(e) => setNewDestination({ ...newDestination, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee (₹)
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                      value={newDestination.fee}
                      onChange={(e) => setNewDestination({ ...newDestination, fee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDestinationModal(false)}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addDestination}
                    className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200"
                  >
                    Add Destination
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Excel Upload Modal */}
        <AnimatePresence>
          {showExcelModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowExcelModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-6 shadow-2xl border border-purple-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-4 border-b border-purple-100">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                    Bulk Upload Template
                  </h2>
                  <button
                    onClick={() => setShowExcelModal(false)}
                    className="text-purple-500 hover:text-purple-700 transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    Column names should follow this format <span className="text-purple-600">(*required)</span>
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-purple-100">
                    <table className="min-w-full divide-y divide-purple-100 text-sm">
                      <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                        <tr>
                          {["Destination", "Fee"].map((header) => (
                            <th
                              key={header}
                              className="px-4 py-2.5 text-left font-medium border-r border-purple-500/30 last:border-r-0"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-purple-100">
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-violet-900">New York</td>
                          <td className="px-4 py-2.5 text-purple-800">1500</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-violet-900">Los Angeles</td>
                          <td className="px-4 py-2.5 text-purple-800">2000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-center cursor-pointer hover:from-purple-700 hover:to-violet-700 shadow-md transition-all"
                  >
                    {uploading ? "Uploading..." : "Choose Excel File"}
                    <input
                      type="file"
                      accept=".xls,.xlsx"
                      onChange={handleExcelUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </motion.label>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}

export default BusDestination;
