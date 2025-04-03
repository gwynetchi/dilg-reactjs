import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import "boxicons/css/boxicons.min.css";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useLocation } from "react-router-dom";

interface NavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfilePic, setUserProfilePic] = useState<string>("");

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (userRole && menuItems[userRole]) {
      const currentItem = menuItems[userRole].find((item) => location.pathname.startsWith(item.path));
      if (currentItem) {
        setActiveMenu(currentItem.name);
      }
    }
  }, [location.pathname, userRole]);
  
  const [searchQuery, setSearchQuery] = useState<string>("");

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const menuItems: Record<string, { name: string; icon: string; path: string }[]> = {
    Viewer: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/viewer/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/viewer/profile"},
      { name: "Inbox", icon: "bxs-message", path: "/viewer/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/viewer/calendar" },
      { name: "Message", icon: "bxs-message", path: "/viewer/message" },
    ],
    Evaluator: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/evaluator/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/evaluator/profile" },
      { name: "Inbox", icon: "bxs-message", path: "/evaluator/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/evaluator/calendar" },
      { name: "Communication", icon: "bxs-message-alt-edit", path: "/evaluator/communication" },
      { name: "Analytics", icon: "bxs-bar-chart-alt-2", path: "/evaluator/analytics" },
      { name: "Message", icon: "bxs-message", path: "/evaluator/message" },
    ],
    LGU: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/lgu/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/lgu/profile" },
      { name: "Inbox", icon: "bxs-message", path: "/lgu/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/lgu/calendar" },
      { name: "Communication", icon: "bxs-message-alt-edit", path: "/lgu/communication" },
      { name: "Message", icon: "bxs-message", path: "/lgu/message" },
    ],
    Admin: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/admin/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/admin/profile" },
      { name: "Inbox", icon: "bxs-message", path: "/admin/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/admin/calendar" },
      { name: "Communication", icon: "bxs-message-alt-edit", path: "/admin/communication" },
      { name: "Message", icon: "bxs-message", path: "/admin/message" },
    ],
  };

  // Track authenticated user and fetch role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        // Fetch user role from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserRole(userSnap.data().role);
          setUserProfilePic(userSnap.data().profilePic || "/person.svg"); // Default profile image if none available
        }
      } else {
        setUserId(null);
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    console.log("Current User ID:", userId);
  }, [userId]);
  
  useEffect(() => {
    if (!userRole) return;

    const fetchUnreadMessages = () => {
      const messagesRef = collection(db, "communications");
      const q = query(messagesRef, where("recipients", "array-contains", auth.currentUser?.uid));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let unread = 0;
        const newUnseenMessages: any[] = [];

        querySnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const message = {
            id: doc.id,
            sender: data.sender,          // Sender of the message
            deadline: data.deadline,      // Deadline of the message
            subject: data.subject,        // Subject of the message
            content: data.content,        // Message content
            timestamp: data.timestamp,    // Timestamp of when it was sent
            ...data, // Include all other fields from the document
          };

          if (!data.seenBy?.includes(auth.currentUser?.uid)) {
            unread++;
            newUnseenMessages.push(message); // Add the entire message details to the list
          }
        });

        setUnreadCount(unread); // Set the unread message count
        setUnreadMessages(newUnseenMessages); // Store the message details in state
      });

      return () => unsubscribe();
    };

    fetchUnreadMessages();
  }, [userRole]);

  const handleEventClick = async (clickInfo: any) => {
    const messageId = clickInfo.event.extendedProps.messageId;
    if (!userRole) {
      console.error("User role not found.");
      return;
    }
  
    // Define role-based paths
    const rolePaths: { [key: string]: string } = {
      Evaluator: "evaluator",
      Viewer: "viewer",
      LGU: "lgu",
      Admin: "admin",
    };
  
    const rolePath = rolePaths[userRole] || "viewer"; // Default to "viewer" if role is unknown
    navigate(`/${rolePath}/inbox/${messageId}`);
  
    // Mark the notification as read by adding the current user's ID to the "seenBy" array in Firestore
    try {
      const messageRef = doc(db, "communications", messageId);
      const messageDoc = await getDoc(messageRef);
  
      if (messageDoc.exists()) {
        const data = messageDoc.data();
        const seenBy = data?.seenBy || [];
  
        // Check if the user has already seen this message
        if (!seenBy.includes(auth.currentUser?.uid)) {
          // Add current user to "seenBy" array
          await updateDoc(messageRef, {
            seenBy: [...seenBy, auth.currentUser?.uid],
          });
        }
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };
  

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect to Landing page
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      const db = getFirestore();
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, where("sender", "==", searchQuery), where("text", "array-contains", searchQuery));
      const querySnapshot = await getDocs(q);
      const inboxResults = querySnapshot.docs.map((doc) => doc.data());
      const filteredSidebarItems = userRole
        ? menuItems[userRole].filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];
      navigate(`/search?query=${searchQuery}`, { state: { filteredSidebarItems, inboxResults } });
    }
  };

  const toggleSearchForm = () => {
    setIsSearchOpen(prevState => !prevState);
  };

  if (!userRole) return null;

  return (
    <div className="d-flex">
      <section id="sidebar" className={isSidebarOpen ? "open show" : "hide"}>
      <Link to="/dashboards" className="brand">
        <img src="/images/logo1.png" alt="Logo" className="brand-logo" />
      </Link>

        <ul className="side-menu top">
          {menuItems[userRole].map(({ name, icon, path }) => (
            <li key={name} className={activeMenu === name ? "active" : ""}>
              <Link to={path} onClick={() => setActiveMenu(name)}>
                <i className={`bx ${icon} bx-sm`}></i>
                <span className="text">{name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="side-menu bottom">
          <li className={activeMenu === "Settings" ? "active" : ""}>
            <Link to="/settings" onClick={() => setActiveMenu("Settings")}>
              <i className="bx bxs-cog bx-sm bx-spin-hover"></i>
              <span className="text">Settings</span>
            </Link>
          </li>
          <li className={activeMenu === "Logout" ? "active" : ""}>
            <Link
              to="/"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <i className="bx bx-power-off bx-sm bx-burst-hover"></i>
              <span className="text">Logout</span>
            </Link>
          </li>
        </ul>
      </section>

      <section id="contentnav" className={`main-content ${isSidebarOpen ? "expanded" : "collapsed"}`}>
        <nav className="d-flex align-items-center justify-content-between px-3 py-2">
          <i className="bx bx-menu bx-sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)}></i>
          <button type="button" className="btn btn-outline-secondary" onClick={toggleSearchForm}></button>
          <form className={`d-flex ${isSearchOpen ? "show" : ""}`}>
            <input
              type="search"
              className="form-control"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <button type="button" className="btn btn-outline-secondary" onClick={handleSearch}>
              <i className={`bx ${isSearchOpen ? "bx-x" : "bx-search"}`}></i>
            </button>
          </form>

          <div className="position-relative" ref={notificationMenuRef}>
            <button className="btn notification" onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
              <i className="bx bx-md bxs-bell bx-tada-hover"></i>
              {unreadCount > 0 && <span className="num">{unreadCount}</span>}
            </button>

            {isNotificationOpen && unreadMessages.length > 0 && (
              <div className="notification-dropdown">
                <ul>
                  {unreadMessages.map((message) => (
                    <li key={message.id}>
                      <Link
                        to={`/inbox/${message.id}`}
                        className="notification-item"
                        onClick={(e) => {
                          e.preventDefault();
                          handleEventClick({
                            event: { extendedProps: { messageId: message.id } },
                          });
                        }}
                      >
                        <div>
                          <strong>{message.sender}</strong>
                          <p><strong>Subject:</strong> {message.subject}</p>
                          <p>{message.content}</p>
                          <p><strong>Deadline:</strong> {message.deadline?.toDate ? new Date(message.deadline.toDate()).toLocaleString() : "No Deadline"}</p>
                          <span><strong>Sent: </strong> {message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleString() :  "No Timestamp"}  </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="position-relative" ref={profileMenuRef}>
            <button className="btn profile" onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}>
              <img src={userProfilePic} alt="Profile" />
            </button>

            {isProfileOpen && (
              <div className="profile-menu">
                <ul>
                  <li><Link to="/profile">My Profile</Link></li>
                  <li><button className="btn btn-link" onClick={handleLogout}>Log Out</button></li>
                </ul>
              </div>
            )}
          </div>
        </nav>
      </section>
    </div>
  );
};

export default Navbar;
