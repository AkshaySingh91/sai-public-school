// src/Pages/SuperAdmin/Schools/AccountantList.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase";

const AccountantList = ({ schoolCode, onAccountantChange }) => {
  const [accountants, setAccountants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch accountants assigned to the given school code.
  const fetchAccountants = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "Users"),
        where("role", "==", "accountant"),
        where("schoolCode", "==", schoolCode)
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        // For any empty fields, we can normalize the value to "null"
        const data = doc.data();
        list.push({
          uid: doc.id,
          name: data.name || "null",
          email: data.email || "null",
          phone: data.phone || "null",
          schoolCode: data.schoolCode || "null",
        });
      });
      setAccountants(list);
    } catch (error) {
      console.error("Error fetching accountants:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccountants();
  }, [schoolCode]);

  const handleDeleteAccountant = async (uid) => {
    try {
      await deleteDoc(doc(db, "Users", uid));
      fetchAccountants();
      if (onAccountantChange) {
        onAccountantChange(); // notify parent if needed
      }
    } catch (error) {
      console.error("Error deleting accountant:", error);
    }
  };

  return (
    <div className="mt-4">
      <h4 className="text-lg font-semibold mb-2">Assigned Accountants:</h4>
      {loading ? (
        <p>Loading accountants...</p>
      ) : accountants.length === 0 ? (
        <p className="text-gray-500">No accountants are assigned.</p>
      ) : (
        <ul className="space-y-2">
          {accountants.map((acc) => (
            <li key={acc.uid} className="border p-2 rounded flex justify-between items-center">
              <div>
                <p className="font-bold">{acc.name}</p>
                <p className="text-sm">Email: {acc.email}</p>
                <p className="text-sm">Phone: {acc.phone}</p>
                <p className="text-sm">School Code: {acc.schoolCode}</p>
              </div>
              <button
                onClick={() => handleDeleteAccountant(acc.uid)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AccountantList;
