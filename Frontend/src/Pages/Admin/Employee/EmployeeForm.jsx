// src/Pages/Admin/Employee/EmployeeForm.jsx
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import MySwal from "sweetalert2";

const EmployeeForm = ({ onEmployeeAdded, onClose }) => {
  const { userData } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState("");
  const [designation, setDesignation] = useState("");
  const [contact, setContact] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await MySwal.fire({
        title: "Confirm Add",
        text: "Are you sure you want to add this employee?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#7c3aed",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, add employee!",
      });

      if (result.isConfirmed) {
        await addDoc(collection(db, "Employees"), {
          firstName,
          lastName,
          middleName: null,
          active: true,
          email: email || "",
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

        await MySwal.fire({
          icon: "success",
          title: "Added!",
          text: "Employee added successfully",
          confirmButtonColor: "#7c3aed",
        });

        // Reset form fields after success
        setFirstName("");
        setLastName("");
        setType("");
        setDesignation("");
        setContact("");
        setGender("");

        onEmployeeAdded && onEmployeeAdded();
        onClose && onClose(); // optional: close form modal if you want
      }
    } catch (err) {
      console.error("Error adding employee:", err);
      await MySwal.fire({
        icon: "error",
        title: "Error",
        text: `Error adding employee: ${err.message}`,
        confirmButtonColor: "#7c3aed",
      });
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 mt-8">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-3xl font-semibold text-gray-900">Add New Employee</h3>
        <button
          onClick={onClose}
          className="text-red-500 hover:text-red-700 transition text-sm font-medium"
          aria-label="Cancel adding employee"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="bg-red-100 text-red-700 p-3 rounded-md mb-6 border border-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            placeholder="First Name *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Last Name *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none placeholder-gray-400"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none"
            required
          >
            <option value="" disabled>
              Select Type *
            </option>
            <option value="Teaching">Teaching</option>
            <option value="Non-Teaching">Non-Teaching</option>
          </select>

          <select
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none"
            required
          >
            <option value="" disabled>
              Select Designation *
            </option>
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
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none placeholder-gray-400"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none placeholder-gray-400"
        />

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none"
        >
          <option value="" disabled>
            Select Gender
          </option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 text-white font-semibold py-4 rounded-lg hover:ring-violet-600 transition disabled:opacity-50"
        >
          {loading ? "Adding Employee..." : "Add Employee"}
        </button>
      </form>
    </div>
  );
};

export default EmployeeForm;
