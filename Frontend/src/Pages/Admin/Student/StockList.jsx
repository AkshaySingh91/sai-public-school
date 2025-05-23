import React, { useState, useEffect, useRef } from "react";
import { db } from "../../../config/firebase";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from 'jspdf-autotable'
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaFileExcel, FaTimes } from "react-icons/fa";
import { MdOutlinePictureAsPdf, MdOutlineFileUpload } from "react-icons/md";
import TableLoader from "../../../components/TableLoader";
import Swal from "sweetalert2"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

function StockList() {
  const { userData } = useAuth();
  const { school } = useSchool();
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [newStock, setNewStock] = useState({
    itemName: "",
    quantity: "",
    purchasePrice: "",
    sellingPrice: "",
    fromClass: "",
    toClass: "",
    category: "All",
  });

  // Class names array
  const classNames = school.class?.length ? school.class : [
    "Nursery", "JRKG", "SRKG", "1st", "2nd", "3rd", "4th",
    "5th", "6th", "7th", "8th", "9th"
  ];

  // Pagination variables
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStocks = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    let filtered = stocks.filter(stock =>
      stock.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStocks(filtered);
  }, [searchTerm, stocks]);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "allStocks"));
      const stockData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.schoolCode === userData.schoolCode);
      setStocks(stockData);
      setFilteredStocks(stockData);
    } catch (error) {
      alert("Error fetching stocks: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addStock = async () => {
    if (!validateStock()) return;

    try {
      const fromIdx = classNames.indexOf(newStock.fromClass);
      const toIdx = classNames.indexOf(newStock.toClass);
      const batch = writeBatch(db);
      for (let i = fromIdx; i <= toIdx; i++) {
        const stockRef = doc(collection(db, "allStocks"));
        batch.set(stockRef, {
          ...newStock,
          quantity: parseInt(newStock.quantity),
          purchasePrice: parseFloat(newStock.purchasePrice),
          sellingPrice: parseFloat(newStock.sellingPrice),
          className: classNames[i],
          createdAt: new Date().toISOString(),
          schoolCode: userData.schoolCode
        });
      }
      await batch.commit();
      resetForm();
      fetchStocks();
    } catch (error) {
      alert("Error adding stock: " + error.message);
    }
  };

  const validateStock = () => {
    const { itemName, quantity, fromClass, toClass } = newStock;
    if (!itemName || !quantity || !fromClass || !toClass) {
      alert("Please fill all required fields");
      return false;
    }
    if (classNames.indexOf(fromClass) > classNames.indexOf(toClass)) {
      alert("Invalid class range");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setNewStock({
      itemName: "",
      quantity: "",
      purchasePrice: "",
      sellingPrice: "",
      fromClass: "",
      toClass: "",
      category: "All"
    });
    setShowModal(false);
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // Get existing stock items for duplicate check
      const existingStockSnap = await getDocs(collection(db, "allStocks"));
      const existingStockItems = existingStockSnap.docs
        .filter(doc => doc.data().schoolCode === userData.schoolCode)
        .map(doc => ({
          itemName: doc.data().itemName.toLowerCase().trim(),
          className: doc.data().className.toLowerCase().trim()
        }));

      const reader = new FileReader();
      reader.onload = async (e) => {
        const swalInstance = Swal.fire({
          title: 'Processing Excel File',
          html: 'Validating and uploading stock items...',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => Swal.showLoading()
        });

        try {
          const workbook = XLSX.read(e.target.result, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet);

          // Validate headers
          const requiredHeaders = ["ItemName", "Quantity", "PurchasePrice", "SellingPrice", "Category", "ClassName"];
          const actualHeaders = Object.keys(data[0] || {});
          const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

          if (missingHeaders.length > 0) {
            throw new Error(
              `Missing required columns: ${missingHeaders.join(", ")}\n\n` +
              `Required columns: ${requiredHeaders.join(", ")}`
            );
          }

          const errors = [];
          const batch = [];
          const uploadedItems = new Set();

          data.forEach((row, index) => {
            const rowNumber = index + 2;
            try {
              // Validate and normalize data
              const itemName = row.ItemName?.toString().trim();
              const quantity = parseInt(row.Quantity);
              const purchasePrice = parseFloat(row.PurchasePrice);
              const sellingPrice = parseFloat(row.SellingPrice);
              const category = row.Category?.toString().trim();
              const className = row.ClassName?.toString().trim();

              // Validate required fields
              if (!itemName) throw new Error("Item name is required");
              if (isNaN(quantity)) throw new Error("Invalid quantity");
              if (isNaN(purchasePrice)) throw new Error("Invalid purchase price");
              if (isNaN(sellingPrice)) throw new Error("Invalid selling price");
              if (!className) throw new Error("Class name is required");

              // Validate numerical values
              if (quantity <= 0) throw new Error("Quantity must be greater than 0");
              if (purchasePrice <= 0) throw new Error("Purchase price must be positive");
              if (sellingPrice <= 0) throw new Error("Selling price must be positive");
              if (sellingPrice < purchasePrice) throw new Error("Selling price cannot be less than purchase price");

              // Validate category
              const validCategories = ["All", "Boys", "Girls"];
              if (!validCategories.includes(category)) {
                throw new Error(`Invalid category: ${category}. Valid values: ${validCategories.join(", ")}`);
              }

              // Validate class exists
              if (!classNames.includes(className)) {
                throw new Error(`Invalid class: ${className}`);
              }

              // Check for duplicates
              const uniqueKey = `${itemName.toLowerCase()}-${className.toLowerCase()}`;
              if (uploadedItems.has(uniqueKey)) {
                throw new Error("Duplicate item-class combination in file");
              }

              const existingDuplicate = existingStockItems.find(
                item => item.itemName === itemName.toLowerCase() &&
                  item.className === className.toLowerCase()
              );

              if (existingDuplicate) {
                throw new Error("Item-class combination already exists in database");
              }

              // Add to batch
              batch.push({
                itemName,
                quantity,
                purchasePrice,
                sellingPrice,
                category,
                className,
                schoolCode: userData.schoolCode,
                createdAt: new Date().toISOString()
              });

              uploadedItems.add(uniqueKey);
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
            throw new Error("No valid stock items found in spreadsheet");
          }

          // Batch write to Firestore
          const batchCommit = writeBatch(db);
          batch.forEach(item => {
            const docRef = doc(collection(db, "allStocks"));
            batchCommit.set(docRef, item);
          });
          await batchCommit.commit();

          // Show success
          Swal.close();
          Swal.fire({
            title: 'Upload Successful!',
            html: `
            <div class="text-left">
              <p>Added ${batch.length} new stock items:</p>
              <ul class="list-disc pl-5 mt-2 max-h-40 overflow-y-auto">
                ${batch.map(item => `
                  <li class="py-1">
                    ${item.itemName} (${item.className}) - 
                    Qty: ${item.quantity}, 
                    ₹${item.purchasePrice} → ₹${item.sellingPrice}
                  </li>
                `).join("")}
              </ul>
            </div>
          `,
            icon: 'success',
            confirmButtonColor: '#2563eb',
            width: '600px'
          });

          fetchStocks();
          setShowExcelModal(false);
        } catch (err) {
          Swal.fire({
            title: 'Upload Error',
            html: `
            <div class="text-left">
              <p class="font-medium">${err.message.split("\n")[0]}</p>
              <div class="mt-2 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded">
                ${err.message.split("\n").slice(1).join("<br/>")}
              </div>
            </div>
          `,
            icon: 'error',
            confirmButtonColor: '#2563eb',
            width: '700px'
          });
        }
      };

      reader.onerror = () => {
        throw new Error("Error reading file");
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      Swal.fire({
        title: 'Upload Error',
        text: err.message,
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
      stocks.map(stock => ({
        ItemName: stock.itemName,
        Quantity: stock.quantity,
        PurchasePrice: stock.purchasePrice,
        SellingPrice: stock.sellingPrice,
        Category: stock.category,
        ClassName: stock.className,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stocks");
    XLSX.writeFile(workbook, "stock-list.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Item Name', 'Quantity', 'Class', 'Category', 'Purchase Price', 'Selling Price']],
      body: stocks.map(stock => [
        stock.itemName,
        stock.quantity,
        stock.className,
        stock.category,
        stock.purchasePrice,
        stock.sellingPrice
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { top: 20 }
    });
    doc.save('stock-list.pdf');
  };

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
      {loading ? (
        <TableLoader />
      ) : (
        <>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-3 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-6 py-3 rounded-xl flex sm:w-fit w-full items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <FaPlus className="w-4 h-4 " />
                  Add Stock
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowExcelModal(true)}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 sm:w-fit w-full text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <MdOutlineFileUpload className="w-5 h-5" />
                  Bulk Upload
                </motion.button>
              </div>

              <div className="ml-auto flex items-center sm:gap-3 gap-3 w-full sm:w-auto justify-between ">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportToExcel}
                  className="flex items-center w-1/2 gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg"
                >
                  <FaFileExcel className="w-4 h-4" />
                  Excel
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center w-1/2 gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                  onClick={exportToPDF}
                  >
                  <MdOutlinePictureAsPdf className="w-4 h-4" />
                  PDF
                </motion.button>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-purple-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full p-4 py-2.5 border-2 border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-4 top-1/4 text-xl text-purple-400" />
              </div>
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto rounded-xl border border-purple-100 shadow-lg overflow-y-hidden">
              <table className="min-w-full divide-y divide-purple-100 overflow-y-hidden">
                <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white text-sm">
                  <tr>
                    {["Item Name", "Quantity", "Class", "Category", "Purchase Price", "Selling Price"].map(
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
                  {currentStocks.map((stock, index) => (
                    <motion.tr
                      key={stock.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-purple-50/50 even:bg-purple-100/50 hover:bg-purple-200/50 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 font-medium text-violet-900">{stock.itemName}</td>
                      <td className="px-4 py-3 text-center text-purple-800 font-semibold">
                        {stock.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {stock.className || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-800">
                          {stock.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-purple-700">
                        ₹{stock.purchasePrice}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-emerald-700">
                        ₹{stock.sellingPrice}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4">
              <div className="text-sm text-violet-800/90 mb-2 sm:mb-0">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredStocks.length)} of{" "}
                {filteredStocks.length} items
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-violet-800/90">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-4 py-2 text-sm font-medium text-violet-800 bg-violet-100/80 border border-violet-200 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Add Stock Modal */}
          <AnimatePresence>
            {showModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setShowModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl border border-purple-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center pb-4 border-b border-purple-100">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                      Add New Stock
                    </h2>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-purple-500 hover:text-purple-700 transition-colors"
                    >
                      <FaTimes className="text-xl" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Item Name"
                      className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                      value={newStock.itemName}
                      onChange={(e) => setNewStock({ ...newStock, itemName: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Quantity"
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                        value={newStock.quantity}
                        onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                      />
                      <select
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                        value={newStock.category}
                        onChange={(e) => setNewStock({ ...newStock, category: e.target.value })}
                      >
                        <option value="All">All Categories</option>
                        <option value="Boys">Boys</option>
                        <option value="Girls">Girls</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Purchase Price"
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                        value={newStock.purchasePrice}
                        onChange={(e) => setNewStock({ ...newStock, purchasePrice: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Selling Price"
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                        value={newStock.sellingPrice}
                        onChange={(e) => setNewStock({ ...newStock, sellingPrice: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <select
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                        value={newStock.fromClass}
                        onChange={(e) => setNewStock({ ...newStock, fromClass: e.target.value })}
                      >
                        <option value="">From Class</option>
                        {classNames.map((cls, idx) => (
                          <option key={idx} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>

                      <select
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                        value={newStock.toClass}
                        onChange={(e) => setNewStock({ ...newStock, toClass: e.target.value })}
                      >
                        <option value="">To Class</option>
                        {classNames.map((cls, idx) => (
                          <option key={idx} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-purple-100">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={addStock}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 shadow-md transition-all"
                    >
                      Add Stock
                    </motion.button>
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
                  className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl border border-purple-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center pb-4 border-b border-purple-100">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
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
                            {["ItemName", "Quantity", "PurchasePrice", "SellingPrice", "Category", "ClassName"].map(
                              (header, index) => (
                                <th
                                  key={index}
                                  className="px-4 py-2.5 text-left font-medium border-r border-purple-500/30 last:border-r-0"
                                >
                                  {header}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-purple-100">
                          <tr>
                            <td className="px-4 py-2.5 font-medium text-violet-900">School Bag</td>
                            <td className="px-4 py-2.5 text-center text-purple-800">50</td>
                            <td className="px-4 py-2.5 text-center text-purple-800">300</td>
                            <td className="px-4 py-2.5 text-center text-emerald-800">400</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">
                                All
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-purple-800">1st</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <motion.label
                      whileHover={{ scale: 1.02 }}
                      className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-center cursor-pointer hover:from-purple-700 hover:to-violet-700 shadow-md transition-all"
                    >
                      {uploading ? 'Uploading...' : 'Choose Excel File'}
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
        </>
      )}
    </div>
  );
}

export default StockList;