import Swal from "sweetalert2";

const ShowStudentSummary = async (studentData) => {
    const confirm = await Swal.fire({
        title: `<div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            </div>
            <span class="text-xl font-semibold text-gray-800">Student Summary</span>
        </div>`,

        html: `
<div class="text-left space-y-4">
    <!-- Student Information Card -->
    <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
        <div class="grid grid-cols-2 gap-3 mb-2">
            <div class="flex flex-col">
                <span class="text-xs text-gray-500">Fee ID</span>
                <span class="text-sm font-medium text-gray-800">${studentData.feeId || 'N/A'}</span>
            </div>
            <div class="flex flex-col">
                <span class="text-xs text-gray-500">Status</span>
                <span class="text-sm font-medium text-green-600">${studentData.status || 'N/A'}</span>
            </div>
        </div>
        
        <div class="space-y-2 mt-2">
            <div class="flex justify-between items-center pb-2 border-b border-blue-100">
                <span class="text-sm text-gray-600">Student:</span>
                <span class="text-sm font-medium text-gray-800">${studentData.fname} ${studentData.fatherName} ${studentData.lname}</span>
            </div>
            <div class="flex justify-between items-center pb-2 border-b border-blue-100">
                <span class="text-sm text-gray-600">Class - Div:</span>
                <span class="text-sm font-medium text-gray-800">${studentData.class} - ${studentData.div.toUpperCase()}</span>
            </div>
            <div class="flex justify-between items-center pb-2 border-b border-blue-100">
                <span class="text-sm text-gray-600">Contact:</span>
                <span class="text-sm font-medium text-gray-800">${studentData.fatherMobile}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Student Type:</span>
                <span class="text-sm font-medium text-gray-800 uppercase">${studentData.type}</span>
            </div>
        </div>
    </div>

    <!-- Fee Details Section -->
    <div class="space-y-4">
        <!-- Tuition Fees -->
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h4 class="font-medium text-blue-700 mb-3 flex items-center gap-2 text-sm">
                <i class="fas fa-book text-blue-500"></i>
                Tuition Fees
            </h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-600">Admission Fee:</span>
                    <span class="text-xs font-medium">₹${studentData?.allFee?.tuitionFees?.AdmissionFee?.toLocaleString('en-IN') || '0'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-600">Annual Tuition:</span>
                    <span class="text-xs font-medium">₹${studentData?.allFee?.tuitionFees?.tuitionFee?.toLocaleString('en-IN') || '0'}</span>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                    <span class="text-xs text-gray-700 font-medium">Total Tuition:</span>
                    <span class="text-xs font-semibold text-blue-600">₹${studentData?.allFee?.tuitionFees?.total?.toLocaleString('en-IN') || '0'}</span>
                </div>
            </div>
        </div>
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 gap-3">
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 flex flex-col items-center">
                <div class="text-green-500 text-xl mb-1">
                    <i class="fas fa-percentage"></i>
                </div>
                <h4 class="text-xs text-gray-600 mb-1">Discount</h4>
                <p class="text-sm font-bold text-green-600">₹${studentData?.allFee?.tuitionFeesDiscount?.toLocaleString('en-IN') || '0'}</p>
            </div>
            
            <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3 flex flex-col items-center">
                <div class="text-blue-500 text-xl mb-1">
                    <i class="fas fa-wallet"></i>
                </div>
                <h4 class="text-xs text-gray-600 mb-1">Payable</h4>
                <p class="text-sm font-bold text-blue-600">₹${studentData?.allFee?.tuitionFees?.total?.toLocaleString('en-IN') || '0'}</p>
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
            popup: 'rounded-xl max-w-md',
            title: 'text-left mb-0 pb-0',
            htmlContainer: 'text-left py-1',
            confirmButton: 'text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300',
            cancelButton: 'text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 mr-2',
            actions: 'mt-3'
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