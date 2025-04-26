// import React, { useState, useEffect } from "react";
// import { db } from "../../../config/firebase";
// import { collection, addDoc, getDocs } from "firebase/firestore";

// function StockList() {
//   const [newStock, setNewStock] = useState({
//     itemName: "",
//     quantity: "",
//     purchasePrice: "",
//     sellingPrice: "",
//   });
//   const [stocks, setStocks] = useState([]);

//   const addStock = async () => {
//     if (!newStock.itemName || !newStock.quantity) return;

//     const stockWithDate = {
//       ...newStock,
//       quantity: parseInt(newStock.quantity),
//       purchasePrice: parseFloat(newStock.purchasePrice),
//       sellingPrice: parseFloat(newStock.sellingPrice),
//       createdAt: new Date().toISOString(),
//     };

//     await addDoc(collection(db, "allStocks"), stockWithDate);

//     setNewStock({
//       itemName: "",
//       quantity: "",
//       purchasePrice: "",
//       sellingPrice: "",
//     });

//     fetchStocks();
//   };

//   const fetchStocks = async () => {
//     const querySnapshot = await getDocs(collection(db, "allStocks"));
//     const stockList = querySnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     setStocks(stockList);
//   };

//   useEffect(() => {
//     fetchStocks();
//   }, []);

//   return (
//     <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
//       {/* Form to Add Stock */}
//       <div className="bg-white p-6 rounded shadow space-y-4">
//         <h2 className="text-xl font-bold">Add New Stock</h2>
//         <input
//           type="text"
//           placeholder="Item Name"
//           className="border w-full p-2 rounded"
//           value={newStock.itemName}
//           onChange={(e) =>
//             setNewStock({ ...newStock, itemName: e.target.value })
//           }
//         />
//         <input
//           type="number"
//           placeholder="Quantity"
//           className="border w-full p-2 rounded"
//           value={newStock.quantity}
//           onChange={(e) =>
//             setNewStock({ ...newStock, quantity: e.target.value })
//           }
//         />
//         <input
//           type="number"
//           placeholder="Purchase Price"
//           className="border w-full p-2 rounded"
//           value={newStock.purchasePrice}
//           onChange={(e) =>
//             setNewStock({ ...newStock, purchasePrice: e.target.value })
//           }
//         />
//         <input
//           type="number"
//           placeholder="Selling Price"
//           className="border w-full p-2 rounded"
//           value={newStock.sellingPrice}
//           onChange={(e) =>
//             setNewStock({ ...newStock, sellingPrice: e.target.value })
//           }
//         />
//         <button
//           onClick={addStock}
//           className="bg-green-600 text-white px-4 py-2 rounded w-full"
//         >
//           ➕ Add Stock
//         </button>
//       </div>

//       {/* Stock Table */}
//       <div className="bg-white p-6 rounded shadow overflow-x-auto">
//         <h2 className="text-xl font-bold mb-4">Available Stock</h2>
//         <table className="min-w-full table-auto border border-gray-300">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="px-4 py-2 border">Item Name</th>
//               <th className="px-4 py-2 border">Quantity</th>
//             </tr>
//           </thead>
//           <tbody>
//             {stocks.map((stock) => (
//               <tr key={stock.id} className="text-center border-t hover:bg-gray-50">
//                 <td className="px-4 py-2 border">{stock.itemName}</td>
//                 <td className="px-4 py-2 border">{stock.quantity}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default StockList;


import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

function StockList() {
  const [newStock, setNewStock] = useState({
    itemName: "",
    quantity: "",
    purchasePrice: "",
    sellingPrice: "",
  });
  const [stocks, setStocks] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const addStock = async () => {
    if (!newStock.itemName || !newStock.quantity) return;

    const stockWithDate = {
      ...newStock,
      quantity: parseInt(newStock.quantity),
      purchasePrice: parseFloat(newStock.purchasePrice),
      sellingPrice: parseFloat(newStock.sellingPrice),
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "allStocks"), stockWithDate);

    setNewStock({
      itemName: "",
      quantity: "",
      purchasePrice: "",
      sellingPrice: "",
    });

    setShowModal(false); // Close the modal after adding
    fetchStocks(); // Refresh the table
  };

  const fetchStocks = async () => {
    const querySnapshot = await getDocs(collection(db, "allStocks"));
    const stockList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setStocks(stockList);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Add Item Button */}
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        ➕ Add Item
      </button>

      {/* Stock Table */}
      <div className="bg-white p-6 rounded shadow overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Available Stock</h2>
        <table className="min-w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">Item Name</th>
              <th className="px-4 py-2 border">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.id} className="text-center border-t hover:bg-gray-50">
                <td className="px-4 py-2 border">{stock.itemName}</td>
                <td className="px-4 py-2 border">{stock.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-8 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Stock</h2>
            <input
              type="text"
              placeholder="Item Name"
              className="border w-full p-2 rounded mb-3"
              value={newStock.itemName}
              onChange={(e) =>
                setNewStock({ ...newStock, itemName: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Quantity"
              className="border w-full p-2 rounded mb-3"
              value={newStock.quantity}
              onChange={(e) =>
                setNewStock({ ...newStock, quantity: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Purchase Price"
              className="border w-full p-2 rounded mb-3"
              value={newStock.purchasePrice}
              onChange={(e) =>
                setNewStock({ ...newStock, purchasePrice: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Selling Price"
              className="border w-full p-2 rounded mb-3"
              value={newStock.sellingPrice}
              onChange={(e) =>
                setNewStock({ ...newStock, sellingPrice: e.target.value })
              }
            />

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={addStock}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                ➕ Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockList;
