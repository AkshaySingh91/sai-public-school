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
import Loader1 from "../../../components/Loader1";
import { useAuth } from "../../../contexts/AuthContext";
function StockGroup() {
  const [groups, setGroups] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const users = useAuth().userData;
  console.log({ Object: users });
  // Generate the class groups based on "1st", "2nd", "3rd" classes
  useEffect(() => {
    const generatedGroups = [];
    const classNames = [
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
      "10th",
      "11th",
      "12th",
    ];

    classNames.forEach((cls) => {
      generatedGroups.push({
        groupName: `${cls} - Boys`,
        className: cls,
        category: "Boys",
      });
      generatedGroups.push({
        groupName: `${cls} - Girls`,
        className: cls,
        category: "Girls",
      });
    });

    setGroups(generatedGroups);
  }, []);

  const fetchItems = async (className, category) => {
    setLoadingItems(true);
    try {
      // Query the stock based on the class name
      const q = query(
        collection(db, "allStocks"),
        where("className", "==", className),
        where("schoolCode", "==", users?.schoolCode)
      );
      const querySnapshot = await getDocs(q);

      // Filter items based on the category ("Girls", "Boys", or "All")
      const fetchedItems = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
          (item) => item.category === category || item.category === "All"
        );

      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching items:", error);
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
    if (window.confirm("Are you sure you want to delete this item?")) {
      await deleteDoc(doc(db, "allStocks", itemId));
      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.sellingPrice,
    0
  );

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8">
        📦 Stock Group
      </h1>

      <div className="bg-white p-8 rounded-3xl shadow-xl overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-y-4">
          <thead>
            <tr className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg">
              <th className="px-6 py-4 text-left rounded-tl-2xl">Group Name</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <React.Fragment key={index}>
                <tr
                  className="cursor-pointer hover:bg-gray-100 transition-all duration-300 text-gray-800 font-medium text-lg"
                  onClick={() => handleGroupClick(group)}
                >
                  <td className="px-6 py-4 border-b border-gray-300">
                    {group.groupName}
                  </td>
                </tr>

                {expandedGroup === group.groupName && (
                  <tr>
                    <td className="bg-gray-50 p-6 rounded-b-2xl">
                      {loadingItems ? (
                        <div className="flex justify-center py-6">
                          <Loader1 />
                        </div>
                      ) : items.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-lg font-medium">
                          No items found.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <table className="min-w-full table-auto shadow-md rounded-xl overflow-hidden">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-6 py-4 text-left text-gray-600 font-semibold text-sm uppercase">
                                  Item Name
                                </th>
                                <th className="px-6 py-4 text-center text-gray-600 font-semibold text-sm uppercase">
                                  Quantity
                                </th>
                                <th className="px-6 py-4 text-center text-gray-600 font-semibold text-sm uppercase">
                                  Price
                                </th>
                                <th className="px-6 py-4 text-center text-gray-600 font-semibold text-sm uppercase">
                                  Total Price
                                </th>
                                <th className="px-6 py-4 text-center text-gray-600 font-semibold text-sm uppercase">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {items.map((item) => (
                                <tr
                                  key={item.id}
                                  className="hover:bg-gray-50 transition-all duration-300"
                                >
                                  <td className="px-6 py-4 text-gray-700 font-medium">
                                    {item.itemName}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {item.quantity}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    ₹{item.sellingPrice}
                                  </td>
                                  <td className="px-6 py-4 text-center font-semibold">
                                    ₹{item.quantity * item.sellingPrice}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-2 rounded-full transition-all duration-300"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div className="text-right text-gray-700 font-extrabold text-2xl mt-4">
                            Total Amount: ₹{totalAmount}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockGroup;
