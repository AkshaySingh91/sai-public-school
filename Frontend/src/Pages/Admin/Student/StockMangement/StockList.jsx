import React, { useState, useEffect, useRef } from "react";
import { db } from "../../../../config/firebase";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext";
import { useSchool } from "../../../../contexts/SchoolContext";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaFileExcel, FaTimes } from "react-icons/fa";
import { MdOutlinePictureAsPdf, MdOutlineFileUpload } from "react-icons/md";
import TableLoader from "../../../../components/TableLoader";
import Swal from "sweetalert2";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import ShowAddStockModal from "./ShowAddStockModal";
import ShowStockEditModal from "./ShowStockEditModal";

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
  const [selectedStocks, setSelectedStocks] = useState([]);

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
  const currentItems = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);
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
    const VALID_CATEGORIES = ["All", "Boys", "Girls"];
    const errors = [];
    const existingStock = stocks.find(s => s.id === editingStockId)
    if (isEditing && !existingStock) {
      errors.push("Editing Stock not found");
    }
    const newItem = isEditing ? { ...(existingStock || {}), ...newStock } : newStock;

    // 1. Generate composite key
    const compositeKey = [
      newItem.itemName?.toLowerCase().trim(),
      newItem.fromClass?.toLowerCase().trim(),
      newItem.toClass?.toLowerCase().trim(),
      newItem.category?.toLowerCase().trim(),
      userData.schoolCode
    ].join("|");

    // 2. Field validations
    if (!newItem.itemName?.trim()) errors.push("Item Name is required");
    if (isNaN(newItem.quantity)) errors.push("Quantity must be a number");
    if (isNaN(newItem.purchasePrice)) errors.push("Purchase Price must be a number");
    if (isNaN(newItem.sellingPrice)) errors.push("Selling Price must be a number");
    if (newItem.quantity <= 0) errors.push("Quantity must be greater than 0");
    if (newItem.purchasePrice <= 0) errors.push("Purchase Price must be greater than 0");
    if (newItem.sellingPrice <= 0) errors.push("Selling Price must be greater than 0");
    if (newItem.sellingPrice < newItem.purchasePrice) errors.push("Selling Price cannot be less than Purchase Price");

    // 3. Class validation
    if (!classNames.includes(newItem.fromClass)) errors.push(`Invalid From Class. Valid classes: ${classNames.join(", ")}`);
    if (!classNames.includes(newItem.toClass)) errors.push(`Invalid To Class. Valid classes: ${classNames.join(", ")}`);
    if (classNames.indexOf(newItem.fromClass) > classNames.indexOf(newItem.toClass)) {
      errors.push("From Class must be lower than To Class");
    }

    // 4. Category validation
    if (!VALID_CATEGORIES.includes(newItem.category)) {
      errors.push(`Invalid Category. Valid options: ${VALID_CATEGORIES.join(", ")}`);
    }

    // 5. Duplicate check
    const isDuplicate = currentStocks.some(item => {
      const existingKey = [
        item.itemName.toLowerCase().trim(),
        item.fromClass.toLowerCase().trim(),
        item.toClass.toLowerCase().trim(),
        item.category.toLowerCase().trim(),
        item.schoolCode
      ].join("|");

      return isEditing
        ? existingKey === compositeKey && item.id !== editingStockId
        : existingKey === compositeKey;
    });

    if (isDuplicate) errors.push("This item already exists for the selected classes and category");

    // 6. Handle errors
    if (errors.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        html: errors.join("<br/>"),
        width: 700,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // 7. Proceed with write operation
    try {
      const batch = writeBatch(db);
      const stockData = {
        ...newItem,
        quantity: Number(newItem.quantity),
        purchasePrice: Number(newItem.purchasePrice),
        sellingPrice: Number(newItem.sellingPrice),
        schoolCode: userData.schoolCode,
        [isEditing ? "updatedAt" : "createdAt"]: new Date().toISOString()
      };

      if (isEditing) {
        const stockRef = doc(db, "allStocks", editingStockId);
        batch.update(stockRef, stockData);
      } else {
        const stockRef = doc(collection(db, "allStocks"));
        batch.set(stockRef, stockData);
      }

      await batch.commit();

      // 8. Success handling
      Swal.fire({
        icon: "success",
        title: isEditing ? "Stock Updated!" : "Stock Added!",
        showConfirmButton: false,
        timer: 1500
      });

      resetForm();
      fetchStocks();
      if (isEditing) {
        setIsEditing(false);
        setEditingStockId(null);
      }

    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Operation Failed",
        text: error.message,
        confirmButtonColor: "#2563eb",
      });
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
      const existingKeys = new Set(currentStocks.map(d =>
        `${d.itemName.toLowerCase()}|${d.fromClass.toLowerCase()}|${d.toClass.toLowerCase()}|${d.category?.toLowerCase()}`));
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
      const uniqueRows = new Set(
        rows.map(row =>
          `${row.ItemName?.toString().toLowerCase().trim()}`
        )
      );
      console.log(uniqueRows)
      if (uniqueRows.size !== rows.length) {
        errors.push("Duplicate items  are not allowed.");
      }
      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        const iName = row.ItemName?.toString().trim();
        const qty = Number(row.Quantity);
        const pp = Number(row.PurchasePrice);
        const sp = Number(row.SellingPrice);
        const cat = row.Category?.toString().trim();
        const fromC = row.FromClass?.toString().trim();
        const toC = row.ToClass?.toString().trim();

        // a) required
        if (!iName) errors.push(`Row ${rowNum}: ItemName is required`);
        if (isNaN(qty)) errors.push(`Row ${rowNum}: Quantity must be a number`);
        if (isNaN(pp)) errors.push(`Row ${rowNum}: PurchasePrice must be a number`);
        if (isNaN(sp)) errors.push(`Row ${rowNum}: SellingPrice must be a number`);
        if (!VALID_CATEGORIES.includes(cat))
          errors.push(`Row ${rowNum}: Category must be one of ${VALID_CATEGORIES.join(", ")}`);
        // check if fron& to classes are exist 
        if (!classNames.includes(fromC))
          errors.push(`Row ${rowNum}: FromClass is from this only  ${classNames.join(", ")}`);
        if (!classNames.includes(toC))
          errors.push(`Row ${rowNum}: ToClass is from this only  ${classNames.join(", ")}`);

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
        const key = `${iName.toLowerCase()}|${fromC.toLowerCase()}|${toC.toLowerCase()}|${cat.toLowerCase()}`
        if (batch._writes?.some(w => w._document?.key.path.segments.includes(key))) {
          errors.push(`Row ${rowNum}: Duplicate entry in the sheet`);
        }
        // d) duplicate in DB
        if (existingKeys.has(key)) {
          errors.push(`Row ${rowNum}: Item already exists in the database`);
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
  const downloadExcelTemplate = async () => {
    const result = await Swal.fire({
      title: "Stock list upload templete",
      text: "In this templete you can add Stock list and upload it to our system",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, download it!",
    });
    if (!result.isConfirmed) return

    const headers = [{
      ItemName: '',
      Quantity: '',
      PurchasePrice: '',
      SellingPrice: '',
      Category: '',
      FromClass: '',
      ToClass: ''
    }];
    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "stock-template.xlsx");
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
  const toggleSelectStock = (id) => {
    setSelectedStocks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = (e) => {
    setSelectedStocks(e.target.checked ? currentItems.map((s) => s.id) : []);
  };
  const handleBatchDelete = async () => {
    try {
      const selected = stocks.filter((s) =>
        selectedStocks.includes(s.id) &&
        s.schoolCode === userData.schoolCode // Initial filter
      );

      // Confirm deletion
      const { isConfirmed } = await Swal.fire({
        title: `Delete ${selected.length} students?`,
        html: `
          <div class="text-center">
            <p class="text-xl">Stocks to delete: ${selected.length}</p>
            <p class="mt-2 text-sm text-red-600">This will permanently remove stocks from your school!</p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Delete Permanently",
        cancelButtonText: "Cancel",
        showLoaderOnConfirm: true,
      });

      if (!isConfirmed) return;

      // Show progress dialog
      Swal.fire({
        title: "Deleting Students...",
        html: `
          <div class="progress-container">
            <div class="progress-bar bg-red-500 h-2 rounded" style="width: 0%"></div>
            <div class="progress-text mt-2">0/${selected.length}</div>
            <div class="current-stock mt-2 text-sm text-gray-600"></div>
          </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      let processed = 0;
      const total = selected.length;
      const errors = [];

      for (const [index, stock] of selected.entries()) {
        try {
          // Double-check school code and ID
          if (stock.schoolCode !== userData.schoolCode || !selectedStocks.includes(stock.id)) {
            throw new Error("Unauthorized deletion attempt blocked");
          }
          // Update progress
          const progress = Math.floor((index / total) * 100);
          Swal.getHtmlContainer().querySelector(".progress-bar").style.width = `${progress}%`;
          Swal.getHtmlContainer().querySelector(".progress-text").textContent = `${index + 1}/${total}`;
          Swal.getHtmlContainer().querySelector(".current-stock").textContent =
            `Deleting: ${stock.itemName}`;

          // Perform deletion
          await deleteDoc(doc(db, "allStocks", stock.id));
          processed++;

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error deleting ${stock.itemName}:`, error);
          errors.push({
            stock: `${stock.itemName}`,
            error: error.message
          });
        }
      }

      // Final updates
      await fetchStocks();
      setSelectedStocks([]);

      if (errors.length === 0) {
        await Swal.fire({
          title: "Deletion Complete!",
          html: `<p>Successfully deleted ${processed} stocks.</p>`,
          icon: "success",
          timer: 2000,
        });
      } else {
        await Swal.fire({
          title: "Partial Deletion",
          html: `
            <p>Deleted ${processed} students successfully.</p>
            <p class="text-red-600">${errors.length} errors occurred.</p>
            <ul class="text-sm text-left mt-2">
              ${errors.map((e) => `<li>${e.stock}: ${e.error}</li>`).join("")}
            </ul>
          `,
          icon: "warning",
          confirmButtonText: "Okay",
        });
      }
    } catch (error) {
      console.error("Batch delete failed:", error);
      Swal.fire({
        title: "Deletion Failed",
        html: `<p class="text-red-600">${error.message}</p>`,
        icon: "error",
      });
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
                {/* deleted one or multiple stocks */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleBatchDelete}
                  disabled={selectedStocks.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                >
                  Delete Stocks
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
                    <th className="p-3 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
                        checked={selectedStocks.length === currentItems.length && currentItems.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
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
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-purple-200 text-violet-600 focus:ring-violet-500"
                          checked={selectedStocks.includes(stock.id)}
                          onChange={() => toggleSelectStock(stock.id)}
                        />
                      </td>
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

          <ShowAddStockModal
            classNames={classNames}
            showModal={showModal}
            isEditing={isEditing}
            newStock={newStock}
            resetForm={resetForm}
            setIsEditing={setIsEditing}
            setShowModal={setShowModal}
            setNewStock={setNewStock}
            addStock={addStock}
          />
          <ShowStockEditModal
            showExcelModal={showExcelModal}
            uploading={uploading}
            handleExcelUpload={handleExcelUpload}
            setShowExcelModal={setShowExcelModal}
          />
        </>
      )}
    </div>
  );
}

export default StockList;
