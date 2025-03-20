import React, { useState, useEffect, JSX } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./pages/navbar";
import "./styles/components/pages.css";

// Import Dashboards
import AdminDashboard from "./pages/admin/dashboard";
import Analytics from "./pages/analytics";


import LGUDashboard from "./pages/lgu/dashboard";
import EvaluatorDashboard from "./pages/evaluator/dashboard"; // Adjust the path as needed
import ViewerDashboard from "./pages/viewer/dashboard"; // Adjust the path as needed

// Import Message Details
import EvaluatorMessageDetails from "./pages/messagedetails"; // Adjust the path as needed
import LGUMessageDetails from "./pages/messagedetails"; // Adjust the path as needed
import ViewerMessageDetails from "./pages/messagedetails";
import AdminMessageDetails from "./pages/messagedetails"; // Adjust the path as needed

// Import Communication Pages
import EvaluatorCommunication from "./pages/communication"; // Adjust the path as needed
import LGUCommunication from "./pages/communication"; // Adjust the path as needed
import ViewerCommunication from "./pages/communication";
import AdminCommunication from "./pages/communication"; // Adjust the path as needed

// Import Inbox
import Inbox from "./pages/inbox";

// Import Calendar
import Calendar from "./pages/calendar";

// Import Message
import Messaging from "./pages/message";

// Import Profile Pages
import Profile from "./pages/profile";

// Import Authentication and Landing Pages
import AuthForm from "./components/NewAuthForm";
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
      setLoading(false); // Only set loading to false **after** getting the role
    });
  
    return () => unsubscribe();
  }, []);
  

  // Simplified role-based route mapping
  const roleRoutes: Record<string, string[]> = {
    Admin: ["/admin/dashboard", "/admin/profile", "/admin/inbox", "/admin/calendar", "/admin/communication", "/admin/message"],
    Evaluator: ["/evaluator/dashboard", "/evaluator/profile", "/evaluator/inbox", "/evaluator/calendar", "/evaluator/communication", "/evaluator/message"],
    LGU: ["/lgu/dashboard", "/lgu/profile", "/lgu/inbox", "/lgu/calendar", "/lgu/communication", "/lgu/message"],
    Viewer: ["/viewer/dashboard", "/viewer/profile", "/viewer/inbox", "/viewer/calendar", "/viewer/communication", "/viewer/message"]
  };

  const getDashboardPath = () => {
    if (role && roleRoutes[role]) {
      return roleRoutes[role][0]; // First route is typically the dashboard
    }
    return "/login";
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element; requiredRole: string }) => {
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/" replace />;
    if (role !== requiredRole) return <Navigate to={getDashboardPath()} replace />;
    return children;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <div className="app-container">
        {/* Show Navbar only if user is authenticated and role is determined */}
        {user && role && <Navbar />}
  
        <div className="content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthForm />} />
            <Route path="/register-success" element={<Navigate to="/login" replace />} />
  
            {/* Protected Routes */}
            {role && (
              <>
                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="Admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/profile" element={<ProtectedRoute requiredRole="Admin"><Profile /></ProtectedRoute>} />
                <Route path="/admin/communication/:id" element={<ProtectedRoute requiredRole="Admin"><AdminMessageDetails /></ProtectedRoute>} />
                <Route path="/admin/communication" element={<ProtectedRoute requiredRole="Admin"><AdminCommunication /></ProtectedRoute>} />
                <Route path="/admin/inbox" element={<ProtectedRoute requiredRole="Admin"><Inbox /></ProtectedRoute>} />
                <Route path="/admin/message" element={<ProtectedRoute requiredRole="Admin"><Messaging setUnreadMessages={() => {}} /></ProtectedRoute>} />
                <Route path="/admin/calendar" element={<ProtectedRoute requiredRole="Admin"><Calendar /></ProtectedRoute>} />
  
                {/* Evaluator Routes */}
                <Route path="/evaluator/inbox" element={<ProtectedRoute requiredRole="Evaluator"><Inbox /></ProtectedRoute>} />
                <Route path="/evaluator/profile" element={<ProtectedRoute requiredRole="Evaluator"><Profile /></ProtectedRoute>} />
                <Route path="/evaluator/communication/:id" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorMessageDetails /></ProtectedRoute>} />
                <Route path="/evaluator/communication" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorCommunication /></ProtectedRoute>} />
                <Route path="/evaluator/calendar" element={<ProtectedRoute requiredRole="Evaluator"><Calendar /></ProtectedRoute>} />
                <Route path="/evaluator/dashboard" element={<ProtectedRoute requiredRole="Evaluator"><EvaluatorDashboard /></ProtectedRoute>} />
                <Route path="/evaluator/message" element={<ProtectedRoute requiredRole="Evaluator"><Messaging setUnreadMessages={() => {}} /></ProtectedRoute>} />
                <Route path="/evaluator/analytics" element={<ProtectedRoute requiredRole="Evaluator"><Analytics /></ProtectedRoute>} />

                {/* LGU Routes */}
                <Route path="/lgu/inbox" element={<ProtectedRoute requiredRole="LGU"><Inbox /></ProtectedRoute>} />
                <Route path="/lgu/dashboard" element={<ProtectedRoute requiredRole="LGU"><LGUDashboard /></ProtectedRoute>} />
                <Route path="/lgu/profile" element={<ProtectedRoute requiredRole="LGU"><Profile /></ProtectedRoute>} />
                <Route path="/lgu/calendar" element={<ProtectedRoute requiredRole="LGU"><Calendar /></ProtectedRoute>} />
                <Route path="/lgu/communication/:id" element={<ProtectedRoute requiredRole="LGU"><LGUMessageDetails /></ProtectedRoute>} />
                <Route path="/lgu/communication" element={<ProtectedRoute requiredRole="LGU"><LGUCommunication /></ProtectedRoute>} />
                <Route path="/lgu/message" element={<ProtectedRoute requiredRole="LGU"><Messaging setUnreadMessages={() => {}} /></ProtectedRoute>} />
  
                {/* Viewer Routes */}
                <Route path="/viewer/profile" element={<ProtectedRoute requiredRole="Viewer"><Profile /></ProtectedRoute>} />
                <Route path="/viewer/communication/:id" element={<ProtectedRoute requiredRole="Viewer"><ViewerMessageDetails /></ProtectedRoute>} />
                <Route path="/viewer/communication" element={<ProtectedRoute requiredRole="Viewer"><ViewerCommunication /></ProtectedRoute>} />
                <Route path="/viewer/inbox" element={<ProtectedRoute requiredRole="Viewer"><Inbox /></ProtectedRoute>} />
                <Route path="/viewer/calendar" element={<ProtectedRoute requiredRole="Viewer"><Calendar /></ProtectedRoute>} />
                <Route path="/viewer/dashboard" element={<ProtectedRoute requiredRole="Viewer"><ViewerDashboard /></ProtectedRoute>} />
                <Route path="/viewer/message" element={<ProtectedRoute requiredRole="Viewer"><Messaging setUnreadMessages={() => {}} /></ProtectedRoute>} />
              </>
            )}
  
            {/* Catch-All Route */}
            <Route path="*" element={<Navigate to={user ? getDashboardPath() : "/"} replace />} />
            </Routes>
        </div>
      </div>
    </Router>
  );  
};

export default App;
