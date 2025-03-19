import React, { useState, useEffect, JSX } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./pages/navbar";


// Import Dashboards
import AdminDashboard from "./pages/admin/dashboard";
import LGUDashboard from "./pages/lgu/dashboard";
import EvaluatorDashboard from "./pages/evaluator/dashboard"; // Adjust the path as needed
import ViewerDashboard from "./pages/viewer/dashboard"; // Adjust the path as needed
//Import Message Details
import EvaluatorMessageDetails from "./pages/messagedetails"; // Adjust the path as needed
import LGUMessageDetails from "./pages/messagedetails"; // Adjust the path as needed
import ViewerMessageDetails from "./pages/messagedetails";
import AdminMessageDetails from "./pages/messagedetails"; // Adjust the path as needed

import EvaluatorCommunication from "./pages/communication"; // Adjust the path as needed
import LGUCommunication from "./pages/communication"; // Adjust the path as needed
import ViewerCommunication from "./pages/communication";
import AdminCommunication from "./pages/communication"; // Adjust the path as needed//Import Inbox
import Inbox from "./pages/inbox";

//Import Calendar
import Calendar from "./pages/calendar";


// Import profile pages
import Profile from "./pages/profile";

// Import authentication and landing pages
import NewAuthForm from "./components/NewAuthForm";
import Landing from "./screens/Landing";



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
       <Navbar />
        <div className="content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={user ? <Navigate to={getDashboardPath()} replace /> : <Landing />} />
            <Route path="/login" element={user ? <Navigate to={getDashboardPath()} replace /> : <NewAuthForm />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="Admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute requiredRole="Admin"><Profile /></ProtectedRoute>} />
            <Route path="/admin/communication/:id" element={<ProtectedRoute requiredRole="Admin"><AdminMessageDetails /></ProtectedRoute>} />
            <Route path="/admin/communication" element={<ProtectedRoute requiredRole="Admin"><AdminCommunication /></ProtectedRoute>} />
            <Route path="/admin/inbox" element={<ProtectedRoute requiredRole="Admin"><Inbox /></ProtectedRoute>} />
            
            <Route path="/admin/calendar" element={<ProtectedRoute requiredRole="Admin"><Calendar /></ProtectedRoute>} />

            {/* Evaluator Routes */}
            <Route path="/evaluator/inbox" element={<ProtectedRoute requiredRole="Evaluator"><Inbox /></ProtectedRoute>} />
            <Route path="/evaluator/profile" element={<ProtectedRoute requiredRole="Evaluator"><Profile /></ProtectedRoute>} />
            <Route path="/evaluator/communication/:id" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorMessageDetails /></ProtectedRoute>} />
            <Route path="/evaluator/communication" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorCommunication /></ProtectedRoute>} />
            <Route path="/evaluator/calendar" element={<ProtectedRoute requiredRole="Evaluator"><Calendar /></ProtectedRoute>} />
            <Route path="/evaluator/dashboard" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorDashboard /></ProtectedRoute>} />

            {/* LGU Routes */}
            <Route path="/lgu/inbox" element={<ProtectedRoute requiredRole="LGU"><Inbox /></ProtectedRoute>} />
            <Route path="/lgu/dashboard" element={<ProtectedRoute requiredRole="LGU"><LGUDashboard /></ProtectedRoute>} />
            <Route path="/lgu/profile" element={<ProtectedRoute requiredRole="LGU"><Profile /></ProtectedRoute>} />
            <Route path="/lgu/calendar" element={<ProtectedRoute requiredRole="LGU"><Calendar /></ProtectedRoute>} />
            <Route path="/lgu/communication/:id" element={<ProtectedRoute requiredRole="LGU"><LGUMessageDetails /></ProtectedRoute>} />
            <Route path="/lgu/communication" element={<ProtectedRoute requiredRole="LGU"><LGUCommunication /></ProtectedRoute>} />


            {/* Viewer Routes */}
            <Route path="/viewer/profile" element={<ProtectedRoute requiredRole="Viewer"><Profile /></ProtectedRoute>} />
            <Route path="/viewer/communication/:id" element={<ProtectedRoute requiredRole="Viewer"><ViewerMessageDetails /></ProtectedRoute>} />
            <Route path="/viewer/communication" element={<ProtectedRoute requiredRole="Viewer"><ViewerCommunication /></ProtectedRoute>} />
            <Route path="/viewer/inbox" element={<ProtectedRoute requiredRole="Viewer"><Inbox /></ProtectedRoute>} />
            <Route path="/viewer/calendar" element={<ProtectedRoute requiredRole="Viewer"><Calendar /></ProtectedRoute>} /> 
            <Route path="/viewer/dashboard" element={<ProtectedRoute requiredRole="Viewer"><ViewerDashboard /></ProtectedRoute>} />

            {/* Catch-All Route */}
            <Route path="*" element={<Navigate to={user ? getDashboardPath() : "/login"} replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
