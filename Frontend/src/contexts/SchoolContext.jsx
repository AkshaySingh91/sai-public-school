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
    const { userData } = useAuth();

    const fetchSchoolData = async () => {
        try {
            setLoading(true);
            setError('');

            if (!userData?.schoolCode) {
                setSchool(null);
                setLoading(false);
                return;
            }

            const schoolsRef = collection(db, "schools");
            const q = query(schoolsRef, where("Code", "==", userData.schoolCode));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                setSchool({
                    id: doc.id,
                    ...doc.data()
                });
            } else {
                setError("School not found");
                setSchool(null);
            }
        } catch (error) {
            setError(error.message);
            setSchool(null);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchSchoolData();
    }, [userData?.schoolCode]); // Re-run when schoolCode changes

    const value = {
        school,
        loading,
        error,
        refresh: () => fetchSchoolData()
    };
    return (
        <SchoolContext.Provider value={value}>
            {children}
        </SchoolContext.Provider>
    );
}