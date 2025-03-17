import React, { useState, useEffect, ReactElement } from "react";

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";

// Import dashboards

import EvaluatorCommunication from "./pages/evaluator/communication";
import EvaluatorProfile from "./pages/evaluator/profile";

{/*import ViewerDashboard from "./pages/viewer/dashboard";*/}

// Import authentication & landing page
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
      setLoading(false);
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

  const renderNavbar = () => {
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

  if (loading) return <div className="loading-screen">Loading...</div>;

  const ProtectedRoute = ({ element, allowedRole }: { element: ReactElement; allowedRole: string }) => {
    if (!user) return <Navigate to="/login" />;
    if (role !== allowedRole) return <Navigate to={getDashboardPath()} />;
    return element;
  };

  return (
    <Router>
      <div className="app-container">
        {user && role && window.location.pathname !== "/login" && renderNavbar()}
        <div className="content">
          <Routes>
            <Route path="/" element={user && role ? <Navigate to={getDashboardPath()} replace /> : <Landing />} />
            <Route path="/login" element={user ? <Navigate to={getDashboardPath()} replace /> : <NewAuthForm />} />

            {/* Role-specific routes */}
            
            <Route path="/evaluator/communication" element={<ProtectedRoute element={<EvaluatorCommunication />} allowedRole="Evaluator" />} />
            <Route path="/evaluator/profile" element={<ProtectedRoute element={<EvaluatorProfile />} allowedRole="Evaluator" />} />
           
            {/*<Route path="/viewer/dashboard" element={<ProtectedRoute element={<ViewerDashboard />} allowedRole="Viewer" />} />*/}

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to={getDashboardPath()} replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
