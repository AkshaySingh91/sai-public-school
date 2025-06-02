import { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./AuthContext";

const SchoolContext = createContext();

export function useSchool() {
    return useContext(SchoolContext);
}

export function SchoolProvider({ children }) {
    const [school, setSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { userData, role } = useAuth();
    useEffect(() => {
        const savedSchool = localStorage.getItem('selectedSchool');
        if (savedSchool && role === "superadmin") {
            setSchool(JSON.parse(savedSchool));
            setLoading(false);
        }
    }, [role]);

    const fetchSchoolData = async () => {
        try {
            setLoading(true);
            setError('');
            // For superadmins, we don't use userData.schoolCode
            if (role === "superadmin") {
                // If we already have a school from localStorage, use it
                const savedSchool = localStorage.getItem('selectedSchool');
                if (savedSchool) {
                    setSchool(JSON.parse(savedSchool));
                    setLoading(false);
                    return;
                }
                // Otherwise, fetch the first school
                const schoolsRef = collection(db, "schools");
                const querySnapshot = await getDocs(schoolsRef);
                if (!querySnapshot.empty) {
                    const firstSchoolDoc = querySnapshot.docs[0];
                    const schoolData = {
                        id: firstSchoolDoc.id,
                        ...firstSchoolDoc.data()
                    };
                    // Save to localStorage and state
                    localStorage.setItem('selectedSchool', JSON.stringify(schoolData));
                    setSchool(schoolData);
                }
                else {
                    setError("No schools found");
                    setSchool(null);
                }
            }
            // For regular users
            else if (userData?.schoolCode) {
                const schoolsRef = collection(db, "schools");
                const q = query(schoolsRef, where("Code", "==", userData.schoolCode));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    setSchool({
                        id: doc.id,
                        ...doc.data()
                    });
                }
                else {
                    setError("School not found");
                    setSchool(null);
                }
            }
        } catch (error) {
            setError(error.message);
            setSchool(null);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        // Only fetch if we're not a superadmin or if we don't have a saved school
        if (role !== "superadmin" || !localStorage.getItem('selectedSchool')) {
            fetchSchoolData();
        }
    }, [userData?.schoolCode, role]);
    // This function will be called when switching schools
    const switchSchool = (newSchool) => {
        // Save to localStorage
        localStorage.setItem('selectedSchool', JSON.stringify(newSchool));
        // Update state
        setSchool(newSchool);
    };

    const value = {
        school,
        loading,
        error,
        switchSchool,  // Renamed from setSchool to be more specific
        refresh: fetchSchoolData
    };
    return (
        <SchoolContext.Provider value={value}>
            {children}
        </SchoolContext.Provider>
    );
}