// src/components/Login.jsx
// import React, { useState } from "react";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { auth, db } from "../config/firebase";
// import { replace, useNavigate } from "react-router-dom";
// import { doc, getDoc } from "firebase/firestore";

// const Login = () => {
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     // For accountants, they must supply the school code.
//     const [schoolCode, setSchoolCode] = useState("");
//     const [error, setError] = useState("");
//     const navigate = useNavigate();
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//             const userCredential = await signInWithEmailAndPassword(auth, email, password);
//             const user = userCredential.user;
//             // Now fetch user details from Firestore "users" collection.
//             // Assume that each user document has: role, schoolCode, and other info.
//             const userDoc = await getDoc(doc(db, "Users", user.uid));
//             if (!userDoc.exists()) {
//                 throw new Error("User profile not found.");
//             }
//             const userData = userDoc.data();
//             console.log(userData)
//             // If the role is accountant, verify the school code.
//             if (userData.role === "accountant") {
//                 if (schoolCode !== userData.schoolCode) {
//                     throw new Error("Invalid school code for this accountant.");
//                 }
//             }
//             // Save the role in localStorage (or use a proper state management solution)
//             localStorage.setItem("userRole", userData.role);
//             navigate("/", replace);
//         } catch (err) {
//             setError(err.message);
//         }
//     };

//     return (
//         <div className="max-w-md mx-auto my-20 p-6 border rounded shadow">
//             <h1 className="text-xl font-bold mb-4 text-center">Login</h1>
//             {error && <p className="text-red-500 mb-2">{error}</p>}
//             <form onSubmit={handleSubmit} className="space-y-4">
//                 <input
//                     type="email"
//                     placeholder="Email"
//                     value={email}
//                     className="w-full p-2 border rounded"
//                     onChange={(e) => setEmail(e.target.value)}
//                     required
//                 />
//                 <input
//                     type="password"
//                     placeholder="Password"
//                     value={password}
//                     className="w-full p-2 border rounded"
//                     onChange={(e) => setPassword(e.target.value)}
//                     required
//                 />
//                 {/* Show School Code input only if the user indicates they are an accountant */}
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">School Code (for Accountants)</label>
//                     <input
//                         type="text"
//                         placeholder="Enter your school code"
//                         value={schoolCode}
//                         className="w-full p-2 border rounded mt-1"
//                         onChange={(e) => setSchoolCode(e.target.value)}
//                     />
//                 </div>
//                 <button
//                     type="submit"
//                     className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
//                 >
//                     Login
//                 </button>
//             </form>
//         </div>
//     );
// };

// export default Login;

// import React, { useState } from "react";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { auth, db } from "../config/firebase";
// import { useNavigate } from "react-router-dom";
// import { doc, getDoc } from "firebase/firestore";
// import leno from "../assets/leno.jpg";

// export default function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [schoolCode, setSchoolCode] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;
//       const userDoc = await getDoc(doc(db, "Users", user.uid));
//       if (!userDoc.exists()) {
//         throw new Error("User profile not found.");
//       }
//       const userData = userDoc.data();

//       // For accountants, check schoolCode match
//       if (userData.role === "accountant") {
//         if (schoolCode !== userData.schoolCode) {
//           throw new Error("Invalid school code for this accountant.");
//         }
//       }

//       localStorage.setItem("userRole", userData.role);
//       navigate("/", { replace: true });
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div className="flex h-screen w-screen">
//       {/* Left side - Illustration */}
//       <div className="w-1/2 h-full relative rounded-l-3xl overflow-hidden">
//         <img src={leno} alt="login" className="w-full h-full" />
//       </div>

//       {/* Right side - Login Form */}
//       <div className="w-1/2 h-full flex items-center justify-center bg-[#F8E4FF] rounded-r-3xl">
//         <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-lg">
//           <h2 className="text-4xl font-bold text-purple-800 text-center mb-6">
//             Welcome Back!
//           </h2>
//           {error && (
//             <p className="text-red-600 text-center mb-4 font-semibold">{error}</p>
//           )}
//           <form onSubmit={handleSubmit} className="space-y-5">
//             {/* Use email input instead of username */}
//             <input
//               type="email"
//               placeholder="Email"
//               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//             <input
//               type="password"
//               placeholder="Password"
//               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//             <input
//               type="text"
//               placeholder="School Code (for Accountants)"
//               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
//               value={schoolCode}
//               onChange={(e) => setSchoolCode(e.target.value)}
//             />
//             <div className="flex items-center justify-between text-sm">
//               <label className="flex items-center text-gray-700">
//                 <input type="checkbox" className="mr-2" />
//                 Remember me
//               </label>
//               <span className="text-purple-700 hover:underline cursor-pointer">
//                 Forgot password?
//               </span>
//             </div>
//             <button
//               type="submit"
//               className="w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded-lg font-semibold text-lg transition duration-200"
//             >
//               Log In
//             </button>
//           </form>
//           <p className="text-center text-purple-800 mt-6">
//             Don't have an account?{" "}
//             <span className="font-semibold cursor-pointer hover:underline">
//               Sign up
//             </span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useState } from "react";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { auth, db } from "../config/firebase";
// import { useNavigate } from "react-router-dom";
// import { doc, getDoc } from "firebase/firestore";
// import leno from "../assets/leno.jpg";

