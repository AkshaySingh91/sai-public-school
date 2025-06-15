import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Settings, User, ChevronLeft, ChevronRight, SortAsc, SortDesc, AlertCircle, CheckCheckIcon } from 'lucide-react';
import CollegeTableLoader from '../../../../components/CollegeTableLoader';

// Mock Firebase integration - replace with actual Firebase calls
const mockStudents = [
    {
        id: "1",
        fName: "Rahul",
        middleName: "Kumar",
        surname: "Sharma",
        dateOfBirth: "2002-05-15",
        category: "General",
        gender: "Male",
        phone: "9876543210",
        email: "rahul@example.com",
        course: "Computer Science",
        status: "current",
        courseEndYear: 2025,
        studentCurrentYear: 3,
        isAllDocSubmited: true,
        updatedAt: "2024-06-10T10:30:00Z",
        avatar: null,
        collegeCode: "ABC123"
    },
    {
        id: "2",
        fName: "Priya",
        middleName: "Devi",
        surname: "Patel",
        dateOfBirth: "2003-08-22",
        category: "OBC",
        gender: "Female",
        phone: "8765432109",
        email: "priya@example.com",
        course: "Electronics",
        status: "new",
        courseEndYear: 2026,
        studentCurrentYear: 2,
        isAllDocSubmited: false,
        updatedAt: "2024-06-11T14:20:00Z",
        avatar: null,
        collegeCode: "ABC123"
    },
    {
        id: "3",
        fName: "Amit",
        middleName: "Singh",
        surname: "Verma",
        dateOfBirth: "2001-12-03",
        category: "SC",
        gender: "Male",
        phone: "7654321098",
        email: "amit@example.com",
        course: "Mechanical",
        status: "inactive",
        courseEndYear: 2024,
        studentCurrentYear: 4,
        isAllDocSubmited: true,
        updatedAt: "2024-06-09T09:15:00Z",
        avatar: null,
        collegeCode: "ABC123"
    },
    {
        id: "4",
        fName: "Sneha",
        middleName: "Rani",
        surname: "Gupta",
        dateOfBirth: "2004-01-18",
        category: "General",
        gender: "Female",
        phone: "6543210987",
        email: "sneha@example.com",
        course: "Civil",
        status: "current",
        courseEndYear: 2027,
        studentCurrentYear: 1,
        isAllDocSubmited: true,
        updatedAt: "2024-06-12T16:45:00Z",
        avatar: null,
        collegeCode: "ABC123"
    }
];

// Mock context hook
const useInstitution = () => ({
    school: { code: "ABC123" }
});

