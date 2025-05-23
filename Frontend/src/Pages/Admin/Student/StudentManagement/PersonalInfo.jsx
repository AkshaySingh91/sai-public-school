import { useEffect, useState } from "react";
import Swal from "sweetalert2"
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
  MapPin,
  IndianRupee,
  BadgePercent,
  CheckCircle
} from "lucide-react";
import { InputField } from "../InputField";
import { SelectField } from "../SelectField";
import { db } from "../../../../config/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
export default function PersonalInfo({
  formData,
  setFormData,
  studentId,
  handleFeeUpdate, schoolData,
}) {
  // State variables
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [busOptions, setBusOptions] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [transportDiscount, setTransportDiscount] = useState(0);
  const [transportFee, setTransportFee] = useState(0);
  const [showTransportSection, setShowTransportSection] = useState(
    formData.busStop && formData.busStop !== "Not Preferred"
  );

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
        console.log("destinationOptions", destinationOptions);
      } catch (err) {
        console.error("Error fetching destinations:", err);
      }
    };
    fetchDestinations();
  }, []);
  // Handle transport preference change
  const handleTransportPreference = async (value) => {
    const isTransportPreferred = value !== "Not Preferred";
    setShowTransportSection(isTransportPreferred);

    if (!isTransportPreferred) {
      await updateStudentTransport({
        busStop: "",
        busNoPlate: "",
        transportFee: 0,
        transportDiscount: 0
      });
    }
  };
  // Handle bus stop selection
  const handleBusStopChange = async (e) => {
    const selectedName = e.target.value;
    setFormData({ ...formData, busStop: selectedName });

    try {
      // Reset related fields
      setSelectedBus(null);
      setTransportFee(0);
      setTransportDiscount(0);

      // Fetch buses for selected destination
      const busSnapshot = await getDocs(collection(db, "allBuses"));
      const buses = busSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(bus =>
          bus.destinations?.some(dest => dest.name === selectedName)
        );

      setBusOptions(buses);

      // Update student document
      if (studentId) {
        await updateDoc(doc(db, "students", studentId.id), {
          busStop: selectedName,
          busNoPlate: ""
        });
      }
    } catch (err) {
      console.error("Error updating bus stop:", err);
    }
  };

  // Handle bus selection
  const handleBusSelection = async (e) => {
    const busId = e.target.value;
    const bus = busOptions.find(b => b.id === busId);
    setSelectedBus(bus);

    if (bus && formData.busStop) {
      const destination = bus.destinations.find(d => d.name === formData.busStop);
      if (destination) {
        const fee = destination.fee || 0;
        setTransportFee(fee);

        // Update fees immediately
        const updatedFees = {
          ...formData.allFee,
          transportFee: fee - transportDiscount,
          transportFeeDiscount: transportDiscount
        };

        setFormData({ ...formData, allFee: updatedFees });

        // Update student document
        await updateStudentTransport({
          busNoPlate: bus.numberPlate,
          transportFee: fee,
          transportDiscount
        });
      }
    }
  };
  // Update transport details in Firestore
  const updateStudentTransport = async (data) => {
    if (!studentId) return;

    try {
      const studentRef = doc(db, "students", studentId.id);
      await updateDoc(studentRef, {
        busStop: formData.busStop,
        busNoPlate: data.busNoPlate || "",
        allFee: {
          ...formData.allFee,
          transportFee: data.transportFee - data.transportDiscount,
          transportFeeDiscount: data.transportDiscount
        }
      });
    } catch (err) {
      console.error("Error updating transport details:", err);
    }
  };

  // Handle discount change
  const handleDiscountChange = (value) => {
    const discount = Math.min(Math.max(0, value), transportFee);
    setTransportDiscount(discount);

    const updatedFees = {
      ...formData.allFee,
      transportFee: transportFee - discount,
      transportFeeDiscount: discount
    };

    setFormData({ ...formData, allFee: updatedFees });
  };

  // Submit transport details
  const submitTransportDetails = async () => {
    if (!selectedBus || !formData.busStop) return;

    try {
      await updateStudentTransport({
        busNoPlate: selectedBus.numberPlate,
        transportFee,
        transportDiscount
      });

      Swal.fire({
        title: 'Success!',
        text: 'Transport details updated successfully',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
    } catch (err) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update transport details',
        icon: 'error',
        confirmButtonColor: '#2563eb'
      });
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
              label="Personal Education No"
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
              <legend className="text-blue-600 font-medium px-2">Transport Information</legend>
              <div className="space-y-4">
                <SelectField
                  icon={<Bus />}
                  label="Transport Preference"
                  options={['Not Preferred', ...destinationOptions.map(d => d.name)]}
                  value={formData.busStop || 'Not Preferred'}
                  onChange={(e) => {
                    handleTransportPreference(e.target.value);
                    handleBusStopChange(e);
                  }}
                />

                {showTransportSection && (
                  <div className="grid gap-4">
                    {/* Current Transport Display */}
                    {formData.busNoPlate && (
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">
                          Current Assignment:&nbsp;
                          <span className="underline font-semibold">{formData.busStop}</span> via <span className="underline font-semibold">{formData.busNoPlate}</span>
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectField
                        icon={<MapPin />}
                        label="Select Destination"
                        options={destinationOptions
                          .filter(d => d.name !== "Not Preferred")
                          .map(d => ({
                            value: d.name,
                            label: d.name,
                            // Show current selection first
                            selected: d.name === formData.busStop
                          }))}
                        value={formData.busStop}
                        onChange={handleBusStopChange}
                      />

                      <SelectField
                        icon={<Bus />}
                        label="Available Buses"
                        options={busOptions.map(bus => ({
                          value: bus.id,
                          label: `${bus.busNo} (${bus.numberPlate}) - ${bus.driverName}`,
                          // Preselect if matches student's current bus
                          selected: bus.numberPlate === formData.busNoPlate
                        }))}
                        value={selectedBus?.id || ""}
                        onChange={handleBusSelection}
                      />
                    </div>

                    {selectedBus && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                          icon={<IndianRupee />}
                          label="Transport Fee"
                          value={transportFee}
                          readOnly
                          className="bg-gray-50"
                        />

                        <div className="space-y-2">
                          <InputField
                            icon={<BadgePercent />}
                            label="Apply Discount"
                            type="number"
                            value={transportDiscount}
                            onChange={(e) => handleDiscountChange(Number(e.target.value))}
                            min="0"
                            max={transportFee}
                          />
                          <button
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            onClick={submitTransportDetails}
                          >
                            <CheckCircle className="w-5 h-5" />
                            Update Transport Details
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
      </div>
    </div>
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
