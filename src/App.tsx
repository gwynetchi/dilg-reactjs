import React, { useState, useEffect, JSX } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./pages/navbar";
import "./styles/components/pages.css";
import { useIdleTimer } from 'react-idle-timer'; 


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
import MonthlyAnalytics from "./pages/program-analytics";
import Sentbox from "./pages/sentbox";
import Scoreboard from "./pages/scoreBoard";
import UserManagement from "./pages/UserManagement";
import DeletedUsers from "./pages/admin/DeletedUsers";

import ProgramMessageDetails from "./pages/ProgramMessageDetails";
import EvaluatorPrograms from "./pages/managePrograms";
import ProgramCards from "./pages/ProgramsCards";
import ProgramMessages from "./pages/ViewProgramLinks";
import OrgChartAdmin from "./pages/admin/orgchart";
import ProgramLinksManager from "./pages/modules/program-modules/ProgramLinksManager";
import MayorManagement from "./pages/admin/MayorManagement";

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
    { path: "/admin/MayorManagement", element: <MayorManagement cities={{}} onSave={function (): Promise<void> {
      throw new Error("Function not implemented.");
    } } />},
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
    { path: "/lgu/programs/:programId", element: <ProgramMessages />},
    { path: "/lgu/program-inbox/message/:id", element: <ProgramMessageDetails /> },
  ],
  Viewer: [
    { path: "/viewer/dashboard", element: <Dashboard /> },
    { path: "/viewer/profile", element: <Profile /> },
    { path: "/viewer/inbox", element: <Inbox /> },
    { path: "/viewer/inbox/:id", element: <MessageDetails /> },
    { path: "/viewer/programs", element: <ProgramCards /> },
    { path: "/viewer/calendar", element: <Calendar /> },
    { path: "/viewer/message", element: <Messaging setUnreadMessages={() => {}} /> },
    { path: "/viewer/scoreBoard", element: <Scoreboard /> },
    { path: "/viewer/programs/:programId", element: <ProgramMessages />},
    { path: "/viewer/program-inbox/message/:id", element: <ProgramMessageDetails /> },
  ],
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 576);
  const auth = getAuth();
  const db = getFirestore();
  const [showWarning, setShowWarning] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);


    // Auto-logout after 12 hours of inactivity (no deletion)
    const handleAutoLogout = async () => {
      if (user) {
        console.log('Auto-logout after 12 hours of inactivity');
        await signOut(auth);
        setUser(null);
        setRole(null);
        setShowWarning(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

      // Show warning 5 minutes before logout
    const showWarningBeforeLogout = () => {
      setShowWarning(true);
      // Set timeout for actual logout 5 minutes after warning
      const id = setTimeout(handleAutoLogout, 5 * 60 * 1000);
      setTimeoutId(id);
    };

  const { reset } = useIdleTimer({
    timeout: 1000 * 60 * 60 * 12, // 12 hours in milliseconds
    onIdle: showWarningBeforeLogout,
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
    promptBeforeIdle: 1000 * 60 * 60 * 11 + 1000 * 60 * 55, // Show warning 5 minutes before idle timeout
    onActive: () => {
      setShowWarning(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    },
  });
    
    const handleUserActivity = () => {
    reset();
    setShowWarning(false);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

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
 
            {/* Warning Modal */}
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
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <p style={{ margin: 0 }}>Your session will expire in 5 minutes due to inactivity.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => {
                    handleUserActivity();
                    setShowWarning(false);
                  }}
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
                <button 
                  onClick={handleAutoLogout}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Log Out Now
                </button>
              </div>
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
              <Route path="/program-links/:programId" element={<ProgramLinksManager />} />
  
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