const CollegeStudentTable = () => {
    const { school: college } = useInstitution();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter and search states
    const [searchTerm, setSearchTerm] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Mock Firebase fetch function
    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            // Simulate API call delay
            setTimeout(() => {
                const filteredStudents = mockStudents.filter(
                    student => student.collegeCode === college.code
                );
                setStudents(filteredStudents);
                setLoading(false);
            }, 1000);
        };

        fetchStudents();
    }, [college.code]);

    // Get unique values for filter options
    const uniqueCourses = [...new Set(students.map(s => s.course))];
    const uniqueCategories = [...new Set(students.map(s => s.category))];
    const uniqueYears = [...new Set(students.map(s => s.studentCurrentYear))];

    // Filter and search logic
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch = searchTerm === '' ||
                student.fName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.middleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.surname.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCourse = courseFilter === '' || student.course === courseFilter;
            const matchesCategory = categoryFilter === '' || student.category === categoryFilter;
            const matchesYear = yearFilter === '' || student.studentCurrentYear.toString() === yearFilter;
            const matchesStatus = statusFilter === '' || student.status === statusFilter;

            return matchesSearch && matchesCourse && matchesCategory && matchesYear && matchesStatus;
        }).sort((a, b) => {
            const dateA = new Date(a.updatedAt);
            const dateB = new Date(b.updatedAt);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [students, searchTerm, courseFilter, categoryFilter, yearFilter, statusFilter, sortOrder]);

    // Pagination logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentStudents = filteredStudents.slice(startIndex, endIndex);

    // Helper functions
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
        switch (status) {
            case 'new':
                return `${baseClasses} bg-blue-100 text-blue-800`;
            case 'current':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'inactive':
                return `${baseClasses} bg-gray-100 text-gray-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const navigateToStudent = (id) => {
        // In real implementation: navigate(`/college/student/${id}`)
        console.log(`Navigate to /college/student/${id}`);
    };

    if (loading) {
        return (
            <CollegeTableLoader rows={10} />
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen w-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-green-900">Student Management</h1>
                    <p className="text-green-600 mt-1">Manage and view all college students</p>
                </div>

                {/* Filters and Search */}
                <div className="px-6 py-4 bg-green-50 border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Search Bar */}
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        {/* Course Filter */}
                        <select
                            value={courseFilter}
                            onChange={(e) => setCourseFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">All Courses</option>
                            {uniqueCourses.map(course => (
                                <option key={course} value={course}>{course}</option>
                            ))}
                        </select>

                        {/* Category Filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">All Categories</option>
                            {uniqueCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>

                        {/* Year Filter */}
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">All Years</option>
                            {uniqueYears.map(year => (
                                <option key={year} value={year}>Year {year}</option>
                            ))}
                        </select>

                        {/* Status Filter & Sort */}
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">All Status</option>
                                <option value="new">New</option>
                                <option value="current">Current</option>
                                <option value="inactive">Inactive</option>
                            </select>

                            <button
                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                title="Sort by Last Updated"
                            >
                                {sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-none">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r text-center from-emerald-600 via-teal-600 to-green-600 text-white">
                            <tr>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Avatar</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Name</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Course</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Status</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Year</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">End Year</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Docs</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Phone</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Gender</th>
                                <th className="px-2 py-2 text-left text-sm font-semibold tracking-wide">Last Updated</th>
                                <th className="px-3 py-2 text-center text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentStudents.map((student, index) => (
                                <tr key={student.id} className={`${index % 2 === 0 ?
                                    'bg-gradient-to-r from-white via-emerald-50/30 to-white hover:from-emerald-50/50 hover:via-emerald-50/40 hover:to-emerald-50/50' :
                                    'bg-gradient-to-r from-emerald-50/20 via-white to-emerald-50/20 hover:from-emerald-50/40 hover:via-emerald-50/30 hover:to-emerald-50/40'} t
                                    transition-all duration-200 hover:shadow-sm hover:scale-[1.001]`}>
                                    <td className="px-3 py-2">
                                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                            {student.profileImage && student.profileImagePath ? (
                                                <img
                                                    src={student.profileImage}
                                                    alt="Student"
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <User className="h-5 w-5 text-green-600" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="text-sm font-medium text-gray-900">
                                            {student.fName} {student.middleName} {student.surname}
                                        </div>
                                        <div className="text-xs text-gray-500">{student.email}</div>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900">{student.course}</td>
                                    <td className="px-3 py-2">
                                        <span className={getStatusBadge(student.status)}>
                                            {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900">{student.studentCurrentYear}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900">{student.courseEndYear}</td>
                                    <td className="px-4 py-4">
                                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${student.isAllDocSubmited
                                            ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-200'
                                            : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200'
                                            }`}>
                                            {student.isAllDocSubmited ?
                                                <p className='flex leading-0 gap-1'><CheckCheckIcon className='w-3 h-3 text-green-800' />
                                                    <span className='my-auto'>Completed</span>
                                                </p> :
                                                <p className='flex leading-0 gap-1'><AlertCircle className='w-3 h-3 text-red-800' />
                                                    <span className='my-auto'>Pending</span>
                                                </p>
                                            }
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900">{student.phone}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900">{student.gender}</td>
                                    <td className="px-3 py-2 text-xs text-gray-900">
                                        {formatDateTime(student.updatedAt)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => navigateToStudent(student.id)}
                                            className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                            title="View Details"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* No Results */}
                {filteredStudents.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-500">No students found matching your criteria.</div>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-green-50 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} results
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </button>

                                <div className="flex items-center space-x-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={`px-3 py-2 text-sm rounded-lg ${currentPage === i + 1
                                                ? 'bg-green-600 text-white'
                                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export default CollegeStudentTable