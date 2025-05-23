import React, { useEffect, useState } from "react";
import { db } from "../../../config/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
import Swal from "sweetalert2";
import Loader1 from "../../../components/Loader1";

function StockGroup() {
  const { userData } = useAuth();
  const { school } = useSchool();
  const [groups, setGroups] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    const generateGroups = () => {
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

      return classNames.flatMap((cls) => [
        { groupName: `${cls} - Boys`, className: cls, category: "Boys" },
        { groupName: `${cls} - Girls`, className: cls, category: "Girls" },
      ]);
    };

    setGroups(generateGroups());
  }, [school.class]);

  const fetchItems = async (className, category) => {
    setLoadingItems(true);
    try {
      const q = query(
        collection(db, "allStocks"),
        where("className", "==", className),
        where("schoolCode", "==", userData.schoolCode)
      );
      const snapshot = await getDocs(q);

      const fetchedItems = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (item) => item.category === category || item.category === "All"
        );

      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching items:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to fetch stock items",
        icon: "error",
        confirmButtonColor: "#2563eb",
      });
    }
    setLoadingItems(false);
  };

  const handleGroupClick = (group) => {
    if (expandedGroup === group.groupName) {
      setExpandedGroup(null);
      setItems([]);
    } else {
      setExpandedGroup(group.groupName);
      fetchItems(group.className, group.category);
    }
  };

  const handleDeleteItem = async (itemId) => {
    const result = await Swal.fire({
      title: "Delete Item?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      reverseButtons: true,
      customClass: {
        popup: "rounded-2xl",
        confirmButton: "px-4 py-2 rounded-lg",
        cancelButton: "px-4 py-2 rounded-lg",
      },
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "allStocks", itemId));
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        Swal.fire({
          title: "Deleted!",
          text: "Item has been deleted",
          icon: "success",
          confirmButtonColor: "#2563eb",
        });
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: "Failed to delete item",
          icon: "error",
          confirmButtonColor: "#2563eb",
        });
      }
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.sellingPrice,
    0
  );

  return (
    // <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen ">
    //   <div className="max-w-7xl mx-auto space-y-6 ">
    //     <div className="flex items-center gap-3 mb-6 ">
    //       <div className="p-3 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl shadow-sm">
    //         <Package className="w-6 h-6 text-purple-600" />
    //       </div>
    //       <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent">
    //         Stock Groups
    //       </h1>
    //     </div>

    //     <div className="bg-white rounded-2xl shadow-xl border border-purple-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
    //       <table className="w-full">
    //         <thead className="bg-gradient-to-r from-purple-600 to-violet-700">
    //           <motion.tr
    //             initial={{ opacity: 0, y: -10 }}
    //             animate={{ opacity: 1, y: 0 }}
    //             transition={{ duration: 0.3 }}
    //           >
    //             <th className="px-6 py-4 text-left text-lg font-semibold text-white">
    //               Stock Groups
    //             </th>
    //           </motion.tr>
    //         </thead>
    //         <tbody>
    //           {groups.map((group, index) => (
    //             <React.Fragment key={index}>
    //               <motion.tr
    //                 initial={{ opacity: 0, y: 10 }}
    //                 animate={{ opacity: 1, y: 0 }}
    //                 transition={{ delay: index * 0.05 }}
    //                 className="cursor-pointer hover:bg-purple-50/80 transition-colors duration-300"
    //                 onClick={() => handleGroupClick(group)}
    //                 whileHover={{ scale: 1.005 }}
    //               >
    //                 <td className="px-6 py-4 border-b border-purple-100">
    //                   <div className="flex items-center justify-between">
    //                     <span className="font-medium text-violet-900">
    //                       {group.groupName}
    //                     </span>
    //                     {expandedGroup === group.groupName ? (
    //                       <ChevronUp className="text-purple-600 w-5 h-5 transition-transform duration-300" />
    //                     ) : (
    //                       <ChevronDown className="text-purple-600 w-5 h-5 transition-transform duration-300" />
    //                     )}
    //                   </div>
    //                 </td>
    //               </motion.tr>

    //               <AnimatePresence>
    //                 {expandedGroup === group.groupName && (
    //                   <motion.tr
    //                     initial={{ opacity: 0, height: 0 }}
    //                     animate={{ opacity: 1, height: "auto" }}
    //                     exit={{ opacity: 0, height: 0 }}
    //                     transition={{ duration: 0.3, ease: "easeInOut" }}
    //                   >
    //                     <td className="p-6 bg-gradient-to-b from-purple-50/50 to-violet-50/50">
    //                       {loadingItems ? (
    //                         <div className="flex justify-center p-8">
    //                           <Loader1 className="animate-spin text-purple-600" />
    //                         </div>
    //                       ) : items.length === 0 ? (
    //                         <div className="text-center p-6 text-gray-400 font-medium">
    //                           No items found in this group
    //                         </div>
    //                       ) : (
    //                         <div className="space-y-6">
    //                           <div className="overflow-x-auto rounded-xl border border-purple-100 shadow-sm">
    //                             <table className="min-w-full">
    //                               <thead className="bg-gradient-to-r from-purple-100 to-violet-100">
    //                                 <tr>
    //                                   {["Item Name", "Quantity", "Unit Price", "Total Value", "Actions"].map((header, i) => (
    //                                     <th
    //                                       key={i}
    //                                       className="px-4 py-3 text-left text-sm font-semibold text-violet-900 border-r border-purple-200 last:border-r-0"
    //                                     >
    //                                       {header}
    //                                     </th>
    //                                   ))}
    //                                 </tr>
    //                               </thead>
    //                               <tbody className="divide-y divide-purple-100">
    //                                 {items.map((item) => (
    //                                   <motion.tr
    //                                     key={item.id}
    //                                     className="hover:bg-purple-50/50 transition-colors duration-300"
    //                                   >
    //                                     <td className="px-4 py-3 font-medium text-violet-900">
    //                                       {item.itemName}
    //                                     </td>
    //                                     <td className="px-4 py-3 text-center text-purple-800">
    //                                       {item.quantity}
    //                                     </td>
    //                                     <td className="px-4 py-3 text-center text-gray-600">
    //                                       ₹{item.sellingPrice}
    //                                     </td>
    //                                     <td className="px-4 py-3 text-center font-semibold bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent">
    //                                       ₹{item.quantity * item.sellingPrice}
    //                                     </td>
    //                                     <td className="px-4 py-3 text-center">
    //                                       <button
    //                                         onClick={() => handleDeleteItem(item.id)}
    //                                         className="p-2 rounded-full hover:bg-red-50/80 transition-all duration-300 hover:shadow-md"
    //                                       >
    //                                         <Trash2 className="w-5 h-5 text-red-600 hover:text-red-700" />
    //                                       </button>
    //                                     </td>
    //                                   </motion.tr>
    //                                 ))}
    //                               </tbody>
    //                             </table>
    //                           </div>

    //                           <div className="bg-gradient-to-r from-purple-100 to-violet-100 p-4 rounded-xl flex justify-between items-center shadow-inner">
    //                             <span className="font-semibold text-violet-900">
    //                               Total Inventory Value:
    //                             </span>
    //                             <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent">
    //                               ₹{totalAmount.toLocaleString()}
    //                             </span>
    //                           </div>
    //                         </div>
    //                       )}
    //                     </td>
    //                   </motion.tr>
    //                 )}
    //               </AnimatePresence>
    //             </React.Fragment>
    //           ))}
    //         </tbody>
    //       </table>
    //     </div>
    //   </div>
    // </div>
    <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 min-h-screen ">
      <div className="max-w-7xl mx-auto space-y-6 ">
        <div className="flex items-center gap-3 mb-6 ">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl shadow-sm">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent">
            Stock Groups
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-purple-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-700">
                <motion.tr
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <th className="px-6 py-4 text-left text-lg font-semibold text-white">
                    Stock Groups
                  </th>
                </motion.tr>
              </thead>
              <tbody>
                {groups.map((group, index) => (
                  <React.Fragment key={index}>
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="cursor-pointer hover:bg-purple-50/80 transition-colors duration-300"
                      onClick={() => handleGroupClick(group)}
                      whileHover={{ scale: 1.005 }}
                    >
                      <td className="px-6 py-4 border-b border-purple-100">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-violet-900">
                            {group.groupName}
                          </span>
                          {expandedGroup === group.groupName ? (
                            <ChevronUp className="text-purple-600 w-5 h-5 transition-transform duration-300" />
                          ) : (
                            <ChevronDown className="text-purple-600 w-5 h-5 transition-transform duration-300" />
                          )}
                        </div>
                      </td>
                    </motion.tr>

                    <AnimatePresence>
                      {expandedGroup === group.groupName && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <td className="p-6 bg-gradient-to-b from-purple-50/50 to-violet-50/50">
                            {loadingItems ? (
                              <div className="flex justify-center p-8">
                                <Loader1 className="animate-spin text-purple-600" />
                              </div>
                            ) : items.length === 0 ? (
                              <div className="text-center p-6 text-gray-400 font-medium">
                                No items found in this group
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div className="overflow-x-auto rounded-xl border border-purple-100 shadow-sm">
                                  <table className="min-w-full">
                                    <thead className="bg-gradient-to-r from-purple-100 to-violet-100">
                                      <tr>
                                        {[
                                          "Item Name",
                                          "Quantity",
                                          "Unit Price",
                                          "Total Value",
                                          "Actions",
                                        ].map((header, i) => (
                                          <th
                                            key={i}
                                            className="px-4 py-3 text-left text-sm font-semibold text-violet-900 border-r border-purple-200 last:border-r-0"
                                          >
                                            {header}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-100">
                                      {items.map((item) => (
                                        <motion.tr
                                          key={item.id}
                                          className="hover:bg-purple-50/50 transition-colors duration-300"
                                        >
                                          <td className="px-4 py-3 font-medium text-violet-900">
                                            {item.itemName}
                                          </td>
                                          <td className="px-4 py-3 text-center text-purple-800">
                                            {item.quantity}
                                          </td>
                                          <td className="px-4 py-3 text-center text-gray-600">
                                            ₹{item.sellingPrice}
                                          </td>
                                          <td className="px-4 py-3 text-center font-semibold bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent">
                                            ₹{item.quantity * item.sellingPrice}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <button
                                              onClick={() =>
                                                handleDeleteItem(item.id)
                                              }
                                              className="p-2 rounded-full hover:bg-red-50/80 transition-all duration-300 hover:shadow-md"
                                            >
                                              <Trash2 className="w-5 h-5 text-red-600 hover:text-red-700" />
                                            </button>
                                          </td>
                                        </motion.tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="bg-gradient-to-r from-purple-100 to-violet-100 p-4 rounded-xl flex justify-between items-center shadow-inner">
                                  <span className="font-semibold text-violet-900">
                                    Total Inventory Value:
                                  </span>
                                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent">
                                    ₹{totalAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockGroup;
