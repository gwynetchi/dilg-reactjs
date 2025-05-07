import React, { useState, useEffect, JSX } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./pages/navbar";
import "./styles/components/pages.css";
import { useIdleTimer } from 'react-idle-timer'; // Add this import

import SendDueCommunications from "./pages/SendDuePrograms";
import CheckFrequency from "./pages/CheckFrequency";
import DeletedCommunications from "./pages/DeletedCommunications";
import Analytics from "./pages/analytics";

// Import Dashboards
import Dashboard from "./pages/dashboard";

// Import Message Details
import MessageDetails from "./pages/messagedetails";

// Import Sent communications
import Sent from "./pages/sentCommunications";

// Import Communication Pages
import Communication from "./pages/communication";

// Import Inbox, Calendar, Messaging, and Profile
import Inbox from "./pages/inbox";
import Calendar from "./pages/calendar";
import Messaging from "./pages/message";
import Profile from "./pages/profile";

// Import Authentication and Landing Pages
import AuthForm from "./components/NewAuthForm";
import Landing from "./screens/Landing";
import SubmissionAnalytics from "./pages/submission-analytics";
import UserAnalytics from "./pages/user-analytics";
import MonthlyAnalytics from "./pages/monthly-analytics";
import Sentbox from "./pages/sentbox";
import Scoreboard from "./pages/scoreBoard";
import UserManagement from "./pages/UserManagement";
import DeletedUsers from "./pages/admin/DeletedUsers";


import EvaluatorPrograms from "./pages/managePrograms";
import ProgramCards from "./pages/ProgramsCards";
import ProgramMessages from "./pages/ProgramMessages";
import OrgChartAdmin from "./pages/admin/orgchart";


