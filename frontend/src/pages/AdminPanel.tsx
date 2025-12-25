import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  UserPlus,
  Trash2,
  Search,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Filter
} from "lucide-react";
import {
  uploadStudentData,
  getAttendance,
  getAllStudents,
  deleteStudent,
  getStats,
  getStudentImages,
  deleteStudentImage,
  getAnalytics
} from "../services/api";

// --- Types ---
interface Student {
  id: number;
  name: string;
  enrollment_number: string;
  created_at: string;
}

interface AttendanceRecord {
  id: number;
  student_name: string;
  enrollment_number: string;
  date: string;
  time_slot: string;
  status: string;
}

interface Stats {
  total_students: number;
  today_attendance: number;
}

interface StudentImage {
  filename: string;
  url: string;
}

// --- Components ---

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) => (
  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-3xl font-bold text-white mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
        <Icon className={`w-8 h-8 ${color.replace("bg-", "text-")}`} />
      </div>
    </div>
  </div>
);

// --- Main Page Component ---

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "students" | "attendance" | "add">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Data States
  const [stats, setStats] = useState<Stats>({ total_students: 0, today_attendance: 0 });
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Analytics Filters
  const [analyticsFilters, setAnalyticsFilters] = useState({
    period: "day",
    slot: "All",
    date: new Date().toISOString().split("T")[0]
  });

  // Image Management States
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentImages, setStudentImages] = useState<StudentImage[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab, analyticsFilters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const res = await getStats();
        setStats(res.data);
      } else if (activeTab === "students") {
        const res = await getAllStudents();
        setStudents(res.data);
      } else if (activeTab === "attendance") {
        const res = await getAnalytics(analyticsFilters.period, analyticsFilters.slot, analyticsFilters.date);
        setAttendance(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      try {
        await deleteStudent(id);
        fetchData(); // Refresh list
      } catch (error) {
        console.error("Error deleting student:", error);
        alert("Failed to delete student.");
      }
    }
  };

  const handleViewImages = async (student: Student) => {
    setSelectedStudent(student);
    setShowImageModal(true);
    setStudentImages([]); // Clear previous images
    try {
      const res = await getStudentImages(student.id);
      setStudentImages(res.data.images);
    } catch (error) {
      console.error("Error fetching images:", error);
      alert("Failed to load images.");
    }
  };

  const handleDeleteImage = async (filename: string) => {
    if (!selectedStudent) return;
    if (window.confirm("Delete this image?")) {
      try {
        await deleteStudentImage(selectedStudent.id, filename);
        setStudentImages(prev => prev.filter(img => img.filename !== filename));
      } catch (error) {
        console.error("Error deleting image:", error);
        alert("Failed to delete image.");
      }
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setMessage("Please select at least one image.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("enrollment_number", enrollmentNumber);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    setLoading(true);
    setMessage("");

    try {
      await uploadStudentData(formData);
      setMessage("Student added successfully!");
      setName("");
      setEnrollmentNumber("");
      setFiles(null);
    } catch (error) {
      console.error(error);
      setMessage("Failed to add student.");
    } finally {
      setLoading(false);
    }
  };

  // Filtered Lists
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.enrollment_number.includes(searchTerm)
  );

  const filteredAttendance = attendance.filter(
    (a) =>
      a.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.enrollment_number.includes(searchTerm)
  );

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-700 h-16">
          {isSidebarOpen && (
            <span className="text-xl font-bold tracking-wide">Admin Panel</span>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem
            icon={LayoutDashboard}
            label={isSidebarOpen ? "Dashboard" : ""}
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
          />
          <SidebarItem
            icon={Users}
            label={isSidebarOpen ? "Students" : ""}
            active={activeTab === "students"}
            onClick={() => setActiveTab("students")}
          />
          <SidebarItem
            icon={FileText}
            label={isSidebarOpen ? "Attendance" : ""}
            active={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
          />
          <SidebarItem
            icon={UserPlus}
            label={isSidebarOpen ? "Add Student" : ""}
            active={activeTab === "add"}
            onClick={() => setActiveTab("add")}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-white capitalize">
            {activeTab.replace("-", " ")}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Dashboard View */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Students"
                  value={stats.total_students}
                  icon={Users}
                  color="text-blue-500"
                />
                <StatCard
                  title="Today's Attendance"
                  value={stats.today_attendance}
                  icon={CheckCircle}
                  color="text-green-500"
                />
                <StatCard
                  title="Active Time Slot"
                  value="Current"
                  icon={Clock}
                  color="text-purple-500"
                />
              </div>
            </div>
          )}

          {/* Students View */}
          {activeTab === "students" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 border-none rounded-md pl-10 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setActiveTab("add")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add New
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-750">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Enrollment
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-750 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {student.enrollment_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewImages(student)}
                            className="text-blue-400 hover:text-blue-300 transition-colors mr-3"
                            title="View Images"
                          >
                            <ImageIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance View */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700 gap-4">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 border-none rounded-md pl-10 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-gray-700 rounded-md px-3 py-2">
                    <Filter className="w-4 h-4 text-gray-400 mr-2" />
                    <select 
                      value={analyticsFilters.period}
                      onChange={(e) => setAnalyticsFilters({...analyticsFilters, period: e.target.value})}
                      className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer outline-none"
                    >
                      <option value="day">Daily</option>
                      <option value="week">Weekly</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>

                  <div className="flex items-center bg-gray-700 rounded-md px-3 py-2">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <select
                      value={analyticsFilters.slot}
                      onChange={(e) => setAnalyticsFilters({...analyticsFilters, slot: e.target.value})}
                      className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer outline-none"
                    >
                      <option value="All">All Slots</option>
                      <option value="7:50-9:30">7:50-9:30</option>
                      <option value="9:50-11:30">9:50-11:30</option>
                      <option value="12:10-1:40">12:10-1:40</option>
                    </select>
                  </div>

                  <input 
                    type="date"
                    value={analyticsFilters.date}
                    onChange={(e) => setAnalyticsFilters({...analyticsFilters, date: e.target.value})}
                    className="bg-gray-700 text-white rounded-md px-3 py-2 text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-750">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Time Slot
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-750 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {record.student_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.enrollment_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {record.time_slot}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-200">
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAttendance.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No attendance records found for the selected filters.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Student View */}
          {activeTab === "add" && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-blue-500" />
                  Register New Student
                </h2>
                <form onSubmit={handleAddStudent} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Enrollment Number
                    </label>
                    <input
                      type="text"
                      value={enrollmentNumber}
                      onChange={(e) => setEnrollmentNumber(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g. 2023001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reference Photos
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-gray-750">
                      <div className="space-y-1 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-400">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md font-medium text-blue-500 hover:text-blue-400 focus-within:outline-none"
                          >
                            <span>Upload files</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              multiple
                              accept="image/*"
                              onChange={(e) => setFiles(e.target.files)}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                    {files && files.length > 0 && (
                      <p className="mt-2 text-sm text-green-400">
                        {files.length} files selected
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Processing..." : "Register Student"}
                  </button>
                </form>
                {message && (
                  <div
                    className={`mt-6 p-4 rounded-lg flex items-center ${
                      message.includes("success")
                        ? "bg-green-900/50 text-green-200 border border-green-800"
                        : "bg-red-900/50 text-red-200 border border-red-800"
                    }`}
                  >
                    {message.includes("success") ? (
                      <CheckCircle className="mr-3 h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0" />
                    )}
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Image Management Modal */}
      {showImageModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700 shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
              <div>
                <h3 className="text-xl font-bold text-white">Student Images</h3>
                <p className="text-sm text-gray-400">{selectedStudent.name} ({selectedStudent.enrollment_number})</p>
              </div>
              <button 
                onClick={() => setShowImageModal(false)} 
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-900">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {studentImages.map((img) => (
                  <div key={img.filename} className="relative group aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <img 
                      src={img.url} 
                      alt={img.filename} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDeleteImage(img.filename)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-all shadow-lg"
                        title="Delete Image"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-xs text-center text-gray-300 truncate">
                      {img.filename}
                    </div>
                  </div>
                ))}
              </div>
              {studentImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p>No images found for this student.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
