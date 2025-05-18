// React & Hooks
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

// Firebase
import { signOut, onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  getDocs
} from "firebase/firestore";
import { auth, db } from "../firebase";

// Styles

import "bootstrap/dist/css/bootstrap.min.css";
import "boxicons/css/boxicons.min.css";
import "../styles/components/navbar.css"

interface NavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

// Constants
const MENU_ITEMS = {
  Viewer: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/viewer/dashboard" },
    { name: "Inbox", icon: "bxs-inbox", path: "/viewer/inbox" },
    { name: "Calendar", icon: "bxs-calendar", path: "/viewer/calendar" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/viewer/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/viewer/DeletedCommunications" },
    { name: "Message", icon: "bxs-chat", path: "/viewer/message" },
    { name: "Score Board", icon: "bxs-bar-chart-alt-2", path: "/viewer/scoreBoard" },
  ],
  Evaluator: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/evaluator/dashboard" },
    { name: "Inbox", icon: "bxs-inbox", path: "/evaluator/inbox" },
    { name: "Calendar", icon: "bxs-calendar", path: "/evaluator/calendar" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/evaluator/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/evaluator/DeletedCommunications" },
    { name: "Analytics", icon: "bxs-bar-chart-alt-2", path: "/evaluator/analytics" },
    { name: "Message", icon: "bxs-chat", path: "/evaluator/message" },
    { name: "Score Board", icon: "bxs-crown", path: "/evaluator/scoreBoard" },
    { name: "Programs", icon: "bxs-doughnut-chart", path: "/evaluator/programs" },
  ],
  LGU: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/lgu/dashboard" },
    { name: "Inbox", icon: "bxs-inbox", path: "/lgu/inbox" },
    { name: "Calendar", icon: "bxs-calendar", path: "/lgu/calendar" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/lgu/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/lgu/DeletedCommunications" },
    { name: "Message", icon: "bxs-chat", path: "/lgu/message" },
    { name: "Score Board", icon: "bxs-bar-chart-alt-2", path: "/lgu/scoreBoard" },
    { name: "Programs", icon: "bxs-doughnut-chart", path: "/lgu/programs" },
  ],
  Admin: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/admin/dashboard" },
    { name: "Inbox", icon: "bxs-inbox", path: "/admin/inbox" },
    { name: "Calendar", icon: "bxs-calendar", path: "/admin/calendar" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/admin/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/admin/DeletedCommunications" },
    { name: "Message", icon: "bxs-chat", path: "/admin/message" },
    { name: "Score Board", icon: "bxs-bar-chart-alt-2", path: "/admin/scoreBoard" },
    { name: "Deleted Users", icon: "bx bx-user-x", path: "/admin/DeletedUsers" },
    { name: "User Management", icon: "bxs-user-plus", path: "/admin/userManagement" },
    { name: "Organizational Chart", icon: "bx-sitemap", path: "/admin/OrganizationalChart" },
    { name: "Mayor Management", icon: "bxr bx-man", path: "/admin/MayorManagement" },
  ],
};

const ROLE_PATHS = {
  Evaluator: "evaluator",
  Viewer: "viewer",
  LGU: "lgu",
  Admin: "admin",
};

