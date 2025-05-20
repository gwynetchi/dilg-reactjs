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
  getDocs,
  Timestamp,
  arrayUnion
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

// Message types
interface BaseMessage {
  id: string;
  createdAt: Timestamp;
  seenBy?: string[];
  type: string;
}

interface CommunicationMessage extends BaseMessage {
  subject: string;
  content: string;
  deadline?: Timestamp;
  type: 'communication';
}

interface ProgramMessage extends BaseMessage {
  programName: string;
  description: string;
  frequency?: string;
  duration?: {
    from: string;
    to: string;
  };
  type: 'program';
}

type Message = CommunicationMessage | ProgramMessage;

// Constants
const MENU_ITEMS = {
  Viewer: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/viewer/dashboard" },
    { name: "One Shot Reports", icon: "bxs-inbox", path: "/viewer/inbox" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/viewer/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/viewer/DeletedCommunications" },
    { name: "Calendar", icon: "bxs-calendar", path: "/viewer/calendar" },
    { name: "Message", icon: "bxs-chat", path: "/viewer/message" },
    { name: "Score Board", icon: "bxs-bar-chart-alt-2", path: "/viewer/scoreBoard" },
  ],
  // other menu items remain the same
  Evaluator: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/evaluator/dashboard" },
    { name: "One Shot Reports", icon: "bxs-inbox", path: "/evaluator/inbox" },
    { name: "Regular Reports", icon: "bxs-doughnut-chart", path: "/evaluator/programs" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/evaluator/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/evaluator/DeletedCommunications" },
    { name: "Analytics", icon: "bxs-bar-chart-alt-2", path: "/evaluator/analytics" },
    { name: "Calendar", icon: "bxs-calendar", path: "/evaluator/calendar" },
    { name: "Message", icon: "bxs-chat", path: "/evaluator/message" },
    { name: "Score Board", icon: "bxs-crown", path: "/evaluator/scoreBoard" },
  ],
  LGU: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/lgu/dashboard" },
    { name: "One Shot Reports", icon: "bxs-inbox", path: "/lgu/inbox" },
    { name: "Regular Reports", icon: "bxs-doughnut-chart", path: "/lgu/programs" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/lgu/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/lgu/DeletedCommunications" },
    { name: "Calendar", icon: "bxs-calendar", path: "/lgu/calendar" },
    { name: "Message", icon: "bxs-chat", path: "/lgu/message" },
    { name: "Score Board", icon: "bxs-bar-chart-alt-2", path: "/lgu/scoreBoard" },
  ],
  Admin: [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/admin/dashboard" },
    { name: "One Shot Reports", icon: "bxs-inbox", path: "/admin/inbox" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/admin/communication" },
    { name: "Deleted Communication", icon: "bx bxs-message-alt-minus", path: "/admin/DeletedCommunications" },
    { name: "Calendar", icon: "bxs-calendar", path: "/admin/calendar" },
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

// Helper function to format date
const formatDate = (timestamp: Timestamp | undefined) => {
  if (!timestamp || !timestamp.seconds) return "No timestamp";
  
  const date = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  // State management
  const [unreadCounts, setUnreadCounts] = useState({
    inbox: 0,
    programs: 0
  });
  const [userRole, setUserRole] = useState<keyof typeof MENU_ITEMS | null>(null);
  const [userProfilePic, setUserProfilePic] = useState<string>("");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "communications" | "programs">("unread");
  
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

    const fetchMessages = async () => {
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
    
        // Get all communication messages
        const communicationMessages = messagesSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...(doc.data() as Omit<CommunicationMessage, 'id' | 'type'>),
          type: 'communication' 
        })) as CommunicationMessage[];

        // Get all program messages
        const programMessages = programMessagesSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...(doc.data() as Omit<ProgramMessage, 'id' | 'type'>),
          type: 'program' 
        })) as ProgramMessage[];
        
        // All messages
        const allMessagesData = [...communicationMessages, ...programMessages].sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA; // Sort by newest first
        });
        
        // Unread messages
        const unreadMessagesData = allMessagesData.filter(item => !item.seenBy?.includes(userId));
        
        setAllMessages(allMessagesData);
        setUnreadMessages(unreadMessagesData);
    
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };  
    // Initial fetch
    fetchMessages();
  
    // Real-time listeners
    const messagesUnsubscribe = onSnapshot(
      query(collection(db, "communications"), 
      where("recipients", "array-contains", userId)),
      () => fetchMessages()
    );
  
    const programMessagesUnsubscribe = onSnapshot(
      query(collection(db, "programs"), 
      where("participants", "array-contains", userId)),
      () => fetchMessages()
    );
  
    return () => {
      messagesUnsubscribe();
      programMessagesUnsubscribe();
    };
  }, [userRole, auth.currentUser?.uid]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationMenuRef.current && 
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleEventClick = async (messageId: string, messageType: string) => {
    if (!userRole || !auth.currentUser?.uid) return;
  
    try {
      const collectionName = messageType === 'communication' ? 'communications' : 'programs';
      const docRef = doc(db, collectionName, messageId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const rolePath = ROLE_PATHS[userRole] || "viewer";
        const routePath = messageType === 'communication' ? 'inbox' : 'programs';
        navigate(`/${rolePath}/${routePath}/${messageId}`);
        
        const data = docSnap.data();
        const seenBy = data?.seenBy || [];
  
        if (!seenBy.includes(auth.currentUser?.uid)) {
          await updateDoc(docRef, {
            seenBy: [...seenBy, auth.currentUser?.uid],
          });
        }
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };
  
  const markAsRead = async (messageId: string, messageType: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!auth.currentUser?.uid) return;
    
    try {
      const collectionName = messageType === 'communication' ? 'communications' : 'programs';
      const docRef = doc(db, collectionName, messageId);
      
      await updateDoc(docRef, {
        seenBy: arrayUnion(auth.currentUser.uid)
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!auth.currentUser?.uid) return;
    
    try {
      const userId = auth.currentUser.uid;
      
      // Update all unread communications
      const unreadCommunications = unreadMessages.filter(msg => msg.type === 'communication');
      const unreadPrograms = unreadMessages.filter(msg => msg.type === 'program');
      
      const communicationUpdates = unreadCommunications.map(msg => 
        updateDoc(doc(db, "communications", msg.id), {
          seenBy: arrayUnion(userId)
        })
      );
      
      const programUpdates = unreadPrograms.map(msg => 
        updateDoc(doc(db, "programs", msg.id), {
          seenBy: arrayUnion(userId)
        })
      );
      
      await Promise.all([...communicationUpdates, ...programUpdates]);
      
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Filter messages based on active filter
  const getFilteredMessages = () => {
    switch (activeFilter) {
      case 'all':
        return allMessages;
      case 'unread':
        return unreadMessages;
      case 'communications':
        return allMessages.filter(msg => msg.type === 'communication');
      case 'programs':
        return allMessages.filter(msg => msg.type === 'program');
      default:
        return unreadMessages;
    }
  };

  const filteredMessages = getFilteredMessages();

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
                {name === "One Shot Reports" && unreadCounts.inbox > 0 && (
                  <span className="menu-badge">{unreadCounts.inbox}</span>
                )}
                {name === "Regular Reports" && unreadCounts.programs > 0 && (
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
                {unreadMessages.length > 0 && (
                  <span className="num">{unreadMessages.length}</span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="m-0">Notifications</h6>
                      {unreadMessages.length > 0 && (
                        <button 
                          className="btn btn-sm mark-all-read" 
                          onClick={markAllAsRead}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="notification-filters mt-2">
                      <button 
                        className={`btn btn-sm ${activeFilter === 'unread' ? 'active' : ''}`} 
                        onClick={() => setActiveFilter('unread')}
                      >
                        Unread {unreadMessages.length > 0 && `(${unreadMessages.length})`}
                      </button>
                      <button 
                        className={`btn btn-sm ${activeFilter === 'all' ? 'active' : ''}`} 
                        onClick={() => setActiveFilter('all')}
                      >
                        All
                      </button>
                      <button 
                        className={`btn btn-sm ${activeFilter === 'communications' ? 'active' : ''}`} 
                        onClick={() => setActiveFilter('communications')}
                      >
                        Communications
                      </button>
                      <button 
                        className={`btn btn-sm ${activeFilter === 'programs' ? 'active' : ''}`} 
                        onClick={() => setActiveFilter('programs')}
                      >
                        Programs
                      </button>
                    </div>
                  </div>
                  
                  <div className="notification-body">
                    {filteredMessages.length === 0 ? (
                      <div className="no-notifications">
                        <i className="bx bx-bell-off bx-lg"></i>
                        <p>No {activeFilter === 'unread' ? 'unread' : ''} notifications</p>
                      </div>
                    ) : (
                      <ul>
                        {filteredMessages.map((message) => {
                          const isCommunication = message.type === 'communication';
                          const commMessage = message as CommunicationMessage;
                          const progMessage = message as ProgramMessage;
                          const isUnread = !message.seenBy?.includes(auth.currentUser?.uid || '');
                          
                          return (
                            <li 
                              key={message.id} 
                              className={`notification-item ${isUnread ? 'unread' : ''}`}
                              onClick={() => handleEventClick(message.id, message.type)}
                            >
                              <div className="notification-icon">
                                <i className={`bx ${isCommunication ? 'bxs-envelope' : 'bxs-calendar'} ${isUnread ? 'active' : ''}`}></i>
                              </div>
                              
                              <div className="notification-content">
                                {isCommunication ? (
                                  <>
                                    <div className="notification-title">
                                      {commMessage.subject}
                                    </div>
                                    <div className="notification-preview">
                                      {commMessage.content?.substring(0, 60)}
                                      {commMessage.content?.length > 60 ? '...' : ''}
                                    </div>
                                    {commMessage.deadline && (
                                      <div className="notification-deadline">
                                        <i className="bx bx-time-five"></i> 
                                        {new Date(commMessage.deadline.seconds * 1000).toLocaleDateString()}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="notification-title">
                                      {progMessage.programName}
                                    </div>
                                    <div className="notification-preview">
                                      {progMessage.description?.substring(0, 60)}
                                      {progMessage.description?.length > 60 ? '...' : ''}
                                    </div>
                                    {progMessage.frequency && (
                                      <div className="notification-frequency">
                                        <i className="bx bx-refresh"></i> {progMessage.frequency}
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                <div className="notification-meta">
                                  <span className="notification-time">
                                    {formatDate(message.createdAt)}
                                  </span>
                                  
                                  {isUnread && (
                                    <button 
                                      className="btn btn-sm btn-mark-read"
                                      onClick={(e) => markAsRead(message.id, message.type, e)}
                                      title="Mark as read"
                                    >
                                      <i className="bx bx-check"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
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