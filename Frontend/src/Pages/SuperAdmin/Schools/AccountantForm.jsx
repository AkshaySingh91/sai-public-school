// src/Pages/SuperAdmin/Schools/AccountantForm.jsx
import React, { useState } from "react";

const AccountantForm = ({ schoolId, schoolCode, onAccountantAdded }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/superadmin/schools/create-accountant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          schoolCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create accountant");
      }

      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      onAccountantAdded && onAccountantAdded();
    } catch (err) {
      console.error("Error creating accountant:", err);
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="border p-4 rounded shadow mt-4">
      <h3 className="text-xl font-semibold mb-2">Add Accountant</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Initial Password *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Adding Accountant..." : "Add Accountant"}
        </button>
      </form>
    </div>
  );
};

export default AccountantForm;
