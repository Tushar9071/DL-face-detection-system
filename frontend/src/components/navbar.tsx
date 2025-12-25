import { LayoutDashboard, ScanFace, Video, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path 
      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
      : "text-gray-400 hover:text-white hover:bg-gray-800";
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center gap-2">
            <ScanFace className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold text-white tracking-wide">
              Face<span className="text-blue-500">Secure</span>
            </span>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive('/')}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Predict Face
            </Link>

            <Link
              to="/camera-access"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive('/camera-access')}`}
            >
              <Video className="w-4 h-4" />
              Add via Webcam
            </Link>

            <Link
              to="/admin"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive('/admin')}`}
            >
              <Settings className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};