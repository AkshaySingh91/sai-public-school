import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase"; // your firebase config

const AddPaymentTable = ({ studentId, schoolId, studentClass }) => {
  const today = new Date().toISOString().substr(0, 10);

  const [paymentData, setPaymentData] = useState({
    date: today,
    itemName: "",
    feeType: "ITEMFEE",
    account: "",
    amount: "",
    remark: ""
  });

  const [availableItems, setAvailableItems] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        const q = query(collection(db, "allStocks"), where("className", "==", studentClass));
        const querySnapshot = await getDocs(q);
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push(doc.data());
        });
        setAvailableItems(items);
      } catch (error) {
        console.error("Error fetching stock items: ", error);
      }
    };

    const fetchAccounts = async () => {
        try {
          console.log("Fetching accounts...");
          console.log("schoolId:", schoolId);  // Check if the schoolId is correct
          
          const schoolRef = doc(db, "schools", schoolId);  // Reference to the school document
          const schoolSnap = await getDoc(schoolRef);  // Fetch the document
          
          console.log("schoolSnap:", schoolSnap.exists());  // Check if the document exists
          
          if (schoolSnap.exists()) {
            const schoolData = schoolSnap.data();  // Get the data from the document
            console.log("schoolData:", schoolData);  // Log the school data
            
            // Make sure accounts field exists and set it to state
            setAccounts(schoolData.accounts || []);
          } else {
            console.error("No such school document exists with ID:", schoolId);
          }
        } catch (error) {
          console.error("Error fetching accounts:", error);  // Log any errors
        }
    };

    fetchStockItems();
    fetchAccounts();
  }, [studentClass, schoolId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === "itemName") {
      const selectedItem = availableItems.find(item => item.itemName === value);
      if (selectedItem) {
        setPaymentData(prev => ({
          ...prev,
          amount: selectedItem.sellingPrice || ""
        }));
      }
    }
  };

  const handleAddPayment = async () => {
    if (!paymentData.itemName || !paymentData.account || !paymentData.amount) {
      alert("Please fill all required fields (Item Name, Account, Amount)");
      return;
    }

    try {
      const studentRef = doc(db, "students", studentId);
      await updateDoc(studentRef, {
        StockPaymentDetail: arrayUnion({
          ...paymentData,
          amount: Number(paymentData.amount)
        })
      });

      alert("Payment added successfully!");

      setPaymentData({
        date: today,
        itemName: "",
        feeType: "ITEMFEE",
        account: "",
        amount: "",
        remark: ""
      });
    } catch (error) {
      console.error("Error adding payment: ", error);
      alert("Failed to add payment");
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Add Payment</h2>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border border-gray-300 rounded-lg shadow-sm">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="border-b px-4 py-3 text-left font-medium">Date</th>
              <th className="border-b px-4 py-3 text-left font-medium">Item Name</th>
              <th className="border-b px-4 py-3 text-left font-medium">Fee Type</th>
              <th className="border-b px-4 py-3 text-left font-medium">Account</th>
              <th className="border-b px-4 py-3 text-left font-medium">Amount</th>
              <th className="border-b px-4 py-3 text-left font-medium">Remark</th>
              <th className="border-b px-4 py-3 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b px-4 py-3">
                <input
                  type="date"
                  name="date"
                  value={paymentData.date}
                  onChange={handleChange}
                  className="border px-3 py-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="border-b px-4 py-3">
                <select
                  name="itemName"
                  value={paymentData.itemName}
                  onChange={handleChange}
                  className="border px-3 py-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Item</option>
                  {availableItems.map((item, index) => (
                    <option key={index} value={item.itemName}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border-b px-4 py-3">
                <input
                  type="text"
                  name="feeType"
                  value={paymentData.feeType}
                  readOnly
                  className="border px-3 py-2 w-full bg-gray-100 rounded-md"
                />
              </td>
              <td className="border-b px-4 py-3">
                <select
                  name="account"
                  value={paymentData.account}
                  onChange={handleChange}
                  className="border px-3 py-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc, idx) => (
                    <option key={idx} value={acc.AccountNo}>
                      {acc.AccountNo} {acc.BankName && `(${acc.BankName})`}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border-b px-4 py-3">
                <input
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handleChange}
                  placeholder="Amount"
                  className="border px-3 py-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="border-b px-4 py-3">
                <input
                  type="text"
                  name="remark"
                  value={paymentData.remark}
                  onChange={handleChange}
                  placeholder="Remark"
                  className="border px-3 py-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="border-b px-4 py-3 text-center">
                <button
                  onClick={handleAddPayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Payment
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddPaymentTable;
