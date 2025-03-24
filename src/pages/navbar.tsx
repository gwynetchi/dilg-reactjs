import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import "boxicons/css/boxicons.min.css";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase";
import { useLocation } from "react-router-dom";
interface NavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}


const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const [role, setRole] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem("darkMode") === "true");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    if (role) {
      // Find the menu item that matches the current path
      const currentItem = menuItems[role].find((item) => location.pathname.includes(item.path));
      
      if (currentItem) {
        setActiveMenu(currentItem.name); // Set the active menu item based on the route
      }
    }
  }, [location.pathname, role]); // Run when the route or role changes
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredMenuItems, setFilteredMenuItems] = useState<any[]>([]);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const menuItems: Record<string, { name: string; icon: string; path: string }[]> = {
    Viewer: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/viewer/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/viewer/profile" },
      { name: "Inbox", icon: "bxs-message", path: "/viewer/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/viewer/calendar" },
      { name: "Message", icon: "bxs-message", path: "/viewer/message" }, // Included at the end if present
    ],
    Evaluator: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/evaluator/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/evaluator/profile" },
      { name: "Inbox", icon: "bxs-message", path: "/evaluator/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/evaluator/calendar" },
      { name: "Communication", icon: "bxs-message-alt-edit", path: "/evaluator/communication" },
      { name: "Analytics", icon: "bxs-bar-chart-alt-2", path: "/evaluator/analytics" },
      { name: "Message", icon: "bxs-message", path: "/evaluator/message" }, // Included at the end if present
    ],
    LGU: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/lgu/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/lgu/profile" },
      { name: "Inbox", icon: "bxs-message", path: "/lgu/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/lgu/calendar" },
      { name: "Communication", icon: "bxs-message-alt-edit", path: "/lgu/communication" },
      { name: "Message", icon: "bxs-message", path: "/lgu/message" }, // Included at the end if present
    ],
    Admin: [
      { name: "Dashboard", icon: "bxs-dashboard", path: "/admin/dashboard" },
      { name: "Profile", icon: "bxs-id-card", path: "/admin/profile" },
      { name: "Inbox", icon: "bxs-message", path: "/admin/inbox" },
      { name: "Calendar", icon: "bxs-calendar", path: "/admin/calendar" },
      { name: "Communication", icon: "bxs-message-alt-edit", path: "/admin/communication" },
      { name: "Message", icon: "bxs-message", path: "/admin/message" }, // Included at the end if present
    ],
  };
  

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const fetchUserRole = async (uid: string) => {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        setRole(userDoc.data().role); // Assuming role is stored in Firestore
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserRole(user.uid);
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (role) {
      setFilteredMenuItems(menuItems[role].filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())));
    }
  }, [role, searchQuery]);

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
      // Search for sidebar items
      const filteredSidebarItems = role
        ? menuItems[role].filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];
      navigate(`/search?query=${searchQuery}`, { state: { filteredSidebarItems, inboxResults } });
    }
  };

  const toggleSearchForm = () => {
    setIsSearchOpen(prevState => !prevState);
  };

  if (!role) return null;

  return (
    <div className="d-flex">
      <section id="sidebar" className={isSidebarOpen ? "open show" : "hide"}>
        <Link to="/dashboards" className="brand">
          <img src="/images/logo.png" alt="Logo" className="brand-logo" />
          <span className="text"></span>
        </Link>
        <ul className="side-menu top">
          {filteredMenuItems.length > 0 ? (
            filteredMenuItems.map(({ name, icon, path }) => (
              <li key={name} className={activeMenu === name ? "active" : ""}>
                <Link to={path} onClick={() => setActiveMenu(name)}>
                  <i className={`bx ${icon} bx-sm`}></i>
                  <span className="text">{name}</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="text-muted">No results found</li>
          )}
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

      <section id="content" className={`main-content ${isSidebarOpen ? "expanded" : "collapsed"}`}>
        <nav className="d-flex align-items-center justify-content-between px-3 py-2">
          <i className="bx bx-menu bx-sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)}></i>
          <button type="button" className="btn btn-outline-secondary" onClick={toggleSearchForm}>
          </button>
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

          <input type="checkbox" id="switch-mode" hidden checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />
          <label className="switch-lm" htmlFor="switch-mode">
            <i className="bx bxs-moon"></i>
            <i className="bx bx-sun"></i>
            <div className="ball"></div>
          </label>

          <div className="position-relative" ref={notificationMenuRef}>
            <button className="btn notification" onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
              <i className="bx bxs-bell bx-tada-hover"></i>
              <span className="num">8</span>
            </button>
            {isNotificationOpen && (
              <div className="notification-menu menu">
                <ul>
                  <li>New message from John</li>
                  <li>Your order has been shipped</li>
                  <li>New comment on your post</li>
                  <li>Update available for your app</li>
                  <li>Reminder: Meeting at 3PM</li>
                </ul>
              </div>
            )}
          </div>

          <div className="position-relative" ref={profileMenuRef}>
            <button className="btn profile" onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}>
              <img src="https://placehold.co/600x400/png" alt="Profile" />
            </button>

            {isProfileOpen && (
              <div className="profile-menu">
                <ul>
                  <li><Link to="/profile">My Profile</Link></li>
                  <li><Link to="/settings">Settings</Link></li>
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