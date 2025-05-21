// src/components/NotFound.jsx
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100/10 via-purple-100/10 to-blue-50/10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 text-center"> 
          <h1 className="text-7xl font-extrabold text-purple-600 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            Sorry, we couldn’t find the page you’re looking for. It might have moved or doesn’t exist.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

// import React, { useState, useEffect } from "react";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { auth, db } from "../config/firebase";
// import { useNavigate } from "react-router-dom";
// import { doc, getDoc } from "firebase/firestore";
// import logimg from "../assets/LoginImage.png";
// export default function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [schoolCode, setSchoolCode] = useState("");
//   const [rememberMe, setRememberMe] = useState(false);
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   useEffect(() => {
//     const savedEmail = localStorage.getItem("rememberEmail");
//     const savedPassword = localStorage.getItem("rememberPassword");
//     if (savedEmail && savedPassword) {
//       setEmail(savedEmail);
//       setPassword(savedPassword);
//       setRememberMe(true);
//     }
//   }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       const userCredential = await signInWithEmailAndPassword(
//         auth,
//         email,
//         password
//       );
//       const user = userCredential.user;
//       const userDoc = await getDoc(doc(db, "Users", user.uid));
//       if (!userDoc.exists()) throw new Error("User profile not found.");

//       const userData = userDoc.data();
//       if (
//         userData.role === "accountant" &&
//         schoolCode !== userData.schoolCode
//       ) {
//         throw new Error("Invalid school code for this accountant.");
//       }

//       if (rememberMe) {
//         localStorage.setItem("rememberEmail", email);
//         localStorage.setItem("rememberPassword", password);
//       } else {
//         localStorage.removeItem("rememberEmail");
//         localStorage.removeItem("rememberPassword");
//       }

//       localStorage.setItem("userRole", userData.role);
//       navigate("/", { replace: true });
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div className="flex h-screen w-screen items-center  bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100">
//       <div className="w-[50%]  h-full  overflow-hidden relative">
//         <img
//           src={logimg}
//           alt="login illustration"
//           className="w-full h-full"
//           style={{ minHeight: "650px" }}
//         />
//       </div>

//       <div className="h-full flex items-center justify-center  rounded-r-3xl px-16 py-20">
//         <div className="w-full max-w-md bg-white p-10 rounded-3xl border   shadow-[0_10px_15px_-3px_rgba(124,58,237,0.6),0_4px_6px_-2px_rgba(59,130,246,0.5)]">
//           <h2 className="text-5xl font-extrabold text-purple-900 text-center mb-12 tracking-tight select-none">
//             Welcome Back!
//           </h2>

//           {error && (
//             <p className="text-red-700 bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 border border-red-300 rounded-md py-3 px-5 mb-8 text-center font-semibold shadow-sm">
//               {error}
//             </p>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-8">
//             <input
//               type="email"
//               placeholder="Email"
//               className="w-full px-6 py-4 rounded-2xl border border-purple-300 bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 text-lg text-purple-900 placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               autoComplete="email"
//             />

//             <input
//               type="password"
//               placeholder="Password"
//               className="w-full px-6 py-4 rounded-2xl border bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 bg-purple-50 text-lg text-purple-900 placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               autoComplete="current-password"
//             />

//             <input
//               type="text"
//               placeholder="School Code (for Accountants)"
//               className="w-full px-6 py-4 rounded-2xl border bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 bg-purple-50 text-lg text-purple-900 placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-600 transition"
//               value={schoolCode}
//               onChange={(e) => setSchoolCode(e.target.value)}
//               autoComplete="off"
//             />

//             <label className="inline-flex items-center text-purple-900 font-medium cursor-pointer select-none">
//               <input
//                 type="checkbox"
//                 className="form-checkbox h-5 w-5 text-purple-600 rounded transition duration-150 ease-in-out mr-3 focus:ring-2 focus:ring-purple-400"
//                 checked={rememberMe}
//                 onChange={() => setRememberMe(!rememberMe)}
//               />
//               Remember me
//             </label>

//             <button
//               type="submit"
//               className="w-full mt-4 bg-purple-700 hover:bg-purple-800 text-white py-4 rounded-3xl font-semibold text-xl transition duration-300 shadow-lg shadow-purple-500/40 focus:outline-none focus:ring-4 focus:ring-purple-500"
//             >
//               Log In
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }


/*
import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
<<<<<<< HEAD
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

*/