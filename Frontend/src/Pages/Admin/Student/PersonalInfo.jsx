// import React, { useEffect, useState } from "react";
// import {
//   User,
//   VenusAndMars,
//   Mail,
//   Phone,
//   GraduationCapIcon,
//   Hash,
//   CalendarDays,
//   Ticket,
//   HomeIcon,
//   CreditCardIcon,
//   Utensils,
//   Bus,
//   HeartPulseIcon,
// } from "lucide-react";
// import { InputField } from "./InputField";
// import { SelectField } from "./SelectField";
// import { db } from "../../../config/firebase";
// import {
//   doc,
//   getDoc,
//   collection,
//   getDocs,
//   updateDoc,
// } from "firebase/firestore";

// export default function PersonalInfo({ formData, setFormData, studentId,handleFeeUpdate }) {
//   const [destinationOptions, setDestinationOptions] = useState([]);
//   const [busOptions, setBusOptions] = useState([]);
//   const [selectedBus, setSelectedBus] = useState(null);
//   const [transportDiscount, setTransportDiscount] = useState(0);

//   // Fetch destinations
//   useEffect(() => {
//     const fetchDestinations = async () => {
//       try {
//         const snapshot = await getDocs(collection(db, "allDestinations"));
//         const destinations = snapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }));
//         setDestinationOptions(destinations);
//       } catch (err) {
//         console.error("Error fetching destinations:", err);
//       }
//     };

//     fetchDestinations();
//   }, []);

//   // Handle bus stop selection
//   const handleBusStopChange = async (e) => {
//     const selectedName = e.target.value;
//     setFormData({ ...formData, busStop: selectedName });
//     setSelectedBus(null);
//     setTransportDiscount(0);

//     try {
//       const busSnapshot = await getDocs(collection(db, "allBuses"));
//       const buses = busSnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       }));

//       const busesForDestination = buses.filter(
//         (bus) =>
//           Array.isArray(bus.destinations) &&
//           bus.destinations.some((dest) => dest.name === selectedName)
//       );
//       setBusOptions(busesForDestination);
//     } catch (err) {
//       console.error("Failed to fetch bus details:", err);
//     }
//   };

//   // Handle bus selection
//   const handleBusSelection = async (e) => {
//     const busId = e.target.value;
//     const selectedBus = busOptions.find((bus) => bus.id === busId);
//     setSelectedBus(selectedBus);

//     if (!selectedBus || !studentId) return;

//     try {
//       const studentRef = doc(db, "students", studentId.id);
//       const studentSnap = await getDoc(studentRef);
//       if (!studentSnap.exists()) return;

//       const studentData = studentSnap.data();
//       const selectedDestination = selectedBus.destinations.find(
//         (dest) => dest.name === formData.busStop
//       );

//       if (!selectedDestination) {
//         console.warn("Selected destination not found in the bus.");
//         return;
//       }

//       const currentFees = studentData.schoolFees || {};
//       const newTransportFee = selectedDestination.fee || 0;

//       const updatedSchoolFees = {
//         ...currentFees,
//         transportFee: newTransportFee,
//         total:
//           (currentFees["Academic Fees"] || 0) +
//           (currentFees["Tution Fees"] || 0) +
//           newTransportFee +
//           (studentData.messFee || 0) +
//           (studentData.hostelFee || 0),
//       };

//       const transportDetails = {
//         destinationId: selectedDestination.id,
//         busId: selectedBus.id,
//       };

//       await updateDoc(studentRef, {
//         transportDetails: transportDetails,
//       });

//       setFormData({
//         ...formData,
//         allFee: { ...formData.allFee, transportFee: selectedDestination.fee },
//       });
//     } catch (err) {
//       console.error("Error updating student transport info:", err);
//     }
//   };

//   // Handle discount input and update total transport fee
//   const handleTransportDiscountChange = async (e) => {
//     const discount = parseInt(e.target.value) || 0;
//     setTransportDiscount(discount);

