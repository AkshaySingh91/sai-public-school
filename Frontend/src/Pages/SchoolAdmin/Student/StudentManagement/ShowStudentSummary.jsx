import Swal from "sweetalert2";
import { IndianRupeeIcon } from "lucide-react"

const ShowStudentSummary = async (studentData) => {
    const confirm = await Swal.fire({
        title: `<div class="text-center"> 
            <span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Student Summary</span>
        </div>`,

        html: `
<div class="text-left ">
    <!-- Student Information Card -->
    <div class="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-2 shadow-sm">
        <div class="grid grid-cols-2 gap-2 ">
            <div class="flex flex-col">
                <span class="text-xs font-medium text-blue-600 uppercase tracking-wide">Fee ID</span>
                <span class="text-sm font-semibold text-gray-800">${studentData.feeId || 'N/A'}</span>
            </div>
            <div class="flex flex-col">
                <span class="text-xs font-medium text-blue-600 uppercase tracking-wide">Status</span>
                <span class="text-sm font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg inline-block w-fit capitalize">${studentData.status || 'N/A'}</span>
            </div>
        </div>
        
        <div class=" ">
            <div class="flex justify-between items-center py-1.5 border-b border-blue-100">
                <span class="text-sm font-medium text-gray-600">Student:</span>
                <span class="text-sm font-bold text-gray-800 capitalize">${studentData.fname} ${studentData.fatherName} ${studentData.lname}</span>
            </div>
            <div class="flex justify-between items-center py-1.5 border-b border-blue-100">
                <span class="text-sm font-medium text-gray-600">Class - Div:</span>
                <span class="text-sm font-bold text-gray-800 bg-white px-2 py-1 rounded-md">${studentData.class} - ${studentData.div.toUpperCase()}</span>
            </div>
            <div class="flex justify-between items-center py-1.5 border-b border-blue-100">
                <span class="text-sm font-medium text-gray-600">Contact:</span>
                <span class="text-sm font-bold text-gray-800">${studentData.fatherMobile}</span>
            </div>
            <div class="flex justify-between items-center py-1.5">
                <span class="text-sm font-medium text-gray-600">Student Type:</span>
                <span class="text-sm font-bold text-gray-800 bg-gradient-to-r from-purple-100 to-pink-100 px-2 py-1 rounded-md uppercase">${studentData.type}</span>
            </div>
        </div>
    </div>

    <!-- Fee Details Section -->
    <div class="space-y-3">
        <!-- Tuition Fees -->
        <div class="bg-white border-l-4 border-blue-500 shadow-md rounded-xl p-2">
            <h4 class="font-bold text-blue-700 flex items-center gap-2 text-sm">
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-book text-blue-600 text-xs"></i>
                </div>
                Tuition Fees
            </h4>
            <div class="bg-gray-50 rounded-lg p-3 space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-gray-700">Admission Fee:</span>
                    <span class="text-sm font-bold text-gray-800 bg-white px-2 py-1 rounded-md">₹${studentData?.allFee?.tuitionFees?.AdmissionFee?.toLocaleString('en-IN') || '0'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-gray-700">Annual Tuition:</span>
                    <span class="text-sm font-bold text-gray-800 bg-white px-2 py-1 rounded-md">₹${studentData?.allFee?.tuitionFees?.tuitionFee?.toLocaleString('en-IN') || '0'}</span>
                </div>
                <div class="flex justify-between items-center pt-2 border-t-2 border-blue-200 mt-3">
                    <span class="text-sm font-bold text-blue-700">Total Tuition:</span>
                    <span class="text-lg font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">₹${studentData?.allFee?.tuitionFees?.total?.toLocaleString('en-IN') || '0'}</span>
                </div>
            </div>
        </div>
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 gap-3">
            <div class="bg-gradient-to-br from-emerald-50 to-green-100 border-l-4 border-emerald-500 rounded-xl p-2 shadow-md">
                <div class="flex items-center gap-2  "> 
                    <h4 class="text-sm font-bold text-emerald-700">Discount</h4>
                </div>
                <p class="text-xl font-black text-emerald-600">₹${studentData?.allFee?.tuitionFeesDiscount?.toLocaleString('en-IN') || '0'}</p>
            </div>
            
            <div class="bg-gradient-to-br from-blue-50 to-cyan-100 border-l-4 border-blue-500 rounded-xl p-2 shadow-md">
                <div class="flex items-center gap-2 "> 
                    <h4 class="text-sm font-bold text-blue-700">Payable</h4>
                </div>
                <p class="text-xl font-black text-blue-600">₹${studentData?.allFee?.tuitionFees?.total?.toLocaleString('en-IN') || '0'}</p>
            </div>
        </div>
    </div>
</div>
        `,
        showCloseButton: true,
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Add Student',
        confirmButtonColor: '#0ea5e9',
        cancelButtonColor: '#9ca3af',
        focusConfirm: false,
        customClass: {
            popup: 'rounded-2xl max-w-lg shadow-2xl',
            title: 'text-center pb-2',
            htmlContainer: 'text-left py-2',
            confirmButton: 'text-sm font-bold px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transform hover:scale-105 transition-all duration-200',
            cancelButton: 'text-sm font-bold px-6 py-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 mr-3 shadow-md transform hover:scale-105 transition-all duration-200',
            actions: 'mt-6 flex justify-center gap-3'
        },
        showClass: {
            popup: 'animate-fade-in-up'
        },
        hideClass: {
            popup: 'animate-fade-out-down'
        }
    });

    return confirm.isConfirmed;
}
export default ShowStudentSummary;