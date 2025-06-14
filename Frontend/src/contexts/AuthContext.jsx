import { createContext, useContext, useState, useEffect } from "react";
import LoadingScreen from "../components/Loader";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";


const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);

  async function signup(email, password, role = "user") {
    try {
      setError("");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Create user document in Firestore with given role.
      await setDoc(doc(db, "Users", userCredential.user.uid), {
        email,
        role,
        createdAt: new Date().toISOString()
      });
      return userCredential;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      setError("");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user role from Firestore (document id must match the auth UID)
      const userDoc = await getDoc(doc(db, "Users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRole(data.role);  // update context role state
      }
      return userCredential;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  // we will store the user data in the context & based on accountant SchoolCode we will create context for school 
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // fetch the user document to get role data
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          /*
           * Expect data to contain:
           *   - role: "superadmin" | "accountant" | "teacher" | …
           *   - institutionId: "<instDocID>" or null
           *   - institutionType: "school" | "college" or null
           *   - privilege: "read" | "write" | "both"
           *   - name, email, etc.
           */
          setUserData({
            ...data,
            uid: user.uid,
            email: user.email,
            name: data.name || "",
            role: data.role || null,
            institutionId: data.institutionId || null,
            institutionType: data.institutionType || null,
            privilege: data.privilege || null,
          });
          setRole(data.role || null);
        }
      } else {
        setRole(null);
      }
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    role,
    userData,
    error,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}
