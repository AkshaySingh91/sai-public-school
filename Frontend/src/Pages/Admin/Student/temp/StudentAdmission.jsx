import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase"; // Update if your context path is different

const StudentAdmission = () => {

    const [form, setForm] = useState({
        firstName: "",
        fatherName: "",
        motherName: "",
        mobile: "",
        gender: "Male",
        className: "",
        studentType: "DS", // DS, DSS, DSR
    });

    const [classes, setClasses] = useState([]);
    const [calculatedFees, setCalculatedFees] = useState({
        tuitionFee: 0,
        admissionFee: 0,
        totalFee: 0,
    });

    // Fetch class-wise fee structure
    const fetchClassFees = async () => {
        try {
            const docRef = doc(db, "feestructure", "2024-2025");
            const snapshot = await getDoc(docRef);
            console.log("snapshot", snapshot);
            if (snapshot.exists()) {
                const data = snapshot.data().Classes;
                console.log("data", data);

                // Optional: sort classes LKG, UKG, 1...12
                const order = ["LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())];
                const sorted = data.sort(
                    (a, b) => order.indexOf(a.class) - order.indexOf(b.class)
                );
                setClasses(sorted);
            }
        } catch (err) {
            console.error("Error fetching fee structure:", err);
        }
    };

    useEffect(() => {
        fetchClassFees();
    }, []);

    // Recalculate fee when class or student type changes
    // useEffect(() => {
    //   if (form.className && form.studentType && classes.length > 0) {
    //     const selectedClass = classes.find(
    //       (cls) => cls.class.trim().toLowerCase() === form.className.trim().toLowerCase()
    //     );

    //     if (selectedClass) {
    //       const structure = selectedClass.feeStructure.find(
    //         (fs) => fs.type.trim().toLowerCase() === form.studentType.trim().toLowerCase()
    //       );

    //       if (structure && structure.allFees) {
    //         const { admission, tuition } = structure.allFees;
    //         setCalculatedFees({
    //           tuitionFee: tuition,
    //           admissionFee: admission,
    //           totalFee: admission + tuition,
    //         });
    //       } else {
    //         setCalculatedFees({ tuitionFee: 0, admissionFee: 0, totalFee: 0 });
    //       }
    //     }
    //   }
    // }, [form.className, form.studentType, classes]);

    useEffect(() => {
        if (form.className && form.studentType && classes.length > 0) {
            const selectedClass = classes.find(
                (cls) => cls.class.trim().toLowerCase() === form.className.trim().toLowerCase()
            );

            if (selectedClass) {
                const selectedTypeFee = selectedClass.feeStructure.find(
                    (fs) => fs.type.trim().toLowerCase() === form.studentType.trim().toLowerCase()
                );

                const dsFee = selectedClass.feeStructure.find(
                    (fs) => fs.type.trim().toLowerCase() === "ds"
                );

                if (selectedTypeFee && selectedTypeFee.allFees && dsFee && dsFee.allFees) {
                    const { admission: typeAdmission = 0, tuition: typeTuition = 0 } = selectedTypeFee.allFees;
                    const { admission: dsAdmission = 0, tuition: dsTuition = 0 } = dsFee.allFees;

                    const totalFee = typeAdmission + typeTuition;
                    const discountFee = (dsAdmission + dsTuition) - totalFee;

                    setCalculatedFees({
                        tuitionFee: typeTuition,
                        admissionFee: typeAdmission,
                        totalFee,
                        discountFee: discountFee > 0 ? discountFee : 0, // always non-negative
                    });
                } else {
                    setCalculatedFees({
                        tuitionFee: 0,
                        admissionFee: 0,
                        totalFee: 0,
                        discountFee: 0,
                    });
                }
            }
        }
    }, [form.className, form.studentType, classes]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // const handleSubmit = async () => {
    //   try {
    //     const studentData = {
    //       ...form,
    //       tuitionFee: calculatedFees.tuitionFee,
    //       admissionFee: calculatedFees.admissionFee,
    //       totalFee: calculatedFees.totalFee,
    //       admissionDate: new Date(),
    //     };

    //     const docRef = doc(db, "students", `${form.firstName}_${Date.now()}`);
    //     await setDoc(docRef, studentData);

    //     alert("🎉 Student admitted successfully!");
    //     setForm({
    //       firstName: "",
    //       fatherName: "",
    //       motherName: "",
    //       mobile: "",
    //       gender: "Male",
    //       className: "",
    //       studentType: "DS",
    //     });
    //   } catch (err) {
    //     console.error("Error during admission:", err);
    //     alert("❌ Failed to admit student: " + err.message);
    //   }
    // };


    const handleSubmit = async () => {
        try {
            const studentData = {
                ...form,
                tuitionFee: calculatedFees.tuitionFee,
                admissionFee: calculatedFees.admissionFee,
                totalFee: calculatedFees.totalFee,
                discountFee: calculatedFees.discountFee || 0, // ✅ added here
                admissionDate: new Date(),
            };

            const docRef = doc(db, "students", `${form.firstName}_${Date.now()}`);
            await setDoc(docRef, studentData);

            alert("🎉 Student admitted successfully!");
            setForm({
                firstName: "",
                fatherName: "",
                motherName: "",
                mobile: "",
                gender: "Male",
                className: "",
                studentType: "DS",
            });
        } catch (err) {
            console.error("Error during admission:", err);
            alert("❌ Failed to admit student: " + err.message);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white shadow rounded mt-10">
            <h2 className="text-2xl font-bold mb-4">Student Admission</h2>
            <div className="space-y-4">
                {["firstName", "fatherName", "motherName", "mobile"].map((field) => (
                    <div key={field}>
                        <label className="block capitalize">{field.replace(/([A-Z])/g, ' $1')}:</label>
                        <input
                            type="text"
                            name={field}
                            value={form[field]}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                ))}

                <div>
                    <label>Gender:</label>
                    <select
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>
                </div>

                <div>
                    <label>Class:</label>
                    <select
                        name="className"
                        value={form.className}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Select Class</option>
                        {classes.map((cls, index) => (
                            <option key={index} value={cls.class}>{cls.class}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Student Type:</label>
                    <select
                        name="studentType"
                        value={form.studentType}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    >
                        <option value="DS">DS</option>
                        <option value="DSS">DSS</option>
                        <option value="DSR">DSR</option>
                    </select>
                </div>

                <div className="bg-gray-100 p-4 rounded">
                    <p><strong>Tuition Fee:</strong> ₹{calculatedFees.tuitionFee}</p>
                    <p><strong>Admission Fee:</strong> ₹{calculatedFees.admissionFee}</p>
                    <p><strong>Total Fee:</strong> ₹{calculatedFees.totalFee}</p>
                </div>

                <button
                    onClick={handleSubmit}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
                >
                    📥 Admit Student
                </button>
            </div>
        </div>
    );
};

export default StudentAdmission;

