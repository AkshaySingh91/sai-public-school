import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import { autoTable } from 'jspdf-autotable'
import { TriangleAlert, Search, Settings, Trash2 } from "lucide-react"
import TableLoader from "../../../components/TableLoader"
import busAnimation from "../../../assets/busAnimation.gif"
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaFileExcel } from "react-icons/fa";
import { MdOutlineFileUpload, MdOutlinePictureAsPdf } from "react-icons/md";

function BusList() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBusModal, setShowBusModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [newBus, setNewBus] = useState({
    numberPlate: "",
    busNo: "",
    driverName: "",
    mobile: "",
    assistant: "",
    status: "Active",
    insuranceDate: "",
  });
  const users = useAuth().userData;
  const [buses, setBuses] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [editingBus, setEditingBus] = useState({
    numberPlate: "",
    busNo: "",
    driverName: "",
    mobile: "",
    assistant: "",
    status: "Active",
    insuranceDate: "",
  });
  // Pagination variables
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  // Updated fetchBuses to include check for existing buses
  const checkExistingBus = (busNo, numberPlate) => {
    return buses.some(bus =>
      bus.busNo === busNo || bus.numberPlate === numberPlate
    );
  };

  // Add a single bus
  const addBus = async () => {
    if (!newBus.numberPlate || !newBus.busNo || !newBus.driverName) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please fill required fields: Number Plate, Bus No, Driver Name',
        confirmButtonColor: '#2563eb'
      });
      return;
    }
    // Check for existing bus
    if (checkExistingBus(newBus.busNo, newBus.numberPlate)) {
      Swal.fire({
        icon: 'error',
        title: 'Bus Exists',
        text: 'Bus with same Bus No or Number Plate already exists!',
        confirmButtonColor: '#2563eb'
      });
      return;
    }
    const busData = {
      ...newBus,
      assistant: newBus.assistant || "Not assigned",
      insuranceDate: newBus.insuranceDate || "Not set",
      schoolCode: users?.schoolCode,
    };

    try {
      await addDoc(collection(db, "allBuses"), busData);
      Swal.fire({
        title: 'Success!',
        text: 'Bus added successfully!',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
      setNewBus({
        numberPlate: "",
        busNo: "",
        driverName: "",
        mobile: "",
        assistant: "",
        status: "",
        insuranceDate: "",
      });
      setShowBusModal(false);
      fetchBuses();
    } catch (error) {
      console.error("Error adding bus:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to add bus.',
        icon: 'error',
        confirmButtonColor: '#2563eb'
      });
    }
  };

  // Fetch buses
  const fetchBuses = async () => {
    if (!users?.schoolCode) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "allBuses"),
        where("schoolCode", "==", users.schoolCode)
      );
      const querySnapshot = await getDocs(q);
      const busList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log({ busList })
      busList.sort((a, b) => a.busNo.localeCompare(b.busNo, undefined, { numeric: true }));
      setBuses(busList);
    } catch (error) {
      console.error("Error fetching buses:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Add these functions
  const openEditModal = (bus) => {
    setSelectedBus(bus);
    setEditingBus(bus);
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingBus(prev => ({ ...prev, [name]: value }));
  };

  const updateBus = async () => {
    if (!editingBus.numberPlate || !editingBus.busNo || !editingBus.driverName) {
      Swal.fire({ icon: 'error', text: 'Required fields missing', confirmButtonColor: '#2563eb' });
      return;
    }

    // Check for existing buses excluding current one
    const existing = buses.some(bus =>
      bus.id !== selectedBus.id &&
      (bus.busNo === editingBus.busNo || bus.numberPlate === editingBus.numberPlate)
    );

    if (existing) {
      Swal.fire({ icon: 'error', text: 'Bus with same details already exists', confirmButtonColor: '#2563eb' });
      return;
    }

    try {
      const busRef = doc(db, "allBuses", selectedBus.id);
      await updateDoc(busRef, editingBus);
      Swal.fire({ icon: 'success', text: 'Bus updated!', confirmButtonColor: '#2563eb' });
      setShowEditModal(false);
      fetchBuses();
    } catch (error) {
      console.error("Error updating bus:", error);
      Swal.fire({ icon: 'error', text: 'Update failed', confirmButtonColor: '#2563eb' });
    }
  };

  const deleteBus = async (busId) => {
    const result = await Swal.fire({
      title: 'Delete Bus?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "allBuses", busId));
        Swal.fire({ icon: 'success', text: 'Bus deleted', confirmButtonColor: '#2563eb' });
        fetchBuses();
      } catch (error) {
        console.error("Error deleting bus:", error);
        Swal.fire({ icon: 'error', text: 'Deletion failed', confirmButtonColor: '#2563eb' });
      }
    }
  };

  // Excel Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      console.log({ jsonData })
      const errors = [];
      const validBuses = [];

      jsonData.forEach((bus, index) => {
        if (!bus["Number Plate"] || !bus["Bus No"] || !bus["Driver Name"]) {
          errors.push(`Row ${index + 2}: Missing required fields`);
          return;
        }
        // Check for duplicates
        if (checkExistingBus(bus["Bus No"], bus["Number Plate"])) {
          errors.push(`Row ${index + 2}: Bus already exists`);
          return;
        }
        validBuses.push({
          numberPlate: bus["Number Plate"].toString().trim(),
          busNo: bus["Bus No"].toString().trim(),
          driverName: bus["Driver Name"].toString().trim(),
          mobile: bus["Mobile"]?.toString().trim() || "",
          assistant: bus["Assistant"]?.toString().trim() || "Not assigned",
          status: ["Active", "Inactive"].includes(bus["Status"]?.toString().trim())
            ? bus["Status"].toString().trim()
            : "Inactive",
          insuranceDate: bus["Insurance Date"]?.toString().trim() || "Not set",
          schoolCode: users?.schoolCode,
        });
      });
      console.log({ validBuses })
      if (errors.length > 0) {
        throw new Error(`Errors found:\n${errors.join('\n')}`);
      }

      // Add valid buses to Firestore
      const batchPromises = validBuses.map(bus =>
        addDoc(collection(db, "allBuses"), bus)
      );
      await Promise.all(batchPromises);

      Swal.fire({
        title: 'Success!',
        html: `Uploaded ${validBuses.length} buses successfully!`,
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
      setShowExcelModal(false);
      fetchBuses();
    } catch (error) {
      Swal.fire({
        title: 'Upload Error',
        html: `<div style="max-height: 200px; overflow-y: auto;">${error.message}</div>`,
        icon: 'error',
        confirmButtonColor: '#2563eb'
      });
    }

    setUploading(false);
    e.target.value = "";
  };
  // Add search functionality
  const filteredBuses = buses.filter(bus => {
    const searchLower = searchTerm.toLowerCase();
    return (
      bus.numberPlate.toLowerCase().includes(searchLower) ||
      bus.driverName.toLowerCase().includes(searchLower) ||
      bus.mobile.includes(searchTerm)
    );
  });
  // Update pagination variables to use filteredBuses
  const currentBuses = filteredBuses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage);
  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(buses.map(bus => ({
      "Bus No": bus.busNo,
      "Number Plate": bus.numberPlate,
      "Driver Name": bus.driverName,
      "Mobile": bus.mobile,
      "Assistant": bus.assistant,
      "Status": bus.status,
      "Insurance Date": bus.insuranceDate
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buses");
    XLSX.writeFile(workbook, "buses.xlsx");
  };
  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Bus No', 'Number Plate', 'Driver', 'Mobile', 'Assistant', 'Status', 'Insurance Date']],
      body: buses.map(bus => [
        bus.busNo,
        bus.numberPlate,
        bus.driverName,
        bus.mobile,
        bus.assistant,
        bus.status,
        bus.insuranceDate
      ]),
      theme: 'grid',
      styles: { halign: 'center' },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save('buses.pdf');
  };

  useEffect(() => { fetchBuses(); }, [users?.schoolCode]);

  return (
    <div className="p-4 space-y-6 relative min-h-screen">
      {/* <style>{`
  @keyframes moveBusLR {
    0% { transform: translateX(-100%) rotateY(0deg); }
    100% { transform: translateX(100%) rotateY(0deg); }
  }
  @keyframes moveBusRL {
    0% { transform: translateX(100%) rotateY(180deg); }
    100% { transform: translateX(-100%) rotateY(180deg); }
  }
  .animate-moveBusLR {
    animation: moveBusLR 12s linear infinite;
  }
  .animate-moveBusRL {
    animation: moveBusRL 12s linear infinite;
  }
    `}</style>
      <div className="absolute bottom-4 h-24 w-full overflow-hidden z-0">
        {[
          { id: 1, direction: 'LR', delay: '0s', top: 'bottom-0' },
          { id: 2, direction: 'RL', delay: '2s', top: 'bottom-4' },
          { id: 3, direction: 'LR', delay: '4s', top: 'bottom-8' }
        ].map((bus) => (
          <img
            key={bus.id}
            src={busAnimation}
            alt="Moving bus"
            className={`absolute h-16 ${bus.top} ${bus.direction === 'LR'
              ? 'animate-moveBusLR'
              : 'animate-moveBusRL'
              }`}
            style={{
              animationDelay: bus.delay,
              [bus.direction === 'LR' ? 'left' : 'right']: '-10%'
            }}
          />
        ))}
      </div> */}

      {/* Loading Overlay */}
      {isLoading ?
        <div className="max-w-7xl mx-auto  p-4 pt-8 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
          <TableLoader
            headers={6}
            rows={5}
            className="border-purple-200/40"
          />
        </div> :
        <>
          {/* Header Section */}
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-3 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowBusModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <FaPlus /> Add Bus
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
          </div>
          {/* Excel Upload Modal */}
          {showExcelModal && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowExcelModal(false)}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 h-screen w-screen z-10">

                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white rounded-2xl p-8 max-w-2xl w-full space-y-6 shadow-xl z-50"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 text-center flex-grow">Excel Template Format</h2>
                    <button onClick={() => setShowExcelModal(false)} className="text-gray-500 hover:text-gray-700">
                      ✕
                    </button>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-3 flex item-center gap-2">
                      <TriangleAlert size={18} className="my-auto text-red-400" />
                      Column name should be in same format <span className="text-gray-600">(* means required)</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-200 px-4 py-2">Bus No*</th>
                            <th className="border border-gray-200 px-4 py-2">Number Plate*</th>
                            <th className="border border-gray-200 px-4 py-2">Driver Name*</th>
                            <th className="border border-gray-200 px-4 py-2">Mobile</th>
                            <th className="border border-gray-200 px-4 py-2">Assistant</th>
                            <th className="border border-gray-200 px-4 py-2">Status</th>
                            <th className="border border-gray-200 px-4 py-2">Insurance Date</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          <tr>
                            <td className="border border-gray-200 px-4 py-2">BUS-001</td>
                            <td className="border border-gray-200 px-4 py-2">KA01AB1234</td>
                            <td className="border border-gray-200 px-4 py-2">John Doe</td>
                            <td className="border border-gray-200 px-4 py-2">9876543210</td>
                            <td className="border border-gray-200 px-4 py-2">Jane Smith</td>
                            <td className="border border-gray-200 px-4 py-2">Active</td>
                            <td className="border border-gray-200 px-4 py-2">2024-12-31</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <label className="block w-full px-4 py-2 bg-[#2563eb] text-white rounded-lg text-center cursor-pointer hover:bg-[#1d4ed8] transition-colors">
                    {uploading ? 'Uploading...' : 'Choose Excel File'}
                    <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Add Bus Modal */}
          {showBusModal && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 "
                onClick={(e) => e.target === e.currentTarget && setShowBusModal(false)}>
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Add New Bus</h2>
                    <button onClick={() => setShowBusModal(false)} className="text-gray-500 hover:text-gray-700">
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    {Object.keys(newBus).map((key) => (
                      key !== 'status' && key !== 'insuranceDate' && (
                        <input key={key} placeholder={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          value={newBus[key]}
                          onChange={(e) => setNewBus({ ...newBus, [key]: e.target.value })}
                        />
                      )
                    ))}

                    <select required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                      value={newBus.status}
                      onChange={(e) => setNewBus({ ...newBus, status: e.target.value })}>
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>

                    <input type="date" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                      value={newBus.insuranceDate}
                      onChange={(e) => setNewBus({ ...newBus, insuranceDate: e.target.value })}
                    />

                    <div className="flex justify-end gap-3 mt-4">
                      <button onClick={() => setShowBusModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                      </button>
                      <button onClick={addBus}
                        className="px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors">
                        Add Bus
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
          {/* Edit bus modal */}
          {showEditModal && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={(e) => setShowEditModal(false)}>

                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white rounded-2xl p-8 max-w-2xl w-full space-y-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Bus Details</h2>
                    <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    {Object.entries({
                      busNo: 'Bus Number',
                      numberPlate: 'License Plate',
                      driverName: 'Driver Name',
                      mobile: 'Contact Number',
                      assistant: 'Assistant Name',
                    }).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          {label}
                        </label>
                        <input
                          name={key}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          value={editingBus[key]}
                          onChange={handleEditChange}
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                        value={editingBus.status}
                        onChange={handleEditChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Insurance Expiry
                      </label>
                      <input
                        type="date"
                        name="insuranceDate"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                        value={editingBus.insuranceDate}
                        onChange={handleEditChange}
                      />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateBus}
                        className="px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select className="px-2 py-1 border rounded"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50">
                Previous
              </button>
              <span className="px-3 py-1 text-sm">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50">
                Next
              </button>
            </div>
          </div>

          {/* Buses Table */}
          <div className="overflow-x-auto rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-400 text-black bg-gradient-to-br from-indigo-50 to-violet-50 w-full">
              <thead className="text-black bg-gradient-to-br from-indigo-50 to-violet-50 w-auto whitespace-nowrap">
                <tr>
                  {['Bus No', 'Number Plate', 'Driver', 'Mobile', 'Assistant', 'Status', 'Insurance Date', 'Action'].map((header) => (
                    <th key={header} className="px-5 py-3 text-left text-md font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl shadow-sm">
                {currentBuses.length > 0 ? (
                  currentBuses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">{bus.busNo}</td>
                      <td className="px-5 py-3 font-mono tracking-[.03em]">{bus.numberPlate}</td>
                      <td className="px-5 py-3">{bus.driverName}</td>
                      <td className="px-5 py-3">{bus.mobile || '-'}</td>
                      <td className="px-5 py-3">{bus.assistant}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                ${bus.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {bus.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">{bus.insuranceDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => openEditModal(bus)}
                            className="text-gray-600 hover:text-[#2563eb] transition-colors"
                          >
                            <Settings size={18} />
                          </button>
                          <button
                            onClick={() => deleteBus(bus.id)}
                            className="text-gray-600 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-2 text-center text-gray-500">
                      No Bus
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>}

    </div >
  );
}

export default BusList;