import React, { useEffect, useState, useRef } from "react";
import { MdOutlineFileUpload } from "react-icons/md";
import * as XLSX from "xlsx";
import { db } from "../../../config/firebase";
import { FaPlus } from "react-icons/fa6";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import Loader1 from "../../../components/Loader1";

function BusDestination() {
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [newDestination, setNewDestination] = useState({ name: "", fee: "" });
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [buses, setBuses] = useState([]);
  const [assignedMap, setAssignedMap] = useState({});
  const [busFilter, setBusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const fileref = useRef(null);

  const users = useAuth().userData;

  const getCurrentAcademicYear = () => {
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear.toString().slice(-2)}`;
  };

  const fetchDestinations = async () => {
    const ref = collection(db, "allDestinations");
    const snap = await getDocs(ref);
    const dests = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((d) => d.schoolCode === users.schoolCode);
    setDestinations(dests);
    setFilteredDestinations(dests);
  };

  const fetchBuses = async () => {
    const ref = collection(db, "allBuses");
    const snap = await getDocs(ref);
    const busesData = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((bus) => bus.schoolCode === users.schoolCode);
    setBuses(busesData);

    const map = {};
    busesData.forEach((bus) => {
      (bus.destinations || []).forEach((dest) => {
        map[dest.name] = { busDocId: bus.id, active: dest.active ?? true };
      });
    });
    setAssignedMap(map);
  };

  const addDestination = async () => {
    if (!newDestination.name || !newDestination.fee) return;
    await addDoc(collection(db, "allDestinations"), {
      name: newDestination.name,
      fee: parseFloat(newDestination.fee),
      academicYear: getCurrentAcademicYear(),
      schoolCode: users.schoolCode,
    });
    setNewDestination({ name: "", fee: "" });
    setShowDestinationModal(false);
    fetchDestinations();
  };

  const assignBus = async (destination, busDocId) => {
    const destRef = doc(db, "allDestinations", destination.id);
    const destSnap = await getDoc(destRef);
    if (!destSnap.exists()) return;

    const fullDest = destSnap.data();
    const destWithId = { ...fullDest, id: destination.id, active: true };

    const previousAssignment = assignedMap[destination.name];
    if (previousAssignment) {
      const prevBusRef = doc(db, "allBuses", previousAssignment.busDocId);
      const prevBusSnap = await getDoc(prevBusRef);
      if (prevBusSnap.exists()) {
        const prevBusData = prevBusSnap.data();
        const updatedPrevDestinations = (prevBusData.destinations || []).filter(
          (d) => d.name !== destination.name
        );
        await updateDoc(prevBusRef, { destinations: updatedPrevDestinations });
      }
    }

    const busRef = doc(db, "allBuses", busDocId);
    const busSnap = await getDoc(busRef);
    if (!busSnap.exists()) return;

    const busData = busSnap.data();
    const updatedDestinations = [...(busData.destinations || []), destWithId];
    await updateDoc(busRef, { destinations: updatedDestinations });

    setAssignedMap((prev) => ({
      ...prev,
      [fullDest.name]: { busDocId, active: true },
    }));
  };

  const toggleStatus = async (destination) => {
    const assignment = assignedMap[destination.name];
    if (!assignment) return;

    const busRef = doc(db, "allBuses", assignment.busDocId);
    const busSnap = await getDoc(busRef);
    if (!busSnap.exists()) return;

    const busData = busSnap.data();
    const updatedList = (busData.destinations || []).map((dest) =>
      dest.name === destination.name
        ? { ...dest, active: !assignment.active }
        : dest
    );
    await updateDoc(busRef, { destinations: updatedList });

    setAssignedMap((prev) => ({
      ...prev,
      [destination.name]: {
        ...assignment,
        active: !assignment.active,
      },
    }));
  };

  const handleExcelUpload = async (e) => {
    const file = fileref.current;
    if (!file) {
      alert("Please select a file first.");
      return;
    }
    setLoading(true);
    try {
      const existingDestSnap = await getDocs(collection(db, "allDestinations"));
      const existingDestNames = existingDestSnap.docs
        .filter((doc) => doc.data().schoolCode === users.schoolCode)
        .map((doc) => doc.data().name.toLowerCase().trim());

      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const addedStops = new Set();

        for (const row of data) {
          const stop = row["BUS STOP"]?.trim();
          const fee = row["Bus Fee"];
          const busNo = row["BUS"];

          if (!stop || !fee || !busNo) continue;

          const normalizedStop = stop.toLowerCase();

          // Avoid duplicates: already in DB or already added in this loop
          if (
            existingDestNames.includes(normalizedStop) ||
            addedStops.has(normalizedStop)
          ) {
            continue;
          }

          // Mark as added to avoid duplicates within the same Excel sheet
          addedStops.add(normalizedStop);

          const destDoc = await addDoc(collection(db, "allDestinations"), {
            name: stop,
            fee: parseFloat(fee),
            academicYear: getCurrentAcademicYear(),
            schoolCode: users.schoolCode,
          });

          const newDest = {
            name: stop,
            fee: parseFloat(fee),
            academicYear: getCurrentAcademicYear(),
            schoolCode: users.schoolCode,
            id: destDoc.id,
            active: true,
          };

          const matchedBus = buses.find((bus) => bus.busNo === String(busNo));
          if (matchedBus) {
            const busRef = doc(db, "allBuses", matchedBus.id);
            const busSnap = await getDoc(busRef);
            const busData = busSnap.data();
            const updatedDestinations = [
              ...(busData.destinations || []),
              newDest,
            ];
            await updateDoc(busRef, { destinations: updatedDestinations });
          }
        }

        fetchDestinations();
        fetchBuses();
        alert("Excel data imported successfully without duplicates.");
        setLoading(false);
        fileref.current = null; // Clear the file reference
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("Error uploading Excel file:", err);
      alert("Error uploading Excel file. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
    fetchBuses();
  }, []);

  useEffect(() => {
    let filtered = destinations;
    if (searchTerm) {
      filtered = filtered.filter((dest) =>
        dest.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (busFilter !== "All") {
      filtered = filtered.filter((dest) => {
        const assignment = assignedMap[dest.name];
        return assignment?.busDocId === busFilter;
      });
    }
    setFilteredDestinations(filtered);
  }, [searchTerm, destinations, busFilter, assignedMap]);

  return (
    <>
      {loading && <Loader1 />}
      <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={() => setShowDestinationModal(true)}
              className="bg-[#9810fa] hover:bg-[#7e0ccc] text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <FaPlus /> Add Destination
            </button>
            <div className="flex gap-4 items-center ml-auto">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  fileref.current = e.target.files[0]; // Save file temporarily
                }}
                className="border px-4 py-2 rounded-lg"
              />

              <button
                onClick={handleExcelUpload}
                className="bg-[#9810fa] hover:bg-[#7e0ccc] text-white font-semibold py-2 px-4 rounded-lg"
              >
                Upload Excel
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search Destination..."
            className="w-full sm:max-w-md px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9810fa] shadow-sm mb-6"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Table Section */}
          <div className="relative overflow-x-auto shadow-md sm:rounded-xl">
            <table className="w-full text-xs sm:text-sm text-left text-gray-600 min-w-[600px]">
              <thead className="text-xs text-white uppercase bg-[#9810fa]">
                <tr>
                  <th className="px-3 sm:px-6 py-3">Academic Year</th>
                  <th className="px-3 sm:px-6 py-3">Destination</th>
                  <th className="px-3 sm:px-6 py-3">Fee</th>
                  <th className="px-3 sm:px-6 py-3">Assign Bus</th>
                  <th className="px-3 sm:px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDestinations.map((dest, index) => {
                  const assignment = assignedMap[dest.name] || {};
                  const assignedBusNo = assignment.busDocId || "";

                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-3 sm:px-6 py-3 text-[#9810fa] font-semibold text-sm sm:text-base">
                        {dest.academicYear}
                      </td>
                      <td className="px-3 sm:px-6 py-3 font-semibold text-sm sm:text-base">
                        {dest.name}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-green-700 font-bold text-sm sm:text-base">
                        ₹{dest.fee}
                      </td>
                      <td className="px-3 sm:px-6 py-3">
                        <select
                          className="w-full border rounded-md text-[#9810fa] px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-base"
                          value={assignedBusNo}
                          onChange={(e) => assignBus(dest, e.target.value)}
                        >
                          <option value="">Select Bus</option>
                          {buses.map((bus) => (
                            <option key={bus.id} value={bus.id}>
                              {bus.busNo} - {bus.numberPlate} ({bus.driverName})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-center">
                        {assignedBusNo ? (
                          <button
                            onClick={() => toggleStatus(dest)}
                            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                              assignment.active
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            } transition`}
                          >
                            {assignment.active ? "Active" : "Inactive"}
                          </button>
                        ) : (
                          <span className="text-red-600 font-bold text-xs sm:text-sm">
                            Not Assigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredDestinations.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-lg font-medium"
                    >
                      No destinations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showDestinationModal && (
          <div className="fixed inset-0 backdrop-blur-3xl bg-opacity-40 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 shadow-xl">
              <h2 className="text-2xl font-bold text-center text-[#9810fa]">
                Add New Destination
              </h2>
              <input
                type="text"
                placeholder="Destination Name"
                className="w-full px-4 py-2 border rounded-lg"
                value={newDestination.name}
                onChange={(e) =>
                  setNewDestination((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
              <input
                type="number"
                placeholder="Fee (₹)"
                className="w-full px-4 py-2 border rounded-lg"
                value={newDestination.fee}
                onChange={(e) =>
                  setNewDestination((prev) => ({
                    ...prev,
                    fee: e.target.value,
                  }))
                }
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDestinationModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addDestination}
                  className="px-4 py-2 bg-[#9810fa] text-white rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default BusDestination;