// export default function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [schoolCode, setSchoolCode] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;
//       const userDoc = await getDoc(doc(db, "Users", user.uid));
//       if (!userDoc.exists()) {
//         throw new Error("User profile not found.");
//       }
//       const userData = userDoc.data();

//       if (userData.role === "accountant") {
//         if (schoolCode !== userData.schoolCode) {
//           throw new Error("Invalid school code for this accountant.");
//         }
//       }

//       localStorage.setItem("userRole", userData.role);
//       navigate("/", { replace: true });
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div className="flex h-screen w-screen bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100">
//       {/* Left side - Illustration */}
//       <div className="w-1/2 h-full relative rounded-l-3xl overflow-hidden ">
//         <img src={leno} alt="login" className="w-full h-full" />
//       </div>

//       {/* Right side - Login Form */}
//       <div className="w-1/2 h-full flex items-center justify-start bg-[#F8E4FF] rounded-r-3xl pl-20">
//         <div className="w-[450px] h-[600px] bg-white p-12 rounded-3xl shadow-2xl flex flex-col justify-center">
//           <h2 className="text-5xl font-extrabold text-purple-900 text-center mb-8 tracking-wide">
//             Welcome Back!
//           </h2>
//           {error && (
//             <p className="text-red-600 text-center mb-6 font-semibold">{error}</p>
//           )}
//           <form onSubmit={handleSubmit} className="space-y-7">
//             <input
//               type="email"
//               placeholder="Email"
//               className="w-full px-5 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-400 bg-gray-50 text-lg"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//             <input
//               type="password"
//               placeholder="Password"
//               className="w-full px-5 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-400 bg-gray-50 text-lg"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//             <input
//               type="text"
//               placeholder="School Code (for Accountants)"
//               className="w-full px-5 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-400 bg-gray-50 text-lg"
//               value={schoolCode}
//               onChange={(e) => setSchoolCode(e.target.value)}
//             />
//             <div className="flex items-center justify-between text-sm text-gray-700">
//               <label className="flex items-center">
//                 <input type="checkbox" className="mr-3 w-5 h-5 accent-purple-600" />
//                 Remember me
//               </label>

//             </div>
//             <button
//               type="submit"
//               className="w-full bg-purple-700 hover:bg-purple-800 text-white py-4 rounded-xl font-semibold text-xl transition duration-300 shadow-md"
//             >
//               Log In
//             </button>
//           </form>

//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import logimg from "../assets/logimg.png";
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
    <div className="flex h-screen w-screen items-center  bg-[#F8E4FF]">
      <div className="w-[50%]  h-full bg-green-600  overflow-hidden relative">
        <img
          src={logimg}
          alt="login illustration"
          className="w-full h-full"
          style={{ minHeight: "650px" }}
        />
      </div>

      <div className="h-full flex items-center justify-center bg-[#F8E4FF] rounded-r-3xl px-16 py-20">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl border border-purple-300 shadow-[0_10px_15px_-3px_rgba(124,58,237,0.6),0_4px_6px_-2px_rgba(59,130,246,0.5)]">
          <h2 className="text-5xl font-extrabold text-purple-900 text-center mb-12 tracking-tight select-none">
            Welcome Back!
          </h2>

          {error && (
            <p className="text-red-700 bg-red-100 border border-red-300 rounded-md py-3 px-5 mb-8 text-center font-semibold shadow-sm">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-6 py-4 rounded-2xl border border-purple-300 bg-purple-50 text-lg text-purple-900 placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full px-6 py-4 rounded-2xl border border-purple-300 bg-purple-50 text-lg text-purple-900 placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <input
              type="text"
              placeholder="School Code (for Accountants)"
              className="w-full px-6 py-4 rounded-2xl border border-purple-300 bg-purple-50 text-lg text-purple-900 placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              autoComplete="off"
            />

            <label className="inline-flex items-center text-purple-900 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-purple-600 rounded transition duration-150 ease-in-out mr-3 focus:ring-2 focus:ring-purple-400"
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
