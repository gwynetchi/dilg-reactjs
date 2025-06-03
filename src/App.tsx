import React, { useState, useEffect, JSX, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./pages/navbar";
import "./styles/components/pages.css";
import { useIdleTimer } from 'react-idle-timer'; 

// Import all your components
import DeletedCommunications from "./pages/DeletedCommunications";
import Analytics from "./pages/analytics";
import Dashboard from "./pages/dashboard";
import MessageDetails from "./pages/messagedetails";
import Sent from "./pages/sentCommunications";
import Communication from "./pages/communication";
import Inbox from "./pages/inbox";
import Calendar from "./pages/calendar";
import Messaging from "./pages/message";
import Profile from "./pages/profile";
import AuthForm from "./components/NewAuthForm";
import Landing from "./screens/Landing";
import SubmissionAnalytics from "./pages/submission-analytics";
import UserAnalytics from "./pages/user-analytics";
import MonthlyAnalytics from "./pages/program-analytics";
import Sentbox from "./pages/sentbox";
import Scoreboard from "./pages/scoreBoard";
import UserManagement from "./pages/UserManagement";
import DeletedUsers from "./pages/admin/DeletedUsers";
import ProgramMessageDetails from "./pages/ProgramMessageDetails";
import EvaluatorPrograms from "./pages/managePrograms";
import ProgramList from "./pages/ProgramList";
import ProgramMessages from "./pages/ViewProgramLinks";
import OrgChartAdmin from "./pages/admin/orgchart";
import ProgramLinksManager from "./pages/modules/program-modules/ProgramLinksManager";
import MayorManagement from "./pages/admin/MayorManagement";

// Role-based route configuration
const roleRoutesConfig: Record<string, { path: string; element: JSX.Element }[]> = {
  Admin: [
    { path: "/admin/dashboard", element: <Dashboard /> },
    { path: "/admin/profile", element: <Profile /> },
    { path: "/admin/inbox/:id", element: <MessageDetails /> },
    { path: "/admin/one_shot_reports", element: <Communication /> },
    { path: "/admin/sentCommunications/:id", element: <Sent /> },
    { path: "/admin/inbox", element: <Inbox /> },
    { path: "/admin/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/admin/calendar", element: <Calendar /> },
    { path: "/admin/scoreBoard", element: <Scoreboard /> },
    { path: "/admin/UserManagement", element: <UserManagement /> },
    { path: "/admin/OrganizationalChart", element: <OrgChartAdmin /> },
    { path: "/admin/DeletedUsers", element: <DeletedUsers />},
    { path: "/admin/Deletedone_shot_reports", element: <DeletedCommunications/>},
    { path: "/admin/MayorManagement", element: <MayorManagement cities={{}} onSave={() => Promise.resolve()} />},
  ],
  ProvincialOffice: [
    { path: "/ProvincialOffice/dashboard", element: <Dashboard /> },
    { path: "/ProvincialOffice/profile", element: <Profile /> },
    { path: "/ProvincialOffice/inbox", element: <Inbox /> },
    { path: "/ProvincialOffice/inbox/:id", element: <MessageDetails /> },
    { path: "/ProvincialOffice/sentbox", element: <Sentbox /> },
    { path: "/ProvincialOffice/one_shot_reports", element: <Communication /> },
    { path: "/ProvincialOffice/Deletedone_shot_reports", element: <DeletedCommunications/>},
    { path: "/ProvincialOffice/sentCommunications/:id", element: <Sent /> },
    { path: "/ProvincialOffice/calendar", element: <Calendar /> },
    { path: "/ProvincialOffice/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/ProvincialOffice/analytics", element: <Analytics /> },
    { path: "/ProvincialOffice/analytics/submission-analytics", element: <SubmissionAnalytics /> },
    { path: "/ProvincialOffice/analytics/user-analytics", element: <UserAnalytics /> },
    { path: "/ProvincialOffice/analytics/monthly-analytics", element: <MonthlyAnalytics /> },
    { path: "/ProvincialOffice/scoreBoard", element: <Scoreboard /> },
    { path: "/ProvincialOffice/programs", element: <EvaluatorPrograms /> },
    { path: "/ProvincialOffice/programs/:programId", element: <ProgramMessages />}
  ],
  ClusterOffice: [
    { path: "/ClusterOffice/dashboard", element: <Dashboard /> },
    { path: "/ClusterOffice/profile", element: <Profile /> },
    { path: "/ClusterOffice/inbox", element: <Inbox /> },
    { path: "/ClusterOffice/inbox/:id", element: <MessageDetails /> },
    { path: "/ClusterOffice/one_shot_reports", element: <Communication /> },
    { path: "/ClusterOffice/Deletedone_shot_reports", element: <DeletedCommunications/>},
    { path: "/ClusterOffice/sentCommunications/:id", element: <Sent /> },
    { path: "/ClusterOffice/calendar", element: <Calendar /> },
    { path: "/ClusterOffice/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/ClusterOffice/scoreBoard", element: <Scoreboard /> },
    { path: "/ClusterOffice/programs", element: <ProgramList /> },
    { path: "/ClusterOffice/programs/:programId", element: <ProgramMessages />},
    { path: "/ClusterOffice/program-inbox/message/:id", element: <ProgramMessageDetails /> },
  ],
  FieldOffice: [
    { path: "/FieldOffice/dashboard", element: <Dashboard /> },
    { path: "/FieldOffice/profile", element: <Profile /> },
    { path: "/FieldOffice/inbox", element: <Inbox /> },
    { path: "/FieldOffice/inbox/:id", element: <MessageDetails /> },
    { path: "/FieldOffice/programs", element: <ProgramList /> },
    { path: "/FieldOffice/calendar", element: <Calendar /> },
    { path: "/FieldOffice/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/FieldOffice/scoreBoard", element: <Scoreboard /> },
    { path: "/FieldOffice/programs/:programId", element: <ProgramMessages />},
    { path: "/FieldOffice/program-inbox/message/:id", element: <ProgramMessageDetails /> },
  ],
};

// Timeout constants
const INACTIVITY_TIMEOUT = 1000 * 60 * 60 * 6; // 6 hours
const WARNING_TIMEOUT = 1000 * 60 * 1; // 1 minute warning before logout

// Role path prefixes for access control
const ROLE_PATHS: Record<string, string> = {
  Admin: "admin",
  ProvincialOffice: "ProvincialOffice",
  ClusterOffice: "ClusterOffice",
  FieldOffice: "FieldOffice",
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 576);
  const [showWarning, setShowWarning] = useState(false);
  
  const auth = getAuth();
  const db = getFirestore();
  const LAST_ACTIVE_KEY = "lastActiveTime";
  let logoutTimer: ReturnType<typeof setTimeout>;

  const updateLastActiveTime = () => {
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
};

  const getLastActiveTime = () => {
    const stored = localStorage.getItem(LAST_ACTIVE_KEY);
    return stored ? parseInt(stored, 10) : null;
  };

  const handleAutoLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setRole(null);
      setShowWarning(false);
    }
  }, [auth]);

  // Idle timer configuration
  const { reset } = useIdleTimer({
    timeout: INACTIVITY_TIMEOUT,
    onIdle: () => {
      setShowWarning(true);
      logoutTimer = setTimeout(handleAutoLogout, WARNING_TIMEOUT);
    },
    onActive: () => {
      clearTimeout(logoutTimer);
      updateLastActiveTime();
      setShowWarning(false);
    },
    debounce: 500,
    promptBeforeIdle: INACTIVITY_TIMEOUT - WARNING_TIMEOUT,
    events: [
      "mousedown", "keydown", "wheel", "DOMMouseScroll",
      "mousewheel", "mousemove", "touchmove", "touchstart", "resize"
    ],
  });

  // Auth state and user data management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const uid = currentUser.uid;
        const deletedSnap = await getDoc(doc(db, "deleted_users", uid));
        if (deletedSnap.exists()) {
          console.warn("Account is marked as deleted. Signing out...");
          await handleAutoLogout();
          return;
        }

        const userSnap = await getDoc(doc(db, "users", uid));
        setRole(userSnap.exists() ? userSnap.data().role : null);
      } catch (err) {
        console.error("User fetch error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db, handleAutoLogout]);
  useEffect(() => {
    const lastActive = getLastActiveTime();
    const now = Date.now();
    if (lastActive && now - lastActive > INACTIVITY_TIMEOUT) {
      console.warn("Inactivity timeout reached before app load.");
      handleAutoLogout();
    }
  }, [handleAutoLogout]);

  // Get dashboard path based on role
  const getDashboardPath = useCallback(() => {
    return role && roleRoutesConfig[role]?.[0]?.path || "/login";
  }, [role]);

  // Protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  
  // Normalize the role by removing spaces
  const normalizedRole = role?.replace(/\s+/g, '') || '';
  
  // Check if user has access to this route
  const userHasAccess = normalizedRole && roleRoutesConfig[normalizedRole]?.some(
    _route => location.pathname.startsWith(`/${ROLE_PATHS[normalizedRole]}`)
  );

  if (!userHasAccess) {
    return <Navigate to={getDashboardPath()} replace />;
  }

  return children;
};

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {user && role && (
          <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        )}
        <div className={`content-layout ${user ? (isSidebarOpen ? "expanded" : "collapsed") : ""}`}>
          {/* Inactivity Warning Modal */}
          {showWarning && (
            <div className="warning-modal">
              <p>Your session will expire in 30 seconds due to inactivity.</p>
              <div className="warning-buttons">
                <button 
                  onClick={() => {
                    reset();
                    setShowWarning(false);
                  }}
                  className="btn btn-primary"
                >
                  Stay Logged In
                </button>
                <button 
                  onClick={handleAutoLogout}
                  className="btn btn-danger"
                >
                  Log Out Now
                </button>
              </div>
            </div>
          )}

          <Routes>
            {/* Public Routes */}
            <Route path="/dashboard" element={user ? <Navigate to={getDashboardPath()} replace /> : <Landing />} />
            <Route path="/login" element={user ? <Navigate to={getDashboardPath()} replace /> : <AuthForm />} />
            <Route path="/register-success" element={<Navigate to="/login" replace />} />
            <Route path="/program-links/:programId" element={<ProgramLinksManager />} />

            {/* Protected Routes */}
            {role && roleRoutesConfig[role]?.map(({ path, element }) => (
              <Route 
                key={path} 
                path={path} 
                element={<ProtectedRoute>{element}</ProtectedRoute>} 
              />
            ))}

            {/* Catch-All Route */}
            <Route path="*" element={<Navigate to={user ? getDashboardPath() : "/dashboard"} replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;