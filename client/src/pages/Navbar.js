// File: src/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!localStorage.getItem('token');
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setShowUserDropdown(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    setShowUserDropdown(false);
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return role ? role[0].toUpperCase() : 'U';
  };

  // Get role color
  const getRoleColor = () => {
    const colors = {
      'admin': '#dc3545',
      'agent': '#007bff',
      'user': '#28a745'
    };
    return colors[role] || '#6c757d';
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        {/* Logo Section */}
        <Link to="/" className="nav-logo">
          <div className="logo-container">
            <span className="logo-icon">📦</span>
            <div className="logo-text">
              <span className="brand-name">Parcel Fast</span>
              <span className="brand-tagline">Delivery</span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="nav-links desktop-nav">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <span className="link-icon">🏠</span>
            Home
          </Link>

          {isLoggedIn && (
            <>
              {role === 'user' && (
                <>
                  <Link 
                    to="/AddToCart" 
                    className={`nav-link ${isActive('/AddToCart') ? 'active' : ''}`}
                  >
                    <span className="link-icon">📦</span>
                    Create Delivery
                  </Link>
                  <Link 
                    to="/Cart" 
                    className={`nav-link ${isActive('/Cart') ? 'active' : ''}`}
                  >
                    <span className="link-icon">🛒</span>
                    My Deliveries
                  </Link>
                  <Link 
                    to="/UserDashboard" 
                    className={`nav-link ${isActive('/UserDashboard') ? 'active' : ''}`}
                  >
                    <span className="link-icon">📊</span>
                    Dashboard
                  </Link>
                </>
              )}

              {role === 'agent' && (
                <>
                  <Link 
                    to="/Cart" 
                    className={`nav-link ${isActive('/Cart') ? 'active' : ''}`}
                  >
                    <span className="link-icon">🚛</span>
                    Assigned Deliveries
                  </Link>
                  <Link 
                    to="/notifications" 
                    className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}
                  >
                    <span className="link-icon">🔔</span>
                    Notifications
                  </Link>
                  <Link 
                    to="/AgentDashboard" 
                    className={`nav-link ${isActive('/AgentDashboard') ? 'active' : ''}`}
                  >
                    <span className="link-icon">📊</span>
                    Dashboard
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link 
                    to="/admin/users" 
                    className={`nav-link ${isActive('/admin/users') ? 'active' : ''}`}
                  >
                    <span className="link-icon">👥</span>
                    Manage Users
                  </Link>
                  <Link 
                    to="/AdminAssignDelivery" 
                    className={`nav-link ${isActive('/AdminAssignDelivery') ? 'active' : ''}`}
                  >
                    <span className="link-icon">📋</span>
                    Assign Delivery
                  </Link>
                  <Link 
                    to="/notifications" 
                    className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}
                  >
                    <span className="link-icon">🔔</span>
                    Notifications
                  </Link>
                  <Link 
                    to="/AdminDashboard" 
                    className={`nav-link ${isActive('/AdminDashboard') ? 'active' : ''}`}
                  >
                    <span className="link-icon">⚙️</span>
                    Dashboard
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* User Section */}
        <div className="nav-user-section">
          {isLoggedIn ? (
            <div className="user-menu">
              <button 
                className="user-avatar"
                onClick={toggleUserDropdown}
                style={{ borderColor: getRoleColor() }}
              >
                <span className="avatar-text">{getUserInitials()}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showUserDropdown && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <div className="user-avatar-large" style={{ backgroundColor: getRoleColor() }}>
                      {getUserInitials()}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.name || 'User'}</span>
                      <span className="user-role" style={{ color: getRoleColor() }}>
                        {role?.charAt(0).toUpperCase() + role?.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <div className="dropdown-links">
                    <Link to="/profile" className="dropdown-link">
                      <span className="dropdown-icon">👤</span>
                      Profile Settings
                    </Link>
                    <Link to="/notifications" className="dropdown-link">
                      <span className="dropdown-icon">🔔</span>
                      Notifications
                    </Link>
                    <Link to="/help" className="dropdown-link">
                      <span className="dropdown-icon">❓</span>
                      Help & Support
                    </Link>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <button onClick={handleLogout} className="logout-btn">
                    <span className="dropdown-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="nav-btn login-btn">
                <span className="btn-icon">🔐</span>
                Login
              </Link>
              <Link to="/signup" className="nav-btn signup-btn">
                <span className="btn-icon">📝</span>
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className={`mobile-menu-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`mobile-nav ${isMenuOpen ? 'active' : ''}`}>
          <div className="mobile-nav-header">
            {isLoggedIn && (
              <div className="mobile-user-info">
                <div className="mobile-avatar" style={{ backgroundColor: getRoleColor() }}>
                  {getUserInitials()}
                </div>
                <div className="mobile-user-details">
                  <span className="mobile-user-name">{user.name || 'User'}</span>
                  <span className="mobile-user-role" style={{ color: getRoleColor() }}>
                    {role?.charAt(0).toUpperCase() + role?.slice(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mobile-nav-links">
            <Link to="/" className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}>
              <span className="mobile-link-icon">🏠</span>
              Home
            </Link>

            {isLoggedIn ? (
              <>
                {role === 'user' && (
                  <>
                    <Link to="/AddToCart" className={`mobile-nav-link ${isActive('/AddToCart') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">📦</span>
                      Create Delivery
                    </Link>
                    <Link to="/Cart" className={`mobile-nav-link ${isActive('/Cart') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">🛒</span>
                      My Deliveries
                    </Link>
                    <Link to="/UserDashboard" className={`mobile-nav-link ${isActive('/UserDashboard') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">📊</span>
                      Dashboard
                    </Link>
                  </>
                )}

                {role === 'agent' && (
                  <>
                    <Link to="/Cart" className={`mobile-nav-link ${isActive('/Cart') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">🚛</span>
                      Assigned Deliveries
                    </Link>
                    <Link to="/notifications" className={`mobile-nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">🔔</span>
                      Notifications
                    </Link>
                    <Link to="/AgentDashboard" className={`mobile-nav-link ${isActive('/AgentDashboard') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">📊</span>
                      Dashboard
                    </Link>
                  </>
                )}

                {role === 'admin' && (
                  <>
                    <Link to="/admin/users" className={`mobile-nav-link ${isActive('/admin/users') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">👥</span>
                      Manage Users
                    </Link>
                    <Link to="/AdminAssignDelivery" className={`mobile-nav-link ${isActive('/AdminAssignDelivery') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">📋</span>
                      Assign Delivery
                    </Link>
                    <Link to="/notifications" className={`mobile-nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">🔔</span>
                      Notifications
                    </Link>
                    <Link to="/AdminDashboard" className={`mobile-nav-link ${isActive('/AdminDashboard') ? 'active' : ''}`}>
                      <span className="mobile-link-icon">⚙️</span>
                      Dashboard
                    </Link>
                  </>
                )}

                <div className="mobile-nav-divider"></div>
                
                <Link to="/profile" className="mobile-nav-link">
                  <span className="mobile-link-icon">👤</span>
                  Profile Settings
                </Link>
                
                <Link to="/help" className="mobile-nav-link">
                  <span className="mobile-link-icon">❓</span>
                  Help & Support
                </Link>
                
                <button onClick={handleLogout} className="mobile-logout-btn">
                  <span className="mobile-link-icon">🚪</span>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="mobile-nav-link">
                  <span className="mobile-link-icon">🔐</span>
                  Login
                </Link>
                <Link to="/signup" className="mobile-nav-link">
                  <span className="mobile-link-icon">📝</span>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && <div className="mobile-nav-overlay" onClick={toggleMenu}></div>}
      </div>
    </nav>
  );
}

export default Navbar;
