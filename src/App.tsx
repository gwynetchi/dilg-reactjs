import React, { useState, useEffect, JSX } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";

// Import pages
import AdminDashboard from "./pages/admin/dashboard";
import EvaluatorDashboard from "./pages/evaluator/dashboard";
import EvaluatorCommunication from "./pages/evaluator/communication";

import LGUDashboard from "./pages/lgu/dashboard";
import ViewerDashboard from "./pages/viewer/dashboard";
import ViewerMessageDetails from "./pages/messagedetails";
import ViewerInbox from "./pages/inbox";
import ViewerCalendar from "./pages/calendar";


// Import profile pages
import AdminProfile from "./pages/profile";
import EvaluatorProfile from "./pages/profile";
import ViewerProfile from "./pages/profile";
import LGUProfile from "./pages/profile";

// Import authentication and landing pages
import NewAuthForm from "./components/NewAuthForm";
import Landing from "./screens/Landing";

// Import role-specific navbars
import AdminNavbar from "./pages/admin/navigation/navbar";
import EvaluatorNavbar from "./pages/evaluator/navigation/navbar";
import LGUNavbar from "./pages/lgu/navigation/navbar";
import ViewerNavbar from "./pages/viewer/navigation/navbar";

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch user role from Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        setRole(userDoc.exists() ? userDoc.data().role : null);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Determine user dashboard path based on role
  const getDashboardPath = () => {
    switch (role) {
      case "Admin":
        return "/admin/dashboard";
      case "Evaluator":
        return "/evaluator/dashboard";
      case "LGU":
        return "/lgu/dashboard";
      case "Viewer":
        return "/viewer/dashboard";
      default:
        return "/login";
    }
  };

  // Select the correct Navbar
  const renderNavbar = () => {
    if (!user || !role) return null;
    switch (role) {
      case "Admin":
        return <AdminNavbar />;
      case "Evaluator":
        return <EvaluatorNavbar />;
      case "LGU":
        return <LGUNavbar />;
      case "Viewer":
        return <ViewerNavbar />;
      default:
        return null;
    }
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element; requiredRole: string }) => {
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (role !== requiredRole) return <Navigate to={getDashboardPath()} replace />;
    return children;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <div className="app-container">
        {renderNavbar()}
        <div className="content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={user ? <Navigate to={getDashboardPath()} replace /> : <Landing />} />
            <Route path="/login" element={user ? <Navigate to={getDashboardPath()} replace /> : <NewAuthForm />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="Admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute requiredRole="Admin"><AdminProfile /></ProtectedRoute>} />

            {/* Evaluator Routes */}
            <Route path="/evaluator/dashboard" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorDashboard /></ProtectedRoute>} />
            <Route path="/evaluator/profile" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorProfile /></ProtectedRoute>} />
            <Route path="/evaluator/communication" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorCommunication /></ProtectedRoute>} />

            {/* LGU Routes */}
            <Route path="/lgu/dashboard" element={<ProtectedRoute requiredRole="LGU"><LGUDashboard /></ProtectedRoute>} />
            <Route path="/lgu/profile" element={<ProtectedRoute requiredRole="LGU"><LGUProfile /></ProtectedRoute>} />

            {/* Viewer Routes */}
            <Route path="/viewer/dashboard" element={<ProtectedRoute requiredRole="Viewer"><ViewerDashboard /></ProtectedRoute>} />
            <Route path="/viewer/profile" element={<ProtectedRoute requiredRole="Viewer"><ViewerProfile /></ProtectedRoute>} />
            <Route path="/viewer/communication/:id" element={<ProtectedRoute requiredRole="Viewer"><ViewerMessageDetails /></ProtectedRoute>} />
            <Route path="/viewer/inbox" element={<ProtectedRoute requiredRole="Viewer"><ViewerInbox /></ProtectedRoute>} />
            <Route path="/viewer/calendar" element={<ProtectedRoute requiredRole="Viewer"><ViewerCalendar /></ProtectedRoute>} />

            {/* Catch-All Route */}
            <Route path="*" element={<Navigate to={user ? getDashboardPath() : "/login"} replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
