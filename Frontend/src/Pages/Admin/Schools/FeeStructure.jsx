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
import { useSchool } from "../../../contexts/SchoolContext";
import AddStudentTypeForm from "./AddStudentTypeForm"

const MySwal = withReactContent(Swal);
export default function FeeStructure() {
  const { userData } = useAuth();
  const { school } = useSchool();

  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState([]);
  const [newYear, setNewYear] = useState("");
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fsRef = doc(db, "feeStructures", school.Code);
        const fsSnap = await getDoc(fsRef);
        if (fsSnap.exists()) {
          const data = fsSnap.data().structures || [];
          // Migrate existing data to include englishMedium property
          const migratedData = data.map(yearStruct => ({
            ...yearStruct,
            classes: yearStruct.classes.map(cls => ({
              ...cls,
              studentType: cls.studentType.map(st => ({
                ...st,
                englishMedium: st.englishMedium !== undefined ? st.englishMedium : true
              }))
            }))
          }));

          setStructures(migratedData);

          // Find latest year from the fetched data
          if (migratedData.length) {
            const sorted = [...migratedData].sort((a, b) => {
              const getStartYear = (year) => parseInt(year?.split("-")[0] || "00");
              return getStartYear(b.year) - getStartYear(a.year);
            });
            console.log(sorted[0].year)
            setSelectedYear(sorted[0].year);
          }
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
  }, [userData, school.Code]);

  // Set default class when year changes
  useEffect(() => {
    if (selectedYear) {
      const yearData = structures.find(s => s.year === selectedYear);
      if (yearData && yearData.classes.length > 0) {
        setSelectedClass(yearData.classes[0].name);
      } else {
        setSelectedClass('');
      }
    }
  }, [selectedYear, structures]);

  // Find the selected class data
  const selectedClassData = selectedYear && selectedClass
    ? structures
      .find(s => s.year === selectedYear)
      ?.classes.find(c => c.name === selectedClass)
    : null;

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

  const addYear = async (newYear) => {
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
    setSelectedYear(newYear);
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
    console.log(year, className)
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
    setSelectedClass(className)
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

  const addStudentType = (year, className, stName, feeStructure, englishMedium) => {
    const validatedFees = Object.fromEntries(
      Object.entries(feeStructure).map(([key, value]) => [
        key,
        Number(value) || 0,
      ])
    );
    const currYear = selectedYear;
    const currClass = selectedClass;
    console.log(selectedClass, selectedYear)

    setStructures((prev) =>
      prev.map((s) => {
        if (s.year !== year) return s;
        return {
          ...s,
          classes: s.classes.map((c) => {
            if (c.name !== className) return c;
            const existing = c.studentType.find(
              (st) => st.name === stName && st.englishMedium === englishMedium
            );

            return {
              ...c,
              studentType: existing
                ? c.studentType.map((st) =>
                  st.name === stName && st.englishMedium === englishMedium
                    ? { ...st, feeStructure: validatedFees }
                    : st
                )
                : [
                  ...c.studentType,
                  {
                    name: stName,
                    feeStructure: validatedFees,
                    englishMedium
                  },
                ],
            };
          }),
        };
      })
    );
    setSelectedClass(currClass)
    setSelectedYear(currYear)
  };

  const deleteStudentType = async (year, className, stName, englishMedium) => {
    const result = await confirmAction(
      "Delete Student Type?",
      `Delete ${stName} (${englishMedium ? "English" : "Semi-English"}) from ${className}?`
    );
    if (result.isConfirmed) {
      setStructures((prev) =>
        prev.map((s) => ({
          ...s,
          classes: s.classes.map((c) => ({
            ...c,
            studentType: c.studentType.filter(
              (st) => !(st.name === stName && st.englishMedium === englishMedium)
            ),
          })),
        }))
      );
    }
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      const fsRef = doc(db, "feeStructures", school.Code);
      const schoolsRef = collection(db, "schools");
      const q = query(schoolsRef, where("Code", "==", school.Code));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error("School not found");
      const schoolDoc = querySnapshot.docs[0];

      const allClasses = [];
      const sortedStructures = [...structures].sort((a, b) => {
        const getStartYear = (year) => {
          const [start] = year?.split("-") || ["00"];
          return parseInt(start) || 0;
        };
        return getStartYear(b.year) - getStartYear(a.year);
      })[0];

      if (sortedStructures) {
        sortedStructures.classes.forEach((c) => {
          allClasses.push(c.name);
        });
      }

      // Update school classes
      await updateDoc(doc(db, "schools", schoolDoc.id), {
        class: [...new Set(allClasses)],
      });

      // Update fee structure
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
  const classesForSelectedYear = selectedYear
    ? structures.find(s => s.year === selectedYear)?.classes || []
    : [];

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      <header className="space-y-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-700 text-center sm:text-left">
          Fee Structure Management
        </h1>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Academic Year Selection */}
          <div className="w-full sm:w-auto">
            <div className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </div>
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="min-w-[120px] p-2 border-2 border-purple-100 rounded-lg focus:outline-none focus:border-purple-500"
              >
                {structures.map((s) => (
                  <option key={s.year} value={s.year}>
                    {s.year}
                  </option>
                ))}``
              </select>
              {
                userData.role !== "superadmin" && (<>
                  <button
                    onClick={() => {
                      setNewYear('');
                      MySwal.fire({
                        title: 'Add New Academic Year',
                        input: 'text',
                        inputLabel: 'Enter in YY-YY format (e.g. 25-26)',
                        inputPlaceholder: '25-26',
                        showCancelButton: true,
                        confirmButtonColor: '#7e22ce',
                        cancelButtonColor: '#64748b',
                        inputValidator: (value) => {
                          if (!/^\d{2}-\d{2}$/.test(value)) {
                            return 'Year must be in format YY-YY';
                          }
                          if (structures.some(s => s.year === value)) {
                            return 'Year already exists';
                          }
                        }
                      }).then((result) => {
                        if (result.isConfirmed) {
                          console.log(result.value)
                          setNewYear(result.value);
                          addYear(result.value);
                        }
                      });
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => selectedYear && deleteYear(selectedYear)}
                    disabled={!selectedYear}
                    className={`px-3 py-2 rounded-lg text-sm ${selectedYear
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </>)
              }
            </div>
          </div>

          {/* Class Selection */}
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class
            </label>
            <div className="flex gap-2">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="min-w-[120px] p-2 border-2 border-purple-100 rounded-lg focus:outline-none focus:border-purple-500"
                disabled={!selectedYear || classesForSelectedYear.length === 0}
              >
                {classesForSelectedYear.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {classesForSelectedYear.length === 0 && (
                  <option value="">No classes</option>
                )}
              </select>
              {
                userData.role !== "superadmin" && (<>
                  <button
                    onClick={() => {
                      MySwal.fire({
                        title: 'Add New Class',
                        input: 'text',
                        inputLabel: `Enter class name for ${selectedYear}`,
                        inputPlaceholder: 'e.g. Nursery',
                        showCancelButton: true,
                        confirmButtonColor: '#7e22ce',
                        cancelButtonColor: '#64748b',
                        inputValidator: (value) => {
                          if (!value.trim()) {
                            return 'Class name is required';
                          }
                          if (classesForSelectedYear.some(c => c.name === value)) {
                            return 'Class already exists';
                          }
                        }
                      }).then((result) => {
                        console.log(result)
                        if (result.isConfirmed && selectedYear) {
                          addClass(selectedYear, result.value);
                          setSelectedClass(result.value);
                        }
                      });
                    }}
                    disabled={!selectedYear}
                    className={`px-3 py-2 rounded-lg text-sm ${selectedYear
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedYear && selectedClass) {
                        deleteClass(selectedYear, selectedClass);
                        // Select the next class if available
                        const index = classesForSelectedYear.findIndex(c => c.name === selectedClass);
                        if (classesForSelectedYear.length > 1) {
                          const newIndex = index === classesForSelectedYear.length - 1 ? index - 1 : index + 1;
                          setSelectedClass(classesForSelectedYear[newIndex].name);
                        } else {
                          setSelectedClass('');
                        }
                      }
                    }}
                    disabled={!selectedYear || !selectedClass}
                    className={`px-3 py-2 rounded-lg text-sm ${selectedYear && selectedClass
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </>
                )}
            </div>
          </div>

          {
            userData.role !== "superadmin" &&
            <button
              onClick={saveAll}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm sm:text-base"
            >
              Save All Changes
            </button>
          }
        </div>
      </header>

      <div className="space-y-8">
        {/* selected year is default year (first year in sturcture), selected class is default class (first class in selected year) */}
        {selectedYear && selectedClass && selectedClassData ? (
          <ClassFeeDisplay
            cls={selectedClassData}
            year={selectedYear}
            feeTypes={school.feeTypes}
            onDeleteClass={deleteClass}
            onAddStudentType={addStudentType}
            onDeleteStudentType={deleteStudentType}
          />
        ) : (
          <div className="bg-purple-50 rounded-xl p-8 text-center border-2 border-dashed border-purple-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-xl font-medium text-purple-800">
              No Class Selected
            </h3>
            <p className="mt-2 text-purple-600">
              {selectedYear
                ? 'Add a class or select one from the dropdown'
                : 'Select an academic year to view fee structures'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


// New component to handle class fee display with tabs
const ClassFeeDisplay = ({
  cls,
  year,
  feeTypes,
  onDeleteClass,
  onAddStudentType,
  onDeleteStudentType
}) => {
  /*
    cls : {
      name: "Nursery", 
      studentType:[
      {
        name : "DS",
        englishMedium: true,
        feeStructure: [
          TuitionFee :1000,
          AdmissionFee: 1200
        ]
      }
      ]
    }
  */
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('english');
  // Separate student types by medium
  const englishStudentTypes = cls.studentType.filter(st => st.englishMedium);
  const nonEnglishStudentTypes = cls.studentType.filter(st => !st.englishMedium);

  const hasEnglishFees = englishStudentTypes.length > 0;
  const hasNonEnglishFees = nonEnglishStudentTypes.length > 0;

  return (
    <div className="border border-purple-50 rounded-lg bg-white p-4 sm:p-6 shadow-sm">
      {
        userData.role !== "superadmin" &&
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
          <h3 className="text-lg sm:text-xl font-semibold text-purple-700">
            {cls.name || ""}
          </h3>
          <button
            onClick={() => onDeleteClass(year, cls.name)}
            className="text-red-500 hover:text-red-700 text-sm sm:text-base"
          >
            Delete Class
          </button>
        </div>
      }

      {
        userData.role !== "superadmin" &&
        <AddStudentTypeForm
          year={year}
          className={cls.name}
          feeTypes={feeTypes}
          onAdd={onAddStudentType}
        />
      }
      {/* here we assign fee for different class  */}

      {/* Tabs for English/Semi-English */}
      <div className="mt-6 border-b border-purple-100 flex">
        <button
          className={`px-4 py-2 font-medium outline-0 ${activeTab === 'english'
            ? 'text-purple-700 border-b-2 border-purple-700'
            : 'text-gray-500 hover:text-purple-600'
            }`}
          onClick={() => setActiveTab('english')}
        >
          English Medium
          {!hasEnglishFees && (
            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              Not Configured
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium outline-0 ${activeTab === 'semi-english'
            ? 'text-purple-700 border-b-2 border-purple-700'
            : 'text-gray-500 hover:text-purple-600'
            }`}
          onClick={() => setActiveTab('semi-english')}
        >
          Semi-English Medium
          {!hasNonEnglishFees && (
            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              Not Configured
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'english' ? (
          hasEnglishFees ? (
            <FeeTable
              studentTypes={englishStudentTypes}
              year={year}
              className={cls.name}
              feeTypes={feeTypes}
              onDeleteStudentType={onDeleteStudentType}
              medium="English"
            />
          ) : (
            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <p className="text-purple-700 font-medium">
                No fees configured for English Medium
              </p>
              <p className="text-sm text-purple-600 mt-2">
                Add fees using the form above
              </p>
            </div>
          )
        ) : hasNonEnglishFees ? (
          <FeeTable
            studentTypes={nonEnglishStudentTypes}
            year={year}
            className={cls.name}
            feeTypes={feeTypes}
            onDeleteStudentType={onDeleteStudentType}
            medium="Semi-English"
          />
        ) : (
          <div className="bg-purple-50 rounded-lg p-6 text-center">
            <p className="text-purple-700 font-medium">
              No fees configured for Semi-English Medium
            </p>
            <p className="text-sm text-purple-600 mt-2">
              Add fees using the form above
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Extracted FeeTable component
const FeeTable = ({ studentTypes, year, className, feeTypes, onDeleteStudentType, medium }) => {
  const { userData } = useAuth();

  return (<div className="overflow-x-auto rounded-lg border border-purple-50">
    <table className="min-w-full divide-y divide-purple-100 text-sm sm:text-base">
      <thead className="bg-purple-50">
        <tr>
          <th className="px-4 py-3 text-left text-purple-700 font-semibold whitespace-nowrap">
            Student Type
          </th>
          <th className="px-4 py-3 text-left text-purple-700 font-semibold whitespace-nowrap">
            Medium
          </th>
          {feeTypes.map((ft) => (
            <th
              key={ft}
              className="px-4 py-3 text-left text-purple-700 font-semibold whitespace-nowrap"
            >
              {ft}
            </th>
          ))}
          {
            userData.role !== "superadmin" &&
            <th className="px-4 py-3 text-purple-700 font-semibold text-center">
              Actions
            </th>
          }
        </tr>
      </thead>
      <tbody className="divide-y divide-purple-100">
        {studentTypes.map((st) => (
          <tr
            key={`${st.name}-${st.englishMedium}`}
            className="hover:bg-purple-50 transition-colors"
          >
            <td className="px-4 py-3 font-medium whitespace-nowrap">
              {st.name}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              {medium}
            </td>
            {feeTypes.map((ft) => (
              <td key={ft} className="px-4 py-3 whitespace-nowrap">
                ₹{st.feeStructure[ft]?.toLocaleString() || 0}
              </td>
            ))}
            {
              userData.role !== "superadmin" &&
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <button
                  onClick={() =>
                    onDeleteStudentType(
                      year,
                      className,
                      st.name,
                      st.englishMedium
                    )
                  }
                  className="text-red-500 hover:text-red-700 px-2 text-sm sm:text-base"
                >
                  Delete
                </button>
              </td>
            }
          </tr>
        ))}
      </tbody>
    </table>
  </div>)
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
