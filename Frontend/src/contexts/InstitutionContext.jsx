import { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./AuthContext";

const InstitutionContext = createContext();

export function useInstitution() {
    return useContext(InstitutionContext);
}

export function SchoolProvider({ children }) {
    const { userData, role } = useAuth();
    const [school, setSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allInstitutions, setAllInstitutions] = useState([]); // for superadmin

    const saveToLocal = (key, obj) => {
        localStorage.setItem(key, JSON.stringify(obj));
    };
    const loadFromLocal = (key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    };
    const fetchInstitutionData = async () => {
        try {
            console.log(userData)
            setLoading(true);
            setError('');
            // For superadmins, we don't use userData.schoolCode
            if (role === "superadmin") {
                // a) Check localStorage for previously selected institution
                const saved = loadFromLocal("selectedInstitution");
                if (saved) {
                    console.log({saved})
                    setSchool(saved);
                    // Also fetch full list of schools AND colleges for the switcher
                    const schoolSnap = await getDocs(collection(db, "schools"));
                    const collegeSnap = await getDocs(collection(db, "colleges"));
                    const combined = [
                        ...schoolSnap.docs.map((d) => ({ id: d.id, type: "school", ...d.data() })),
                        ...collegeSnap.docs.map((d) => ({ id: d.id, type: "college", ...d.data() })),
                    ];
                    setAllInstitutions(combined);
                    setLoading(false);
                    return;
                }
                // b) No saved → fetch first SCHOOL (if any)
                const qSchool = query(collection(db, "schools"));
                const schoolSnap = await getDocs(qSchool);
                if (!schoolSnap.empty) {
                    const firstSchoolDoc = schoolSnap.docs[0];
                    const instObj = { id: firstSchoolDoc.id, type: "school", ...firstSchoolDoc.data() };
                    setSchool(instObj);
                    saveToLocal("selectedInstitution", instObj);
                } else {
                    // c) No schools exist → fetch first COLLEGE (if any)
                    const colSnap = await getDocs(collection(db, "colleges"));
                    if (!colSnap.empty) {
                        const firstCollegeDoc = colSnap.docs[0];
                        const instObj = { id: firstCollegeDoc.id, type: "college", ...firstCollegeDoc.data() };
                        setSchool(instObj);
                        saveToLocal("selectedInstitution", instObj);
                    } else {
                        throw new Error("No schools or colleges found.");
                    }
                }
                // d) Now fetch ALL schools + colleges for the switcher
                const [schoolsAll, collegesAll] = await Promise.all([
                    getDocs(collection(db, "schools")),
                    getDocs(collection(db, "colleges")),
                ]);
                const listAll = [
                    ...schoolsAll.docs.map((d) => ({ id: d.id, type: "school", ...d.data() })),
                    ...collegesAll.docs.map((d) => ({ id: d.id, type: "college", ...d.data() })),
                ];
                setAllInstitutions(listAll);
                setLoading(false);
                return;
            }
            // 2) NON-SUPERADMIN: read exactly their assigned institution
            //    userData.institutionType is either "school" or "college"
            if (userData.institutionType?.toLowerCase() === "school") {
                const instDoc = await getDoc(doc(db, "schools", userData.institutionId));
                if (instDoc.exists()) {
                    setSchool({ id: instDoc.id, type: "school", ...instDoc.data() });
                } else {
                    throw new Error("Your school was not found.");
                }
            } else if (userData.institutionType?.toLowerCase() === "college") {
                const instDoc = await getDoc(doc(db, "colleges", userData.institutionId));
                if (instDoc.exists()) {
                    setSchool({ id: instDoc.id, type: "college", ...instDoc.data() });
                } else {
                    throw new Error("Your college was not found.");
                }
            } else {
                throw new Error("Invalid institution type on your profile.");
            }
            setLoading(false);
        } catch (error) {
            setError(error.message);
            setSchool(null);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchInstitutionData();
    }, [userData, role]);

    // Allows superadmin to switch to any school or college
    const switchSchool = (newInstObj) => {
        setSchool(newInstObj);
        saveToLocal("selectedInstitution", newInstObj);
    };

    const value = {
        allInstitutions,
        school,
        loading,
        error,
        switchSchool,  // Renamed from setSchool to be more specific
        refresh: fetchInstitutionData
    };
    return (
        <InstitutionContext.Provider value={value}>
            {children}
        </InstitutionContext.Provider>
    );
}