const roleRoutesConfig: Record<string, { path: string; element: JSX.Element }[]> = {
  Admin: [
    { path: "/admin/dashboard", element: <Dashboard /> },
    { path: "/admin/profile", element: <Profile /> },
    { path: "/admin/inbox/:id", element: <MessageDetails /> },
    { path: "/admin/communication", element: <Communication /> },
    { path: "/admin/sentCommunications/:id", element: <Sent /> }, // Added this line
    { path: "/admin/inbox", element: <Inbox /> },
    { path: "/admin/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/admin/calendar", element: <Calendar /> },
    { path: "/admin/scoreBoard", element: <Scoreboard /> },
    { path: "/admin/UserManagement", element: <UserManagement /> }, // ← Added here
    { path: "/admin/OrganizationalChart", element: <OrgChartAdmin /> }, // ← Added here
    { path: "/admin/DeletedUsers", element: <DeletedUsers />},
    { path: "/admin/DeletedCommunications", element: <DeletedCommunications/>},

  ],
  Evaluator: [
    { path: "/evaluator/dashboard", element: <Dashboard /> },
    { path: "/evaluator/profile", element: <Profile /> },
    { path: "/evaluator/inbox", element: <Inbox /> },
    { path: "/evaluator/inbox/:id", element: <MessageDetails /> },
    { path: "/evaluator/sentbox", element: <Sentbox /> },
    { path: "/evaluator/communication", element: <Communication /> },
    { path: "/evaluator/DeletedCommunications", element: <DeletedCommunications/>},
    { path: "/evaluator/sentCommunications/:id", element: <Sent /> }, // Added this line
    { path: "/evaluator/calendar", element: <Calendar /> },
    { path: "/evaluator/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/evaluator/analytics", element: <Analytics /> },
    { path: "/evaluator/analytics/submission-analytics", element: <SubmissionAnalytics /> },
    { path: "/evaluator/analytics/user-analytics", element: <UserAnalytics /> },
    { path: "/evaluator/analytics/monthly-analytics", element: <MonthlyAnalytics /> },
    { path: "/evaluator/scoreBoard", element: <Scoreboard /> },
    { path: "/evaluator/programs", element: <EvaluatorPrograms /> },
    { path: "/evaluator/programs/:programId", element: <ProgramMessages />}


  ],
  LGU: [
    { path: "/lgu/dashboard", element: <Dashboard /> },
    { path: "/lgu/profile", element: <Profile /> },
    { path: "/lgu/inbox", element: <Inbox /> },
    { path: "/lgu/inbox/:id", element: <MessageDetails /> },
    { path: "/lgu/communication", element: <Communication /> },
    { path: "/lgu/DeletedCommunications", element: <DeletedCommunications/>},
    { path: "/lgu/sentCommunications/:id", element: <Sent /> }, // Added this line
    { path: "/lgu/calendar", element: <Calendar /> },
    { path: "/lgu/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/lgu/scoreBoard", element: <Scoreboard /> },
    { path: "/lgu/programs", element: <ProgramCards /> },
    { path: "/lgu/programs/:programId", element: <ProgramMessages />}

  ],
  Viewer: [
    { path: "/viewer/dashboard", element: <Dashboard /> },
    { path: "/viewer/profile", element: <Profile /> },
    { path: "/viewer/inbox", element: <Inbox /> },
    { path: "/viewer/inbox/:id", element: <MessageDetails /> },
    { path: "/viewer/communication", element: <Communication /> },
    { path: "/viewer/DeletedCommunications", element: <DeletedCommunications/>},
    { path: "/viewer/sentCommunications/:id", element: <Sent /> }, // Added this line
    { path: "/viewer/calendar", element: <Calendar /> },
    { path: "/viewer/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/viewer/scoreBoard", element: <Scoreboard /> },
  ],
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 576);
  const [duePrograms, setDuePrograms] = useState<any[]>([]);
  const auth = getAuth();
  const db = getFirestore();
  const [showWarning, setShowWarning] = useState(false);


    // Auto-logout after 12 hours of inactivity (no deletion)
    const handleAutoLogout = async () => {
      if (user) {
        console.log('Auto-logout after 12 hours of inactivity');
        await signOut(auth); // Just logs out, no deletion
        setUser(null);
        setRole(null);
      }
    };
  
    const { reset } = useIdleTimer({
      timeout: 1000 * 60 * 60 * 12, // 12 hours
      onIdle: handleAutoLogout,
      debounce: 500,
      events: [
        'mousedown',
        'keydown',
        'wheel',
        'DOMMouseScroll',
        'mousewheel',
        'mousemove',
        'touchmove',
        'touchstart',
        'resize'
      ],
      promptBeforeIdle: 1000 * 60 * 5, // 5-minute warning
      onPrompt: () => setShowWarning(true),
      onActive: () => setShowWarning(false),
    });
    
    // Add reset to the dependency array of your auth useEffect
    useEffect(() => {
      const unsubscribeAuth = onAuthStateChanged(auth, async () => {
        // ... existing code ...
      });
      return () => unsubscribeAuth();
    }, [reset]); // ← Add reset here
          
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const uid = currentUser.uid;
      setUser(currentUser);

      // Set up real-time listener for user deletion
      const deletedRef = doc(db, "deleted_users", uid);
      const unsubscribeDeleted = onSnapshot(deletedRef, async (deletedSnap) => {
        if (deletedSnap.exists()) {
          console.warn("This account is marked as deleted. Signing out...");
          await signOut(auth);  // Sign out user if they are marked as deleted
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      });

      // Fetch role from users collection
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      setRole(userDoc.exists() ? userDoc.data().role : null);
      setLoading(false);

      // Cleanup Firestore listener on unmount or auth change
      return () => unsubscribeDeleted();
    });

    return () => unsubscribeAuth();
  }, []);
  const getDashboardPath = () => {
    return role && roleRoutesConfig[role] ? roleRoutesConfig[role][0].path : "/login";
  };

  const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element; requiredRole: string }) => {
    if (loading)
      return (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );

    if (!user) return <Navigate to="/login" replace />;
    if (role !== requiredRole) return <Navigate to={getDashboardPath()} replace />;

    return children;
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );

    return (
      <Router>
        <div className="app-container">
          {user && role && (
            <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
          )}
          <div className={`content-layout ${user ? (isSidebarOpen ? "expanded" : "collapsed") : ""}`}>
            {user && (
              <>
                <CheckFrequency onDuePrograms={setDuePrograms} />
                {duePrograms.length > 0 && <SendDueCommunications duePrograms={duePrograms} />}
              </>
            )}
            {/* Warning Modal */}
            {showWarning && (
              <div className="warning-modal" style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '15px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1000
              }}>
                <p>Your session will expire in 5 minutes due to inactivity.</p>
                <button 
                  onClick={reset}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Stay Logged In
                </button>
              </div>
            )}

            <Routes>
              {/* Public Routes */}
              <Route
                path="/dashboard"
                element={
                  user ? (
                    <Navigate to={getDashboardPath()} replace />
                  ) : (
                    <Landing />
                  )
                }
              />  
              <Route
                path="/login"
                element={
                  user ? (
                    <Navigate to={getDashboardPath()} replace />
                  ) : (
                    <AuthForm />
                  )
                }
              />
              <Route path="/register-success" element={<Navigate to="/login" replace />} />
  
              {/* Protected Routes (Dynamically Rendered) */}
              {role &&
                roleRoutesConfig[role]?.map(({ path, element }) => (
                  <Route key={path} path={path} element={<ProtectedRoute requiredRole={role}>{element}</ProtectedRoute>} />
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