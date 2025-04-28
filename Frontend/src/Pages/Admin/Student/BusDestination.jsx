import React, { useEffect, useState } from "react";
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
          const updatedPrevDestinations = (
            prevBusData.destinations || []
          ).filter((d) => d.name !== destination.name);
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
        className="px-4 py-2 flex items-center gap-2 bg-[#9810fa] text-white rounded mb-4"
      >
        <span className="text-white">
          <FaPlus />
        </span>{" "}
        Add Destination
      </button>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-[#9810fa] mb-6">
          Bus Destination Assignment
        </h2>

        {/* Top controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search destination..."
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="w-1/3 px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
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
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-white uppercase bg-[#9810fa] dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Academic Year</th>
                <th className="px-6 py-3">Destination</th>
                <th className="px-6 py-3">Other Students Fee</th>
                <th className="px-6 py-3">Assign Bus</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDestinations.map((dest, index) => {
                const assignment = assignedMap[dest.name] || {};
                const assignedBusNo = assignment.busDocId || "";

                return (
                  <tr
                    key={index}
                    className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700 border-gray-200"
                  >
                    <td className="px-6 py-4 font-medium text-[#9810fa] whitespace-nowrap dark:text-white">
                      {dest.academicYear}
                    </td>
                    <td className="px-6 py-4 font-semibold">{dest.name}</td>
                    <td className="px-6 py-4 text-green-700 font-bold">₹{dest.fee}</td>
                    <td className="px-6 py-4">
                      <select
                        className="w-full border rounded-md text-[#9810fa] px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    <td className="px-6 py-4 text-center">
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
                        <span className="text-red-600 font-bold">Not Assigned</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredDestinations.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center text-gray-400 py-6 dark:text-gray-500"
                  >
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
        <div className="fixed inset-0 bg-opacity-40 backdrop-blur-3xl flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 space-y-6">
            <h2 className="text-2xl mb-2 text-[#9810fa] font-bold text-center">
              Add New Destination
            </h2>
            <input
              type="text"
              placeholder="Destination Name"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newDestination.name}
              onChange={(e) =>
                setNewDestination((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <input
              type="number"
              placeholder="Fee (₹)"
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] transition duration-300"
              value={newDestination.fee}
              onChange={(e) =>
                setNewDestination((prev) => ({ ...prev, fee: e.target.value }))
              }
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDestinationModal(false)}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={addDestination}
                className="px-5 py-2 rounded-xl bg-[#9810fa] hover:bg-[#7e0ccc] text-white transition duration-300"
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
