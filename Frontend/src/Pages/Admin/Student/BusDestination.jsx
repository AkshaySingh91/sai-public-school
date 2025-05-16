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
import { useAuth } from "../../../contexts/AuthContext";

function BusDestination() {
  // ... your existing code ...
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [newDestination, setNewDestination] = useState({ name: "", fee: "" });
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [buses, setBuses] = useState([]);
  const [assignedMap, setAssignedMap] = useState({});
  const [busFilter, setBusFilter] = useState("All");

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
    try {
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
    } catch (err) {
      console.error("Error adding destination:", err);
    }
  };

  const assignBus = async (destination, busDocId) => {
    try {
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
      const existingDestinations = busData.destinations || [];
      const updatedDestinations = [...existingDestinations, destWithId];
      await updateDoc(busRef, { destinations: updatedDestinations });

      setAssignedMap((prev) => ({
        ...prev,
        [fullDest.name]: { busDocId, active: true },
      }));
    } catch (error) {
      console.error("Error assigning destination:", error);
    }
  };

  const toggleStatus = async (destination) => {
    const assignment = assignedMap[destination.name];
    if (!assignment) return;

    try {
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
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => setShowDestinationModal(true)}
          className="px-3 py-2 mb-4 sm:mb-6 inline-flex items-center gap-2 sm:gap-3 bg-[#9810fa] text-white rounded-lg shadow hover:bg-[#7e0ccc] transition text-sm sm:text-lg font-semibold"
          aria-label="Add Destination"
        >
          <FaPlus size={16} />
          <span>Add Destination</span>
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#9810fa] mb-6 sm:mb-8 text-center md:text-left">
            Bus Destination Assignment
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
            <input
              type="text"
              placeholder="Search destination..."
              className="flex-1 px-3 py-2 sm:px-6 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] text-sm sm:text-lg transition duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="w-full sm:w-1/3 px-3 py-2 sm:px-5 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] text-sm sm:text-lg transition duration-300"
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
            >
              <option value="All">All Buses</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.busNo} - {bus.numberPlate}
                </option>
              ))}
            </select>
          </div>

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
      </div>

      {/* Add Modal */}
      {showDestinationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl max-w-md w-full space-y-4 sm:space-y-6 shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#9810fa]">
              Add New Destination
            </h2>
            <input
              type="text"
              placeholder="Destination Name"
              className="w-full px-3 py-2 sm:px-6 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] text-sm sm:text-lg"
              value={newDestination.name}
              onChange={(e) =>
                setNewDestination((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <input
              type="number"
              placeholder="Fee (₹)"
              className="w-full px-3 py-2 sm:px-6 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#9810fa] text-sm sm:text-lg"
              value={newDestination.fee}
              onChange={(e) =>
                setNewDestination((prev) => ({ ...prev, fee: e.target.value }))
              }
            />
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowDestinationModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-semibold text-sm sm:text-base transition"
              >
                Cancel
              </button>
              <button
                onClick={addDestination}
                className="px-4 py-2 rounded-xl bg-[#9810fa] hover:bg-[#7e0ccc] text-white font-semibold text-sm sm:text-base transition"
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
