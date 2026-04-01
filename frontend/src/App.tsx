import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages & Components
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import Feed from "./pages/Feed";
// Search is now a slide-out panel in Layout
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import SinglePost from "./pages/SinglePost";
import EditProfile from "./pages/EditProfile";

// A wrapper to protect routes that require authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="state-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes wrapped in the Layout (Navbar) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Feed />} />
            {/* Search is now a slide-out panel in Layout */}
            <Route path="create" element={<CreatePost />} />
            <Route path="profile/:userId" element={<Profile />} />
            <Route path="post/:postId" element={<SinglePost />} />
            <Route path="settings/profile" element={<EditProfile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
