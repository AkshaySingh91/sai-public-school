// src/components/Admin/SchoolPaymentStructure.jsx
import { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useSchool } from '../../../contexts/SchoolContext';

const PaymentStructure = () => {
  const { userData } = useAuth();
  const { school } = useSchool();
  const [paymentModes, setPaymentModes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [newMode, setNewMode] = useState('');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountDetails, setAccountDetails] = useState({
    AccountNo: '',
    IFSC: '',
    BankName: '',
    Branch: ''
  });
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(-1);

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const schoolsRef = collection(db, 'schools');
        const q = query(schoolsRef, where("Code", "==", school.Code));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const schoolDoc = querySnapshot.docs[0];
          setAccounts(schoolDoc.data().accounts || []);
          setPaymentModes(schoolDoc.data().paymentModes || []);
        }
      } catch (error) {
        console.error("Error fetching school data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchoolData();
  }, [userData, school.Code]);

  const handleAddPaymentMode = async () => {
    const mode = newMode.trim().toUpperCase();
    if (!mode || paymentModes.includes(mode)) return;

    try {
      const schoolsRef = collection(db, 'schools');
      const q = query(schoolsRef, where("Code", "==", school.Code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("School not found");

      const schoolDoc = querySnapshot.docs[0];
      const updatedModes = [...paymentModes, mode];

      await updateDoc(doc(db, 'schools', schoolDoc.id), {
        paymentModes: updatedModes
      });

      setPaymentModes(updatedModes);
      setNewMode('');
    } catch (error) {
      console.error("Error adding payment mode:", error);
    }
  };
  const handleDeleteMode = async (mode) => {
    if (!mode || !paymentModes.includes(mode.toUpperCase().trim())) return;

    try {
      const schoolsRef = collection(db, 'schools');
      const q = query(schoolsRef, where("Code", "==", school.Code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("School not found");
      const schoolDoc = querySnapshot.docs[0];
      const updatedModes = paymentModes.filter(p => p.toUpperCase().trim() !== mode.toUpperCase().trim());
      ({ updatedModes })
      await updateDoc(doc(db, 'schools', schoolDoc.id), {
        paymentModes: updatedModes
      });
      setPaymentModes(updatedModes);
    } catch (error) {
      console.error("Error adding payment mode:", error);
    }
  }
  const handleSaveAccount = async () => {
    try {
      const { AccountNo, BankName, IFSC, Branch } = accountDetails;
      if (AccountNo.trim() === '') return;

      if (AccountNo?.toLowerCase().trim() !== 'cash' && (!BankName || !IFSC || !Branch)) {
        alert('Please fill all bank details');
        return;
      }

      const schoolsRef = collection(db, 'schools');
      const q = query(schoolsRef, where("Code", "==", school.Code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("School not found");

      const schoolDoc = querySnapshot.docs[0];
      const updatedAccounts = editingIndex === -1
        ? [...accounts, accountDetails]
        : accounts.map((acc, index) =>
          index === editingIndex ? accountDetails : acc
        );
      await updateDoc(doc(db, 'schools', schoolDoc.id), {
        accounts: updatedAccounts
      });

      setAccounts(updatedAccounts);
      setShowAddAccount(false);
      setAccountDetails({ AccountNo: '', IFSC: '', BankName: '', Branch: '' });
      setEditingIndex(-1);
    } catch (error) {
      console.error("Error saving account:", error);
    }
  };

  // Loading Skeleton Component
  const SkeletonLoader = () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-purple-100 rounded w-1/2"></div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 bg-purple-50 rounded-lg"></div>
      ))}
    </div>
  );
  const handleDeleteAccount = async (idx) => {
    if (idx < accounts.length) {
      const schoolsRef = collection(db, 'schools');
      const q = query(schoolsRef, where("Code", "==", school.Code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("School not found");

      const schoolDoc = querySnapshot.docs[0];
      const updatedAccounts = accounts.filter((v, i) => i !== idx);
      await updateDoc(doc(db, 'schools', schoolDoc.id), {
        accounts: updatedAccounts
      });
      setAccounts(updatedAccounts);
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-violet-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Payment Methods Section */}
        <div className="sm:bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-purple-100">
          <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 mb-4 sm:mb-6">
            Payment Methods
          </h2>

          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              {
                userData.role !== "superadmin" &&
                <div className="flex flex-col sm:flex-row gap-2 mb-6">
                  <input
                    type="text"
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value)}
                    placeholder="Add payment method (e.g. UPI)"
                    className="border-2 border-purple-200 focus:border-purple-500 rounded-xl p-3 w-full transition-colors"
                  />
                  <button
                    onClick={handleAddPaymentMode}
                    className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-violet-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              }

              <div className="space-y-3">
                {paymentModes.map((mode) => (
                  <div
                    key={mode}
                    className="flex justify-between items-center bg-purple-50 p-4 rounded-lg"
                  >
                    <span className="font-medium text-purple-800">{mode}</span>
                    {
                      userData.role !== "superadmin" &&
                      <button
                        onClick={() => handleDeleteMode(mode)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    }
                  </div>
                ))}
                {paymentModes.length === 0 && (
                  <p className="text-center text-purple-500 py-4">
                    No payment methods added yet
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bank Accounts Section */}
        <div className="sm:bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-purple-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800">
              Bank Accounts
            </h2>
            {
              userData.role !== "superadmin" &&
              <button
                onClick={() => {
                  setShowAddAccount(true);
                  setEditingIndex(-1);
                  setAccountDetails({
                    AccountNo: "",
                    IFSC: "",
                    BankName: "",
                    Branch: "",
                  });
                }}
                className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-violet-700 transition-colors"
              >
                Add Account
              </button>
            }
          </div>

          {/* Add/Edit Form */}
          {showAddAccount && (
            <div className="mb-6 p-4 sm:p-6 bg-violet-50 rounded-xl border border-purple-200">
              <h3 className="text-lg sm:text-xl font-semibold text-purple-800 mb-4">
                {editingIndex === -1 ? "➕ Add New Account" : "✏️ Edit Account"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {
                  userData.role !== "superadmin" &&
                  <div>
                    <label for='account'
                      className="block text-sm font-medium text-purple-700 mb-2">
                      Account Number/Cash
                    </label>
                    <input
                      id="account"
                      type="text"
                      placeholder="Enter 'Cash' for cash payments"
                      value={accountDetails.AccountNo}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAccountDetails((prev) => ({
                          ...prev,
                          AccountNo: value,
                          ...(value === "Cash" && {
                            BankName: "",
                            IFSC: "",
                            Branch: "",
                          }),
                        }));
                      }}
                      className="w-full border-2 border-purple-200 focus:border-purple-500 rounded-lg p-3 transition-colors"
                    />
                  </div>
                }
                {accountDetails.AccountNo !== "Cash" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={accountDetails.BankName}
                        onChange={(e) =>
                          setAccountDetails({
                            ...accountDetails,
                            BankName: e.target.value,
                          })
                        }
                        className="w-full border-2 border-purple-200 focus:border-purple-500 rounded-lg p-3 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={accountDetails.IFSC}
                        onChange={(e) =>
                          setAccountDetails({
                            ...accountDetails,
                            IFSC: e.target.value,
                          })
                        }
                        className="w-full border-2 border-purple-200 focus:border-purple-500 rounded-lg p-3 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={accountDetails.Branch}
                        onChange={(e) =>
                          setAccountDetails({
                            ...accountDetails,
                            Branch: e.target.value,
                          })
                        }
                        className="w-full border-2 border-purple-200 focus:border-purple-500 rounded-lg p-3 transition-colors"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={handleSaveAccount}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingIndex === -1 ? "Save Account" : "Update Account"}
                </button>
                <button
                  onClick={() => {
                    setShowAddAccount(false);
                    setEditingIndex(-1);
                    setAccountDetails({
                      AccountNo: "",
                      IFSC: "",
                      BankName: "",
                      Branch: "",
                    });
                  }}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Table */}
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-2 border-b-2 border-purple-100">
                <div className="text-sm font-medium text-purple-700">
                  Account No
                </div>
                <div className="text-sm font-medium text-purple-700">Bank</div>
                <div className="text-sm font-medium text-purple-700">IFSC</div>
                <div className="text-sm font-medium text-purple-700">
                  Branch
                </div>
              </div>
              {[1, 2, 3].map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-3 animate-pulse"
                >
                  <div className="h-4 bg-purple-100 rounded-full w-3/4"></div>
                  <div className="h-4 bg-purple-100 rounded-full"></div>
                  <div className="h-4 bg-purple-100 rounded-full w-1/2"></div>
                  <div className="h-4 bg-purple-100 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-2 border-b-2 border-purple-100">
                <div className="text-sm font-medium text-purple-700">
                  Account No
                </div>
                <div className="text-sm font-medium text-purple-700">Bank</div>
                <div className="text-sm font-medium text-purple-700">IFSC</div>
                <div className="text-sm font-medium text-purple-700">
                  Branch
                </div>
              </div>

              {accounts.length === 0 && !showAddAccount && (
                <div className="text-center text-purple-500 py-4">
                  No bank accounts found. Add your first account!
                </div>
              )}

              {accounts.map((acc, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-3 hover:bg-purple-50 rounded-lg group"
                >
                  <div className="flex items-center text-purple-800 font-medium">
                    {acc.AccountNo === "Cash" ? "💰 Cash" : acc.AccountNo}
                  </div>
                  <div className="text-purple-600">
                    {acc.BankName || <span className="text-gray-400">-</span>}
                  </div>
                  <div className="text-purple-600">
                    {acc.IFSC || <span className="text-gray-400">-</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-600">
                      {acc.Branch || <span className="text-gray-400">-</span>}
                    </span>
                    {
                      userData.role !== "superadmin" &&
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setAccountDetails(acc);
                            setEditingIndex(index);
                            setShowAddAccount(true);
                          }}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

  );
};

export default PaymentStructure;