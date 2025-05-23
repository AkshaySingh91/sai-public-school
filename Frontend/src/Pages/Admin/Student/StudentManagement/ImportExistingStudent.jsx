import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSchool } from '../../../../contexts/SchoolContext';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';
import { InputField } from '../InputField';
import { SelectField } from '../SelectField';
import { User } from 'lucide-react';

export default function ImportExistingStudent() {
    const { userData } = useAuth();
    const { school } = useSchool();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [inputData, setInputData] = useState({
        fname: '',
        sname: '',
        fatherName: '',
        motherName: '',
        DOB: '',
        sex: 'M',
        saral: '',
        aadhar: '',
        fatherMob: '',
        motherMob: '',
        class: '',
        div: 'A',
        address: '',
        lastYearBalanceFee: 0,
        lastYearDiscount: 0,
        tutionFeesDiscount: 0,
        tutionFee: 0,
        tutionPaidFee: 0,
        transportFee: 0,
        transportFeePaid: 0,
        transportDiscount: 0,
        Ayear: school?.academicYear || '24-25',
        busStop: '',
        BUS: '',
        status: 'Current',
        email: '',
        caste: '',
        subCaste: '',
        nationality: 'Indian',
        category: '',
        religion: '',
        type: 'DSS',
        grNo: "",
        penNo: "",
    });

    useEffect(() => {
        if (school) setLoading(false);
    }, [school]);

    const createTransaction = (feeType, amount, discount, feeAmount) => {
        const accounts = school.accounts || [];
        const receiptCount = school.receiptCount || 0;

        return {
            academicYear: inputData.Ayear,
            account: accounts.length > 0 ? `${accounts[0].AccountNo} (${accounts[0].Branch})` : 'Cash',
            amount: Number(amount),
            date: new Date().toISOString().split('T')[0],
            feeType,
            historicalSnapshot: {
                applicableDiscount: Number(discount),
                feeCategory: feeType.replace('Fee', ''),
                initialFee: Number(feeAmount),
                previousPayments: 0,
                remainingBefore: Number(feeAmount - discount),
                remainingAfter: Number(feeAmount - discount - amount),
                transactionDate: new Date().toISOString()
            },
            paymentMode: 'CASH',
            receiptId: receiptCount + 1,
            remark: 'Imported from legacy system',
            status: 'completed',
            timestamp: new Date().toISOString()
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Validate required fields
            const requiredFields = ['Fname', 'class', 'Ayear', 'FatherName', 'Address'];
            const missingFields = requiredFields.filter(field => !inputData[field]);
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Create transactions
            const transactions = [];

            if (inputData.TutionPaidFee > 0) {
                transactions.push(createTransaction(
                    'SchoolFee',
                    inputData.TutionPaidFee,
                    inputData.tutionFeesDiscount,
                    inputData.TutionFee
                ));
            }

            if (inputData.transportFeePaid > 0) {
                transactions.push(createTransaction(
                    'TransportFee',
                    inputData.transportFeePaid,
                    inputData.transportDiscount,
                    inputData.transportFee
                ));
            }

            // Build student object
            const studentData = {
                // Personal Info
                fname: inputData.Fname,
                mname: '', // Not in input data
                lname: inputData.Sname,
                dob: inputData.DOB.split('-').reverse().join('-'),
                gender: inputData.Sex === 'M' ? 'Male' : 'Female',
                saralId: inputData.Saral,
                aadharNumber: inputData.Aadhar,

                // Parent Info
                fatherName: inputData.FatherName,
                motherName: inputData.MotherName,
                fatherContact: String(inputData.FatherMob),
                motherContact: String(inputData.MotherMob),

                // Academic Info
                class: inputData.class,
                div: inputData.Div,
                academicYear: inputData.Ayear,
                status: inputData.STATUS.toLowerCase(),
                type: inputData.Type,

                // Address
                address: inputData.Address,

                // Fee Details
                feeId: `FEE-${nanoid(6).toUpperCase()}`,
                allFee: {
                    lastYearBalanceFee: Number(inputData.lastYearBalanceFee),
                    lastYearTransportFee: Number(0),
                    tutionFeesDiscount: Number(inputData.tutionFeesDiscount),
                    transportFeeDiscount: Number(inputData.transportDiscount),
                    schoolFees: {
                        AdmissionFee: 0,
                        TutionFee: Number(inputData.TutionFee),
                        total: Number(inputData.TutionFee)
                    },
                    transportFee: Number(inputData.transportFee),
                    messFee: 0,
                    hostelFee: 0,
                    lastYearDiscount: 0,
                    lastYearTransportFeeDiscount: 0
                },

                // Additional Fields
                transportDetails: {
                    busStop: inputData.busStop,
                    busNoPlate: inputData.BUS,
                    discount: 0,
                    transportFee: Number(inputData.transportFee)
                },
                caste: inputData.caste,
                subCaste: inputData.SubCaste,
                nationality: inputData.Nationality,
                category: inputData.category,
                religion: inputData.Religion,
                email: inputData.Email,

                // System Fields
                schoolCode: userData.schoolCode,
                createdAt: new Date(),
                transactions
            };

            // Add to Firestore
            await addDoc(collection(db, 'students'), studentData);

            // Update receipt counter
            if (transactions.length > 0) {
                const schoolsRef = collection(db, 'schools');
                const q = query(schoolsRef, where("Code", "==", userData.schoolCode));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    await updateDoc(doc(db, 'schools', querySnapshot.docs[0].id), {
                        receiptCount: school.receiptCount + transactions.length
                    });
                }
            }

            Swal.fire('Success!', 'Student imported successfully', 'success');
            navigate('/students');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading school data...</div>;

    return (
        // <div className="p-6 max-w-4xl mx-auto">
        //     <div className="bg-white rounded-xl shadow-lg p-8">
        //         {/* Header Section */}
        //         <div className="mb-8 text-center">
        //             <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-2xl mb-4">
        //                 <User className="w-8 h-8 text-purple-600" />
        //             </div>
        //             <h2 className="text-3xl font-bold text-gray-900 mb-2">Import Student</h2>
        //             <p className="text-gray-600">Fill in the student details below</p>
        //         </div>

        //         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        //             {/* Personal Information */}
        //             <div className="md:col-span-2">
        //                 <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
        //                     Personal Information
        //                 </h3>
        //                 <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        //                     <InputField label="First Name *" value={inputData.fname}
        //                         onChange={e => setInputData({ ...inputData, fname: e.target.value })} />

        //                     <InputField label="Last Name *" value={inputData.sname}
        //                         onChange={e => setInputData({ ...inputData, sname: e.target.value })} />

        //                     <InputField label="DOB(DD-MM-YYYY) *" value={inputData.DOB}
        //                         onChange={e => setInputData({ ...inputData, DOB: e.target.value })}
        //                         pattern="\d{2}-\d{2}-\d{4}" />

        //                     <SelectField label="Gender *" value={inputData.sex}
        //                         options={['Male', 'Female', 'Other']}
        //                         onChange={e => setInputData({ ...inputData, sex: e.target.value })} />
        //                     {/* Parent Information */}
        //                     <InputField label="Father's Name *" value={inputData.fatherName}
        //                         onChange={e => setInputData({ ...inputData, fatherName: e.target.value })} />

        //                     <InputField label="Mother's Name" value={inputData.motherName}
        //                         onChange={e => setInputData({ ...inputData, motherName: e.target.value })} />

        //                     <InputField label="Father's Mobile *" type="tel" value={inputData.fatherMob}
        //                         onChange={e => setInputData({ ...inputData, fatherMob: e.target.value })} />

        //                     <InputField label="Mother's Mobile" type="tel" value={inputData.motherMob}
        //                         onChange={e => setInputData({ ...inputData, motherMob: e.target.value })} />
        //                     {/* other data */}
        //                     <InputField label="Caste" value={inputData.caste}
        //                         onChange={e => setInputData({ ...inputData, caste: e.target.value })} />

        //                     <InputField label="Sub Caste" value={inputData.subCaste}
        //                         onChange={e => setInputData({ ...inputData, subCaste: e.target.value })} />

        //                     <InputField label="Religion" value={inputData.religion}
        //                         onChange={e => setInputData({ ...inputData, religion: e.target.value })} />

        //                     <InputField label="Category" value={inputData.category}
        //                         onChange={e => setInputData({ ...inputData, category: e.target.value })} />

        //                     <InputField label="Email" type="email" value={inputData.email}
        //                         onChange={e => setInputData({ ...inputData, email: e.target.value })} />
        //                 </div>
        //                 {/* Address Information */}
        //                 <div className="md:col-span-2">
        //                     <InputField label="Address *" value={inputData.address}
        //                         onChange={e => setInputData({ ...inputData, address: e.target.value })} />
        //                 </div>
        //             </div>
        //             <div className="md:col-span-2">
        //                 <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
        //                     Academic Information
        //                 </h3>
        //                 <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        //                     <SelectField label="Class *" value={inputData.class}
        //                         options={school.class}
        //                         onChange={e => setInputData({ ...inputData, class: e.target.value })} />

        //                     <SelectField label="Division *" value={inputData.div}
        //                         options={school.divisions}
        //                         onChange={e => setInputData({ ...inputData, div: e.target.value })} />

        //                     <InputField label="Academic Year *" value={inputData.Ayear}
        //                         onChange={e => setInputData({ ...inputData, Ayear: e.target.value })} />

        //                     <SelectField label="Student Type *" value={inputData.type}
        //                         options={['DSS', 'DSR', 'DS']}
        //                         onChange={e => setInputData({ ...inputData, type: e.target.value })} />

        //                     <InputField label="Bus No plate" value={inputData.Ayear}
        //                         onChange={e => setInputData({ ...inputData, Ayear: e.target.value })} />

        //                     <InputField label="Bus stop" value={inputData.busStop}
        //                         onChange={e => setInputData({ ...inputData, busStop: e.target.value })} />

        //                     <InputField label="FeeId *" value={inputData.feeID}
        //                         onChange={e => setInputData({ ...inputData, feeID: e.target.value })} />

        //                     <SelectField label="status*" value={inputData.type}
        //                         options={['inactive', 'current', 'new']}
        //                         onChange={e => setInputData({ ...inputData, type: e.target.value })} />

        //                 </div>
        //             </div>
        //             <div className="md:col-span-2">
        //                 <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
        //                     Fee Information
        //                 </h3>
        //                 <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        //                     {/* tution */}
        //                     <InputField label="Tuition Fee" type="number" value={inputData.tutionFee}
        //                         onChange={e => setInputData({ ...inputData, TutionFee: e.target.value })} />
        //                     <InputField label="TutionFeesDiscount" type="number" value={inputData.tutionFeesDiscount}
        //                         onChange={e => setInputData({ ...inputData, tutionFeesDiscount: e.target.value })} />
        //                     <InputField label="Paid Tuition" type="number" value={inputData.tutionPaidFee}
        //                         onChange={e => setInputData({ ...inputData, TutionPaidFee: e.target.value })} />
        //                     {/* transport */}
        //                     <InputField label="Transport Fee" type="number" value={inputData.transportFee}
        //                         onChange={e => setInputData({ ...inputData, transportFee: e.target.value })} />
        //                     <InputField label="Transport Discount" type="number" value={inputData.transportDiscount}
        //                         onChange={e => setInputData({ ...inputData, transportDiscount: e.target.value })} />
        //                     <InputField label="Paid Transport" type="number" value={inputData.transportFeePaid}
        //                         onChange={e => setInputData({ ...inputData, transportFeePaid: e.target.value })} />
        //                     {/* last year */}
        //                     <InputField label="lastYearDiscount" type="number" value={inputData.lastYearDiscount}
        //                         onChange={e => setInputData({ ...inputData, lastYearDiscount: e.target.value })} />
        //                 </div>
        //             </div>

        //             <div className="md:col-span-2">
        //                 <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600">
        //                     Additional Information
        //                 </h3>
        //                 <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        //                     <InputField label="Saral" type="text" value={inputData.saral}
        //                         onChange={e => setInputData({ ...inputData, saral: e.target.value })} />
        //                     <InputField label="Aadhar" type="text" value={inputData.aadhar}
        //                         onChange={e => setInputData({ ...inputData, aadhar: e.target.value })} />
        //                     <InputField label="GrNo" type="text" value={inputData.grNo}
        //                         onChange={e => setInputData({ ...inputData, aadhar: e.target.value })} />
        //                     <InputField label="PEN" type="text" value={inputData.penNo}
        //                         onChange={e => setInputData({ ...inputData, aadhar: e.target.value })} />
        //                 </div>
        //             </div>
        //             <div className="md:col-span-2">
        //                 <button type="submit" disabled={submitting}
        //                     className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition font-semibold">
        //                     {submitting ? 'Importing...' : 'Import Student'}
        //                 </button>
        //             </div>
        //         </form>
        //     </div>
        // </div>
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
  <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
    {/* Header */}
    <div className="mb-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-2xl mb-4">
        <User className="w-8 h-8 text-purple-600" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Import Student</h2>
      <p className="text-gray-600 text-sm sm:text-base">Fill in the student details below</p>
    </div>

    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-purple-600">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <InputField label="First Name *" value={inputData.fname} onChange={e => setInputData({ ...inputData, fname: e.target.value })} />
          <InputField label="Last Name *" value={inputData.sname} onChange={e => setInputData({ ...inputData, sname: e.target.value })} />
          <InputField label="DOB (DD-MM-YYYY) *" value={inputData.DOB} pattern="\d{2}-\d{2}-\d{4}" onChange={e => setInputData({ ...inputData, DOB: e.target.value })} />
          <SelectField label="Gender *" value={inputData.sex} options={['Male', 'Female', 'Other']} onChange={e => setInputData({ ...inputData, sex: e.target.value })} />

          <InputField label="Father's Name *" value={inputData.fatherName} onChange={e => setInputData({ ...inputData, fatherName: e.target.value })} />
          <InputField label="Mother's Name" value={inputData.motherName} onChange={e => setInputData({ ...inputData, motherName: e.target.value })} />
          <InputField label="Father's Mobile *" type="tel" value={inputData.fatherMob} onChange={e => setInputData({ ...inputData, fatherMob: e.target.value })} />
          <InputField label="Mother's Mobile" type="tel" value={inputData.motherMob} onChange={e => setInputData({ ...inputData, motherMob: e.target.value })} />

          <InputField label="Caste" value={inputData.caste} onChange={e => setInputData({ ...inputData, caste: e.target.value })} />
          <InputField label="Sub Caste" value={inputData.subCaste} onChange={e => setInputData({ ...inputData, subCaste: e.target.value })} />
          <InputField label="Religion" value={inputData.religion} onChange={e => setInputData({ ...inputData, religion: e.target.value })} />
          <InputField label="Category" value={inputData.category} onChange={e => setInputData({ ...inputData, category: e.target.value })} />
          <InputField label="Email" type="email" value={inputData.email} onChange={e => setInputData({ ...inputData, email: e.target.value })} />
        </div>
        <div className="mt-4">
          <InputField label="Address *" value={inputData.address} onChange={e => setInputData({ ...inputData, address: e.target.value })} />
        </div>
      </div>

      {/* Academic Info */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-purple-600">Academic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <SelectField label="Class *" value={inputData.class} options={school.class} onChange={e => setInputData({ ...inputData, class: e.target.value })} />
          <SelectField label="Division *" value={inputData.div} options={school.divisions} onChange={e => setInputData({ ...inputData, div: e.target.value })} />
          <InputField label="Academic Year *" value={inputData.Ayear} onChange={e => setInputData({ ...inputData, Ayear: e.target.value })} />
          <SelectField label="Student Type *" value={inputData.type} options={['DSS', 'DSR', 'DS']} onChange={e => setInputData({ ...inputData, type: e.target.value })} />
          <InputField label="Bus No plate" value={inputData.busNo} onChange={e => setInputData({ ...inputData, busNo: e.target.value })} />
          <InputField label="Bus stop" value={inputData.busStop} onChange={e => setInputData({ ...inputData, busStop: e.target.value })} />
          <InputField label="Fee ID *" value={inputData.feeID} onChange={e => setInputData({ ...inputData, feeID: e.target.value })} />
          <SelectField label="Status *" value={inputData.status} options={['inactive', 'current', 'new']} onChange={e => setInputData({ ...inputData, status: e.target.value })} />
        </div>
      </div>

      {/* Fee Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-purple-600">Fee Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <InputField label="Tuition Fee" type="number" value={inputData.tutionFee} onChange={e => setInputData({ ...inputData, tutionFee: e.target.value })} />
          <InputField label="Tuition Fees Discount" type="number" value={inputData.tutionFeesDiscount} onChange={e => setInputData({ ...inputData, tutionFeesDiscount: e.target.value })} />
          <InputField label="Paid Tuition" type="number" value={inputData.tutionPaidFee} onChange={e => setInputData({ ...inputData, tutionPaidFee: e.target.value })} />

          <InputField label="Transport Fee" type="number" value={inputData.transportFee} onChange={e => setInputData({ ...inputData, transportFee: e.target.value })} />
          <InputField label="Transport Discount" type="number" value={inputData.transportDiscount} onChange={e => setInputData({ ...inputData, transportDiscount: e.target.value })} />
          <InputField label="Paid Transport" type="number" value={inputData.transportFeePaid} onChange={e => setInputData({ ...inputData, transportFeePaid: e.target.value })} />

          <InputField label="Last Year Discount" type="number" value={inputData.lastYearDiscount} onChange={e => setInputData({ ...inputData, lastYearDiscount: e.target.value })} />
        </div>
      </div>

      {/* Additional Info */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-purple-600">Additional Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <InputField label="Saral" value={inputData.saral} onChange={e => setInputData({ ...inputData, saral: e.target.value })} />
          <InputField label="Aadhar" value={inputData.aadhar} onChange={e => setInputData({ ...inputData, aadhar: e.target.value })} />
          <InputField label="GrNo" value={inputData.grNo} onChange={e => setInputData({ ...inputData, grNo: e.target.value })} />
          <InputField label="PEN" value={inputData.penNo} onChange={e => setInputData({ ...inputData, penNo: e.target.value })} />
        </div>
      </div>

      <div>
        <button type="submit" disabled={submitting}
          className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition font-semibold">
          {submitting ? 'Importing...' : 'Import Student'}
        </button>
      </div>
    </form>
  </div>
</div>

    );
}