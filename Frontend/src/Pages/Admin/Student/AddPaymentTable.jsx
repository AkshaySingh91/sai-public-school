import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useSchool } from "../../../contexts/SchoolContext";

import { v4 as uuidv4 } from "uuid";
const AddPaymentTable = ({
  selectedItems,
  studentId,
  schoolId,
  studentClass,
}) => {
  const { school } = useSchool();
  const today = new Date().toISOString().substr(0, 10);
  const [paymentRows, setPaymentRows] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [accounts, setAccounts] = useState(school.accounts || []);

  useEffect(() => {
    // Fetch available items based on the selectedItems prop
    const fetchStockItems = async () => {
      try {
        const q = query(
          collection(db, "allStocks"),
          where("className", "==", studentClass)
        );
        const querySnapshot = await getDocs(q);
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push(doc.data());
        });
        setAvailableItems(items);
      } catch (error) {
        console.error("Error fetching stock items: ", error);
      }
    };

    fetchStockItems();
  }, [studentClass, schoolId]);

  useEffect(() => {
    // Set payment rows based on selected items
    const rows = selectedItems.map((item) => ({
      date: today,
      itemName: item.itemName,
      feeType: "ITEMFEE",
      account: accounts.length > 0 ? accounts[0].AccountNo : "", // Default to the first account
      amount: item.sellingPrice,
      quantity: 1, // Default quantity to 1
      remark: "",
    }));
    setPaymentRows(rows);
  }, [selectedItems, today, accounts]);

  useEffect(() => {
    setAccounts(school?.accounts?.length ? school.accounts : []);
  }, [school.accounts]);

  const handleRowChange = (index, e) => {
    const { name, value } = e.target;
    setPaymentRows((prevRows) => {
      const updatedRows = [...prevRows];
      updatedRows[index][name] = name === "quantity" ? parseInt(value) : value;

      if (name === "quantity" && updatedRows[index].itemName) {
        const selectedItem = availableItems.find(
          (item) => item.itemName === updatedRows[index].itemName
        );
        if (selectedItem) {
          updatedRows[index].amount = selectedItem.sellingPrice * value || "";
        }
      }

      return updatedRows;
    });
  };

  

  const handleSubmitPayments = async () => {
  if (paymentRows.length === 0) {
    alert("Please fill at least one valid payment entry.");
    return;
  }

  try {
    const studentRef = doc(db, "students", studentId);

    const receiptId = uuidv4(); // Single ID for the whole group

    const newTransaction = {
      date: today,
      account: "Cash",
      receiptId,
      items: paymentRows.map(row => ({
        itemName: row.itemName,
        quantity: row.quantity,
        amount: Number(row.amount),
      }))
    };

    await updateDoc(studentRef, {
      StockPaymentDetail: arrayUnion(newTransaction),
    });

    alert("Payments added successfully!");
    setPaymentRows([]);
  } catch (error) {
    console.error("Error adding payments: ", error);
    alert("Failed to add payments");
  }
};

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        Add Stock Payment
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border border-gray-300 rounded-lg shadow-sm">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              {/* <th className="border-b px-4 py-3">Date</th> */}
              <th className="border-b px-4 py-3">Item Name</th>
              <th className="border-b px-4 py-3">Quantity</th>
              {/* <th className="border-b px-4 py-3">Account</th> */}
              <th className="border-b px-4 py-3">Amount</th>
              {/* <th className="border-b px-4 py-3">Remark</th> */}
            </tr>
          </thead>
          <tbody>
            {paymentRows.map((row, idx) => (
              <tr key={idx}>
                <td className="border-b px-4 py-3">
                  <input
                    type="text"
                    value={row.itemName}
                    readOnly
                    className="border px-3 py-2 w-full bg-gray-100 rounded-md"
                  />
                </td>
                <td className="border-b px-4 py-3">
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => handleRowChange(idx, e)}
                    className="border px-3 py-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </td>

                <td className="border-b px-4 py-3">
                  <input
                    type="number"
                    name="amount"
                    value={row.amount}
                    readOnly
                    className="border px-3 py-2 w-full bg-gray-100 rounded-md"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={handleSubmitPayments}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Payments
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentTable;
