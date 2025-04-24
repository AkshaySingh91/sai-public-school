// src/Pages/Admin/Employee/EmployeeForm.jsx
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";

const EmployeeForm = ({ onEmployeeAdded }) => {
  const { userData } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState(""); // Teaching / Non-Teaching
  const [designation, setDesignation] = useState("");
  const [contact, setContact] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Save basic employee details to Firestore.
      await addDoc(collection(db, "Employees"), {
        firstName,
        lastName,
        middleName: null,     // Optional; initially null
        active: true,         // Newly added employee active by default
        email: "",            // Not captured here; can be extended later
        department: null,
        designation: designation || null,
        class: null,
        address: null,
        webAccess: "no",
        div: null,
        schoolCode: userData.schoolCode,
        addharCardNo: null,
        type: type || null,
        contact: contact || null,
        dob: null,
        doj: serverTimestamp(),
        gender: gender || null,
        maritalStatus: null,
      });
      // Clear form fields.
      setFirstName("");
      setLastName("");
      setType("");
      setDesignation("");
      setContact("");
      setGender("");
      onEmployeeAdded && onEmployeeAdded();
    } catch (err) {
      console.error("Error adding employee:", err);
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="border p-4 rounded shadow mt-4">
      <h3 className="text-xl font-semibold mb-2">Add Employee</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="First Name *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Last Name *"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Type *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Type</option>
            <option value="Teaching">Teaching</option>
            <option value="Non-Teaching">Non-Teaching</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Designation *</label>
          <select
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Designation</option>
            <option value="Teacher">Teacher</option>
            <option value="Security">Security</option>
            <option value="Manager">Manager</option>
            <option value="Sports Teacher">Sports Teacher</option>
            <option value="Accountant">Accountant</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition"
        >
          {loading ? "Adding Employee..." : "Add Employee"}
        </button>
      </form>
    </div>
  );
};

export default EmployeeForm;
