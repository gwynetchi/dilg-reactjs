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
import EvaluatorDashboard from "./pages/evaluator/dashboard";
import ViewerDashboard from "./pages/viewer/dashboard";

// Import Message Details
import EvaluatorMessageDetails from "./pages/messagedetails";
import LGUMessageDetails from "./pages/messagedetails";
import ViewerMessageDetails from "./pages/messagedetails";
import AdminMessageDetails from "./pages/messagedetails";

// Import Communication Pages
import EvaluatorCommunication from "./pages/communication";
import LGUCommunication from "./pages/communication";
import ViewerCommunication from "./pages/communication";
import AdminCommunication from "./pages/communication";

// Import Inbox, Calendar, Messaging, and Profile
import Inbox from "./pages/inbox";
import Calendar from "./pages/calendar";
import Messaging from "./pages/message";
import Profile from "./pages/profile";

// Import Authentication and Landing Pages
import AuthForm from "./components/NewAuthForm";
import Landing from "./screens/Landing";

const roleRoutesConfig: Record<string, { path: string; element: JSX.Element }[]> = {
  Admin: [
    { path: "/admin/dashboard", element: <AdminDashboard /> },
    { path: "/admin/profile", element: <Profile /> },
    { path: "/admin/communication/:id", element: <AdminMessageDetails /> },
    { path: "/admin/communication", element: <AdminCommunication /> },
    { path: "/admin/inbox", element: <Inbox /> },
    { path: "/admin/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/admin/calendar", element: <Calendar /> },
  ],
  Evaluator: [
    { path: "/evaluator/dashboard", element: <EvaluatorDashboard /> },
    { path: "/evaluator/profile", element: <Profile /> },
    { path: "/evaluator/inbox", element: <Inbox /> },
    { path: "/evaluator/communication/:id", element: <EvaluatorMessageDetails /> },
    { path: "/evaluator/communication", element: <EvaluatorCommunication /> },
    { path: "/evaluator/calendar", element: <Calendar /> },
    { path: "/evaluator/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/evaluator/analytics", element: <Analytics /> },
  ],
  LGU: [
    { path: "/lgu/dashboard", element: <LGUDashboard /> },
    { path: "/lgu/profile", element: <Profile /> },
    { path: "/lgu/inbox", element: <Inbox /> },
    { path: "/lgu/communication/:id", element: <LGUMessageDetails /> },
    { path: "/lgu/communication", element: <LGUCommunication /> },
    { path: "/lgu/calendar", element: <Calendar /> },
    { path: "/lgu/message", element: <Messaging setUnreadMessages={() => {}} /> },
  ],
  Viewer: [
    { path: "/viewer/dashboard", element: <ViewerDashboard /> },
    { path: "/viewer/profile", element: <Profile /> },
    { path: "/viewer/inbox", element: <Inbox /> },
    { path: "/viewer/communication/:id", element: <ViewerMessageDetails /> },
    { path: "/viewer/communication", element: <ViewerCommunication /> },
    { path: "/viewer/calendar", element: <Calendar /> },
    { path: "/viewer/message", element: <Messaging setUnreadMessages={() => {}} /> },
  ],
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 576);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
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

  const getDashboardPath = () => {
    return role && roleRoutesConfig[role] ? roleRoutesConfig[role][0].path : "/login";
  };

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
        {user && role && (
          <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />)}
        <div className={`content-layout ${isSidebarOpen ? "expanded" : "collapsed"}`}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthForm />} />
            <Route path="/register-success" element={<Navigate to="/login" replace />} />

            {/* Protected Routes (Dynamically Rendered) */}
            {role &&
              roleRoutesConfig[role]?.map(({ path, element }) => (
                <Route key={path} path={path} element={<ProtectedRoute requiredRole={role}>{element}</ProtectedRoute>} />
              ))}

            {/* Catch-All Route */}
            <Route path="*" element={<Navigate to={user ? getDashboardPath() : "/"} replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
