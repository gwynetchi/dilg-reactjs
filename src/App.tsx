import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";



// Import dashboards
import AdminDashboard from "./pages/admin/dashboard";
import EvaluatorDashboard from "./pages/evaluator/dashboard";
import EvaluatorCommunication from "./pages/evaluator/communication"; // 
import EvaluatorProfile from "./pages/evaluator/profile"; // 
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

      <div className="app-container">
        {/* Only render the navbar when the role is available */}
        {user && role && (
          <>
            {role === "Admin" && <AdminNavbar />}
            {role === "Evaluator" && <EvaluatorNavbar />}
            {role === "LGU" && <LGUNavbar />}
            {role === "Viewer" && <ViewerNavbar />}
          </>
        )}

        <div className="content">
          <Routes>
            {/* Login Route */}
            <Route path="/" element={<Landing/>} />
            <Route path="/login" element={<NewAuthForm/>} />

            {/* Redirect logged-in users to their dashboard */}
            {user && role && <Route path="/" element={<Navigate to={getDashboardPath()} replace />} />}

            {/* Role-specific Routes */}
            <Route path="/admin/dashboard" element={user && role === "Admin" ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/evaluator/dashboard" element={user && role === "Evaluator" ? <EvaluatorDashboard /> : <Navigate to="/login" />} />
            <Route path="/evaluator/communication" element={user && role === "Evaluator" ? <EvaluatorCommunication /> : <Navigate to="/login" />} />
            <Route path="/evaluator/profile" element={user && role === "Evaluator" ? <EvaluatorProfile /> : <Navigate to="/login" />} />
            <Route path="/lgu/dashboard" element={user && role === "LGU" ? <LGUuserDashboard /> : <Navigate to="/login" />} />
            <Route path="/viewer/dashboard" element={user && role === "Viewer" ? <ViewerDashboard /> : <Navigate to="/login" />} />

            {/* Redirect unknown routes */}
            {user && role && <Route path="*" element={<Navigate to={getDashboardPath()} replace />} />}

            {/* Redirect non-logged-in users to login */}
            {!user && <Route path="*" element={<Navigate to="/login" replace />} />}
          </Routes>
        </div>
      </div>

    </Router>
  );
};

export default App;
