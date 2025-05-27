import {
    CreditCard, Wallet, PiggyBankIcon, CalendarDays, DollarSign, FileTextIcon
} from "lucide-react"
import { InputField } from '../InputField'
import { SelectField } from '../SelectField'

function TransactionForm({ newTransaction, setNewTransaction, schoolData, handleTransactionSubmit, student }) {
    return (
        <>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-purple-600">
                    <CreditCard className="w-6 h-6 mr-2" />
                    Record New Payment
                </h3>

                <form onSubmit={handleTransactionSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        icon={<CalendarDays />}
                        label="Academic Year"
                        type="text"
                        value={newTransaction.academicYear}
                        onChange={(e) => setNewTransaction({ ...newTransaction, academicYear: e.target.value })}
                    />

                    <SelectField
                        icon={<Wallet />}
                        label="Payment Mode"
                        options={schoolData.paymentModes || []}
                        value={newTransaction.paymentMode}
                        onChange={(e) => setNewTransaction({ ...newTransaction, paymentMode: e.target.value })}
                    />

                    <SelectField
                        icon={<PiggyBankIcon />}
                        label="Account"
                        options={schoolData.accounts?.map(a => `${a.AccountNo} (${a.Branch})`) || []}
                        value={newTransaction.account}
                        onChange={(e) => setNewTransaction({ ...newTransaction, account: e.target.value })}
                    />

                    <InputField
                        icon={<CalendarDays />}
                        label="Date"
                        type="date"
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    />

                    <SelectField
                        icon={<FileTextIcon />}
                        label="Fee Type"
                        // schoolData.feeTypes will only have AdmissionFee, tuitionFee that only school fees thus we need to add all fee
                        options={["AdmissionFee", "TuitionFee", "MessFee", "HostelFee", "BusFee"]}
                        value={newTransaction.feeType}
                        onChange={(e) => {
                            if (e.target.value === "AdmissionFee" && student.type?.toLowerCase() !== "dsr") {
                                setNewTransaction({ ...newTransaction, feeType: e.target.value, amount: "1000" });
                            } else {
                                setNewTransaction({ ...newTransaction, feeType: e.target.value })
                            }
                        }}
                    />

                    <InputField
                        icon={<DollarSign />}
                        label="Amount"
                        type="number"
                        value={newTransaction.amount}
                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    />

                    <div className="md:col-span-2">
                        <InputField
                            icon={<FileTextIcon />}
                            label="Remarks"
                            textarea
                            value={newTransaction.remark}
                            onChange={(e) => setNewTransaction({ ...newTransaction, remark: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="md:col-span-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                    >
                        Record Payment
                    </button>
                </form>
            </div>
        </>
    )
}

export default TransactionForm
