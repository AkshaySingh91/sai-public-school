import React, { useState, useEffect } from 'react';
import { Edit, Trash, Plus, X, Save, GraduationCap, DollarSign, Clock, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

const CoursesManagement = ({ academicSettings, setAcademicSettings, userData, saveSection }) => {

    const [showCourseModal, setShowCourseModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState({
        name: '',
        code: '',
        totalFees: '',
        duration: '',
        durationType: 'years',
        description: '',
        eligibility: '',
        seats: ''
    });

    const [errors, setErrors] = useState({});

    // Reset form
    const resetForm = () => {
        setCourseForm({
            name: '',
            code: '',
            totalFees: '',
            duration: '',
            durationType: 'years',
            description: '',
            eligibility: '',
            seats: ''
        });
        setErrors({});
        setEditingCourse(null);
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!courseForm.name.trim()) newErrors.name = 'Course name is required';
        if (!courseForm.code.trim()) newErrors.code = 'Course code is required';
        if (!courseForm.totalFees || courseForm.totalFees <= 0) newErrors.totalFees = 'Valid total fees is required';
        if (!courseForm.duration || courseForm.duration <= 0) newErrors.duration = 'Valid duration is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setCourseForm(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Open modal for adding new course
    const handleAddCourse = () => {
        resetForm();
        setShowCourseModal(true);
    };

    // Open modal for editing existing course
    const handleEditCourse = (index) => {
        const course = academicSettings.courses[index];
        setCourseForm({
            name: course.name || '',
            code: course.code || '',
            totalFees: course.totalFees || '',
            duration: course.duration || '',
            durationType: course.durationType || 'years',
            description: course.description || '',
            eligibility: course.eligibility || '',
            seats: course.seats || ''
        });
        setEditingCourse(index);
        setShowCourseModal(true);
    };

    // Save course (add or edit)
    const handleSaveCourse = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const newCourse = {
            ...courseForm,
            totalFees: parseFloat(courseForm.totalFees),
            duration: parseFloat(courseForm.duration),
            seats: courseForm.seats ? parseInt(courseForm.seats) : null,
            id: editingCourse !== null ? academicSettings.courses[editingCourse].id : Date.now()
        };

        let updatedCourses;
        if (editingCourse !== null) {
            // Edit existing course
            updatedCourses = academicSettings.courses.map((course, index) =>
                index === editingCourse ? newCourse : course
            );
        } else {
            // Add new course
            updatedCourses = [...academicSettings.courses, newCourse];
        }
        let updatedAcademicSetting = null;
        setAcademicSettings(prev => {
            updatedAcademicSetting = {
                ...prev,
                courses: updatedCourses
            }
            return {
                ...prev,
                courses: updatedCourses
            }
        });
        if (updatedAcademicSetting.courses.length === 0) {
            return Swal.fire({
                icon: 'error',
                title: 'No Courses',
                text: 'Please add at least one course.'
            });
        }

        // Call parent update function
        saveSection && saveSection('academic', updatedAcademicSetting);


        setShowCourseModal(false);
        resetForm();
    };

    // Delete course
    const handleDeleteCourse = (index) => {
        Swal.fire({
            title: 'Delete Course?',
            text: `Are you sure you want to delete this course?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (!result.isConfirmed) return;

            //  Compute the new state
            const updatedCourses = academicSettings.courses.filter((_, i) => i !== index);
            const newAcademicSettings = {
                ...academicSettings,
                courses: updatedCourses
            };

            // Update React state
            setAcademicSettings(newAcademicSettings);

            //  Persist the change in the parent
            saveSection?.('academic', newAcademicSettings);
        });
    };


    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <>
            {/* Header Section */}
            <div className="flex items-center justify-between col-span-2">
                <div>
                    <h2 className="text-md font-bold text-gray-700">Course Management</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage your academic courses and programs</p>
                </div>
                {userData.privilege?.toLowerCase() !== "read" && (
                    <button
                        type="button"
                        onClick={handleAddCourse}
                        className="whitespace-nowrap text-sm inline-flex items-center gap-2 px-2 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        Add Course
                    </button>
                )}
            </div>

            {/* Courses Grid */}
            {academicSettings.courses.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses available</h3>
                    <p className="text-gray-500 mb-6">Get started by adding your first course</p>
                    {userData.privilege?.toLowerCase() !== "read" && (
                        <button
                            type="button"
                            onClick={handleAddCourse}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                        >
                            <Plus size={18} />
                            Add Course
                        </button>
                    )}
                </div>
            ) : (
                academicSettings.courses.map((course, index) => (
                    <div
                        key={course.id || index}
                        className="group bg-white border border-gray-200 rounded-2xl p-2 hover:shadow-sm hover:border-green-200 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        {/* Course Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <GraduationCap className="text-white" size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                                        {course.name}
                                    </h3>
                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full mt-1">
                                        {course.code}
                                    </span>
                                </div>
                            </div>

                            {userData.privilege?.toLowerCase() !== "read" && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        type="button"
                                        onClick={() => handleEditCourse(index)}
                                        className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition-colors hover:scale-110 transform duration-200"
                                        title="Edit Course"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCourse(index)}
                                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors hover:scale-110 transform duration-200"
                                        title="Delete Course"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Course Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="flex items-center gap-3 p-2 bg-green-50 rounded-xl border border-green-100">
                                <div>
                                    <p className="whitespace-nowrap text-xs text-green-600 font-medium uppercase tracking-wider">Total Fees</p>
                                    <p className="whitespace-nowrap text-xs font-bold text-green-700">{formatCurrency(course.totalFees)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-xl border border-blue-100">
                                <div>
                                    <p className="whitespace-nowrap text-xs text-blue-600 font-medium uppercase tracking-wider">Duration</p>
                                    <p className="whitespace-nowrap text-xs font-bold text-blue-700">{course.duration} {course.durationType}</p>
                                </div>
                            </div>

                            {course.seats && (
                                <div className="flex items-center gap-3 p-2 bg-orange-50 rounded-xl border border-orange-100">
                                    <div>
                                        <p className="whitespace-nowrap text-xs text-orange-600 font-medium uppercase tracking-wider">Seats</p>
                                        <p className="whitespace-nowrap text-xs font-bold text-orange-700">{course.seats}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Course Details */}
                        <div className="space-y-4">
                            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    Description
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed">{course.description || "-"}</p>
                            </div>

                            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Eligibility Criteria
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed">{course.eligibility || "-"}</p>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {/* Enhanced Modal */}
            {showCourseModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="relative bg-gradient-to-r from-green-600 to-green-700 px-6 py-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-md font-bold text-white">
                                        {editingCourse !== null ? 'Edit Course' : 'Add New Course'}
                                    </h3>
                                    <p className="text-sm text-green-100 mt-1">
                                        {editingCourse !== null ? 'Update course information' : 'Create a new academic course'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCourseModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white hover:scale-110 transform duration-200"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            {/* Basic Information Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                        <GraduationCap className="text-green-600" size={14} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900">Basic Information</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Course Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={courseForm.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className={`text-sm w-full px-2 py-2 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            placeholder="e.g., Bachelor of Education"
                                        />
                                        {errors.name && (
                                            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Course Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={courseForm.code}
                                            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                                            className={`text-sm w-full  px-2 py-2  border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 ${errors.code ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            placeholder="e.g., B.ED"
                                        />
                                        {errors.code && (
                                            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                                {errors.code}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Financial & Duration Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                        <DollarSign className="text-green-600" size={14} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900">Course Details</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-3">
                                            Total Fees (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            value={courseForm.totalFees}
                                            onChange={(e) => handleInputChange('totalFees', e.target.value)}
                                            className={`text-sm w-full px-2 py-2 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 ${errors.totalFees ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            placeholder="50000"
                                            min="0"
                                        />
                                        {errors.totalFees && (
                                            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                                {errors.totalFees}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-3">
                                            Duration *
                                        </label>
                                        <input
                                            type="number"
                                            value={courseForm.duration}
                                            onChange={(e) => handleInputChange('duration', e.target.value)}
                                            className={`text-sm w-full px-2 py-2 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 ${errors.duration ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            placeholder="2"
                                            min="0"
                                            step="0.5"
                                        />
                                        {errors.duration && (
                                            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                                {errors.duration}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-3">
                                            Duration Type
                                        </label>
                                        <select
                                            value={courseForm.durationType}
                                            onChange={(e) => handleInputChange('durationType', e.target.value)}
                                            className="w-full px-2 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                                        >
                                            <option value="years">Years</option>
                                            <option value="months">Months</option>
                                            <option value="weeks">Weeks</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-3">
                                            Available Seats
                                        </label>
                                        <input
                                            type="number"
                                            value={courseForm.seats}
                                            onChange={(e) => handleInputChange('seats', e.target.value)}
                                            className="text-sm w-full px-2 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                                            placeholder="50"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FileText className="text-blue-600" size={18} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900">Additional Information</h4>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-3">
                                            Course Description
                                        </label>
                                        <textarea
                                            value={courseForm.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            rows={4}
                                            className={`text-sm w-full px-2 py-2 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 resize-none ${errors.description ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            placeholder="Provide a comprehensive description of the course, including objectives, curriculum highlights, and career prospects..."
                                        />
                                        {errors.description && (
                                            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                                {errors.description}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-3">
                                            Eligibility Criteria
                                        </label>
                                        <textarea
                                            value={courseForm.eligibility}
                                            onChange={(e) => handleInputChange('eligibility', e.target.value)}
                                            rows={3}
                                            className={`text-sm w-full px-2 py-2 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 resize-none ${errors.eligibility ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            placeholder="Specify the minimum educational qualifications, percentage requirements, and any other criteria..."
                                        />
                                        {errors.eligibility && (
                                            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                                {errors.eligibility}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-4 p-4 bg-gray-50 border-t border-gray-200">
                            <button
                                onClick={() => setShowCourseModal(false)}
                                className="px-6 py-3 text-gray-600 hover:bg-gray-200 rounded-xl transition-all duration-200 font-medium hover:scale-105 transform"
                            >
                                Cancel
                            </button>
                            <button
                                type='button'
                                onClick={handleSaveCourse}
                                className="text-md px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-md"
                            >
                                {editingCourse !== null ? 'Update Course' : 'Add Course'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};

export default CoursesManagement;