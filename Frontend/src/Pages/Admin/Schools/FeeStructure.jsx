// src/Pages/Admin/Schools/FeeStructure.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useRef } from "react";

const MySwal = withReactContent(Swal);

export default function FeeStructure() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolSchema, setSchoolSchema] = useState(null);
  const [structures, setStructures] = useState([]);
  const [newYear, setNewYear] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const schoolQ = query(
          collection(db, "schools"),
          where("Code", "==", userData.schoolCode)
        );
        const schoolSnap = await getDocs(schoolQ);

        if (schoolSnap.empty) throw new Error("School not found");
        const schoolData = schoolSnap.docs[0].data();

        setSchoolSchema({
          studentType: schoolData.studentsType || [],
          feeType: schoolData.feeTypes || [],
        });

        const fsRef = doc(db, "feeStructures", userData.schoolCode);
        const fsSnap = await getDoc(fsRef);

        if (fsSnap.exists()) {
          setStructures(fsSnap.data().structures || []);
        } else {
          await setDoc(fsRef, { structures: [] });
          setStructures([]);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData.schoolCode]);

  const confirmAction = async (title, text) => {
    return MySwal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#7e22ce",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Confirm",
      cancelButtonText: "Cancel",
    });
  };

  const addYear = async () => {
    if (!/^\d{2}-\d{2}$/.test(newYear)) {
      setError("Year must be in format YY-YY");
      return;
    }
    if (structures.some((s) => s.year === newYear)) {
      setError("That year already exists");
      return;
    }

    const newStructure = {
      year: newYear,
      classes: [],
    };

    setStructures((prev) => [...prev, newStructure]);
    setNewYear("");
    setError("");
  };

  const deleteYear = async (year) => {
    const result = await confirmAction(
      "Delete Academic Year?",
      `Are you sure you want to delete ${year}?`
    );
    if (result.isConfirmed) {
      setStructures((prev) => prev.filter((s) => s.year !== year));
    }
  };

  const addClass = (year, className) => {
    setStructures((prev) =>
      prev.map((s) =>
        s.year === year
          ? {
              ...s,
              classes: [...s.classes, { name: className, studentType: [] }],
            }
          : s
      )
    );
  };

  const deleteClass = async (year, className) => {
    const result = await confirmAction(
      "Delete Class?",
      `Delete ${className} from ${year}?`
    );
    if (result.isConfirmed) {
      setStructures((prev) =>
        prev.map((s) =>
          s.year === year
            ? { ...s, classes: s.classes.filter((c) => c.name !== className) }
            : s
        )
      );
    }
  };

  const addStudentType = (year, className, stName, feeStructure) => {
    const validatedFees = Object.fromEntries(
      Object.entries(feeStructure).map(([key, value]) => [
        key,
        Number(value) || 0,
      ])
    );

    setStructures((prev) =>
      prev.map((s) => {
        if (s.year !== year) return s;
        return {
          ...s,
          classes: s.classes.map((c) => {
            if (c.name !== className) return c;
            const existing = c.studentType.find((st) => st.name === stName);
            return {
              ...c,
              studentType: existing
                ? c.studentType.map((st) =>
                    st.name === stName
                      ? { ...st, feeStructure: validatedFees }
                      : st
                  )
                : [
                    ...c.studentType,
                    { name: stName, feeStructure: validatedFees },
                  ],
            };
          }),
        };
      })
    );
  };

  const deleteStudentType = async (year, className, stName) => {
    const result = await confirmAction(
      "Delete Student Type?",
      `Delete ${stName} from ${className}?`
    );
    if (result.isConfirmed) {
      setStructures((prev) =>
        prev.map((s) => ({
          ...s,
          classes: s.classes.map((c) => ({
            ...c,
            studentType: c.studentType.filter((st) => st.name !== stName),
          })),
        }))
      );
    }
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      const fsRef = doc(db, "feeStructures", userData.schoolCode);
      const schoolsRef = collection(db, "schools");
      const q = query(schoolsRef, where("Code", "==", userData.schoolCode));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error("School not found");
      const schoolDoc = querySnapshot.docs[0];

      console.log({ structures });
      const allClasses = [];
      const sortedStructures = [...structures].sort((a, b) => {
        // Extract starting year from academic year format "YY-YY"
        const getStartYear = (year) => {
          const [start] = year?.split("-") || ["00"];
          return parseInt(start) || 0;
        };

        return getStartYear(b.year) - getStartYear(a.year);
      })[0];
      sortedStructures.classes.map((c) => {
        allClasses.push(c.name);
      });
      // whenever we add new class we will update in school.class
      await updateDoc(doc(db, "schools", schoolDoc.id), {
        class: allClasses,
      });
      // updating school feestructure
      await setDoc(fsRef, { structures }, { merge: true });
      MySwal.fire({
        title: "Success!",
        text: "Fee structure saved successfully",
        icon: "success",
        confirmButtonColor: "#7e22ce",
      });
    } catch (err) {
      MySwal.fire({
        title: "Error!",
        text: err.message,
        icon: "error",
        confirmButtonColor: "#7e22ce",
      });
    }
    setLoading(false);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    // <div className="p-6 max-w-7xl mx-auto space-y-8">
    //   <header className="space-y-4">
    //     <h1 className="text-4xl font-bold text-purple-700">
    //       Fee Structure Management
    //     </h1>

    //     <div className="flex flex-wrap gap-4 items-center">
    //       <div className="flex-1 max-w-xs">
    //         <input
    //           type="text"
    //           placeholder="Academic Year (e.g. 25-26)"
    //           value={newYear}
    //           onChange={(e) => setNewYear(e.target.value)}
    //           className="w-full p-3 border-2 border-purple-100 rounded-lg focus:outline-none focus:border-purple-500"
    //         />
    //       </div>
    //       <button
    //         onClick={addYear}
    //         className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
    //       >
    //         Add Academic Year
    //       </button>
    //       <button
    //         onClick={saveAll}
    //         className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
    //       >
    //         Save All Changes
    //       </button>
    //     </div>
    //   </header>

    //   <div className="space-y-8">
    //     {structures.map((yearStruct) => (
    //       <YearSection
    //         key={yearStruct.year}
    //         yearStruct={yearStruct}
    //         schoolSchema={schoolSchema}
    //         onDeleteYear={deleteYear}
    //         onAddClass={addClass}
    //         onDeleteClass={deleteClass}
    //         onAddStudentType={addStudentType}
    //         onDeleteStudentType={deleteStudentType}
    //       />
    //     ))}
    //   </div>
    // </div>
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-700 text-center sm:text-left">
          Fee Structure Management
        </h1>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-stretch sm:items-center">
          <div className="w-full sm:flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Academic Year (e.g. 25-26)"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="w-full p-3 border-2 border-purple-100 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={addYear}
            className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Add Academic Year
          </button>

          <button
            onClick={saveAll}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Save All Changes
          </button>
        </div>
      </header>

      <div className="space-y-8">
        {structures.map((yearStruct) => (
          <YearSection
            key={yearStruct.year}
            yearStruct={yearStruct}
            schoolSchema={schoolSchema}
            onDeleteYear={deleteYear}
            onAddClass={addClass}
            onDeleteClass={deleteClass}
            onAddStudentType={addStudentType}
            onDeleteStudentType={deleteStudentType}
          />
        ))}
      </div>
    </div>
  );
}

