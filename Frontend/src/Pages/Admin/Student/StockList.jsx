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
import { FiSearch } from "react-icons/fi";
import TableLoader from "../../../components/TableLoader";
import Swal from "sweetalert2"

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
      console.log(fromIdx, toIdx)
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {loading ?
        <TableLoader /> :
        <>

          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-3 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <FaPlus /> Add Stock
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowExcelModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <MdOutlineFileUpload className="text-lg" /> Bulk Upload
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

            {/* Search */}
            <div className="bg-white p-2 rounded-xl shadow-sm relative">
              <input
                type="text"
                placeholder="Search items..."
                className="w-full p-4 py-2 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-400 text-black bg-gradient-to-br from-indigo-50 to-violet-50 w-full">
                <thead className="text-black bg-gradient-to-br from-indigo-50 to-violet-50 w-auto whitespace-nowrap">
                  <tr>
                    <th className="p-4 text-left">Item Name</th>
                    <th className="p-4 text-center">Quantity</th>
                    <th className="p-4 text-center">Class</th>
                    <th className="p-4 text-center">Category</th>
                    <th className="p-4 text-center">Purchase Price</th>
                    <th className="p-4 text-center">Selling Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl shadow-sm">
                  {currentStocks.map((stock) => (
                    <motion.tr
                      key={stock.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-blue-50"
                    >
                      <td className="p-4 font-medium">{stock.itemName}</td>
                      <td className="p-4 text-center">{stock.quantity}</td>
                      <td className="p-4 text-center">{stock.className || "N/A"}</td>
                      <td className="p-4 text-center">{stock.category}</td>
                      <td className="p-4 text-center">₹{stock.purchasePrice}</td>
                      <td className="p-4 text-center">₹{stock.sellingPrice}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 border-t">
                <span className="text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredStocks.length)} of {filteredStocks.length} items
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
                  className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-blue-600">Add New Stock</h2>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes className="text-xl" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Item Name"
                      className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                      value={newStock.itemName}
                      onChange={(e) => setNewStock({ ...newStock, itemName: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Quantity"
                        className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                        value={newStock.quantity}
                        onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                      />
                      <select
                        className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
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
                        className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                        value={newStock.purchasePrice}
                        onChange={(e) => setNewStock({ ...newStock, purchasePrice: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Selling Price"
                        className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                        value={newStock.sellingPrice}
                        onChange={(e) => setNewStock({ ...newStock, sellingPrice: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <select
                        className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                        value={newStock.fromClass}
                        onChange={(e) => setNewStock({ ...newStock, fromClass: e.target.value })}
                      >
                        <option value="">From Class</option>
                        {classNames.map((cls, idx) => (
                          <option key={idx} value={cls}>{cls}</option>
                        ))}
                      </select>

                      <select
                        className="w-full p-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-500"
                        value={newStock.toClass}
                        onChange={(e) => setNewStock({ ...newStock, toClass: e.target.value })}
                      >
                        <option value="">To Class</option>
                        {classNames.map((cls, idx) => (
                          <option key={idx} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addStock}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Stock
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
                className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 h-screen w-screen z-10"
                onClick={() => setShowExcelModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white rounded-2xl p-4 max-w-2xl w-full space-y-6 shadow-xl z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 text-center flex-grow">Excel Template Format</h2>
                    <button onClick={() => setShowExcelModal(false)} className="text-gray-500 hover:text-gray-700">
                      <FaTimes className="text-xl" />
                    </button>
                  </div>
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-3 text-center  gap-2">
                      Column name should be in same format <span className="text-gray-600">(* means required)</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="border-collapse border border-gray-200">
                        <thead className="bg-gray-50 w-auto whitespace-nowrap">
                          <tr>
                            <th className="border border-gray-200 px-4 py-2">ItemName</th>
                            <th className="border border-gray-200 px-4 py-2">Quantity</th>
                            <th className="border border-gray-200 px-4 py-2">PurchasePrice</th>
                            <th className="border border-gray-200 px-4 py-2">SellingPrice</th>
                            <th className="border border-gray-200 px-4 py-2">Category</th>
                            <th className="border border-gray-200 px-4 py-2">ClassName</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          <tr>
                            <td className="border border-gray-200 px-4 py-2">School Bag</td>
                            <td className="border border-gray-200 px-4 py-2">50</td>
                            <td className="border border-gray-200 px-4 py-2">300</td>
                            <td className="border border-gray-200 px-4 py-2">400</td>
                            <td className="border border-gray-200 px-4 py-2">All</td>
                            <td className="border border-gray-200 px-4 py-2">1st</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <label className="block w-full px-4 py-2 bg-[#2563eb] text-white rounded-lg text-center cursor-pointer hover:bg-[#1d4ed8] transition-colors">
                    {uploading ? 'Uploading...' : 'Choose Excel File'}
                    <input type="file" accept=".xls,.xlsx" onChange={handleExcelUpload} className="hidden" disabled={uploading} />
                  </label>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      }

    </div>
  );
}

export default StockList;