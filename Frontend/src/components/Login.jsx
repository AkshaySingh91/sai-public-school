import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import logimg from "../assets/LoginImage.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    const savedPassword = localStorage.getItem("rememberPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "Users", user.uid));
      if (!userDoc.exists()) throw new Error("User profile not found.");

      const userData = userDoc.data();
      if (
        userData.role === "accountant" &&
        schoolCode !== userData.schoolCode
      ) {
        throw new Error("Invalid school code for this accountant.");
      }

      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
        localStorage.setItem("rememberPassword", password);
      } else {
        localStorage.removeItem("rememberEmail");
        localStorage.removeItem("rememberPassword");
      }

      localStorage.setItem("userRole", userData.role);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center  bg-[#c3cee7]">
      <div className="w-[50%]  h-full  overflow-hidden relative">
        <img
          src={logimg}
          alt="login illustration"
          className="w-full h-full"
          style={{ minHeight: "650px" }}
        />
      </div>

      <div className="h-full flex items-center justify-center  rounded-r-3xl px-16 py-20">
        <div className="w-full max-w-md bg-[#f9f8f9] p-10 rounded-3xl shadow-lg">
          <h2 className="text-5xl font-extrabold text-purple-900 text-center mb-12 tracking-tight select-none">
            Welcome Back!
          </h2>

          {error && (
            <p className="text-red-700 bg-[#c3cee7] border border-red-300 rounded-md py-3 px-5 mb-8 text-center font-semibold shadow-sm">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-6 py-4 rounded-2xl   bg-[#d7d9e9] text-[#2a3e6f] 
placeholder-[#2a3e6f] focus:outline-none text-lg  focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full px-6 py-4 rounded-2xl   bg-[#d7d9e9] text-[#2a3e6f] 
placeholder-[#2a3e6f] focus:outline-none text-lg focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <input
              type="text"
              placeholder="School Code (for Accountants)"
              className="w-full px-6 py-4    bg-[#d7d9e9] text-[#2a3e6f] rounded-xl
placeholder-[#2a3e6f] focus:outline-none text-lg focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              autoComplete="off"
            />

            <label className="inline-flex items-center text-purple-900 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 bg-[#d7d9e9] text-[#2a3e6f] rounded 
placeholder-[#2a3e6f] focus:outline-none  transition duration-150 ease-in-out mr-3 focus:ring-2 focus:ring-purple-400 "
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              Remember me
            </label>

            <button
              type="submit"
              className="w-full mt-4 bg-purple-700 hover:bg-purple-800 text-white py-4 rounded-3xl font-semibold text-xl transition duration-300 shadow-lg shadow-purple-500/40 focus:outline-none focus:ring-4 focus:ring-purple-500"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
