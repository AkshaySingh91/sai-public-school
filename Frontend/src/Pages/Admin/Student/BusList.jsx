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
          className="px-4 py-2 bg-[#9810fa] font-semibold text-white rounded"
        >
          🚌 Add Bus
        </button>
      </div>
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

      {/* Bus Modal */}
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
