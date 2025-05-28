import React, { useState, useEffect } from "react";
import { db } from "../../../../config/firebase";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import { autoTable } from 'jspdf-autotable'
import { TriangleAlert, Search, Upload, Settings, Trash2, FileText } from "lucide-react"
import TableLoader from "../../../../components/TableLoader"
import busAnimation from "../../../../assets/busAnimation.gif"
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus } from "react-icons/fa";

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
      bus.busNo == busNo || bus.numberPlate == numberPlate
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
      assistant: newBus.assistant || "-",
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
      busList.sort((a, b) => a.busNo.localeCompare(b.busNo, undefined, { numeric: true }));
      setBuses(busList);
      console.log(busList)
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
      const errors = [];
      const validBuses = [];

      jsonData.forEach((bus, index) => {
        if (!bus["NumberPlate"] || !bus["BusNo"] || !bus["DriverName"]) {
          errors.push(`Row ${index + 2}: Missing required fields`);
          return;
        }
        // Check for duplicates
        if (checkExistingBus(bus["BusNo"], bus["NumberPlate"])) {
          errors.push(`Row ${index + 2}: Bus already exists`);
          return;
        }
        validBuses.push({
          numberPlate: bus["NumberPlate"].toString().trim(),
          busNo: bus["BusNo"].toString().trim(),
          driverName: bus["DriverName"].toString().trim(),
          mobile: bus["Mobile"]?.toString().trim() || "",
          assistant: bus["Assistant"]?.toString().trim() || "-",
          status: ["Active", "Inactive"].includes(bus["Status"]?.toString().trim())
            ? bus["Status"].toString().trim()
            : "Inactive",
          insuranceDate: bus["InsuranceDate"]?.toString().trim() || "Not set",
          schoolCode: users?.schoolCode,
        });
      });
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
    console.log(buses)
    const headers = {
      BusNo: '',
      NumberPlate: '',
      DriverName: '',
      Mobile: '',
      Assistant: '',
      Status: '',
      InsuranceDate: ''
    };
    const data = buses.length > 0
      ? buses.map(b => ({
        BusNo: b.busNo,
        NumberPlate: b.numberPlate,
        DriverName: b.driverName,
        Mobile: b.mobile,
        Assistant: b.assistant,
        Status: b.status,
        InsuranceDate: b.insuranceDate
      }))
      : [headers]; // only headers as keys with empty values
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buses");
    XLSX.writeFile(workbook, "buses.xlsx");
  };
  const downloadExcelTemplate = async () => {
    const result = await Swal.fire({
      title: "Bus list upload templete",
      text: "In this templete you can add bus list and upload it to our system",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, download it!",
    });
    if (!result.isConfirmed) return

    const headers = [{
      BusNo: '',
      NumberPlate: '',
      DriverName: '',
      Mobile: '',
      Assistant: '',
      Status: '',
      InsuranceDate: ''
    }];
    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "bus-template.xlsx");
  };
  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    const head = [
      [
        "BusNo",
        "NumberPlate",
        "DriverName",
        "Mobile",
        "Assistant",
        "Status",
        "InsuranceDate"
      ],
    ];

    const body =
      buses.length > 0
        ? buses.map((b) => [
          b.busNo,
          b.numberPlate,
          b.driverName,
          b.mobile,
          b.assistant,
          b.status,
          b.insuranceDate
        ])
        : [];

    autoTable(doc, {
      head,
      body,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      margin: { top: 20 },
    });

    doc.save("buses.pdf");
  };


  useEffect(() => { fetchBuses(); }, [users?.schoolCode]);

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
      {isLoading ? (
        <div className="max-w-7xl mx-auto p-4 pt-8">
          <TableLoader
            headers={8}
            rows={5}
            className="border-purple-200/40"
          />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full justify-between">
            <div className="flex gap-3 flex-wrap w-full ">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowBusModal(true)}
                className="bg-gradient-to-r from-purple-600 to-violet-700 w-full sm:w-auto text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <FaPlus className="w-5 h-5" />
                Add Bus
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExcelModal(true)}
                className="bg-gradient-to-r from-violet-600 to-purple-700 sm:w-auto w-full text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Upload className="w-5 h-5" />
                Bulk Upload
              </motion.button>
              {/* New Template Buttons */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={downloadExcelTemplate}
                className="flex items-center w-full sm:w-auto gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 whitespace-nowrap rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                Excel Template
              </motion.button>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToExcel}
                className="flex items-center w-1/2 gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                Excel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToPDF}
                className="flex items-center w-1/2 gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                PDF
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-purple-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search bus..."
                className="w-full p-4 py-2.5 border-2 border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-4 top-1/4 text-xl text-purple-400" />
            </div>
          </div>

          {/* Buses Table */}
          <div className="overflow-x-auto rounded-2xl shadow-xl border border-purple-100">
            <table className="min-w-full divide-y divide-purple-100">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white text-sm">
                <tr>
                  {['Bus No', 'Number Plate', 'Driver', 'Mobile', 'Assistant', 'Status', 'Insurance Date', 'Action'].map((header, i) => (
                    <th
                      key={i}
                      className="w-auto px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap border-r border-purple-500/30 last:border-r-0"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {currentBuses.length > 0 ? (
                  currentBuses.map((bus, index) => (
                    <motion.tr
                      key={bus.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-purple-50/50 even:bg-purple-100/50 hover:bg-purple-200/50 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 font-medium text-violet-900">{bus.busNo}</td>
                      <td className="px-4 py-3 font-mono tracking-tight text-purple-800">{bus.numberPlate}</td>
                      <td className="px-4 py-3 text-gray-700">{bus.driverName}</td>
                      <td className="px-4 py-3 text-gray-600">{bus.mobile || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 text-center">{bus.assistant}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bus.status === 'Active'
                          ? 'bg-emerald-100/80 text-emerald-800'
                          : 'bg-red-100/80 text-red-800'
                          }`}>
                          {bus.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{bus.insuranceDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => openEditModal(bus)}
                            className="text-violet-600 hover:text-purple-800 transition-colors p-2 rounded-full hover:bg-purple-100/50"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteBus(bus.id)}
                            className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-full hover:bg-red-100/50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                      No buses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
            <div className="text-sm text-violet-800/90">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, currentBuses.length)} of{' '}
              {currentBuses.length} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-medium text-violet-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Excel Upload Modal */}
      {showExcelModal && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExcelModal(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-10"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-fit w-full  shadow-xl border border-purple-100"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100">
                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  Excel Template Format
                </h2>
                <button
                  onClick={() => setShowExcelModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Instructions */}
              <div className="mb-4">
                <h3 className="flex items-center text-sm font-medium text-gray-700">
                  <TriangleAlert size={18} className="mr-2 text-red-400" />
                  Column names must match exactly <span className="ml-1 text-purple-600">(* required)</span>
                </h3>
              </div>

              {/* Template Table */}
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full divide-y divide-purple-100 text-sm border border-gray-200">
                  <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                    <tr>
                      {[
                        "BusNo*",
                        "NumberPlate*",
                        "DriverName*",
                        "Mobile",
                        "Assistant",
                        "Status",
                        "InsuranceDate",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium border-r border-purple-500/30 last:border-r-0"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-purple-100">
                    <tr>
                      <td className="px-3 py-2">BUS-001</td>
                      <td className="px-3 py-2">KA01AB1234</td>
                      <td className="px-3 py-2">John Doe</td>
                      <td className="px-3 py-2">9876543210</td>
                      <td className="px-3 py-2">Jane Smith</td>
                      <td className="px-3 py-2">Active</td>
                      <td className="px-3 py-2">2024-12-31</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* File Input */}
              <motion.label
                whileHover={{ scale: 1.02 }}
                className="block w-full px-4 py-2 mb-4 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl text-center cursor-pointer hover:from-purple-600 hover:to-violet-700 shadow-sm transition-all"
              >
                {uploading ? "Uploading..." : "Choose Excel File"}
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </motion.label>
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-10"
            onClick={(e) => e.target === e.currentTarget && setShowBusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl border border-purple-100"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100">
                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  Add New Bus
                </h2>
                <button
                  onClick={() => setShowBusModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {Object.keys(newBus).map((key) =>
                  key !== 'status' && key !== 'insuranceDate' ? (
                    <input
                      key={key}
                      placeholder={key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={newBus[key]}
                      onChange={(e) => setNewBus({ ...newBus, [key]: e.target.value })}
                    />
                  ) : null
                )}

                <select
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={newBus.status}
                  onChange={(e) => setNewBus({ ...newBus, status: e.target.value })}
                >
                  <option value="">Select Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={newBus.insuranceDate}
                  onChange={(e) => setNewBus({ ...newBus, insuranceDate: e.target.value })}
                />

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-purple-100">
                  <button
                    onClick={() => setShowBusModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addBus}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-lg shadow-sm hover:from-purple-600 hover:to-violet-700 transition-all"
                  >
                    Add Bus
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
      {/* Edit Bus Modal */}
      {showEditModal && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-10"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-purple-100"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100">
                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  Edit Bus Details
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
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
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={editingBus.insuranceDate}
                    onChange={handleEditChange}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-purple-100">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateBus}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-lg shadow-sm hover:from-purple-600 hover:to-violet-700 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div >
  );
}

export default BusList;