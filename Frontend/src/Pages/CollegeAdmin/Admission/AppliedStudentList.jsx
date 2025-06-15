import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Settings, User, Calendar, Phone, Mail, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInstitution } from '../../../contexts/InstitutionContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { db } from '../../../config/firebase';
import CollegeTableLoader from '../../../components/CollegeTableLoader';

const AppliedStudentList = () => {
    const { school: college } = useInstitution();
    const navigate = useNavigate();
    // search & filter
    const [searchTerm, setSearchTerm] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    // pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [students, setStudents] = useState([
        {
            id: 1,
            fName: "Arjun",
            middleName: "Kumar",
            surname: "Sharma",
            dateOfBirth: "2004-03-15",
            category: "General",
            gender: "Male",
            phone: "+91-9876543210",
            email: "arjun.sharma@email.com",
            course: "Computer Science Engineering",
            updatedAt: "2024-06-12T14:30:00Z",
            profileImage: null
        },
    ]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            setError(null);

            try {
                const q = query(
                    collection(db, 'appliedCollegeStudents'),
                    where('collegeCode', '==', college.Code)
                );

                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                }));
                console.log(list)
                setStudents(list);
            } catch (err) {
                console.error('Error fetching students:', err);
                setError('Failed to load students. Please try again.');
                Swal.fire({
                    icon: 'error',
                    title: 'Load Error',
                    text: err.message || 'Could not fetch student list.'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [college.Code]);


    // Get unique courses and categories for filters
    const courses = [...new Set(students.map(s => s.course))];
    const categories = [...new Set(students.map(s => s.category.toLowerCase()))];

    // Filter and sort students
    const filteredStudents = useMemo(() => {
        let filtered = students.filter(student => {
            const matchesSearch = searchTerm === '' ||
                student.fName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.middleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.surname.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCourse = courseFilter === '' || student.course === courseFilter;
            const matchesCategory = categoryFilter === '' || student.category === categoryFilter;

            return matchesSearch && matchesCourse && matchesCategory;
        });

        // Sort by updatedAt
        filtered.sort((a, b) => {
            const dateA = new Date(a.updatedAt);
            const dateB = new Date(b.updatedAt);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return filtered;
    }, [students, searchTerm, courseFilter, categoryFilter, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };
    // category bg-color
    const palette = [
        ['bg-blue-100', 'text-blue-800'],
        ['bg-green-100', 'text-green-800'],
        ['bg-red-100', 'text-red-800'],
        ['bg-yellow-100', 'text-yellow-800'],
        ['bg-purple-100', 'text-purple-800'],
        ['bg-indigo-100', 'text-indigo-800'],
        ['bg-pink-100', 'text-pink-800'],
        ['bg-teal-100', 'text-teal-800'],
        ['bg-amber-100', 'text-amber-800'],
        ['bg-emerald-100', 'text-emerald-800'],
    ];

    let categoryColorMap = {};
    useMemo(() => {
        categories.forEach((cat, idx) => {
            const [bg, text] = palette[idx % palette.length];
            categoryColorMap[cat] = { bg, text };
        });
    }, [categories])

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
            </div>
        );
    }

    return (<>
        {
            loading ? <CollegeTableLoader rows={10} cols={5} /> : (
                <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-semibold text-green-800 ">Admission Management System</h1>
                            <p className="text-md text-green-600">Manage student admission applications efficiently</p>
                        </div>

                        {/* Filters and Search */}
                        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Course Filter */}
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 w-4 h-4" />
                                    <select
                                        value={courseFilter}
                                        onChange={(e) => setCourseFilter(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="">All Courses</option>
                                        {courses.map(course => (
                                            <option key={course}
                                                className='capitalize'
                                                value={course}>{course}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category Filter */}
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 w-4 h-4" />
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map(category => (
                                            <option key={category}
                                                className='capitalize'
                                                value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort Button */}
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                    Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-green-600 text-white">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Student</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Name</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Course</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Document</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Category</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Gender</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Phone</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">Applied On</th>
                                            <th className="px-3 py-2 text-center text-sm font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-green-100">
                                        {paginatedStudents.map((student, index) => {
                                            const { bg, text } = categoryColorMap[student.category?.toLowerCase()] || palette[0];
                                            return <tr key={student.id} className={`hover:bg-green-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-green-25'}`}>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center justify-center w-12 h-12 rounded-full overflow-hidden bg-green-100">
                                                        {student.profileImage && student.profileImagePath ? (
                                                            <img
                                                                src={student.profileImage}
                                                                alt={`${student.fName} ${student.surname}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <User className="w-6 h-6 text-green-600" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="capitalize px-3 py-2">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {student.fName} {student.middleName} {student.surname}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {student.email}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="capitalize whitespace-nowrap inline-flex px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                        {student.course}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`whitespace-nowrap inline-flex px-2 py-1   text-xs font-medium rounded-full ${student.isAllDocSubmited ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}>
                                                        {student.isAllDocSubmited ? 'Submited' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="capitalize px-3 py-2">
                                                    <span className={`whitespace-nowrap  inline-flex px-2 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
                                                        {student.category}
                                                    </span>
                                                </td>
                                                <td className={`capitalize px-3 py-2 `}>
                                                    <span className={`whitespace-nowrap inline-flex px-2 py-1   text-xs font-medium rounded-full ${student.gender?.toLowerCase() === "male" ? "bg-blue-100 text-blue-900" : student.gender?.toLowerCase() === "female" ? "bg-pink-100 text-pink-900" : "bg-pink-100 text-pink-900"}`}>
                                                        {student.gender}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="whitespace-nowrap text-sm text-gray-900 flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-green-600" />
                                                        {student.studentWhatsAppNo || "-"}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-gray-900 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-green-600" />
                                                        {formatDateTime(student.updatedAt)}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center ">
                                                    <button
                                                        onClick={() => navigate(`/college/applied-student/${student.id}`)}
                                                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
                                                        title="View Details"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {paginatedStudents.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>No students found matching your criteria.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between bg-white rounded-xl shadow-sm border border-green-100 px-3 py-2">
                                <div className="text-sm text-gray-700">
                                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} results
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`px-3 py-1 rounded-lg transition-colors ${currentPage === i + 1
                                                ? 'bg-green-600 text-white'
                                                : 'text-green-600 hover:bg-green-100'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
        }
    </>);
};


export default AppliedStudentList;