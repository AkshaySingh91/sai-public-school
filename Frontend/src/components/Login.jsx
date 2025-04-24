// src/components/Login.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { replace, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
 
const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // For accountants, they must supply the school code.
    const [schoolCode, setSchoolCode] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Now fetch user details from Firestore "users" collection.
            // Assume that each user document has: role, schoolCode, and other info.
            const userDoc = await getDoc(doc(db, "Users", user.uid));
            if (!userDoc.exists()) {
                throw new Error("User profile not found.");
            }
            const userData = userDoc.data();
            console.log(userData)
            // If the role is accountant, verify the school code.
            if (userData.role === "accountant") {
                if (schoolCode !== userData.schoolCode) {
                    throw new Error("Invalid school code for this accountant.");
                }
            }
            // Save the role in localStorage (or use a proper state management solution)
            localStorage.setItem("userRole", userData.role);
            navigate("/", replace);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="max-w-md mx-auto my-20 p-6 border rounded shadow">
            <h1 className="text-xl font-bold mb-4 text-center">Login</h1>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    className="w-full p-2 border rounded"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    className="w-full p-2 border rounded"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {/* Show School Code input only if the user indicates they are an accountant */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">School Code (for Accountants)</label>
                    <input
                        type="text"
                        placeholder="Enter your school code"
                        value={schoolCode}
                        className="w-full p-2 border rounded mt-1"
                        onChange={(e) => setSchoolCode(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
                >
                    Login
                </button>
            </form>
        </div>
    );
};

export default Login;
