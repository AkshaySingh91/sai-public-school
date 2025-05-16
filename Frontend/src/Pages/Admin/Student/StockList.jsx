import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
function StockList() {
  const [newStock, setNewStock] = useState({
    itemName: "",
    quantity: "",
    purchasePrice: "",
    sellingPrice: "",
    fromClass: "",
    toClass: "",
    category: "All",
  });
  const [stocks, setStocks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const users = useAuth().userData;
  console.log({ Object: users.schoolCode });

  // Class name mapping for easier handling
  const classNames = [
    "JRKG",
    "Nursery",
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

  const addStock = async () => {
    if (
      !newStock.itemName ||
      !newStock.quantity ||
      !newStock.fromClass ||
      !newStock.toClass
    )
      return;

    const fromClassIndex = classNames.indexOf(newStock.fromClass);
    const toClassIndex = classNames.indexOf(newStock.toClass);

    if (
      fromClassIndex === -1 ||
      toClassIndex === -1 ||
      fromClassIndex > toClassIndex
    ) {
      alert("Please select a valid class range");
      return;
    }

    // Loop over the class range
    for (let i = fromClassIndex; i <= toClassIndex; i++) {
      const stockWithDateAndClass = {
        itemName: newStock.itemName,
        quantity: parseInt(newStock.quantity),
        purchasePrice: parseFloat(newStock.purchasePrice),
        sellingPrice: parseFloat(newStock.sellingPrice),
        className: classNames[i], // Assign class name based on index
        createdAt: new Date().toISOString(),
        category: newStock.category,
        schoolCode: users?.schoolCode, // Ensure this is always set
      };
      await addDoc(collection(db, "allStocks"), stockWithDateAndClass);
    }

    setNewStock({
      itemName: "",
      quantity: "",
      purchasePrice: "",
      sellingPrice: "",
      fromClass: "",
      toClass: "",
      category: "All",
    });
    setShowModal(false);
    fetchStocks();
  };

  const fetchStocks = async () => {
    const querySnapshot = await getDocs(collection(db, "allStocks"));
    const stockList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const schoolcodeofuser = users?.schoolCode;
    const filteredStockList = stockList.filter((student) => {
      return student.schoolCode === schoolcodeofuser;
    });
    setStocks(filteredStockList);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  return (
    <div className="p-6 space-y-8 font-sans">
      {/* Add Item Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition duration-300 shadow-lg"
        >
          Add Item
        </button>
      </div>

      {/* Stock Table */}
      <div className="bg-white p-8 rounded-2xl shadow-2xl overflow-x-auto">
        <h2 className="text-3xl font-bold mb-8 text-purple-700 text-center">
          📦 Available Stock
        </h2>
        <table className="min-w-full text-sm text-gray-700 border border-gray-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-xs uppercase tracking-wider">
              <th className="px-6 py-4 text-left">Item Name</th>
              <th className="px-6 py-4 text-center">Quantity</th>
              <th className="px-6 py-4 text-center">Class</th>
              <th className="px-6 py-4 text-center">Category</th>
            </tr>
          </thead>
          <tbody className="text-base font-medium">
            {stocks.map((stock) => (
              <tr
                key={stock.id}
                className="border-t hover:bg-gray-100 transition-all duration-300"
              >
                <td className="px-6 py-4">{stock.itemName}</td>
                <td className="px-6 py-4 text-center">{stock.quantity}</td>
                <td className="px-6 py-4 text-center">
                  {stock.className || "N/A"}
                </td>
                <td className="px-6 py-4 text-center">
                  {stock.category || "All"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-3xl bg-opacity-40 z-50">
          <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md relative animate-fadeIn">
            <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">
              ➕ Add New Stock
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
                value={newStock.itemName}
                onChange={(e) =>
                  setNewStock({ ...newStock, itemName: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Quantity"
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
                value={newStock.quantity}
                onChange={(e) =>
                  setNewStock({ ...newStock, quantity: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Purchase Price"
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
                value={newStock.purchasePrice}
                onChange={(e) =>
                  setNewStock({ ...newStock, purchasePrice: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Selling Price"
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
                value={newStock.sellingPrice}
                onChange={(e) =>
                  setNewStock({ ...newStock, sellingPrice: e.target.value })
                }
              />

              <div className="flex gap-4">
                <select
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
                  value={newStock.fromClass}
                  onChange={(e) =>
                    setNewStock({ ...newStock, fromClass: e.target.value })
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
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
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

              {/* Category Dropdown */}

              <select
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
                value={newStock.category}
                onChange={(e) =>
                  setNewStock({ ...newStock, category: e.target.value })
                }
              >
                <option value="All">All</option>
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
              </select>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 text-white px-6 py-2 rounded-xl hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={addStock}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700"
              >
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockList;
