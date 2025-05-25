import React, { useState, useEffect, useRef } from "react";
import { db } from "../../../config/firebase";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaFileExcel, FaTimes } from "react-icons/fa";
import { MdOutlinePictureAsPdf, MdOutlineFileUpload } from "react-icons/md";
import TableLoader from "../../../components/TableLoader";
import Swal from "sweetalert2";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Trash2,
} from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStockId, setEditingStockId] = useState(null);
  const [currentStocks, setCurrentStocks] = useState([]);
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
  const classNames = school.class?.length
    ? school.class
    : [
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
    ];

  // Pagination variables 
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  useEffect(() => {
    const current = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);
    setCurrentStocks(current);
  }, [filteredStocks, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    let filtered = stocks.filter(
      (stock) =>
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
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.schoolCode === userData.schoolCode);
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
      const batch = writeBatch(db);

      if (isEditing) {
        // 🔍 Find the className of the existing stock from currentStocks
        const existingStock = currentStocks.find(
          (s) => s.id === editingStockId
        );
        console.log(existingStock, newStock)

        // Case 1: Class range is unchanged (i.e., only one class and it matches old class)
        // if (fromIdx === toIdx && classNames[fromIdx] === existingClassName) {
        //   const stockRef = doc(db, "allStocks", editingStockId);
        //   await updateDoc(stockRef, {
        //     ...newStock,
        //     quantity: parseInt(newStock.quantity),
        //     purchasePrice: parseFloat(newStock.purchasePrice),
        //     sellingPrice: parseFloat(newStock.sellingPrice),
        //     updatedAt: new Date().toISOString(),
        //   });

        //   // Update UI
        //   setCurrentStocks((prev) =>
        //     prev.map((s) =>
        //       s.id === editingStockId ? { ...s, ...newStock } : s
        //     )
        //   );
        // } else {
        //   // Case 2: Class range has changed → delete and recreate
        //   const oldRef = doc(db, "allStocks", editingStockId);
        //   batch.delete(oldRef);

        //   for (let i = fromIdx; i <= toIdx; i++) {
        //     const newDocRef = doc(collection(db, "allStocks"));
        //     batch.set(newDocRef, {
        //       ...newStock,
        //       quantity: parseInt(newStock.quantity),
        //       purchasePrice: parseFloat(newStock.purchasePrice),
        //       sellingPrice: parseFloat(newStock.sellingPrice),
        //       className: classNames[i],
        //       createdAt: new Date().toISOString(),
        //       schoolCode: userData.schoolCode,
        //     });
        //   }

        //   await batch.commit();
        //   fetchStocks(); // refresh list
        // }
        const stockRef = doc(db, "allStocks", editingStockId);
        await updateDoc(stockRef, {
          ...existingStock,
          itemName: newStock.itemName,
          quantity: parseInt(newStock.quantity),
          purchasePrice: parseFloat(newStock.purchasePrice),
          sellingPrice: parseFloat(newStock.sellingPrice),
          category: newStock.category,
          updatedAt: new Date().toISOString(),
          fromClass: newStock.fromClass,
          toClass: newStock.toClass,
        });

        setCurrentStocks((prev) =>
          prev.map((s) =>
            s.id === editingStockId ? { ...s, ...newStock } : s
          )
        );

        // await batch.commit();
        fetchStocks(); // refresh list
        // Reset editing state
        setIsEditing(false);
        setEditingStockId(null);
      } else {
        // ➕ Add new stock for selected class range
        const stockRef = doc(collection(db, "allStocks"));
        batch.set(stockRef, {
          ...newStock,
          quantity: parseInt(newStock.quantity),
          purchasePrice: parseFloat(newStock.purchasePrice),
          sellingPrice: parseFloat(newStock.sellingPrice),
          createdAt: new Date().toISOString(),
          schoolCode: userData.schoolCode,
        });
        //  for (let i = fromIdx; i <= toIdx; i++) {
        //   const stockRef = doc(collection(db, "allStocks"));
        //   batch.set(stockRef, {
        //     ...newStock,
        //     quantity: parseInt(newStock.quantity),
        //     purchasePrice: parseFloat(newStock.purchasePrice),
        //     sellingPrice: parseFloat(newStock.sellingPrice),
        //     className: classNames[i],
        //     createdAt: new Date().toISOString(),
        //     schoolCode: userData.schoolCode,
        //   });
        // }
        await batch.commit();
      }

      // ✅ Reset form and refresh
      resetForm();
      fetchStocks();
    } catch (error) {
      alert("Error adding/updating stock: " + error.message);
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
      category: "All",
    });
    setIsEditing(false);
    setEditingStockId(null);
    setShowModal(false);
  };
  const handleExcelUpload = async (e) => {
    const REQUIRED_HEADERS = [
      "ItemName",
      "Quantity",
      "PurchasePrice",
      "SellingPrice",
      "Category",
      "FromClass",
      "ToClass",
    ];
    const VALID_CATEGORIES = ["All", "Boys", "Girls"];
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      // 1. Load existing items for duplicate-check
      const existingKeys = new Set(
        currentStocks
          .map(d =>
            `${d.itemName.toLowerCase().trim()}|${d.FromClass}|${d.ToClass}`
          )
      );
      // 2. Read workbook
      const dataBinary = await file.arrayBuffer();
      const wb = XLSX.read(dataBinary, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!rows.length) {
        throw new Error("The uploaded sheet is empty.");
      }
      // 3. Header validation (exact match + case-suggestions)
      const actualHeaders = Object.keys(rows[0]);
      // exact-missing
      const missingExact = REQUIRED_HEADERS.filter(h => !actualHeaders.includes(h));
      // case-only mismatches
      const caseMismatches = REQUIRED_HEADERS
        .filter(h => !actualHeaders.includes(h))
        .map(h => {
          const alt = actualHeaders.find(a => a.toLowerCase() === h.toLowerCase());
          return alt ? { actual: alt, expected: h } : null;
        })
        .filter(x => x);

      if (missingExact.length || caseMismatches.length) {
        // build error message
        let msg = "";
        if (caseMismatches.length) {
          msg += caseMismatches
            .map((m, i) => `${i + 1}. \`${m.actual}\` → \`${m.expected}\``)
            .join("<br/>");
        }
        if (missingExact.length) {
          msg += (msg ? "<br/>" : "") +
            "Missing columns: " +
            missingExact.map(h => `\`${h}\``).join(", ");
        }
        throw new Error(msg);
      }

      // 4. Row-level validation & batch collection
      const errors = [];
      const batch = writeBatch(db);
      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        const iName = row.ItemName?.toString().trim();
        const qty = Number(row.Quantity);
        const pp = Number(row.PurchasePrice);
        const sp = Number(row.SellingPrice);
        const cat = row.Category?.toString().trim();
        const fromC = row.FromClass;
        const toC = row.ToClass;

        // a) required
        if (!iName) errors.push(`Row ${rowNum}: ItemName is required`);
        if (isNaN(qty)) errors.push(`Row ${rowNum}: Quantity must be a number`);
        if (isNaN(pp)) errors.push(`Row ${rowNum}: PurchasePrice must be a number`);
        if (isNaN(sp)) errors.push(`Row ${rowNum}: SellingPrice must be a number`);
        if (!VALID_CATEGORIES.includes(cat))
          errors.push(`Row ${rowNum}: Category must be one of ${VALID_CATEGORIES.join(", ")}`);

        const fromIdx = classNames.indexOf(fromC);
        const toIdx = classNames.indexOf(toC);
        if (fromIdx > toIdx) errors.push(`Row ${rowNum}: FromClass must be less than ToClass`);
        // b) logical checks
        if (qty <= 0) errors.push(`Row ${rowNum}: Quantity must be > 0`);
        if (pp <= 0) errors.push(`Row ${rowNum}: PurchasePrice must be > 0`);
        if (sp <= 0) errors.push(`Row ${rowNum}: SellingPrice must be > 0`);
        if (sp < pp)
          errors.push(`Row ${rowNum}: SellingPrice (${sp}) cannot be less than PurchasePrice (${pp})`);

        // c) duplicate in file
        const key = `${iName.toLowerCase()}|${fromC}|${toC}`;
        if (batch._writes?.some(w => w._document?.key.path.segments.includes(key))) {
          errors.push(`Row ${rowNum}: Duplicate entry in the sheet`);
        }
        // d) duplicate in DB
        if (existingKeys.has(key)) {
          errors.push(`Row ${rowNum}: Already exists in database`);
        }

        // if row clean, queue it
        if (!errors.find(msg => msg.startsWith(`Row ${rowNum}:`))) {
          const newDoc = doc(collection(db, "allStocks"));
          batch.set(newDoc, {
            itemName: iName,
            quantity: qty,
            purchasePrice: pp,
            sellingPrice: sp,
            category: cat,
            fromClass: fromC,
            toClass: toC,
            schoolCode: userData.schoolCode,
            createdAt: new Date().toISOString()
          });
        }
      });

      if (errors.length) {
        throw new Error(errors.join("<br/>"));
      }

      // 5. Commit & feedback
      await batch.commit();
      Swal.fire({
        icon: "success",
        title: `Uploaded ${rows.length} items`,
        confirmButtonText: "OK",
      });
      fetchStocks();
      setShowExcelModal(false);

    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Upload Error",
        html: err.message,
        width: 700,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
      e.target.value = null; // reset input
    }
  };
  const exportToExcel = () => {
    // Define headers as keys
    const headers = {
      ItemName: '',
      Quantity: '',
      PurchasePrice: '',
      SellingPrice: '',
      Category: '',
      FromClass: '',
      ToClass: ''
    };
    const data = stocks.length > 0
      ? stocks.map(stock => ({
        ItemName: stock.itemName,
        Quantity: stock.quantity,
        PurchasePrice: stock.purchasePrice,
        SellingPrice: stock.sellingPrice,
        Category: stock.category,
        FromClass: stock.fromClass,
        ToClass: stock.toClass
      }))
      : [headers]; // only headers as keys with empty values

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stocks");
    XLSX.writeFile(workbook, "stock-list.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    const head = [
      [
        "ItemName",
        "Quantity",
        "PurchasePrice",
        "SellingPrice",
        "Category",
        "FromClass",
        "ToClass",
      ],
    ];

    const body =
      stocks.length < 0
        ? stocks.map((stock) => [
          stock.itemName,
          stock.quantity,
          stock.purchasePrice,
          stock.sellingPrice,
          stock.category,
          stock.fromClass,
          stock.toClass,
        ])
        : [];

    autoTable(doc, {
      head,
      body,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      margin: { top: 20 },
    });

    doc.save("stock-list.pdf");
  };
  const openEditModal = (stock) => {
    setNewStock({
      itemName: stock.itemName,
      quantity: stock.quantity,
      category: stock.category,
      purchasePrice: stock.purchasePrice,
      sellingPrice: stock.sellingPrice,
      fromClass: stock.fromClass || "",
      toClass: stock.toClass || "",
    });
    setEditingStockId(stock.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const deletestock = async (id) => {
    const result = await Swal.fire({
      title: 'Confirm Delete Stock?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "allStocks", id));
        Swal.fire({ icon: 'success', text: 'Stock Deleted', confirmButtonColor: '#2563eb' });
        fetchStocks();
      } catch (error) {
        console.error("Error deleting Stock:", error);
        Swal.fire({ icon: 'error', text: 'Deletion failed', confirmButtonColor: '#2563eb' });
      }
    }
  };

  return (
    <div className="sm:p-6 p-4 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen">
      {loading ? (
        <TableLoader />
      ) : (
        <>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
              <div className="flex gap-3 flex-wrap w-full sm:w-auto">
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
            <div className="overflow-x-auto border border-purple-100 shadow-lg rounded-xl my-6">
              <table className="min-w-full divide-y divide-purple-100 table-fixed">
                <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white text-sm">
                  <tr>
                    {[
                      "Item Name",
                      "From-Class",
                      "To-Class",
                      "Quantity",
                      "Category",
                      "Purchase Price",
                      "Selling Price",
                      "Action",
                    ].map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-center font-semibold tracking-wide whitespace-nowrap border-r border-purple-500/30 last:border-r-0 align-middle"
                      >
                        {header}
                      </th>
                    ))}
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
                      <td className="px-6 py-3 text-center align-middle font-medium text-violet-900 capitalize">
                        {stock.itemName}
                      </td>
                      <td className="px-6 py-3 text-center align-middle font-bold text-violet-900">
                        {stock.fromClass || "N/A"}
                      </td>
                      <td className="px-6 py-3 text-center align-middle font-bold text-violet-900">
                        {stock.toClass || "N/A"}
                      </td>
                      <td className="px-6 py-3 text-center align-middle font-medium text-violet-900">
                        <span className="inline-block px-3 py-1 rounded-full text- font-semibold">
                          {stock.quantity || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center align-middle">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-800">
                          {stock.category || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center align-middle font-medium text-purple-700">
                        ₹{stock.purchasePrice || "N/A"}
                      </td>
                      <td className="px-6 py-3 text-center align-middle font-medium text-emerald-700">
                        ₹{stock.sellingPrice || "N/A"}
                      </td>
                      <td className="px-6 py-3 text-center align-middle">
                        <div className="flex justify-center items-center gap-3">
                          <button
                            onClick={() => openEditModal(stock)}
                            className="text-violet-600 hover:text-purple-800 transition-colors p-2 rounded-full hover:bg-purple-100/50"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deletestock(stock.id)}
                            className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-full hover:bg-red-100/50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4">
              <div className="text-sm text-violet-800/90 mb-2 sm:mb-0">
                Showing {indexOfFirstItem + 1} to{" "}
                {Math.min(indexOfLastItem, filteredStocks.length)} of{" "}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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
                onClick={() => {
                  // either we have click on add or edit 
                  if (isEditing) {
                    resetForm();
                    setIsEditing(false);
                    setShowModal(false)
                  } else {
                    setShowModal(false)
                  }
                }}
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
                      onChange={(e) =>
                        setNewStock({ ...newStock, itemName: e.target.value })
                      }
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Quantity"
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                        value={newStock.quantity}
                        onChange={(e) =>
                          setNewStock({ ...newStock, quantity: e.target.value })
                        }
                      />
                      <select
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                        value={newStock.category}
                        onChange={(e) =>
                          setNewStock({ ...newStock, category: e.target.value })
                        }
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
                        onChange={(e) =>
                          setNewStock({
                            ...newStock,
                            purchasePrice: e.target.value,
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Selling Price"
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 transition-all"
                        value={newStock.sellingPrice}
                        onChange={(e) =>
                          setNewStock({
                            ...newStock,
                            sellingPrice: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <select
                        className="w-full p-3 border-2 border-purple-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-purple-50 appearance-none"
                        value={newStock.fromClass}
                        onChange={(e) =>
                          setNewStock({
                            ...newStock,
                            fromClass: e.target.value,
                          })
                        }
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
                        onChange={(e) =>
                          setNewStock({ ...newStock, toClass: e.target.value })
                        }
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
                      {isEditing ? "Update Stock" : "Add Stock"}
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
                  className="bg-white rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-2xl border border-purple-100"
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
                      Column names should follow this format{" "}
                      <span className="text-purple-600">(*required)</span>
                    </p>

                    <div className="overflow-x-auto rounded-xl border border-purple-100">
                      <table className="min-w-full divide-y divide-purple-100 text-sm">
                        <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                          <tr>
                            {[
                              "ItemName",
                              "Quantity",
                              "PurchasePrice",
                              "SellingPrice",
                              "Category",
                              "FromClass",
                              "ToClass",
                            ].map((header, index) => (
                              <th
                                key={index}
                                className="px-4 py-2.5 text-left font-medium border-r border-purple-500/30 last:border-r-0"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-purple-100">
                          <tr>
                            <td className="px-4 py-2.5 font-medium text-violet-900">
                              School Bag
                            </td>
                            <td className="px-4 py-2.5 text-center text-purple-800">
                              50
                            </td>
                            <td className="px-4 py-2.5 text-center text-purple-800">
                              300
                            </td>
                            <td className="px-4 py-2.5 text-center text-emerald-800">
                              400
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">
                                All
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-purple-800">
                              Nursery
                            </td>
                            <td className="px-4 py-2.5 text-center text-purple-800">
                              3rd
                            </td>
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
        </>
      )}
    </div>
  );
}

export default StockList;