//     if (!selectedBus || !formData.busStop) return;

//     try {
//       const selectedDestination = selectedBus.destinations.find(
//         (dest) => dest.name === formData.busStop
//       );
//       if (!selectedDestination) return;

//       const originalTransportFee = selectedDestination.fee || 0;
//       const discountedFee = Math.max(originalTransportFee - discount, 0);

//       // Update Firestore
//       const studentRef = doc(db, "students", studentId.id);
//       await updateDoc(studentRef, {
//         transportDetails: {
//           destinationId: selectedDestination.id,
//           busId: selectedBus.id,
//           transportFee: originalTransportFee,
//           discount: discount,
//           finalTransportFee: discountedFee,
//         },
//       });

//       handleFeeUpdate({...studentId.allFee, transportFee: discountedFee,transportFeeDiscount: discount});

//       console.log("Transport fee updated with discount");
//     } catch (err) {
//       console.error("Error applying transport discount:", err);
//     }
//   };

//   return (
//     <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <Section title="Personal Information">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <InputField icon={<User />} label="First Name" value={formData.fname} onChange={(e) => setFormData({ ...formData, fname: e.target.value })} />
//             <InputField icon={<User />} label="Last Name" value={formData.lname} onChange={(e) => setFormData({ ...formData, lname: e.target.value })} />
//             <InputField icon={<User />} label="Father Name" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
//             <InputField icon={<User />} label="Mother Name" value={formData.motherName} onChange={(e) => setFormData({ ...formData, motherName: e.target.value })} />
//             <InputField icon={<CalendarDays />} label="Date of Birth" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
//             <SelectField icon={<VenusAndMars />} label="Gender" options={["Male", "Female", "Other"]} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} />
//           </div>
//         </Section>

//         <Section title="Contact Information">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <InputField icon={<Mail />} label="Student Email" type="email" value={formData.studentEmail} onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })} />
//             <InputField icon={<Phone />} label="Student Mobile" value={formData.studentMobile} onChange={(e) => setFormData({ ...formData, studentMobile: e.target.value })} />
//             <InputField icon={<Phone />} label="Father's Mobile" value={formData.fatherMobile} onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })} />
//             <InputField icon={<Phone />} label="Mother's Mobile" value={formData.motherMobile} onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })} />
//           </div>
//         </Section>

//         <Section title="Academic Information">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <InputField icon={<GraduationCapIcon />} label="Class" value={formData.class} disabled />
//             <InputField icon={<Hash />} label="Division" value={formData.div} onChange={(e) => setFormData({ ...formData, div: e.target.value })} />
//             <InputField icon={<CalendarDays />} label="Academic Year" value={formData.academicYear} disabled />
//             <InputField icon={<Ticket />} label="Coupon Code" value={formData.couponCode} onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })} />
//           </div>
//         </Section>

//         <Section title="Additional Details">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <InputField icon={<HomeIcon />} label="Address" textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
//             <InputField icon={<CreditCardIcon />} label="Aadhar Number" value={formData.addharNo} onChange={(e) => setFormData({ ...formData, addharNo: e.target.value })} />
//             <SelectField icon={<Utensils />} label="Meal Service" options={["Yes", "No"]} value={formData.mealService} onChange={(e) => setFormData({ ...formData, mealService: e.target.value })} />
//             <SelectField icon={<Bus />} label="Bus Stop" options={destinationOptions.map((d) => d.name)} value={formData.busStop} onChange={handleBusStopChange} />
//             {busOptions.length > 0 && (
//               <SelectField icon={<Bus />} label="Select Bus" value={selectedBus?.id || ""} options={busOptions.map((bus) => ({ value: bus.id, label: bus.busNo }))} onChange={handleBusSelection} />
//             )}
//             {selectedBus && (
//               <InputField
//                 icon={<CreditCardIcon />}
//                 label="Transport Discount"
//                 type="number"
//                 value={transportDiscount}
//                 onChange={handleTransportDiscountChange}
//               />
//             )}
//             <InputField icon={<HeartPulseIcon />} label="Blood Group" value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} />
//           </div>
//         </Section>
//       </div>
//     </div>
//   );
// }

