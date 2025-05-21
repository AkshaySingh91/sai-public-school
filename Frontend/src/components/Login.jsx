// src/components/Login.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { replace, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import loginImage from "../assets/loginImage.png"; // Adjust the import path as needed

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [schoolCode, setSchoolCode] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDoc = await getDoc(doc(db, "Users", user.uid));
            if (!userDoc.exists()) {
                throw new Error("User profile not found.");
            }

            const userData = userDoc.data();
            if (userData.role === "accountant" && schoolCode !== userData.schoolCode) {
                throw new Error("Invalid school code for this accountant.");
            }

            localStorage.setItem("userRole", userData.role);
            navigate("/", replace);
        } catch (err) {
            setError(err.message);
        }
    };


    return (
        <div className="bg-[#c3cee7] max-h-screen flex items-center justify-center overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-center md:items-start h-screen w-screen ">
                <img
                    alt="Login illustration"
                    className="w-3/5 rounded-lg max-h-screen  self-center mr-[-3rem] object-cover"
                    src={loginImage}
                />

                <div className="bg-[#f9f8f9] rounded-3xl p-8 w-full max-w-md flex flex-col items-center self-center">
                    <h1 className="text-[#2a3e6f] font-extrabold text-3xl mb-8">Log In</h1>
                    {error && <p className="text-red-500 mb-2 text-center">{error}</p>}

                    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            className="bg-[#d7d9e9] text-[#2a3e6f] rounded-xl py-3 px-5 text-lg placeholder-[#2a3e6f] focus:outline-none"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            className="bg-[#d7d9e9] text-[#2a3e6f] rounded-xl py-3 px-5 text-lg placeholder-[#2a3e6f] focus:outline-none"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {/* School Code Input for Accountants */}
                        <div className="mt-2">
                            <input
                                type="text"
                                placeholder="School Code (for Accountants)"
                                value={schoolCode}
                                className="bg-[#d7d9e9] text-[#2a3e6f] rounded-xl py-3 px-5 text-lg placeholder-[#2a3e6f] focus:outline-none w-full"
                                onChange={(e) => setSchoolCode(e.target.value)}
                            />
                        </div>

                        <label className="flex items-center gap-3 text-[#2a3e6f] text-lg">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded-md bg-[#2a3e6f] border-none text-white focus:ring-0"
                            />
                            Remember me
                        </label>

                        <button
                            type="submit"
                            className="bg-[#2a3e6f] text-white font-bold text-lg rounded-full py-3 mt-2 hover:bg-[#1a2d4f] transition-colors"
                        >
                            LOG IN
                        </button>
                    </form>

                    <a href="#" className="text-[#2a3e6f] text-lg mt-6 hover:underline">
                        Forgot password?
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;