const YearSection = ({
  yearStruct,
  schoolSchema,
  onDeleteYear,
  onAddClass,
  onDeleteClass,
  onAddStudentType,
  onDeleteStudentType,
}) => {
  const containerRef = useRef(null);
  const prevClassesLength = useRef(yearStruct.classes.length);

  useEffect(() => {
    if (yearStruct.classes.length > prevClassesLength.current) {
      const lastClassElement = containerRef.current?.lastElementChild;
      if (lastClassElement) {
        lastClassElement.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
    prevClassesLength.current = yearStruct.classes.length;
  }, [yearStruct.classes.length]);

  return (
    // <section className="border-2 border-purple-100 rounded-xl bg-white shadow-lg">
    //   <div className="p-6 border-b border-purple-100 flex justify-between items-center bg-purple-50 rounded-t-xl">
    //     <h2 className="text-2xl font-bold text-purple-800">
    //       {yearStruct.year}
    //     </h2>
    //     <button
    //       onClick={() => onDeleteYear(yearStruct.year)}
    //       className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
    //     >
    //       Delete Year
    //     </button>
    //   </div>

    //   <div className="p-6 space-y-6" ref={containerRef}>
    //     <AddClassForm year={yearStruct.year} onAdd={onAddClass} />
    //     {yearStruct.classes.map((cls) => (
    //       <div
    //         key={cls.name}
    //         className="border border-purple-50 rounded-lg bg-white p-6 shadow-sm"
    //       >
    //         <div className="flex justify-between items-center mb-4">
    //           <h3 className="text-xl font-semibold text-purple-700">
    //             {cls.name}
    //           </h3>
    //           <button
    //             onClick={() => onDeleteClass(yearStruct.year, cls.name)}
    //             className="text-red-500 hover:text-red-700"
    //           >
    //             Delete Class
    //           </button>
    //         </div>

    //         <AddStudentTypeForm
    //           year={yearStruct.year}
    //           className={cls.name}
    //           studentTypes={schoolSchema.studentType}
    //           feeTypes={schoolSchema.feeType}
    //           onAdd={onAddStudentType}
    //         />

    //         {cls.studentType.length > 0 && (
    //           <div className="overflow-x-auto rounded-lg border border-purple-50 mt-4">
    //             <table className="min-w-full divide-y divide-purple-100">
    //               <thead className="bg-purple-50">
    //                 <tr>
    //                   <th className="px-4 py-3 text-left text-purple-700 font-semibold">
    //                     Student Type
    //                   </th>
    //                   {schoolSchema.feeType.map((ft) => (
    //                     <th
    //                       key={ft}
    //                       className="px-4 py-3 text-left text-purple-700 font-semibold"
    //                     >
    //                       {ft}
    //                     </th>
    //                   ))}
    //                   <th className="px-4 py-3 text-purple-700 font-semibold">
    //                     Actions
    //                   </th>
    //                 </tr>
    //               </thead>
    //               <tbody className="divide-y divide-purple-100">
    //                 {cls.studentType.map((st) => (
    //                   <tr
    //                     key={st.name}
    //                     className="hover:bg-purple-50 transition-colors"
    //                   >
    //                     <td className="px-4 py-3 font-medium">{st.name}</td>
    //                     {schoolSchema.feeType.map((ft) => (
    //                       <td key={ft} className="px-4 py-3">
    //                         ₹{st.feeStructure[ft]?.toLocaleString() || 0}
    //                       </td>
    //                     ))}
    //                     <td className="px-4 py-3 text-center">
    //                       <button
    //                         onClick={() =>
    //                           onDeleteStudentType(
    //                             yearStruct.year,
    //                             cls.name,
    //                             st.name
    //                           )
    //                         }
    //                         className="text-red-500 hover:text-red-700 px-2"
    //                       >
    //                         Delete
    //                       </button>
    //                     </td>
    //                   </tr>
    //                 ))}
    //               </tbody>
    //             </table>
    //           </div>
    //         )}
    //       </div>
    //     ))}
    //   </div>
    // </section>
    <section className="border-2 border-purple-100 rounded-xl bg-white shadow-lg">
      <div className="p-4 sm:p-6 border-b border-purple-100 flex flex-col sm:flex-row justify-between gap-4 sm:items-center bg-purple-50 rounded-t-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-purple-800">
          {yearStruct.year}
        </h2>
        <button
          onClick={() => onDeleteYear(yearStruct.year)}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm sm:text-base"
        >
          Delete Year
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6" ref={containerRef}>
        <AddClassForm year={yearStruct.year} onAdd={onAddClass} />
        {yearStruct.classes.map((cls) => (
          <div
            key={cls.name}
            className="border border-purple-50 rounded-lg bg-white p-4 sm:p-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-purple-700">
                {cls.name}
              </h3>
              <button
                onClick={() => onDeleteClass(yearStruct.year, cls.name)}
                className="text-red-500 hover:text-red-700 text-sm sm:text-base"
              >
                Delete Class
              </button>
            </div>

            <AddStudentTypeForm
              year={yearStruct.year}
              className={cls.name}
              studentTypes={schoolSchema.studentType}
              feeTypes={schoolSchema.feeType}
              onAdd={onAddStudentType}
            />

            {cls.studentType.length > 0 && (
              <div className="overflow-x-auto mt-4 rounded-lg border border-purple-50">
                <table className="min-w-full divide-y divide-purple-100 text-sm sm:text-base">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-purple-700 font-semibold whitespace-nowrap">
                        Student Type
                      </th>
                      {schoolSchema.feeType.map((ft) => (
                        <th
                          key={ft}
                          className="px-4 py-3 text-left text-purple-700 font-semibold whitespace-nowrap"
                        >
                          {ft}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-purple-700 font-semibold text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {cls.studentType.map((st) => (
                      <tr
                        key={st.name}
                        className="hover:bg-purple-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {st.name}
                        </td>
                        {schoolSchema.feeType.map((ft) => (
                          <td key={ft} className="px-4 py-3 whitespace-nowrap">
                            ₹{st.feeStructure[ft]?.toLocaleString() || 0}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() =>
                              onDeleteStudentType(
                                yearStruct.year,
                                cls.name,
                                st.name
                              )
                            }
                            className="text-red-500 hover:text-red-700 px-2 text-sm sm:text-base"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const AddClassForm = ({ year, onAdd }) => {
  const [cls, setCls] = useState("");
  const handleadd = () => {
    if (cls.trim()) {
      onAdd(year, cls.trim());
      setCls("");
    }
  };
  return (
    // <div className="flex gap-4 items-center bg-purple-50 p-4 rounded-lg">
    //   <input
    //     type="text"
    //     placeholder={`Add class to ${year}`}
    //     value={cls}
    //     onChange={(e) => setCls(e.target.value)}
    //     className="flex-1 p-2 border-2 border-purple-100 rounded focus:outline-none focus:border-purple-500"
    //   />
    //   <button
    //     onClick={handleadd}
    //     className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
    //   >
    //     Add Class
    //   </button>
    // </div>
    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-purple-50 p-4 rounded-lg">
      <input
        type="text"
        placeholder={`Add class to ${year}`}
        value={cls}
        onChange={(e) => setCls(e.target.value)}
        className="w-full sm:flex-1 p-2 border-2 border-purple-100 rounded focus:outline-none focus:border-purple-500"
      />
      <button
        onClick={handleadd}
        className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
      >
        Add Class
      </button>
    </div>
  );
};

const AddStudentTypeForm = ({
  year,
  className,
  studentTypes,
  feeTypes,
  onAdd,
}) => {
  const [stName, setStName] = useState("DS"); // Default DS selected
  const [fees, setFees] = useState(
    Object.fromEntries(feeTypes.map((ft) => [ft, ""]))
  );

  const handleFeeChange = (ft, value) => {
    setFees((prev) => ({ ...prev, [ft]: value }));
  };

  const handleSubmit = () => {
    if (!Object.values(fees).some((v) => v !== "")) return;

    const dsFees = {
      AdmissionFee: Number(fees["AdmissionFee"]),
      TutionFee: Number(fees["TutionFee"]),
    };

    // Add DS
    onAdd(year, className, "DS", dsFees);

    // Add DSS: Half of DS
    const dssFees = {
      AdmissionFee: Math.round(dsFees.AdmissionFee / 2),
      TutionFee: Math.round(dsFees.TutionFee / 2),
    };
    onAdd(year, className, "DSS", dssFees);

    // Add DSR: AdmissionFee same, TutionFee 0
    const dsrFees = {
      AdmissionFee: dsFees.AdmissionFee,
      TutionFee: 0,
    };
    onAdd(year, className, "DSR", dsrFees);

    // Reset
    setFees(Object.fromEntries(feeTypes.map((ft) => [ft, ""])));
    setStName("DS");
  };

  return (
    // <div className="bg-white p-4 flex flex-col rounded-lg border border-purple-100">
    //   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    //     <div>
    //       <label className="block text-sm font-medium text-purple-700 mb-2">
    //         Student Type
    //       </label>
    //       <select
    //         value={stName}
    //         disabled
    //         className="w-full p-2 border-2 border-purple-100 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
    //       >
    //         <option value="DS">DS</option>
    //       </select>
    //     </div>

    //     {feeTypes.map((ft) => (
    //       <div key={ft}>
    //         <label className="block text-sm font-medium text-purple-700 mb-2">
    //           {ft}
    //         </label>
    //         <input
    //           type="number"
    //           placeholder={ft}
    //           value={fees[ft]}
    //           onChange={(e) => handleFeeChange(ft, e.target.value)}
    //           className="w-full p-2 border-2 border-purple-100 rounded focus:outline-none focus:border-purple-500"
    //         />
    //       </div>
    //     ))}
    //   </div>

    //   <div className="flex justify-end mt-4">
    //     <button
    //       onClick={handleSubmit}
    //       className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
    //     >
    //       Add Fees
    //     </button>
    //   </div>
    // </div>
    <div className="bg-white p-4 flex flex-col rounded-lg border border-purple-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-purple-700 mb-2">
            Student Type
          </label>
          <select
            value={stName}
            disabled
            className="w-full p-2 border-2 border-purple-100 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
          >
            <option value="DS">DS</option>
          </select>
        </div>

        {feeTypes.map((ft) => (
          <div key={ft}>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              {ft}
            </label>
            <input
              type="number"
              placeholder={ft}
              value={fees[ft]}
              onChange={(e) => handleFeeChange(ft, e.target.value)}
              className="w-full p-2 border-2 border-purple-100 rounded focus:outline-none focus:border-purple-500"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSubmit}
          className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Add Fees
        </button>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="p-6 space-y-8 animate-pulse">
    <div className="h-12 bg-purple-100 rounded w-1/4"></div>
    <div className="space-y-4">
      <div className="h-10 bg-purple-100 rounded w-1/3"></div>
      <div className="h-8 bg-purple-100 rounded w-1/2"></div>
    </div>
    {[...Array(3)].map((_, i) => (
      <div key={i} className="border rounded-xl p-6 space-y-6">
        <div className="h-8 bg-purple-100 rounded w-1/4"></div>
        <div className="space-y-4">
          {[...Array(2)].map((_, j) => (
            <div key={j} className="border rounded-lg p-4 space-y-4">
              <div className="h-6 bg-purple-100 rounded w-1/5"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, k) => (
                  <div key={k} className="h-8 bg-purple-100 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const ErrorDisplay = ({ error }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
    <h2 className="text-xl font-semibold text-red-700">Error Loading Data</h2>
    <p className="mt-2 text-red-600">{error}</p>
  </div>
);
