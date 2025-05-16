import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase"; // Your firebase config import
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import * as XLSX from "xlsx";

function BusList() {
  const [showBusModal, setShowBusModal] = useState(false);
  const [newBus, setNewBus] = useState({
    numberPlate: "",
    busNo: "",
    driverName: "",
    mobile: "",
    assistant: "",
    status: "",
    insuranceDate: "0000-00-00",
  });
  const users = useAuth().userData;
  const [buses, setBuses] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Add a single bus
  const addBus = async () => {
    if (!newBus.numberPlate || !newBus.busNo || !newBus.driverName) {
      alert("Please fill required fields: Number Plate, Bus No, Driver Name");
      return;
    }

    const busData = {
      ...newBus,
      assistant: newBus.assistant || "Not assigned",
      insuranceDate: newBus.insuranceDate || "0000-00-00",
      schoolCode: users?.schoolCode,
    };

    try {
      await addDoc(collection(db, "allBuses"), busData);
      alert("Bus added successfully!");
      setNewBus({
        numberPlate: "",
        busNo: "",
        driverName: "",
        mobile: "",
        assistant: "",
        status: "",
        insuranceDate: "0000-00-00",
      });
      setShowBusModal(false);
      fetchBuses();
    } catch (error) {
      console.error("Error adding bus:", error);
      alert("Failed to add bus.");
    }
  };

  // Fetch buses for the current schoolCode
  const fetchBuses = async () => {
    if (!users?.schoolCode) return;

    try {
      const q = query(
        collection(db, "allBuses"),
        where("schoolCode", "==", users.schoolCode)
      );
      const querySnapshot = await getDocs(q);

      let busList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by busNo numerically if possible
      busList.sort((a, b) => {
        const numA = parseInt(a.busNo, 10);
        const numB = parseInt(b.busNo, 10);
        if (isNaN(numA) || isNaN(numB)) {
          return a.busNo.localeCompare(b.busNo);
        }
        return numA - numB;
      });

      setBuses(busList);
    } catch (error) {
      console.error("Error fetching buses:", error);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, [users?.schoolCode]);

  // Handle Excel file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      for (const bus of jsonData) {
        if (!bus.numberPlate || !bus.busNo || !bus.driverName) {
          // Skip incomplete rows
          continue;
        }

        const busData = {
          numberPlate: bus.numberPlate,
          busNo: bus.busNo.toString(),
          driverName: bus.driverName,
          mobile: bus.mobile || "",
          assistant: bus.assistant || "Not assigned",
          status: bus.status || "Inactive",
          insuranceDate: bus.insuranceDate || "0000-00-00",
          schoolCode: users?.schoolCode,
        };

        await addDoc(collection(db, "allBuses"), busData);
      }

      alert("Buses added successfully from Excel!");
      fetchBuses();
    } catch (error) {
      console.error("Error reading Excel file: ", error);
      alert("Failed to upload Excel file.");
    }

    setUploading(false);
    e.target.value = ""; // Reset input so same file can be uploaded again if needed
  };

  return (
    <div className="p-4 space-y-6">
      {/* Buttons */}
      <div className="flex gap-4 items-center">
        <button
          onClick={() => setShowBusModal(true)}
          className="px-4 py-2 bg-[#9810fa] font-semibold text-white rounded"
        >
          🚌 Add Bus
        </button>

        <label className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer">
          Upload Excel
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>

        {uploading && <span>Uploading...</span>}
      </div>

      {/* Buses Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
        <table className="min-w-full table-auto">
          <thead className="bg-[#9810FA] text-white text-sm font-semibold">
            <tr>
              <th className="px-6 py-4 text-left">Bus No</th>
              <th className="px-6 py-4 text-left">Number Plate</th>
              <th className="px-6 py-4 text-left">Driver</th>
              <th className="px-6 py-4 text-left">Mobile</th>
              <th className="px-6 py-4 text-left">Assistant</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Insurance Date</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm divide-y divide-gray-200">
            {buses.map((bus) => (
              <tr
                key={bus.id}
                className="hover:bg-gray-100 transition-all duration-300"
              >
                <td className="px-6 py-4">{bus.busNo}</td>
                <td className="px-6 py-4">{bus.numberPlate}</td>
                <td className="px-6 py-4">{bus.driverName}</td>
                <td className="px-6 py-4">{bus.mobile}</td>
                <td className="px-6 py-4">{bus.assistant}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bus.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {bus.status}
                  </span>
                </td>
                <td className="px-6 py-4">{bus.insuranceDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Bus Modal */}
      {showBusModal && (
        <div className="fixed inset-0 backdrop-blur-3xl bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 space-y-3">
            <h2 className="text-lg  text-[#9810fa] font-bold">Add New Bus</h2>
            <input
              type="text"
              placeholder="Bus Number Plate"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newBus.numberPlate}
              onChange={(e) =>
                setNewBus({ ...newBus, numberPlate: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Bus No"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newBus.busNo}
              onChange={(e) => setNewBus({ ...newBus, busNo: e.target.value })}
            />
            <input
              type="text"
              placeholder="Driver Name"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newBus.driverName}
              onChange={(e) =>
                setNewBus({ ...newBus, driverName: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Mobile No"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newBus.mobile}
              onChange={(e) => setNewBus({ ...newBus, mobile: e.target.value })}
            />
            <input
              type="text"
              placeholder="Assistant Name"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newBus.assistant}
              onChange={(e) =>
                setNewBus({ ...newBus, assistant: e.target.value })
              }
            />
            <select
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newBus.status}
              onChange={(e) => setNewBus({ ...newBus, status: e.target.value })}
            >
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <input
              type="date"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newBus.insuranceDate}
              onChange={(e) =>
                setNewBus({ ...newBus, insuranceDate: e.target.value })
              }
            />
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2 rounded border border-[#9810fa] text-[#9810fa]"
                onClick={() => setShowBusModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 rounded bg-[#9810fa] text-white"
                onClick={addBus}
              >
                Add Bus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusList;
