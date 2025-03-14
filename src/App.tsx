import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";

// Import dashboards
import AdminDashboard from "./pages/admin/dashboard";
import EvaluatorDashboard from "./pages/evaluator/dashboard";
import EvaluatorCommunication from "./pages/evaluator/communication";
import EvaluatorProfile from "./pages/evaluator/profile";
import LGUuserDashboard from "./pages/lgu/dashboard";
import ViewerDashboard from "./pages/viewer/dashboard";

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

        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false); // Mark as loaded
    });

    return () => unsubscribe();
  }, []);

  // Function to return the correct dashboard path
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

  // Prevent rendering before role is fetched
  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Content user={user} role={role} getDashboardPath={getDashboardPath} />
    </Router>
  );
};

// Move everything that uses useLocation() into a separate component inside <Router>
const Content: React.FC<{ user: any; role: string | null; getDashboardPath: () => string }> = ({
  user,
  role,
  getDashboardPath,
}) => {
  const location = useLocation(); // Now inside Router, so no error!

  // Hide navbar on these pages
  const hideNavbarRoutes = ["/", "/login", "/register-success"];
  const shouldShowNavbar = user && role && !hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="app-container">
      {/* Only render the navbar when a user is authenticated and not on login/registration pages */}
      {shouldShowNavbar && (
        <>
          {role === "Admin" && <AdminNavbar />}
          {role === "Evaluator" && <EvaluatorNavbar />}
          {role === "LGU" && <LGUNavbar />}
          {role === "Viewer" && <ViewerNavbar />}
        </>
      )}

      <div className="content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<NewAuthForm />} />

          {/* Redirect newly registered users to login */}
          <Route path="/register-success" element={<Navigate to="/login" replace />} />

          {/* Protected Routes (User must be authenticated) */}
          {user && role ? (
            <>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/evaluator/dashboard" element={<EvaluatorDashboard />} />
              <Route path="/evaluator/communication" element={<EvaluatorCommunication />} />
              <Route path="/evaluator/profile" element={<EvaluatorProfile />} />
              <Route path="/lgu/dashboard" element={<LGUuserDashboard />} />
              <Route path="/viewer/dashboard" element={<ViewerDashboard />} />

              {/* Redirect authenticated users to their dashboard */}
              <Route path="*" element={<Navigate to={getDashboardPath()} replace />} />
            </>
          ) : (
            // Redirect non-logged-in users to login
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </div>
    </div>
  );
};

export default App;
