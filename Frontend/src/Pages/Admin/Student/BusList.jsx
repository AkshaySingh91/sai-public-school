import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

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
  const [buses, setBuses] = useState([]);

  const getCurrentAcademicYear = () => {
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear.toString().slice(-2)}`;
  };

  const addBus = async () => {
    if (!newBus.numberPlate || !newBus.busNo || !newBus.driverName) return;

    await addDoc(collection(db, "allBuses"), newBus);

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
  };

  const fetchBuses = async () => {
    const querySnapshot = await getDocs(collection(db, "allBuses"));
    const busList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setBuses(busList);
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-4">
        <button
          onClick={() => setShowBusModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          🚌 Add Bus
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border">Bus No</th>
              <th className="px-3 py-2 border">Number Plate</th>
              <th className="px-3 py-2 border">Driver</th>
              <th className="px-3 py-2 border">Mobile</th>
              <th className="px-3 py-2 border">Assistant</th>
              <th className="px-3 py-2 border">Status</th>
              <th className="px-3 py-2 border">Insurance Date</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => (
              <tr key={bus.id} className="text-center border-t">
                <td className="px-3 py-2 border">{bus.busNo}</td>
                <td className="px-3 py-2 border">{bus.numberPlate}</td>
                <td className="px-3 py-2 border">{bus.driverName}</td>
                <td className="px-3 py-2 border">{bus.mobile}</td>
                <td className="px-3 py-2 border">{bus.assistant}</td>
                <td className="px-3 py-2 border">{bus.status}</td>
                <td className="px-3 py-2 border">{bus.insuranceDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bus Modal */}
      {showBusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 space-y-3">
            <h2 className="text-lg font-semibold">Add New Bus</h2>
            <input
              type="text"
              placeholder="Bus Number Plate"
              className="border w-full p-2 rounded"
              value={newBus.numberPlate}
              onChange={(e) =>
                setNewBus({ ...newBus, numberPlate: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Bus No"
              className="border w-full p-2 rounded"
              value={newBus.busNo}
              onChange={(e) => setNewBus({ ...newBus, busNo: e.target.value })}
            />
            <input
              type="text"
              placeholder="Driver Name"
              className="border w-full p-2 rounded"
              value={newBus.driverName}
              onChange={(e) =>
                setNewBus({ ...newBus, driverName: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Mobile No"
              className="border w-full p-2 rounded"
              value={newBus.mobile}
              onChange={(e) => setNewBus({ ...newBus, mobile: e.target.value })}
            />
            <input
              type="text"
              placeholder="Assistant Name"
              className="border w-full p-2 rounded"
              value={newBus.assistant}
              onChange={(e) =>
                setNewBus({ ...newBus, assistant: e.target.value })
              }
            />
            <select
              className="border w-full p-2 rounded"
              value={newBus.status}
              onChange={(e) => setNewBus({ ...newBus, status: e.target.value })}
            >
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <input
              type="date"
              className="border w-full p-2 rounded"
              value={newBus.insuranceDate}
              onChange={(e) =>
                setNewBus({ ...newBus, insuranceDate: e.target.value })
              }
            />
            <div className="flex justify-between">
              <button
                onClick={addBus}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Add Bus
              </button>
              <button
                onClick={() => setShowBusModal(false)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusList;
