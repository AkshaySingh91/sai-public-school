import React, { useEffect, useState } from "react";
import { db } from "../../../config/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";

function BusDestination() {
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [newDestination, setNewDestination] = useState({ name: "", fee: "" });
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [buses, setBuses] = useState([]);
  const [assignedMap, setAssignedMap] = useState({}); // destinationName => { busDocId, active }
  const [busFilter, setBusFilter] = useState("All");

  // Fetch destinations
  const fetchDestinations = async () => {
    const ref = collection(db, "allDestinations");
    const snap = await getDocs(ref);
    const dests = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setDestinations(dests);
    setFilteredDestinations(dests);
  };

  const getCurrentAcademicYear = () => {
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear.toString().slice(-2)}`;
  };

  const addDestination = async () => {
    try {
      if (!newDestination.name || !newDestination.fee) return;

      const academicYear = getCurrentAcademicYear();

      await addDoc(collection(db, "allDestinations"), {
        name: newDestination.name,
        fee: parseFloat(newDestination.fee),
        academicYear,
      });

      setNewDestination({ name: "", fee: "" });
      setShowDestinationModal(false);

      fetchDestinations();
    } catch (err) {
      console.error("Error adding destination:", err);
    }
  };

  // Fetch buses
  const fetchBuses = async () => {
    const ref = collection(db, "allBuses");
    const snap = await getDocs(ref);
    const busesData = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setBuses(busesData);

    const map = {};
    busesData.forEach((bus) => {
      (bus.destinations || []).forEach((dest) => {
        map[dest.name] = { busDocId: bus.id, active: dest.active ?? true };
      });
    });
    setAssignedMap(map);
  };

  // Assign a bus to destination
  const assignBus = async (destination, busDocId) => {
    try {
      const destRef = doc(db, "allDestinations", destination.id);
      const destSnap = await getDoc(destRef);
      if (!destSnap.exists()) return;

      const fullDest = destSnap.data();
      const destWithId = { ...fullDest, id: destination.id, active: true };

      // Remove from previous bus if assigned
      const previousAssignment = assignedMap[destination.name];
      if (previousAssignment) {
        const prevBusRef = doc(db, "allBuses", previousAssignment.busDocId);
        const prevBusSnap = await getDoc(prevBusRef);
        if (prevBusSnap.exists()) {
          const prevBusData = prevBusSnap.data();
          const updatedPrevDestinations = (prevBusData.destinations || []).filter(
            (d) => d.name !== destination.name
          );
          await updateDoc(prevBusRef, {
            destinations: updatedPrevDestinations,
          });
        }
      }

      // Add to new bus
      const busRef = doc(db, "allBuses", busDocId);
      const busSnap = await getDoc(busRef);
      if (!busSnap.exists()) return;

      const busData = busSnap.data();
      const existingDestinations = busData.destinations || [];
      const updatedDestinations = [...existingDestinations, destWithId];
      await updateDoc(busRef, { destinations: updatedDestinations });

      setAssignedMap((prev) => ({
        ...prev,
        [fullDest.name]: { busDocId: busDocId, active: true },
      }));
    } catch (error) {
      console.error("Error assigning destination:", error);
    }
  };

  // Toggle active/inactive status
  const toggleStatus = async (destination) => {
    const assignment = assignedMap[destination.name];
    if (!assignment) return;

    try {
      const busRef = doc(db, "allBuses", assignment.busDocId);
      const busSnap = await getDoc(busRef);
      if (!busSnap.exists()) return;

      const busData = busSnap.data();
      const destinationsList = busData.destinations || [];
      const updatedList = destinationsList.map((dest) =>
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
    } catch (error) {
      console.error("Error toggling status:", error);
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => setShowDestinationModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
      >
        ➕ Add Destination
      </button>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Bus Destination Assignment
        </h2>

        {/* Top controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search destination..."
            className="w-full md:w-1/2 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="w-full md:w-1/3 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
          >
            <option value="All">All Buses</option>
            {buses.map((bus, idx) => (
              <option key={idx} value={bus.id}>
                {bus.busNo} - {bus.numberPlate}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border rounded-md">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="border px-4 py-2 text-left">Academic Year</th>
                <th className="border px-4 py-2 text-left">Destination</th>
                <th className="border px-4 py-2 text-left">Other Students Fee</th>
                <th className="border px-4 py-2 text-left">Assign Bus</th>
                <th className="border px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {filteredDestinations.map((dest, index) => {
                const assignment = assignedMap[dest.name] || {};
                const assignedBusNo = assignment.busDocId || "";

                return (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="border px-4 py-2">{dest.academicYear}</td>
                    <td className="border px-4 py-2">{dest.name}</td>
                    <td className="border px-4 py-2">₹{dest.fee}</td>
                    <td className="border px-4 py-2">
                      <select
                        className="w-full border rounded-md px-2 py-1"
                        value={assignedBusNo}
                        onChange={(e) => assignBus(dest, e.target.value)}
                      >
                        <option value="">Select Bus</option>
                        {buses.map((bus, idx) => (
                          <option key={idx} value={bus.id}>
                            {bus.busNo} - {bus.numberPlate} ({bus.driverName})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {assignedBusNo ? (
                        <button
                          onClick={() => toggleStatus(dest)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            assignment.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {assignment.active ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span className="text-gray-400">Not Assigned</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredDestinations.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-gray-400 py-6">
                    No destinations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Destination Modal */}
      {showDestinationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 space-y-4">
            <h2 className="text-lg font-semibold mb-4">Add New Destination</h2>
            <input
              type="text"
              placeholder="Destination Name"
              className="w-full px-4 py-2 border rounded-md"
              value={newDestination.name}
              onChange={(e) =>
                setNewDestination((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <input
              type="number"
              placeholder="Fee (₹)"
              className="w-full px-4 py-2 border rounded-md"
              value={newDestination.fee}
              onChange={(e) =>
                setNewDestination((prev) => ({ ...prev, fee: e.target.value }))
              }
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDestinationModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={addDestination}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusDestination;