const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  // State management
  const [unreadCounts, setUnreadCounts] = useState({
    inbox: 0,
    programs: 0
  });  const [userRole, setUserRole] = useState<keyof typeof MENU_ITEMS | null>(null);
  const [userProfilePic, setUserProfilePic] = useState<string>("");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // Refs and hooks
  const location = useLocation();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Effects
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        
        const unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUserRole(userData.role);
            setUserProfilePic(userData.profileImage || "");
          }
        });
  
        return unsubscribeUserDoc;
      } else {
        setUserRole(null);
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (userRole && MENU_ITEMS[userRole]) {
      const currentItem = MENU_ITEMS[userRole].find((item) => 
        location.pathname.startsWith(item.path)
      );
      if (currentItem) {
        setActiveMenu(currentItem.name);
      }
    }
  }, [location.pathname, userRole]);
  
  useEffect(() => {
    if (!userRole || !auth.currentUser?.uid) return;
  
    const userId = auth.currentUser.uid;

    const fetchUnreadMessages = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
    
        // Query for communications (inbox)
        const messagesQuery = query(
          collection(db, "communications"),
          where("recipients", "array-contains", userId)
        );
        
        // Query for programs
        const programMessagesQuery = query(
          collection(db, "programs"),
          where("participants", "array-contains", userId)
        );
    
        const [messagesSnapshot, programMessagesSnapshot] = await Promise.all([
          getDocs(messagesQuery),
          getDocs(programMessagesQuery)
        ]);
    
        // Calculate unread counts for each category
        const inboxUnread = messagesSnapshot.docs.filter(
          doc => !doc.data().seenBy?.includes(userId)
        ).length;
    
        const programsUnread = programMessagesSnapshot.docs.filter(
          doc => !doc.data().seenBy?.includes(userId)
        ).length;
    
        setUnreadCounts({
          inbox: inboxUnread,
          programs: programsUnread
        });
    
        // Combine all unread messages for notifications
        const allUnreadMessages = [
          ...messagesSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...(doc.data() as { seenBy?: string[] }), // Explicitly type the data
            type: 'communication' 
          })),
          ...programMessagesSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...(doc.data() as { seenBy?: string[] }), // Explicitly type the data
            type: 'program' 
          }))
        ].filter(item => !item.seenBy?.includes(userId));
    
        setUnreadMessages(allUnreadMessages);
    
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
    };  
    // Initial fetch
    fetchUnreadMessages();
  
    // Real-time listeners (if needed)
    const messagesUnsubscribe = onSnapshot(
      query(collection(db, "communications"), 
      where("recipients", "array-contains", userId)),
      () => fetchUnreadMessages() // Refetch when changes occur
    );
  
    const programMessagesUnsubscribe = onSnapshot(
      query(collection(db, "programs"), 
      where("participants", "array-contains", userId)),
      () => fetchUnreadMessages() // Refetch when changes occur
    );
  
    return () => {
      messagesUnsubscribe();
      programMessagesUnsubscribe();
    };
  }, [userRole, auth.currentUser?.uid]);

  // Handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleEventClick = async (clickInfo: any) => {
    const messageId = clickInfo.event.extendedProps.messageId;
    if (!userRole) return;
  
    try {
      // First try to find in communications
      const commRef = doc(db, "communications", messageId);
      const commDoc = await getDoc(commRef);
      
      if (commDoc.exists()) {
        const rolePath = ROLE_PATHS[userRole] || "viewer";
        navigate(`/${rolePath}/inbox/${messageId}`);
        
        const data = commDoc.data();
        const seenBy = data?.seenBy || [];
  
        if (!seenBy.includes(auth.currentUser?.uid)) {
          await updateDoc(commRef, {
            seenBy: [...seenBy, auth.currentUser?.uid],
          });
        }
        return;
      }
  
      // If not found in communications, try programs
      const programRef = doc(db, "programs", messageId);
      const programDoc = await getDoc(programRef);
      
      if (programDoc.exists()) {
        const rolePath = ROLE_PATHS[userRole] || "viewer";
        navigate(`/${rolePath}/programs/${messageId}`);
        
        const data = programDoc.data();
        const seenBy = data?.seenBy || [];
  
        if (!seenBy.includes(auth.currentUser?.uid)) {
          await updateDoc(programRef, {
            seenBy: [...seenBy, auth.currentUser?.uid],
          });
        }
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  if (!userRole) return null;

  return (
    <div className="d-flex">
      <section id="sidebar" className={isSidebarOpen ? "open show" : "hide"}>
        <Link to="/dashboards" className="brand">
          <img 
            src="/images/logo.png" 
            alt="Logo" 
            className={`brand-logo ${isSidebarOpen ? "logo-expanded" : "logo-collapsed"}`}
          />
        </Link>

        <ul className="side-menu top">
          {userRole && MENU_ITEMS[userRole].map(({ name, icon, path }) => (
            <li key={name} className={activeMenu === name ? "active" : ""}>
              <Link to={path} onClick={() => setActiveMenu(name)}>
                <i className={`bx ${icon} bx-sm`}></i>
                <span className="text">{name}</span>
                {name === "Inbox" && unreadCounts.inbox > 0 && (
                  <span className="menu-badge">{unreadCounts.inbox}</span>
                )}
                {name === "Programs" && unreadCounts.programs > 0 && (
                  <span className="menu-badge">{unreadCounts.programs}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        
        <ul className="side-menu bottom">
          <li className={activeMenu === "Logout" ? "active" : ""}>
            <Link to="/" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
              <i className="bx bx-log-out bx-sm bx-burst-hover"></i>
              <span className="text">Logout</span>
            </Link>
          </li>
        </ul>
      </section>

      <section id="contentnav" className={`main-content ${isSidebarOpen ? "expanded" : "collapsed"}`}>
        <nav className="d-flex align-items-center justify-content-between px-3 py-2">
        <div className="d-flex align-items-center">
            <button 
              className="btn btn-menu"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <i className="bx bx-menu bx-sm"></i>
              {/* Persistent unread badge - visible even when sidebar is collapsed */}
              {(unreadCounts.inbox + unreadCounts.programs) > 0 && (
                <span className="global-unread-badge">
                  {unreadCounts.inbox + unreadCounts.programs}
                </span>
              )}
            </button>
          </div>
          
          <div className="d-flex justify-content-end align-items-center">
            <div className="position-relative" ref={notificationMenuRef}>
            <button 
              className="btn notification" 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              aria-label="Notifications"
            >
              <i className="bx bx-md bx-bell bx-tada-hover"></i>
              {unreadCounts.inbox + unreadCounts.programs > 0 && (
                <span className="num">{unreadCounts.inbox + unreadCounts.programs}</span>
              )}
            </button>

              {isNotificationOpen && unreadMessages.length > 0 && (
                <div className="notification-dropdown">
                  <ul>
                    {unreadMessages.map((message) => {
                      // Determine if it's a communication or program
                      const isCommunication = message.hasOwnProperty('subject');
                      const isProgram = message.hasOwnProperty('programName');
                      
                      return (
                        <li key={message.id}>
                          <Link
                            to={isCommunication ? `/inbox/${message.id}` : `/programs/${message.id}`}
                            className="notification-item"
                            onClick={(e) => {
                              e.preventDefault();
                              handleEventClick({
                                event: { extendedProps: { messageId: message.id } },
                              });
                            }}
                          >
                            <div>
                              {isCommunication && (
                                <>
                                  <strong>New Communication</strong>
                                  <p><strong>Subject:</strong> {message.subject}</p>
                                  <p>{message.content?.substring(0, 100)}...</p>
                                  {message.deadline && (
                                    <p>
                                      <strong>Deadline:</strong> {message.deadline?.toDate ? 
                                        new Date(message.deadline.toDate()).toLocaleString() : "No Deadline"}
                                    </p>
                                  )}
                                  <span>
                                    <strong>Sent: </strong> 
                                    {message.createdAt?.seconds ? 
                                      new Date(message.createdAt.seconds * 1000).toLocaleString() : 
                                      "No Timestamp"}
                                  </span>
                                </>
                              )}
                              
                              {isProgram && (
                                <>
                                  <strong>New Program Notification</strong>
                                  <p><strong>Program:</strong> {message.programName}</p>
                                  <p><strong>Description:</strong> {message.description?.substring(0, 100)}...</p>
                                  {message.frequency && (
                                    <p><strong>Frequency:</strong> {message.frequency}</p>
                                  )}
                                  {message.duration && (
                                    <p>
                                      <strong>Duration:</strong> {message.duration.from} to {message.duration.to}
                                    </p>
                                  )}
                                  <span>
                                    <strong>Created: </strong>
                                    {message.createdAt?.seconds ? 
                                      new Date(message.createdAt.seconds * 1000).toLocaleString() : 
                                      "No Timestamp"}
                                  </span>
                                </>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}            
          </div>
            
            <div className="position-relative" ref={profileMenuRef}>
              <button
                className="btn btn-profile p-0 border-0 bg-transparent"
                onClick={() => navigate(`/${userRole.toLowerCase()}/profile`)}
                aria-label="User profile"
              >
                {userProfilePic && userProfilePic.trim() !== "" ? (
                  <img
                    src={userProfilePic}
                    alt="Profile"
                    className="rounded-circle"
                    style={{ 
                      width: "40px", 
                      height: "40px", 
                      objectFit: "cover",
                      border: "2px solid #f8f9fa"
                    }}
                  />
                ) : (
                  <div 
                    className="placeholder-profile" 
                    style={{ 
                      width: "40px", 
                      height: "40px", 
                      backgroundColor: "#e9ecef", 
                      borderRadius: "50%",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      border: "2px solid #f8f9fa"
                    }}
                  >
                    <i className="bx bx-user" style={{ fontSize: "20px", color: "#adb5bd" }}></i>
                  </div>
                )}
              </button>
            </div>
          </div>
        </nav>
      </section>
    </div>
  );
};

export default Navbar;