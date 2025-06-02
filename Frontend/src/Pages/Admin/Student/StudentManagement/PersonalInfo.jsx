import { useEffect, useState } from "react";
import Swal from "sweetalert2"
import {
  User, VenusAndMars, Mail, Phone, GraduationCapIcon, Hash, CalendarDays, Ticket, HomeIcon, CreditCardIcon, Utensils, Bus, HeartPulseIcon, MapPin, IndianRupee, BadgePercent, CheckCircle, FileTextIcon,
  XCircle,
  TriangleAlert
} from "lucide-react";
import { InputField } from "../InputField";
import { SelectField } from "../SelectField";
import { db } from "../../../../config/firebase";
import { doc, query, where, collection, getDocs, updateDoc, } from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext";

export default function PersonalInfo({ formData, setFormData, studentId, schoolData, fetchStudent, rollBackStudent }) {
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [busOptions, setBusOptions] = useState([]);
  const [selectedBus, setSelectedBus] = useState((formData.busStop && formData.busStop !== "" && formData.busNoPlate && formData.busNoPlate !== "") ? formData.busStop.toUpperCase() : "");
  const [busDiscount, setBusDiscount] = useState(formData?.allFee?.busFeeDiscount || 0);
  const [busFee, setBusFee] = useState(formData?.allFee?.busFee || 0);
  const [busDiscountRemark, setBusDiscountRemark] = useState(formData.busDiscountRemark || "")
  const hasBusPreference = !!formData.busStop && formData.busStop;
  const { userData } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const destQuery = query(
          collection(db, 'allDestinations'),
          where('schoolCode', '==', userData.schoolCode)
        );
        const destSnapshot = await getDocs(destQuery);
        const destinations = destSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDestinationOptions(destinations);

        // Fetch buses if student has existing preference
        if (hasBusPreference) {
          const busQuery = query(
            collection(db, "allBuses"),
            where("schoolCode", "==", userData.schoolCode),
          );
          const busSnapshot = await getDocs(busQuery);
          // it will show all that bus that go to student bus stop
          const buses = busSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })).filter(b => b.destinations && b.destinations.length && b.destinations.find(d => d.name?.toLowerCase() === formData.busStop?.toLowerCase()));

          setBusOptions(buses);
          // it is that bus which will go to student bus stop
          const currentBus = buses.find(b => b.numberPlate?.toLowerCase() === formData.busNoPlate?.toLowerCase());
          setSelectedBus(currentBus);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [userData.schoolCode, hasBusPreference]);

  // Handle bus preference change
  const handleTransportPreference = async (value) => {
    if (value === "Not Preferred") {
      await removeBusPreference();
    } else {
      // Check if destination exists
      const destinationExists = destinationOptions.some(
        d => d.name === value
      );

      if (!destinationExists) {
        Swal.fire('Error!', 'Selected destination does not exist', 'error');
        return;
      }

      // Always set the bus stop regardless of bus availability
      setFormData(prev => ({
        ...prev,
        busStop: value,
        busNoPlate: "",
        allFee: { ...prev.allFee, busFee: 0, busFeeDiscount: 0 }
      }));

      // Now handle bus availability check
      try {
        const buses = await fetchBusesForDestination(value);

        if (buses.length === 0) {
          Swal.fire({
            title: 'No Buses Available',
            text: 'This destination has no assigned buses',
            icon: 'warning',
            confirmButtonColor: '#2563eb'
          });
        }

        // Reset bus selection even if no buses found
        setSelectedBus(null);
        setBusFee(0);
        setBusDiscount(0);
        setBusOptions(buses);
      } catch (err) {
        console.error("Error fetching buses:", err);
        Swal.fire('Error!', 'Failed to load bus information', 'error');
      }
    }
  };

  // Helper function to fetch buses
  const fetchBusesForDestination = async (destination) => {
    const busQuery = query(
      collection(db, "allBuses"),
      where("schoolCode", "==", userData.schoolCode)
    );
    const busSnapshot = await getDocs(busQuery);
    return busSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(b => b.destinations?.some(
        d => d.name?.toLowerCase() === destination?.toLowerCase()
      ));
  };
  // Handle bus stop selection
  const handleBusStopChange = async (selectedName) => {
    try {
      const busQuery = query(
        collection(db, "allBuses"),
        where("schoolCode", "==", userData.schoolCode),
      );
      const busSnapshot = await getDocs(busQuery);
      // it will show all that bus that go to student bus stop
      let buses = busSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      buses = buses.filter(b => {
        if (b.destinations && b.destinations.length) {
          // b.destinations.forEach((d) => console.log(d.name?.toLowerCase(), selectedName?.toLowerCase()))
          return b.destinations.find(d => d.name?.toLowerCase() === selectedName?.toLowerCase())
        }
      });
      setBusOptions(buses);
      setBusFee(0);
      setBusDiscount(0);
      // if atleast 1 bus go on that place than assign 1st bus as default
      if (buses.length) {
        setFormData(prev => ({
          ...prev,
          busStop: selectedName,
          busNoPlate: buses[0].numberPlate,
          allFee: { ...prev.allFee, busFee: 0, busFeeDiscount: 0 }
        }));
        setSelectedBus(buses[0]);
      } else {
        Swal.fire({
          title: 'No Buses Available',
          text: 'This destination has no assigned buses',
          icon: 'warning',
          confirmButtonColor: '#2563eb'
        });
      }
    } catch (err) {
      console.error("Error updating bus stop:", err);
    }
  };

  // Handle bus selection
  const handleBusSelection = async (busId) => {
    const bus = busOptions.find(b => b.id === busId);
    if (!bus) return;
    const destination = bus.destinations.find(d => d.name === formData.busStop);
    const fee = destination?.fee || 0;

    setSelectedBus(bus);
    setBusFee(fee);
    setBusDiscount(0);

    const updatedFees = {
      ...formData.allFee,
      busFee: fee,
      busFeeDiscount: 0
    };

    setFormData(prev => ({
      ...prev,
      busNoPlate: bus.numberPlate,
      allFee: updatedFees
    }));
  };

  // Remove bus preference
  const removeBusPreference = async () => {
    const result = await Swal.fire({
      title: 'Remove Bus Preference?',
      text: 'This will Update transport-related information',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, remove it'
    });

    if (result.isConfirmed) {
      try {
        if (studentId?.id) {
          await updateDoc(doc(db, "students", studentId.id), {
            busStop: null,
            busNoPlate: null,
            busDiscountRemark: "",
            allFee: {
              ...formData.allFee,
              busFee: 0,
              busFeeDiscount: 0
            }
          });
        }

        setFormData(prev => ({
          ...prev,
          busStop: "",
          busNoPlate: "",
          busDiscountRemark: "",
          allFee: { ...prev.allFee, busFee: 0, busFeeDiscount: 0 }
        }));

        setBusOptions([]);
        setSelectedBus(null);
        setBusFee(0);
        setBusDiscount(0);

        Swal.fire('Removed!', 'Bus preference has been removed.', 'success');
      } catch (err) {
        Swal.fire('Error!', 'Failed to remove bus preference', 'error');
      }
    }
  };

  // Handle discount changes
  const handleDiscountChange = (value) => {
    const discount = Math.min(Math.max(0, value), busFee);
    setBusDiscount(discount);

    setFormData(prev => ({
      ...prev,
      allFee: {
        ...prev.allFee,
        busFee: busFee - discount,
        busFeeDiscount: discount
      }
    }));
  };

  // Submit transport details
  const submitTransportDetails = async () => {
    if (!selectedBus || !formData.busStop) return;
    const result = await Swal.fire({
      title: 'Add new bus Details?',
      text: 'This will reset all transport-related information',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'blue',
      confirmButtonText: 'Yes, Update it'
    });

    if (result.isConfirmed) {
      try {
        if (studentId?.id) {
          await updateDoc(doc(db, "students", studentId.id), {
            busStop: formData.busStop,
            busNoPlate: selectedBus.numberPlate,
            allFee: {
              ...formData.allFee,
              busFee: busFee - busDiscount,
              busFeeDiscount: busDiscount
            },
            busDiscountRemark
          });
        }

        fetchStudent()
        Swal.fire({
          title: 'Success!',
          text: 'Transport details updated',
          icon: 'success',
          confirmButtonColor: '#2563eb'
        });
      } catch (err) {
        Swal.fire('Error!', 'Failed to update transport details', 'error');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Personal Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              icon={<User />}
              label="First Name"
              value={formData.fname}
              onChange={(e) =>
                setFormData({ ...formData, fname: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="Last Name"
              value={formData.lname}
              onChange={(e) =>
                setFormData({ ...formData, lname: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="Father Name"
              value={formData.fatherName}
              onChange={(e) =>
                setFormData({ ...formData, fatherName: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="Mother Name"
              value={formData.motherName}
              onChange={(e) =>
                setFormData({ ...formData, motherName: e.target.value })
              }
            />
            <InputField
              icon={<CalendarDays />}
              label="Date of Birth"
              type="date"
              value={formData.dob}
              onChange={(e) =>
                setFormData({ ...formData, dob: e.target.value })
              }
            />
            <SelectField
              icon={<VenusAndMars />}
              label="Gender"
              options={["Male", "Female", "Other"]}
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="Caste"
              type="text"
              value={formData.caste}
              onChange={(e) =>
                setFormData({ ...formData, caste: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="subCaste"
              type="text"
              value={formData.subCaste}
              onChange={(e) =>
                setFormData({ ...formData, subCaste: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="Religion"
              type="text"
              value={formData.religion}
              onChange={(e) =>
                setFormData({ ...formData, religion: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="Nationality"
              type="text"
              value={formData.nationality}
              onChange={(e) =>
                setFormData({ ...formData, nationality: e.target.value })
              }
            />
            <InputField
              icon={<User />}
              label="category"
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            />
          </div>
        </Section>

        <Section title="Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              icon={<Mail />}
              label="Student Email"
              type="email"
              value={formData.studentEmail}
              onChange={(e) =>
                setFormData({ ...formData, studentEmail: e.target.value })
              }
            />
            <InputField
              icon={<Phone />}
              label="Student Mobile"
              value={formData.studentMobile}
              onChange={(e) =>
                setFormData({ ...formData, studentMobile: e.target.value })
              }
            />
            <InputField
              icon={<Phone />}
              label="Father's Mobile"
              value={formData.fatherMobile}
              onChange={(e) =>
                setFormData({ ...formData, fatherMobile: e.target.value })
              }
            />
            <InputField
              icon={<Phone />}
              label="Mother's Mobile"
              value={formData.motherMobile}
              onChange={(e) =>
                setFormData({ ...formData, motherMobile: e.target.value })
              }
            />
          </div>
        </Section>

        <Section title="Academic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              icon={<GraduationCapIcon />}
              label="Class"
              options={schoolData?.class || []}
              value={formData.class}
              disabled={true}
            />
            <SelectField
              icon={<Hash />}
              label="Division"
              options={schoolData?.divisions || []}
              value={formData.div}
              onChange={(e) => { setFormData({ ...formData, div: e.target.value }); }}
            />
            <InputField
              icon={<Hash />}
              label="PEN No."
              value={formData.penNo}
              onChange={(e) => setFormData({ ...formData, penNo: e.target.value })}
            />
            <InputField
              icon={<Hash />}
              label="Saral ID"
              value={formData.saralId}
              onChange={(e) => setFormData({ ...formData, saralId: e.target.value })}
            />
            <InputField
              icon={<Hash />}
              label="General Regestration No"
              value={formData.grNo}
              onChange={(e) => setFormData({ ...formData, grNo: e.target.value })}
            />
            <InputField
              icon={<CalendarDays />}
              label="Academic Year"
              type="text"
              pattern="\d{2}-\d{2}"
              value={formData.academicYear}
              disabled={true}
            />
            <div className="relative inline-block group">
              <button
                className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all cursor-pointer"
                onClick={rollBackStudent}
              >
                <span className="text-purple-900">
                  <TriangleAlert className="w-5 h-5" />
                </span>
                Roll Back student
              </button>
              {/* Tooltip */}
              <div
                className=" absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 pointer-events-none transition-opacity group-hover:opacity-100"
              >
                Update the student’s academic year within same class
              </div>
            </div>

          </div>
        </Section>

        <Section title="Additional Details">
          <div className="grid grid-cols-1 gap-4">
            <InputField
              icon={<HomeIcon />}
              label="Address"
              textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
            <InputField
              icon={<CreditCardIcon />}
              label="Aadhar Number"
              value={formData.aadharNo}
              onChange={(e) =>
                setFormData({ ...formData, aadharNo: e.target.value })
              }
            />
            <SelectField
              icon={<Utensils />}
              label="Meal Service"
              options={["Yes", "No"]}
              value={formData.mealService}
              onChange={(e) =>
                setFormData({ ...formData, mealService: e.target.value })
              }
            />
            <InputField
              icon={<Ticket />}
              label="Coupon Code"
              value={formData.couponCode}
              onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
            />
            {/* Custom Row Layout for Bus Stop, Bus Selection, and Discount */}
            <fieldset className="border-2 border-blue-100 rounded-xl p-4 bg-blue-50/30">
              <legend className="text-blue-600 font-medium px-2">Bus Information</legend>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Bus className="w-4 h-4 mr-2 text-gray-500" />
                    Bus Preference
                  </label>
                  <select
                    value={hasBusPreference ? formData.busStop?.toUpperCase() : 'Not Preferred'}
                    onChange={(e) => handleTransportPreference(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Not Preferred">Not Preferred</option>
                    {destinationOptions.map((dest) => (
                      <option key={dest.id} value={dest.name}>
                        {dest.name}
                      </option>
                    ))}
                  </select>
                </div>

                {hasBusPreference && (
                  <>
                    <div className="flex justify-between items-center bg-blue-100 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        Assignment: {' '}
                        <span className="font-semibold uppercase underline">
                          {formData.busStop}
                        </span> via {' '}
                        <span className="font-semibold uppercase underline">
                          {formData.busNoPlate}
                        </span>
                      </p>
                      <button
                        onClick={removeBusPreference}
                        className="flex items-center text-red-600 hover:text-red-700 text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Remove Bus
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        Select Destination
                      </label>
                      <select
                        value={formData.busStop?.toUpperCase()}
                        onChange={(e) => handleBusStopChange(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {destinationOptions.map((dest) => (
                          <option key={dest.id} value={dest.name}>
                            {dest.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <Bus className="w-4 h-4 mr-2 text-gray-500" />
                        Available Buses
                      </label>
                      <select
                        value={selectedBus?.id || ''}
                        onChange={(e) => handleBusSelection(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select bus</option>
                        {busOptions.map((bus) => (
                          <option key={bus.id} value={bus.id}>
                            {bus.busNo} ({bus.numberPlate}) - {bus.driverName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedBus && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700">
                              <IndianRupee className="w-4 h-4 mr-2 text-gray-500" />
                              Bus Fee
                            </label>
                            <input
                              type="number"
                              value={busFee}
                              readOnly
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700">
                              <BadgePercent className="w-4 h-4 mr-2 text-gray-500" />
                              Discount
                            </label>
                            <input
                              type="number"
                              value={busDiscount}
                              onChange={(e) => handleDiscountChange(Number(e.target.value))}
                              min="0"
                              max={busFee}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            <FileTextIcon className="w-4 h-4 mr-2 text-gray-500" />
                            Discount Remark
                          </label>
                          <input
                            type="text"
                            value={busDiscountRemark}
                            onChange={(e) => setBusDiscountRemark(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          />
                        </div>

                        <button
                          onClick={submitTransportDetails}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Update Transport Details
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </fieldset>
            <InputField
              icon={<HeartPulseIcon />}
              label="Blood Group"
              value={formData.bloodGroup}
              onChange={(e) =>
                setFormData({ ...formData, bloodGroup: e.target.value })
              }
            />
          </div>
        </Section>
      </div >
    </div >
  );
}

function Section({ title, children }) {
  return (
    <div className="md:col-span-2">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
        {title}
      </h3>
      {children}
    </div>
  );
}
