// src/Pages/Admin/Student/StudentDetails.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDoc,
  doc,
} from "firebase/firestore";
import { db, storage } from "../../../../config/firebase";
import { useAuth } from "../../../../contexts/AuthContext";
import { nanoid } from "nanoid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Link } from "react-router-dom";

export default function StudentDetails() {
  const { userData } = useAuth();
  const schoolCode = userData.schoolCode;

  // State
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentTypes, setStudentTypes] = useState([]);
  const [filterClass, setFilterClass] = useState("");
  const [filterDiv, setFilterDiv] = useState("");
  const [searchName, setSearchName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  // Fetch school schema & student list
  useEffect(() => {
    async function loadSchema() {
      const sq = query(
        collection(db, "schools"),
        where("Code", "==", schoolCode)
      );
      const snap = await getDoc((await getDocs(sq)).docs[0].ref);
      const data = snap.data();
      setClasses(data.classes || []);
      setStudentTypes(data.studentType || []);
    }
    loadSchema();

    const q = query(
      collection(db, "students"),
      where("schoolCode", "==", schoolCode)
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setStudents(arr);
      setLoading(false);
    });
    return unsub;
  }, [schoolCode]);

  // Filtering + Pagination
  const filtered = students.filter((st) => {
    if (filterClass && st.class !== filterClass) return false;
    if (filterDiv && st.div !== filterDiv) return false;
    const fullName = `${st.fname} ${st.lname}`.toLowerCase();
    if (
      searchName &&
      !fullName.includes(searchName.trim().toLowerCase())
    )
      return false;
    return true;
  });
  const pageCount = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Student Management</h1>
      <AddStudentForm
        classes={classes}
        studentTypes={studentTypes}
        schoolCode={schoolCode}
      />

      <div className="mt-6 flex flex-wrap gap-4">
        <select
          value={filterClass}
          onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
          className="border p-2 rounded"
        >
          <option value="">All Classes</option>
          {classes.map((cl) => (
            <option key={cl} value={cl}>{cl}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter Div"
          value={filterDiv}
          onChange={(e) => { setFilterDiv(e.target.value); setPage(1); }}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Search Name"
          value={searchName}
          onChange={(e) => { setSearchName(e.target.value); setPage(1); }}
          className="border p-2 rounded flex-1"
        />
      </div>

      {loading ? (
        <p className="mt-4">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4">No Student in School</p>
      ) : (
        <>
          <table className="w-full mt-4 table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {[
                  "AcademicYear",
                  "Type",
                  "Name",
                  "FeeId",
                  "Class",
                  "Div",
                  "Gender",
                  "FatherContact",
                  "MotherContact",
                  "BusStop",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="border px-3 py-2 text-left text-sm font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((st) => (
                <tr key={st.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{st.academicYear}</td>
                  <td className="border px-2 py-1">{st.type}</td>
                  <td className="border px-2 py-1">
                    {st.fname} {st.lname}
                  </td>
                  <td className="border px-2 py-1">{st.feeId}</td>
                  <td className="border px-2 py-1">{st.class}</td>
                  <td className="border px-2 py-1">{st.div}</td>
                  <td className="border px-2 py-1">{st.gender}</td>
                  <td className="border px-2 py-1">{st.fatherMob}</td>
                  <td className="border px-2 py-1">{st.motherMob}</td>
                  <td className="border px-2 py-1">{st.busDestination}</td>
                  <td className="border px-2 py-1">
                    <Link
                      to={`/student/${st.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="mt-4 flex justify-center items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded"
            >
              Prev
            </button>
            <span>
              Page {page} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ========================
// AddStudentForm
function AddStudentForm({ classes, studentTypes, schoolCode }) {
  const [fname, setFname] = useState("");
  const [mname, setMname] = useState("");
  const [lname, setLname] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [fatherMob, setFatherMob] = useState("");
  const [motherMob, setMotherMob] = useState("");
  const [studentMob, setStudentMob] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [type, setType] = useState("");
  const [div, setDiv] = useState("");
  const [cls, setCls] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1) Generate feeId
    const feeId = nanoid(8);

    // 2) Compute allFee
    //   fetch feeStructures for this year & class & type
    const fsRef = doc(db, "feeStructures", schoolCode);
    const fsSnap = await getDoc(fsRef);
    const structures = fsSnap.exists() ? fsSnap.data().structures : [];
    const yearObj = structures.find((s) => s.year === academicYear);
    const classObj = yearObj?.classes.find((c) => c.name === cls);
    const stObj = classObj?.studentType.find((st) => st.name === type);
    const baseFees = stObj?.feeStructure || {};
    const totalBase = Object.values(baseFees).reduce((a, b) => a + b, 0);

    // discount: if DSS, compare to DS
    let discount = 0;
    if (type === "DSS") {
      const dsObj = classObj?.studentType.find((st) => st.name === "DS");
      const dsFees = dsObj?.feeStructure || {};
      const totalDS = Object.values(dsFees).reduce((a, b) => a + b, 0);
      discount = totalDS - totalBase;
    }

    const allFee = {
      lastYearBalanceFee: 0,
      lastYearDiscount: 0,
      lastYearTransportFee: 0,
      lastYearTransportFeeDiscount: 0,
      schoolFees: { ...baseFees, total: totalBase },
      schoolFeesDiscount: discount,
      transportFee: 0,
      transportFeeDiscount: 0,
      messFee: 0,
      hostelFee: 0,
    };

    // 3) Add student doc
    await addDoc(collection(db, "students"), {
      fname,
      mname,
      lname,
      fatherName,
      motherName,
      fatherMob,
      motherMob,
      studentMob,
      studentEmail,
      type,
      div,
      class: cls,
      dob,
      gender,
      address: "",
      mealService: false,
      couponCode: "",
      addharNo: "",
      busDestination: "",
      status: "active",
      Bgroup: "",
      academicYear,
      feeId,
      document: [],
      transaction: [],
      schoolCode,
      allFee,
    });

    // clear form
    setFname("");
    setMname("");
    setLname("");
    setFatherName("");
    setMotherName("");
    setFatherMob("");
    setMotherMob("");
    setStudentMob("");
    setStudentEmail("");
    setType("");
    setDiv("");
    setCls("");
    setDob("");
    setGender("");
    setAcademicYear("");
    setLoading(false);
    toast.success("Student added");
  };

  return (
    <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <input
        value={fname}
        onChange={(e) => setFname(e.target.value)}
        required
        placeholder="First Name"
        className="border p-2 rounded"
      />
      <input
        value={mname}
        onChange={(e) => setMname(e.target.value)}
        placeholder="Middle Name"
        className="border p-2 rounded"
      />
      <input
        value={lname}
        onChange={(e) => setLname(e.target.value)}
        required
        placeholder="Last Name"
        className="border p-2 rounded"
      />

      <input
        value={fatherName}
        onChange={(e) => setFatherName(e.target.value)}
        required
        placeholder="Father Name"
        className="border p-2 rounded"
      />
      <input
        value={motherName}
        onChange={(e) => setMotherName(e.target.value)}
        required
        placeholder="Mother Name"
        className="border p-2 rounded"
      />
      <input
        value={fatherMob}
        onChange={(e) => setFatherMob(e.target.value)}
        placeholder="Father Mobile"
        className="border p-2 rounded"
      />

      <input
        value={motherMob}
        onChange={(e) => setMotherMob(e.target.value)}
        placeholder="Mother Mobile"
        className="border p-2 rounded"
      />
      <input
        value={studentMob}
        onChange={(e) => setStudentMob(e.target.value)}
        placeholder="Student Mobile"
        className="border p-2 rounded"
      />
      <input
        value={studentEmail}
        onChange={(e) => setStudentEmail(e.target.value)}
        placeholder="Student Email"
        className="border p-2 rounded"
      />

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        required
        className="border p-2 rounded"
      >
        <option value="">Type</option>
        {studentTypes.map((st) => (
          <option key={st} value={st}>{st}</option>
        ))}
      </select>
      <select
        value={cls}
        onChange={(e) => setCls(e.target.value)}
        required
        className="border p-2 rounded"
      >
        <option value="">Class</option>
        {classes.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        value={div}
        onChange={(e) => setDiv(e.target.value)}
        placeholder="Div"
        className="border p-2 rounded"
      />

      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        required
        placeholder="DOB"
        className="border p-2 rounded col-span-1"
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        required
        className="border p-2 rounded"
      >
        <option value="">Gender</option>
        <option>Male</option>
        <option>Female</option>
        <option>Other</option>
      </select>
      <input
        value={academicYear}
        onChange={(e) => setAcademicYear(e.target.value)}
        required
        placeholder="Academic Year (24-25)"
        className="border p-2 rounded"
      />

      <button
        type="submit"
        disabled={loading}
        className="col-span-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? "Adding…" : "Add Student"}
      </button>
    </form>
  );
}
