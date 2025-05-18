import React, { useEffect, useState } from "react";
import { db } from "../../../config/firebase";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
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
      const classNames = school.class?.length ? school.class : [
        "Nursery", "JRKG", "SRKG", "1st", "2nd", "3rd", "4th",
        "5th", "6th", "7th", "8th", "9th"
      ];

      return classNames.flatMap(cls => [
        { groupName: `${cls} - Boys`, className: cls, category: "Boys" },
        { groupName: `${cls} - Girls`, className: cls, category: "Girls" }
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
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.category === category || item.category === "All");

      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching items:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to fetch stock items",
        icon: "error",
        confirmButtonColor: "#2563eb"
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
        popup: 'rounded-2xl',
        confirmButton: 'px-4 py-2 rounded-lg',
        cancelButton: 'px-4 py-2 rounded-lg'
      }
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "allStocks", itemId));
        setItems(prev => prev.filter(item => item.id !== itemId));
        Swal.fire({
          title: "Deleted!",
          text: "Item has been deleted",
          icon: "success",
          confirmButtonColor: "#2563eb"
        });
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: "Failed to delete item",
          icon: "error",
          confirmButtonColor: "#2563eb"
        });
      }
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity * item.sellingPrice),
    0
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <Package className="text-blue-600 w-8 h-8" />
          Stock Groups
        </h1>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-lg font-semibold">Stock Groups</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => (
                <React.Fragment key={index}>
                  <motion.tr
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleGroupClick(group)}
                  >
                    <td className="px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">
                          {group.groupName}
                        </span>
                        {expandedGroup === group.groupName ? (
                          <ChevronUp className="text-blue-600 w-5 h-5" />
                        ) : (
                          <ChevronDown className="text-blue-600 w-5 h-5" />
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
                      >
                        <td className="p-6 bg-gray-50">
                          {loadingItems ? (
                            <div className="flex justify-center p-8">
                              <Loader1 />
                            </div>
                          ) : items.length === 0 ? (
                            <div className="text-center p-6 text-gray-400 font-medium">
                              No items found in this group
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                        Item Name
                                      </th>
                                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                                        Quantity
                                      </th>
                                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                                        Unit Price
                                      </th>
                                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                                        Total Value
                                      </th>
                                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700 font-medium">
                                          {item.itemName}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          {item.quantity}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          ₹{item.sellingPrice}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-blue-600">
                                          ₹{item.quantity * item.sellingPrice}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-red-600 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                                          >
                                            <Trash2 className="w-5 h-5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                                <span className="font-semibold text-gray-700">
                                  Total Inventory Value:
                                </span>
                                <span className="text-2xl font-bold text-blue-600">
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
  );
}

export default StockGroup;