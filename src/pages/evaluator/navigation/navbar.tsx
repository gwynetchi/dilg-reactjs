import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth"; // Import Firebase Auth
import "bootstrap/dist/css/bootstrap.min.css";
import "boxicons/css/boxicons.min.css";


const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    window.innerWidth > 576
  );
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); // For navigation after logout

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 576);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call on mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
  
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate("/login"); // Redirect to login after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const menuItems = [
    { name: "Dashboard", icon: "bxs-dashboard", path: "/evaluator/dashboard" },
    { name: "Profile", icon: "bxs-id-card", path: "/evaluator/profile" },
    { name: "Communication", icon: "bxs-message-alt-edit", path: "/evaluator/communication" }, // Added Communication route
    { name: "Inbox", icon: "bxs-message", path: "/evaluator/Inbox" },
    { name: "Analytics", icon: "bxs-bar-chart-alt-2", path: "/evaluator/analytics" },
    { name: "Message", icon: "bxs-message", path: "/evaluator/messages" },
    { name: "Team", icon: "bxs-group", path: "/evaluator/team" },
  ];

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <section id="sidebar" className={isSidebarOpen ? "open show" : "hide"}>
      <Link to="/" className="brand">
  <img src="/images/logo.png" alt="DILG - Cavite Logo" className="brand-logo" />
  <span className="text"></span>
</Link>
<ul className="side-menu top">
  {menuItems.map(({ name, icon, path }) => (
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
      to="#"
      onClick={(e) => {
        e.preventDefault(); // Prevent navigation
        handleLogout();
      }}
    >
      <i className="bx bx-power-off bx-sm bx-burst-hover"></i>
      <span className="text">Logout</span>
    </Link>
  </li>
</ul>
      </section>

      {/* Main Content */}
      <section id="content" className="flex-grow-5">
        <nav className="d-flex align-items-center justify-content-between px-3 py-2">
          <i
            className="bx bx-menu bx-sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          ></i>
          <Link to="#" className="nav-link">
            Categories
          </Link>
          <form className={`d-flex ${isSearchOpen ? "show" : ""}`}>
            <input type="search" className="form-control" placeholder="Search..." />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <i className={`bx ${isSearchOpen ? "bx-x" : "bx-search"}`}></i>
            </button>
          </form>

          {/* Dark Mode Toggle */}
          <input
            type="checkbox"
            id="switch-mode"
            hidden
            checked={isDarkMode}
            onChange={() => setIsDarkMode(!isDarkMode)}
          />
          <label className="switch-lm" htmlFor="switch-mode">
            <i className="bx bxs-moon"></i>
            <i className="bx bx-sun"></i>
            <div className="ball"></div>
          </label>

          {/* Notification Bell */}
          <div className="position-relative" ref={notificationMenuRef}>
            <button
              className="btn notification"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            >
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

          {/* Profile Menu */}
<div className="position-relative" ref={profileMenuRef}>
  <button 
    className="btn profile" 
    onClick={(e) => {
      e.stopPropagation();
      setIsProfileOpen(!isProfileOpen);
    }}
  >
    <img src="https://placehold.co/600x400/png" alt="Profile" />
  </button>

  {isProfileOpen && (
    <div className="profile-menu">
      <ul>
        <li><Link to="/profile">My Profile</Link></li>
        <li><Link to="/settings">Settings</Link></li>
        <li>
          <button className="btn btn-link" onClick={handleLogout}>
            Log Out
          </button>
        </li>
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
