import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Search, PlusSquare, Heart, User, LogOut } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null; // Don't show navbar if not logged in

  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold font-serif italic">
          INSTA
        </Link>

        {/* Search Bar (Mock) */}
        <div className="hidden md:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search"
            className="bg-gray-100 rounded-md pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Navigation Icons */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-gray-900 hover:text-gray-600">
            <Home className="w-6 h-6" />
          </Link>
          <button className="text-gray-900 hover:text-gray-600">
            <PlusSquare className="w-6 h-6" />
          </button>
          <button className="text-gray-900 hover:text-gray-600">
            <Heart className="w-6 h-6" />
          </button>
          <Link
            to={`/profile/${user.id ?? user.username}`}
            className="text-gray-900 hover:text-gray-600"
          >
            <User className="w-6 h-6" />
          </Link>
          <button
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};
