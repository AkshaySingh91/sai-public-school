// src/Pages/SuperAdmin/Schools/SchoolForm.jsx
import React, { useState } from "react";
import { db, storage } from "../../../config/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const SchoolForm = ({ onSchoolAdded }) => {
  const [schoolName, setSchoolName] = useState("");
  const [Code, setCode] = useState("");
  const [location, setLocation] = useState({
    state: "Maharastra",
    taluka: "",
    district: ""
  });
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper to generate a random school code if needed.
  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Use provided code or generate one.
      const schoolCode = Code.trim() !== "" ? Code : generateRandomCode();
      let logoURL = "";
      if (logoFile) {
        const storageRef = ref(storage, `schoolLogos/${schoolCode}_${logoFile.name}`);
        const uploadResult = await uploadBytes(storageRef, logoFile);
        logoURL = await getDownloadURL(uploadResult.ref);
      }
      // Create a new school document in Firestore.
      await addDoc(collection(db, "schools"), {
        schoolName,
        Code: schoolCode,
        logoURL,
        location,
        createdAt: new Date().toISOString(),
        // Empty arrays for students
        students: [],
        // Array of account objects (can be updated later)
        accounts: [],
        // Predefined payment modes and fee types.
        PaymentMode: ["Cash", "Online", "GPay", "PhonePay", "Cheque"],
        feeType: ["AdmisionFee", "TutionFee", "BusFee"],
        receiptCount: 0
      });
      setSchoolName("");
      setCode("");
      setLocation({
        state: "",
        taluka: "",
        district: ""
      });
      setLogoFile(null);
      onSchoolAdded && onSchoolAdded();
    } catch (err) {
      console.error("Error adding school:", err);
      setError("Error adding school. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="border p-4 rounded shadow mb-6">
      <h2 className="text-2xl font-semibold mb-2">Add School</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="School Name *"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="School Code *"
          value={Code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <h2>School location</h2>
        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
        <input
          type="text"
          value={location?.state || ''}
          onChange={(e) => setLocation({ ...location, state: e.target.value })}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          required
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
        <input
          type="text"
          value={location?.district || ''}
          onChange={(e) => setLocation({ ...location, district: e.target.value })}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          required
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Taluka</label>
        <input
          type="text"
          value={location?.taluka || ''}
          onChange={(e) => setLocation({ ...location, taluka: e.target.value })}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Upload Logo (optional)
          </label>
          <input
            disabled={true}
            type="file"
            onChange={(e) => setLogoFile(e.target.files[0])}
            className="w-full p-2 border rounded mt-1"
            accept="image/*"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition"
        >
          {loading ? "Adding School..." : "Add School"}
        </button>
      </form>
    </div>
  );
};

export default SchoolForm;
