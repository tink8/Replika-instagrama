//import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  PlusSquare,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/create", icon: PlusSquare, label: "Create" },
    { path: `/profile/${user?.username}`, icon: UserIcon, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900 italic">
                InstagramClone
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`${
                      isActive ? "text-black" : "text-gray-500 hover:text-black"
                    } transition-colors duration-200`}
                  >
                    <Icon
                      className="h-6 w-6"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </Link>
                );
              })}

              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-500 transition-colors duration-200 ml-4"
                title="Log out"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
