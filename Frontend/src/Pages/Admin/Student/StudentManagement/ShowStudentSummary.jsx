import Swal from "sweetalert2";

export default async function showStudentSummary(studentData) {
    const totalAnnualFees = studentData.allFee.tuitionFees.total;
    const netPayable = totalAnnualFees - studentData.allFee.tuitionFeesDiscount;
    const currentDate = new Date().toLocaleDateString('en-IN');

    // Format date properly
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Create the HTML content for the modal
    const htmlContent = `
        <style>
            .glass-card {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
            }
            .glass-light {
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            .student-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .student-row:last-child {
                border-bottom: none;
            }
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
        </style>
        
        <div class="gradient-bg p-6 -m-6">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <!-- Student Information -->
                <div class="glass-card rounded-xl p-4">
                    <div class="flex items-center gap-2 mb-3">
                        <div class="w-8 h-8 glass-light rounded-lg flex items-center justify-center">
                            <i class="fas fa-user-graduate text-blue-600 text-sm"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-white text-sm">Student Details</h3>
                        </div>
                    </div>
                    
                    <div class="space-y-1">
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Name:</span>
                            <span class="font-medium text-white text-xs">${studentData.fname} ${studentData.lname}</span>
                        </div>
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Class:</span>
                            <span class="font-medium text-white text-xs">${studentData.class}-${studentData.div}</span>
                        </div>
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Type:</span>
                            <span class="px-2 py-0.5 glass-light text-blue-700 text-xs rounded-full">${studentData.type}</span>
                        </div>
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Gender:</span>
                            <span class="font-medium text-white text-xs">${studentData.gender}</span>
                        </div>
                        <div class="student-row">
                            <span class="text-xs text-gray-200">DOB:</span>
                            <span class="font-medium text-white text-xs">${formatDate(studentData.dob)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Parent Information -->
                <div class="glass-card rounded-xl p-4">
                    <div class="flex items-center gap-2 mb-3">
                        <div class="w-8 h-8 glass-light rounded-lg flex items-center justify-center">
                            <i class="fas fa-users text-green-600 text-sm"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-white text-sm">Parent Details</h3>
                        </div>
                    </div>
                    
                    <div class="space-y-1">
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Father:</span>
                            <span class="font-medium text-white text-xs">${studentData.fatherName}</span>
                        </div>
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Mother:</span>
                            <span class="font-medium text-white text-xs">${studentData.motherName}</span>
                        </div>
                        ${studentData.fatherMobile ? `
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Contact:</span>
                            <span class="font-mono text-xs text-white">${studentData.fatherMobile}</span>
                        </div>
                        ` : ''}
                        <div class="student-row">
                            <span class="text-xs text-gray-200">Year:</span>
                            <span class="px-2 py-0.5 glass-light text-green-700 text-xs rounded-full">${studentData.academicYear}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Fee Structure -->
            <div class="glass-card rounded-xl p-4 mb-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 glass-light rounded-lg flex items-center justify-center">
                            <i class="fas fa-receipt text-purple-600 text-sm"></i>
                        </div>
                        <h3 class="font-semibold text-white text-sm">Fee Structure</h3>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-gray-300">ID: ${studentData.feeId}</div>
                    </div>
                </div>
                
                <div class="glass-light rounded-lg p-3">
                    <div class="grid grid-cols-2 gap-4">
                        <!-- Fee Breakdown -->
                        <div>
                            <h4 class="font-medium text-purple-700 mb-2 text-xs flex items-center gap-1">
                                <i class="fas fa-calculator text-xs"></i>
                                Breakdown
                            </h4>
                            <div class="space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-xs text-gray-600">Admission:</span>
                                    <span class="font-medium text-xs">₹${studentData.allFee.tuitionFees.AdmissionFee.toLocaleString('en-IN')}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-xs text-gray-600">Tuition:</span>
                                    <span class="font-medium text-xs">₹${studentData.allFee.tuitionFees.tuitionFee.toLocaleString('en-IN')}</span>
                                </div>
                                <div class="flex justify-between pt-1 border-t border-gray-300">
                                    <span class="text-xs font-medium">Gross:</span>
                                    <span class="font-semibold text-purple-600 text-xs">₹${totalAnnualFees.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment Summary -->
                        <div>
                            <h4 class="font-medium text-purple-700 mb-2 text-xs flex items-center gap-1">
                                <i class="fas fa-money-bill-wave text-xs"></i>
                                Summary
                            </h4>
                            <div class="space-y-1">
                                ${studentData.allFee.tuitionFeesDiscount > 0 ? `
                                <div class="flex justify-between">
                                    <span class="text-xs text-gray-600">Discount:</span>
                                    <span class="font-medium text-green-600 text-xs">-₹${studentData.allFee.tuitionFeesDiscount.toLocaleString('en-IN')}</span>
                                </div>
                                ` : ''}
                                <div class="flex justify-between pt-1 border-t border-gray-300">
                                    <span class="text-xs font-medium">Net Payable:</span>
                                    <span class="font-bold text-green-600 text-sm">₹${netPayable.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Registration Info -->
            <div class="glass-card rounded-lg p-3 text-center">
                <div class="text-xs text-gray-200">Registration: ${currentDate}</div>
            </div>
        </div>
    `;

    // Show the SweetAlert modal
    const result = await Swal.fire({ 
        html: htmlContent,
        icon: false,
        showCancelButton: true,
        reverseButtons: true,
        confirmButtonText: `
            <div class="flex items-center gap-2">
                <i class="fas fa-check"></i>
                <span>Confirm</span>
            </div>
        `,
        cancelButtonText: `
            <div class="flex items-center gap-2">
                <i class="fas fa-edit"></i>
                <span>Edit</span>
            </div>
        `,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#3b82f6',
        width: '750px',
        padding: '0',
        customClass: {
            popup: 'rounded-2xl shadow-2xl border-0',
            header: 'border-b border-gray-100 pb-3 px-4 pt-4',
            title: 'text-center font-normal mb-0',
            htmlContainer: 'p-0',
            actions: 'gap-3 px-4 pb-4 pt-3 border-t border-gray-100',
            confirmButton: 'bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 px-5 rounded-lg transition-colors border-0',
            cancelButton: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-lg transition-colors border-0',
        },
        allowOutsideClick: false,
        allowEscapeKey: true,
        buttonsStyling: false,
        backdrop: 'rgba(0,0,0,0.7)'
    });

    return result.isConfirmed;
}