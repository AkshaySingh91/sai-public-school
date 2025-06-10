import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { utils, writeFile } from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { v4 as uuidv4 } from 'uuid';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Edit, Trash2, Copy, User, Users, Calendar, MapPin, Mail, Phone, CheckCircle, XCircle, X, MessageSquare, ClipboardCheck, Clock, MessageCircle, Send, Share2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import {
  SettingsIcon,
  FileText,
  FileSpreadsheet,
  Share2Icon,
  CopyIcon
} from "lucide-react";
import EmployeeForm from "./EmployeeForm";
import Swal from "sweetalert2";
import TableLoader from "../../../components/TableLoader"
import { useInstitution } from "../../../contexts/InstitutionContext";

const EmployeeList = () => {
  const { userData, currentUser } = useAuth();
  const { school } = useInstitution();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [expirationHours, setExpirationHours] = useState(24);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filters, setFilters] = useState({
    designation: "All",
    type: "All",
    search: "",
  });
  const [sortBy, setSortBy] = useState('doj');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchEmployees = async () => {
    try {
      const q = query(
        collection(db, "Employees"),
        where("schoolCode", "==", school.Code)
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setEmployees(list);
      // Extract unique designations
      const uniqueDesignations = [...new Set(list.map((e) => e.designation))];
      setDesignations(uniqueDesignations);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school && school.Code) fetchEmployees();
  }, [userData, school]);

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      const nameMatch = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.toLowerCase().includes(filters.search.toLowerCase());
      const typeMatch = filters.type?.toLowerCase() === "all" || emp.type?.toLowerCase() === filters.type?.toLowerCase();
      const designationMatch = filters.designation?.toLowerCase() === "all" || emp?.designation?.toLowerCase() === filters.designation?.toLowerCase();
      return nameMatch && typeMatch && designationMatch;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "doj") {
        aValue = aValue && typeof aValue.toDate === "function"
          ? aValue.toDate()
          : new Date(0);
        bValue = bValue && typeof bValue.toDate === "function"
          ? bValue.toDate()
          : new Date(0);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [employees, filters, sortBy, sortOrder]);

  // Generate shareable link
  const generateShareLink = async () => {
    if (!school.Code) return;

    try {
      // Generate unique token
      const token = uuidv4();
      // Calculate expiration date
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + expirationHours);
      // Store token in Firestore with token as document ID
      await setDoc(doc(db, 'shareTokens', token), {
        schoolCode: school.Code,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        expiresAt: expirationDate,
        used: false
      });

      // Generate shareable link
      const link = `${window.location.origin}/employee-form?token=${token}`;
      setGeneratedLink(link);
      setShareModalOpen(true);
    } catch (error) {
      console.error("Error generating share link:", error);
      Swal.fire("Error", "Failed to generate share link", "error");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    Swal.fire("Success", "Link copied to clipboard!", "success");
  };

  // Export handlers
  const exportToExcel = () => {
    const worksheet = utils.json_to_sheet(filteredAndSortedEmployees.map(emp => ({
      Name: `${emp.firstName || ""} ${emp.middleName || ""} ${emp.lastName || ""}`,
      Designation: emp.designation || "N/A",
      Type: emp?.type?.toUpperCase() || "N/A",
      Email: emp.email || "N/A",
      Contact: emp.contact || "N/A",
      'Date of Joining': emp.doj || "N/A",
      'Marital Status': emp.maritalStatus || "N/A",
      'School Code': emp.schoolCode || "N/A",
      'Web Access': emp.webAccess || false,
      Status: emp.active ? "Active" : "Inactive",
      Class: emp.class || "",
      Div: emp.div || "",
      Address: emp.address || "",
      Addhar: emp.addharCardNo || "",
    })));
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Employees");
    writeFile(workbook, "employees.xlsx");
  };

  const exportToPDF = () => {
    try {
      const columns = [
        "Name",
        "Designation",
        "Type",
        "Email",
        "Contact",
        "Date of Joining",
        "Marital Status",
        "School Code",
        "Web Access",
        "Status",
        "Class",
        "Div",
        "Address",
        "Addhar",
      ];

      // 2) Build each row as an array of cell‐values (same order as `columns`)
      const rows = filteredAndSortedEmployees.map((emp) => [
        `${emp.firstName || ""} ${emp.middleName || ""} ${emp.lastName || ""}`,
        emp.designation || "N/A",
        emp.type?.toUpperCase() || "N/A",
        emp.email || "N/A",
        emp.contact || "N/A",
        emp.doj || "N/A",
        emp.maritalStatus || "N/A",
        emp.schoolCode || "N/A",
        emp.webAccess ? "Yes" : "No",
        emp.active ? "Active" : "Inactive",
        emp.class || "",
        emp.div || "",
        emp.address || "",
        emp.addharCardNo || "",
      ]);

      // 3) Create a new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",      // using points makes sizing a bit more precise
        format: "a4",
      });

      // 4) Add a page‐title at the top (fontSize 14)
      doc.setFontSize(14);
      doc.text("Employee List", 14, 20);
      // We leave enough space (y = 20) so the table can start around y = 40

      // 5) Use autoTable to render the table
      autoTable(doc, {
        startY: 40,         // push the table down below the title
        head: [columns],    // header row
        body: rows,         // body rows

        // 6) Core style tweaks:
        styles: {
          fontSize: 10,
          cellPadding: 4,
          cellWidth: "wrap",      // wrap cell text instead of squishing
          overflow: "linebreak",  // break long text into multiple lines
        },
        headStyles: {
          fillColor: [41, 128, 185],  // a blue header row
          textColor: 255,
          fontStyle: "bold",
        },
        theme: "striped",  // optional: zebra‐striped rows
        margin: { left: 14, right: 14 }, // consistent left/right margins
        tableLineColor: 200,  // light gray row borders
        tableLineWidth: 0.1,
      });

      // 7) Save/download the PDF
      doc.save("employees.pdf");
    } catch (error) {
      console.error("PDF generation error:", error);
    }
  };

  const handleDelete = async (id) => {
    const employeeRef = doc(db, "Employees", id);
    const employeeSnap = await getDoc(employeeRef);
    if (!employeeSnap.exists()) {
      // If the document doesn’t exist at all
      await Swal.fire({
        icon: "error",
        title: "Not Found",
        text: "Employee record does not exist.",
        confirmButtonColor: "#7c3aed",
      });
      return;
    }
    const employeeData = employeeSnap.data();
    //  Check if the fetched document’s schoolCode matches school.Code
    if (employeeData.schoolCode !== school.Code) {
      await Swal.fire({
        icon: "error",
        title: "Permission Denied",
        text: "You are not allowed to delete this employee.",
        confirmButtonColor: "#7c3aed",
      });
      return;
    }
    const result = await Swal.fire({
      title: "Delete Employee",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "Employees", id));
        await Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Employee has been deleted",
          confirmButtonColor: "#7c3aed",
        });
        await fetchEmployees()
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Error deleting employee: ${err.message}`,
          confirmButtonColor: "#7c3aed",
        });
      }
    }
  };
  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedEmployees.length / itemsPerPage);

  // Pie chart data
  const pieData = [
    {
      name: 'Teaching Staff',
      value: employees.filter(emp => emp.type?.toLowerCase() === 'teaching').length,
      color: '#8B5CF6'
    },
    {
      name: 'Non-Teaching Staff',
      value: employees.filter(emp => emp.type?.toLowerCase() === 'non-teaching').length,
      color: '#06B6D4'
    }
  ];

  // Handle checkbox selection
  const toggleSelectEmployee = (id) => {
    setSelectedEmployees(prev =>
      prev.includes(id)
        ? prev.filter(empId => empId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === currentItems.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(currentItems.map(emp => emp.id));
    }
  };

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <TableLoader />
    );
  }
  const whatsappShare = () => {
    const message = `Fill the employee form: ${generatedLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const emailShare = () => {
    const subject = "Employee Form Link";
    const body = `Please fill the employee form using this link: ${generatedLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const smsShare = () => {
    const message = `Fill the employee form: ${generatedLink}`;
    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
  };
  return (
    <div className="w-full sm:bg-white rounded-lg shadow-sm p-4">

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">School Employee Management</h1>
                <p className="text-gray-600 mt-1">Manage and track all school staff members</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generateShareLink}
                  className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Share2Icon className="mr-2" size={16} /> Share
                </button>

                <button
                  onClick={() => setShowAddEmployeeModal(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <PlusIcon className="mr-2" size={16} /> Add Employee
                </button>
              </div>
            </div>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-xl font-bold text-gray-900">{employees.length || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Teaching Staff</p>
                  <p className="text-xl font-bold text-gray-900">{employees.filter(emp => emp.type?.toLowerCase() === 'teaching').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Non-Teaching</p>
                  <p className="text-xl font-bold text-gray-900">{employees.filter(emp => emp.type?.toLowerCase() === 'non-teaching').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-xl font-bold text-gray-900">{employees.filter(emp => emp.active).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 " />
                <input
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }))
                  }}
                  type="text"
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-0"
                />
              </div>

              <select
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, type: e.target.value }))
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-0 focus:border-transparent"
              >
                <option value="All">All Staff Types</option>
                <option value="Teaching">Teaching Staff</option>
                <option value="Non-Teaching">Non-Teaching Staff</option>
              </select>

              <select
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, designation: e.target.value }))
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg outline-0 focus:ring-2 focus:ring-purple-500 focus:border-transparent "
              >
                <option value="All">All Designations</option>
                {designations.filter(Boolean).map(designation => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>

              <select
                onChange={(e) => {
                  handleSort(e.target.value)
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="doj">Sort by DOJ</option>
                <option value="firstName">Sort by Name</option>
                <option value="designation">Sort by Designation</option>
              </select>

              <select
                onChange={(e) => {
                  setSortOrder(e.target.value)
                }}
                className="px-4 py-2 text-sm border outline-0 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          {/* Export Buttons */}
          <div className="px-6 py-3 bg-gray-50 flex justify-end border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="flex items-center px-3 py-1.5 text-xs font-medium border rounded-md bg-white text-gray-700 hover:bg-gray-50"
              >
                <FileText size={14} className="mr-2" />
                <span>PDF</span>
              </button>

              <button
                onClick={exportToExcel}
                className="flex items-center px-3 py-1.5 text-xs font-medium border rounded-md bg-white text-gray-700 hover:bg-gray-50"
              >
                <FileSpreadsheet size={14} className="mr-2" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {
            currentItems.length ?
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={selectedEmployees.length === currentItems.length && currentItems.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DOJ</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => toggleSelectEmployee(employee.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 my-auto relative">
                            {employee.profileImage && employee.profileImagePath ?
                              <img
                                className="h-12 w-12 rounded-full object-cover border-2 border-purple-100"
                                src={employee?.profileImage}
                                alt={`${employee.firstName} ${employee.lastName}`}
                              /> :
                              <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                                <User className="w-6 h-6 text-purple-600" />
                              </div>
                            }
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white 
                  ${employee.active && employee.active ? "bg-green-400" : "bg-red-400"}`}></div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center truncate">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {employee.contact || "-"}
                        </div>
                        <div
                          className="flex items-center text-sm text-gray-500 font-medium max-w-[120px] truncate"
                          title={employee.address || "No address"}
                        >
                          <MapPin className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                          <span className="truncate ">{employee.address || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.designation}</div>
                        {employee.class && (
                          <div className="text-sm text-gray-900">Class {employee.class || ""} - {employee.div || ""}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${employee.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {employee.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${employee.type === 'Teaching'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                          }`}>
                          {employee.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {employee.doj && new Date(employee.doj).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex justify-center space-x-2">
                          <button
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200 cursor-pointer"
                            title="Edit Employee"
                            onClick={() => {
                              navigate(`/school/employee/${employee.id}`)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(employee.contact ? employee.contact : employee.email);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 cursor-pointer"
                            title="Copy Phone Number"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {
                            userData.privilege?.toLowerCase() === "both" &&
                            <button
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 cursor-pointer"
                              title="Delete Employee"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
              : <div className="">
                <p className="text-xl py-6 mx-auto whitespace-nowrap text-center text-gray-500 font-bold">No Employees in School</p>
              </div>
          }

        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-medium">{Math.min(indexOfLastItem, filteredAndSortedEmployees.length)}</span> of{' '}
              <span className="font-medium">{filteredAndSortedEmployees.length}</span> results
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>

              <div className="flex space-x-1">
                {[...Array(totalPages).keys()].map((page) => (
                  <button
                    key={page + 1}
                    onClick={() => setCurrentPage(page + 1)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${currentPage === page + 1
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Share Form</h3>
                    <p className="text-sm text-gray-500">Send employee form to others</p>
                  </div>
                </div>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Link Expiration */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                  <Clock className="w-4 h-4" />
                  <span>Link Expiration</span>
                </label>
                <select
                  value={expirationHours}
                  onChange={(e) => setExpirationHours(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                >
                  <option value={1}>1 Hour</option>
                  <option value={24}>24 Hours</option>
                  <option value={72}>72 Hours</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>

              {/* Generated Link */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                  <Link className="w-4 h-4" />
                  <span>Shareable Link</span>
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-50 text-sm text-gray-600 border-0 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 transition-colors duration-200 flex items-center space-x-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Expires in {expirationHours} hours</span>
                </p>
              </div>

              {/* Share Options */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Share via</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={whatsappShare}
                    className="flex items-center justify-center space-x-2 px-4 py-3 border border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors duration-200"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">WhatsApp</span>
                  </button>

                  <button
                    onClick={emailShare}
                    className="flex items-center justify-center space-x-2 px-4 py-3 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Email</span>
                  </button>

                  <button
                    onClick={smsShare}
                    className="flex items-center justify-center space-x-2 px-4 py-3 border border-purple-200 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors duration-200"
                  >
                    <Send className="w-4 h-4" />
                    <span className="font-medium">SMS</span>
                  </button>

                  <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-200 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="font-medium">Copy Link</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6 md:px-8 backdrop-blur-sm ">
          <EmployeeForm
            onClose={() => setShowAddEmployeeModal(false)}
            fetchEmployees={fetchEmployees}
          />
        </div>
      )}
    </div>
  );
};
// Icons for demonstration
const PlusIcon = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const WhatsappIcon = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default EmployeeList;
