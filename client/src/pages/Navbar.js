import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLoggedIn = !!localStorage.getItem("token");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Scroll effect for navbar shadow/height change
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation change
  useEffect(() => {
    setIsMenuOpen(false);
    setShowUserDropdown(false);
  }, [location]);

  // Logout handler clears localStorage and redirects to login
  const logout = useCallback(() => {
    localStorage.clear();
    setShowUserDropdown(false);
    navigate("/login");
  }, [navigate]);

  // Toggle for mobile hamburger menu
  const toggleMenu = () => setIsMenuOpen((o) => !o);

  // Toggle user dropdown menu
  const toggleUserDropdown = () => setShowUserDropdown((o) => !o);

  // Checks if provided path is current active route
  const isActive = useCallback(
    (path) => {
      if (path === "/") {
        return location.pathname === path;
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  // Get initials for avatar circle
  const getUserInitials = () => {
    if (user?.name) {
      const names = user.name.trim().split(" ");
      if (names.length === 1) return names[0][0].toUpperCase();
      return names[0][0].toUpperCase() + names[1][0].toUpperCase();
    }
    return (role ? role[0].toUpperCase() : "U").toUpperCase();
  };

  // Color code for user role
  const getRoleColor = () => {
    const colors = { admin: "#dc3545", agent: "#007bff", user: "#28a745" };
    return colors[role] || "#6c757d";
  };

  // Navigation link configuration per role
  const linksConfig = {
    user: [
      { to: "/addtocart", icon: "📦", label: "Create Delivery" },
      { to: "/cart", icon: "🛒", label: "My Deliveries" },
      { to: "/userdashboard", icon: "📊", label: "Dashboard" },
    ],
    agent: [
      { to: "/agentdashboard", icon: "📊", label: "Dashboard" },
      { to: "/agent-deliveries", icon: "🚛", label: "My Deliveries" }, // new page
      { to: "/notifications", icon: "🔔", label: "Notifications" },
    ],
    admin: [
      { to: "/admin/users", icon: "👥", label: "Manage Users" },
      { to: "/adminassign", icon: "📋", label: "Assign Delivery" },
      { to: "/notifications", icon: "🔔", label: "Notifications" },
      { to: "/admindashboard", icon: "⚙️", label: "Dashboard" },
    ],
  };

  // Compose links based on login & role
  const navLinks = [
    { to: "/", icon: "🏠", label: "Home" },
    ...(
      isLoggedIn && role && linksConfig[role.toLowerCase()] 
        ? linksConfig[role.toLowerCase()] 
        : []
    ),
  ];

  // Render

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
      <div className="nav-container">
        <Link to="/" className="nav-logo" aria-label="Parcel Fast Home">
          <div className="logo-container">
            <span className="logo-icon" aria-hidden="true">
              📦
            </span>
            <div className="logo-text">
              <span className="brand-name">Parcel Fast</span>
              <span className="brand-tagline">Delivery</span>
            </div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="nav-links desktop-nav" role="navigation" aria-label="Primary Navigation">
          {navLinks.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link${isActive(to) ? " active" : ""}`}
              aria-current={isActive(to) ? "page" : undefined}
            >
              <span className="link-icon">{icon}</span>
              {label}
            </Link>
          ))}
        </div>

        {/* User section */}
        <div className="nav-user-section">
          {isLoggedIn ? (
            <div className="user-menu">
              <button
                className="user-avatar"
                style={{ borderColor: getRoleColor() }}
                onClick={toggleUserDropdown}
                aria-haspopup="true"
                aria-expanded={showUserDropdown}
                aria-label="User menu"
              >
                <span className="avatar-text" aria-hidden="true">
                  {getUserInitials()}
                </span>
                <span className="dropdown-arrow" aria-hidden="true">
                  ▼
                </span>
              </button>
              {showUserDropdown && (
                <div
                  className="user-dropdown"
                  role="menu"
                  aria-label="User menu dropdown"
                >
                  <div className="user-info">
                    <div
                      className="user-avatar-large"
                      style={{ backgroundColor: getRoleColor() }}
                      aria-hidden="true"
                    >
                      {getUserInitials()}
                    </div>
                    <div className="user-details">
                      <span className="user-name" tabIndex={-1}>
                        {user?.name || "User"}
                      </span>
                      <span
                        className="user-role"
                        style={{ color: getRoleColor() }}
                        tabIndex={-1}
                      >
                        {(role?.charAt(0).toUpperCase() + role?.slice(1)) || "User"}
                      </span>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />
                  <nav className="dropdown-links" aria-label="User navigation">
                    <Link className="dropdown-link" role="menuitem" to="/profile">
                      <span className="dropdown-icon" aria-hidden="true">
                        👤
                      </span>
                      Profile Settings
                    </Link>
                    <Link className="dropdown-link" role="menuitem" to="/notifications">
                      <span className="dropdown-icon" aria-hidden="true">
                        🔔
                      </span>
                      Notifications
                    </Link>
                    <Link className="dropdown-link" role="menuitem" to="/help">
                      <span className="dropdown-icon" aria-hidden="true">
                        ❓
                      </span>
                      Help & Support
                    </Link>
                  </nav>
                  <hr className="dropdown-divider" />
                  <button
                    onClick={logout}
                    className="logout-btn"
                    role="menuitem"
                    tabIndex={0}
                    aria-label="Logout"
                  >
                    <span className="dropdown-icon" aria-hidden="true">
                      🚪
                    </span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="nav-btn login-btn" aria-label="Login">
                <span className="btn-icon" aria-hidden="true">
                  🔐
                </span>
                Login
              </Link>
              <Link to="/signup" className="nav-btn signup-btn" aria-label="Sign up">
                <span className="btn-icon" aria-hidden="true">
                  📝
                </span>
                Sign Up
              </Link>
            </div>
          )}

          <button
            className={`mobile-menu-toggle${isMenuOpen ? " active" : ""}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-nav${isMenuOpen ? " active" : ""}`} aria-hidden={!isMenuOpen}>
          <div className="mobile-nav-header">
            {isLoggedIn && (
              <div className="mobile-user-info" tabIndex={-1}>
                <div
                  className="mobile-avatar"
                  style={{ backgroundColor: getRoleColor() }}
                  aria-hidden="true"
                >
                  {getUserInitials()}
                </div>
                <div className="mobile-user-details">
                  <span className="mobile-user-name">{user?.name || "User"}</span>
                  <span className="mobile-user-role" style={{ color: getRoleColor() }}>
                    {(role?.charAt(0).toUpperCase() + role?.slice(1)) || "User"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mobile-nav-links" role="navigation" aria-label="Mobile navigation">
            {navLinks.map(({ to, icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`mobile-nav-link${isActive(to) ? " active" : ""}`}
                onClick={toggleMenu} // close menu on link click
              >
                <span className="mobile-link-icon">{icon}</span>
                {label}
              </Link>
            ))}
            <hr className="mobile-divider" />
            {isLoggedIn ? (
              <>
                <Link className="mobile-nav-link" to="/profile" onClick={toggleMenu}>
                  <span className="mobile-link-icon">👤</span> Profile Settings
                </Link>
                <Link className="mobile-nav-link" to="/help" onClick={toggleMenu}>
                  <span className="mobile-link-icon">❓</span> Help & Support
                </Link>
                <button onClick={logout} className="mobile-logout-btn" aria-label="Logout">
                  <span className="mobile-link-icon">🚪</span> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="mobile-nav-link" onClick={toggleMenu}>
                  <span className="mobile-link-icon">🔐</span> Login
                </Link>
                <Link to="/signup" className="mobile-nav-link" onClick={toggleMenu}>
                  <span className="mobile-link-icon">📝</span> Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {isMenuOpen && <div className="mobile-nav-overlay" onClick={toggleMenu} />}
      </div>
    </nav>
  );
}

export default Navbar;
