
import React, { useEffect, useState, useRef } from "react";
import { MdOutlineFileUpload, MdOutlinePictureAsPdf } from "react-icons/md";
import { FaPlus, FaFileExcel } from "react-icons/fa";
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
  const fileref = useRef(null);
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
    const ref = collection(db, "allDestinations");
    const snap = await getDocs(ref);
    const dests = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((d) => d.schoolCode === userData.schoolCode);
    setDestinations(dests);
    console.log({ dests })
    setFilteredDestinations(dests);
  };

  const fetchBuses = async () => {
    const ref = collection(db, "allBuses");
    const snap = await getDocs(ref);
    const busesData = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((bus) => bus.schoolCode === userData.schoolCode);
    setBuses(busesData);

    const map = {};
    console.log({ busesData })
    busesData.forEach((bus) => {
      (bus.destinations || []).forEach((dest) => {
        map[dest.name] = { busDocId: bus.id, active: dest.active ?? true };
      });
    });
    console.log({ map })
    setAssignedMap(map);
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

    setLoading(true);
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
      setLoading(false);
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
      {loading && <TableLoader />}
      <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-3 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowDestinationModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <FaPlus /> Add Destination
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowExcelModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <MdOutlineFileUpload />
                Bulk Upload
              </motion.button>
            </div>

            <div className="ml-auto flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 border border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb] hover:text-white rounded-lg transition-all"
              >
                <FaFileExcel /> Excel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 border border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white rounded-lg transition-all"
              >
                <MdOutlinePictureAsPdf /> PDF
              </motion.button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <input
              type="text"
              placeholder="Search destinations..."
              className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Table Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-400">
              <thead className="text-black bg-gradient-to-br from-indigo-50 to-violet-50 ">
                <tr>
                  <th className="p-4 text-left">Destination</th>
                  <th className="p-4 text-left">Fee</th>
                  <th className="p-4 text-left">Academic Year</th>
                  <th className="p-4 text-left">Assigned Bus</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-gradient-to-r from-slate-50 to-indigo-50">
                {currentDestinations.map((dest) => {
                  const assignment = assignedMap[dest.name] || {};
                  const bus = buses.find(b => b.id === assignment.busDocId);
                  const isUpdating = updatingDestinationId === dest.id;

                  return (
                    <tr key={dest.id} className="hover:bg-blue-50 transition-colors">
                      {/* Destination Cells */}
                      <td className="p-4 font-medium align-middle">{dest.name}</td>
                      <td className="p-4 align-middle">₹{dest.fee}</td>
                      <td className="p-4 text-blue-600 align-middle">{dest.academicYear}</td>

                      {/* Bus Assignment Dropdown */}
                      <td className="p-4 align-middle">
                        <select
                          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          value={assignment.busDocId || ""}
                          onChange={(e) => assignBus(dest, e.target.value)}
                        >
                          <option value="">Select Bus</option>
                          {buses.map(bus => (
                            <option key={bus.id} value={bus.id}>
                              {bus.busNo} ({bus.driverName})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status Toggle */}
                      <td className="p-4 align-middle">
                        <div className="flex items-center justify-center h-full">
                          {isUpdating ? (
                            <div className="w-20 flex justify-center"> {/* Fixed width matching toggle+text */}
                              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                            </div>
                          ) : (
                            <label className="relative inline-flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={assignment.active}
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

                              {/* Toggle Track */}
                              <div className={`
                  w-11 h-6 bg-gray-200 rounded-full 
                  peer-focus:ring-2 peer-focus:ring-blue-300 
                  transition-colors duration-200
                  ${!assignment.busDocId
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'group-hover:bg-gray-300'
                                }
                  ${assignment.active ? 'bg-blue-600' : 'bg-gray-400'}
                `}>
                                {/* Toggle Thumb */}
                                <div className={`
                    absolute top-0.5 left-[2px] bg-white rounded-full h-5 w-5
                    transition-transform duration-200
                    ${assignment.active ? 'translate-x-full' : ''}
                    ${!assignment.busDocId ? 'left-[2px]' : ''}
                  `} />
                              </div>

                              {/* Status Text */}
                              <span className={`
                  text-sm font-medium 
                  ${!assignment.busDocId
                                  ? 'text-gray-400'
                                  : assignment.active
                                    ? 'text-green-700'
                                    : 'text-red-700'
                                }
                `}>
                                {assignment.busDocId
                                  ? (assignment.active ? 'Active' : 'Inactive')
                                  : 'Not Assigned'}
                              </span>
                            </label>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* pagination */}
            <div className="flex justify-between items-center p-4 border-t">
              <span className="text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDestinations.length)} of {filteredDestinations.length} entries
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

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
                className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-blue-600">Add New Destination</h2>
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                className="bg-white rounded-2xl p-8 max-w-2xl w-full space-y-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-blue-600">Upload Destinations via Excel</h2>

                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">Required Format:</h3>
                    <table className="w-full border-collapse border-2 border-gray-200">
                      <thead className="text-black bg-gradient-to-br from-indigo-50 to-violet-50 ">
                        <tr>
                          <th className="p-3 text-left">Destination</th>
                          <th className="p-3 text-left">Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl shadow-sm">
                        <tr>
                          <td className="p-3 border">New York</td>
                          <td className="p-3 border">1500</td>
                        </tr>
                        <tr>
                          <td className="p-3 border">Los Angeles</td>
                          <td className="p-3 border">2000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <label className="block">
                    <span className="sr-only">Choose Excel file</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelUpload}
                      className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowExcelModal(false)}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Close
                  </button>
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