// function Section({ title, children }) {
//   return (
//     <div className="md:col-span-2">
//       <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">{title}</h3>
//       {children}
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import {
  User,
  VenusAndMars,
  Mail,
  Phone,
  GraduationCapIcon,
  Hash,
  CalendarDays,
  Ticket,
  HomeIcon,
  CreditCardIcon,
  Utensils,
  Bus,
  HeartPulseIcon,
} from "lucide-react";
import { InputField } from "./InputField";
import { SelectField } from "./SelectField";
import { db } from "../../../config/firebase";
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";

export default function PersonalInfo({ formData, setFormData, studentId, handleFeeUpdate }) {
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [busOptions, setBusOptions] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [transportDiscount, setTransportDiscount] = useState(0);

  // Fetch destinations
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const snapshot = await getDocs(collection(db, "allDestinations"));
        const destinations = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDestinationOptions(destinations);
      } catch (err) {
        console.error("Error fetching destinations:", err);
      }
    };
    fetchDestinations();
  }, []);

  // Handle bus stop selection
  const handleBusStopChange = async (e) => {
    const selectedName = e.target.value;
    setFormData({ ...formData, busStop: selectedName });
    setSelectedBus(null);
    setTransportDiscount(0);

    try {
      const busSnapshot = await getDocs(collection(db, "allBuses"));
      const buses = busSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const busesForDestination = buses.filter(
        (bus) =>
          Array.isArray(bus.destinations) &&
          bus.destinations.some((dest) => dest.name === selectedName)
      );
      setBusOptions(busesForDestination);
    } catch (err) {
      console.error("Failed to fetch bus details:", err);
    }
  };

  // Handle bus selection
  const handleBusSelection = async (e) => {
    const busId = e.target.value;
    const selectedBus = busOptions.find((bus) => bus.id === busId);
    setSelectedBus(selectedBus);

    if (!selectedBus || !studentId) return;

    try {
      const studentRef = doc(db, "students", studentId.id);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) return;

      const studentData = studentSnap.data();
      const selectedDestination = selectedBus.destinations.find(
        (dest) => dest.name === formData.busStop
      );

      if (!selectedDestination) {
        console.warn("Selected destination not found in the bus.");
        return;
      }

      const currentFees = studentData.schoolFees || {};
      const newTransportFee = selectedDestination.fee || 0;

      const updatedSchoolFees = {
        ...currentFees,
        transportFee: newTransportFee,
        total:
          (currentFees["Academic Fees"] || 0) +
          (currentFees["Tution Fees"] || 0) +
          newTransportFee +
          (studentData.messFee || 0) +
          (studentData.hostelFee || 0),
      };

      const transportDetails = {
        destinationId: selectedDestination.id,
        busId: selectedBus.id,
      };

      await updateDoc(studentRef, {
        transportDetails: transportDetails,
      });

      setFormData({
        ...formData,
        allFee: { ...formData.allFee, transportFee: selectedDestination.fee },
      });
    } catch (err) {
      console.error("Error updating student transport info:", err);
    }
  };

  // APPLY Discount (Only on button click)
  const applyTransportDiscount = async () => {
    if (!selectedBus || !formData.busStop) return;

    try {
      const selectedDestination = selectedBus.destinations.find(
        (dest) => dest.name === formData.busStop
      );
      if (!selectedDestination) return;

      const originalTransportFee = selectedDestination.fee || 0;
      const discountedFee = Math.max(originalTransportFee - transportDiscount, 0);

      const studentRef = doc(db, "students", studentId.id);
      await updateDoc(studentRef, {
        transportDetails: {
          destinationId: selectedDestination.id,
          busId: selectedBus.id,
          transportFee: originalTransportFee,
          discount: transportDiscount,
          finalTransportFee: discountedFee,
        },
      });

      handleFeeUpdate({
        ...studentId.allFee,
        transportFee: discountedFee,
        transportFeeDiscount: transportDiscount,
      });

      console.log("Transport fee updated with discount");
    } catch (err) {
      console.error("Error applying transport discount:", err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Personal Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField icon={<User />} label="First Name" value={formData.fname} onChange={(e) => setFormData({ ...formData, fname: e.target.value })} />
            <InputField icon={<User />} label="Last Name" value={formData.lname} onChange={(e) => setFormData({ ...formData, lname: e.target.value })} />
            <InputField icon={<User />} label="Father Name" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
            <InputField icon={<User />} label="Mother Name" value={formData.motherName} onChange={(e) => setFormData({ ...formData, motherName: e.target.value })} />
            <InputField icon={<CalendarDays />} label="Date of Birth" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
            <SelectField icon={<VenusAndMars />} label="Gender" options={["Male", "Female", "Other"]} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} />
          </div>
        </Section>

        <Section title="Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField icon={<Mail />} label="Student Email" type="email" value={formData.studentEmail} onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })} />
            <InputField icon={<Phone />} label="Student Mobile" value={formData.studentMobile} onChange={(e) => setFormData({ ...formData, studentMobile: e.target.value })} />
            <InputField icon={<Phone />} label="Father's Mobile" value={formData.fatherMobile} onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })} />
            <InputField icon={<Phone />} label="Mother's Mobile" value={formData.motherMobile} onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })} />
          </div>
        </Section>

        <Section title="Academic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField icon={<GraduationCapIcon />} label="Class" value={formData.class} disabled />
            <InputField icon={<Hash />} label="Division" value={formData.div} onChange={(e) => setFormData({ ...formData, div: e.target.value })} />
            <InputField icon={<CalendarDays />} label="Academic Year" value={formData.academicYear} disabled />
            <InputField icon={<Ticket />} label="Coupon Code" value={formData.couponCode} onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })} />
          </div>
        </Section>

        <Section title="Additional Details">
          <div className="grid grid-cols-1 gap-4">
            <InputField icon={<HomeIcon />} label="Address" textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            <InputField icon={<CreditCardIcon />} label="Aadhar Number" value={formData.addharNo} onChange={(e) => setFormData({ ...formData, addharNo: e.target.value })} />
            <SelectField icon={<Utensils />} label="Meal Service" options={["Yes", "No"]} value={formData.mealService} onChange={(e) => setFormData({ ...formData, mealService: e.target.value })} />

            {/* Custom Row Layout for Bus Stop, Bus Selection, and Discount */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <SelectField icon={<Bus />} label="Bus Stop" options={destinationOptions.map((d) => d.name)} value={formData.busStop} onChange={handleBusStopChange} />
              </div>

              {busOptions.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <SelectField icon={<Bus />} label="Select Bus" value={selectedBus?.id || ""} options={busOptions.map((bus) => ({ value: bus.id, label: bus.busNo }))} onChange={handleBusSelection} />
                </div>
              )}

              {selectedBus && (
                <div className="flex-1 min-w-[200px]">
                  <InputField
                    icon={<CreditCardIcon />}
                    label="Transport Discount"
                    type="number"
                    value={transportDiscount}
                    onChange={(e) => setTransportDiscount(parseInt(e.target.value) || 0)}
                  />
                  <button
                    className="bg-purple-600 text-white px-4 py-2 rounded-md w-full mt-2 hover:bg-purple-700 transition"
                    onClick={applyTransportDiscount}
                  >
                    Apply Discount
                  </button>
                </div>
              )}
            </div>

            <InputField icon={<HeartPulseIcon />} label="Blood Group" value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="md:col-span-2">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">{title}</h3>
      {children}
    </div>
  );
}
