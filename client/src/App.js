import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Navbar from './pages/Navbar';
import AddToCart from './pages/AddToCart';
import Cart from './pages/Cart';
import UserDashboard from './pages/UserDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import AdminAssignDelivery from './pages/AdminAssignDelivery';
import AdminManageUsers from './pages/AdminManageUsers';
import Payment from './pages/payments';
import './App.css'; // Add this CSS file

function Home() {
  const [trackingId, setTrackingId] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // Hero slider content
  const heroSlides = [
    {
      title: "Fast & Reliable Delivery",
      subtitle: "📦 We provide fast and reliable parcel delivery services from home-to-home across your city",
      bgColor: "#4A90E2",
      icon: "🚚"
    },
    {
      title: "Real-Time Tracking",
      subtitle: "Track your package every step of the way with live updates",
      bgColor: "#7ED321",
      icon: "📱"
    },
    {
      title: "Secure & Professional",
      subtitle: "Admin-controlled parcel system for quality assurance",
      bgColor: "#F5A623",
      icon: "🔒"
    }
  ];

  // Auto-slide carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleTrackPackage = (e) => {
    e.preventDefault();
    if (trackingId.trim()) {
      // You can add tracking functionality here
      alert(`Tracking package: ${trackingId}`);
    }
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      if (role === 'user') navigate('/UserDashboard');
      else if (role === 'agent') navigate('/AgentDashboard');
      else if (role === 'admin') navigate('/AdminDashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section with Carousel */}
      <section className="hero-section">
        <div className="hero-carousel">
          {heroSlides.map((slide, index) => (
            <div 
              key={index}
              className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
              style={{ background: `linear-gradient(135deg, ${slide.bgColor}, ${slide.bgColor}dd)` }}
            >
              <div className="hero-content">
                <div className="hero-text">
                  <h1 className="hero-title">Welcome to Parcel Fast Delivery</h1>
                  <h2 className="hero-subtitle">{slide.title}</h2>
                  <p className="hero-description">{slide.subtitle}</p>
                  
                  <div className="hero-buttons">
                    <button onClick={handleGetStarted} className="btn btn-white btn-large">
                      {isLoggedIn ? '🎯 Go to Dashboard' : '🚀 Get Started'}
                    </button>
                    {!isLoggedIn && (
                      <Link to="/login" className="btn btn-outline-white btn-large">
                        🔐 Login
                      </Link>
                    )}
                  </div>
                </div>
                
                <div className="hero-image">
                  <span className="hero-icon">{slide.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Indicators */}
        <div className="carousel-indicators">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </section>

      {/* Quick Track Section */}
      <section className="quick-track-section">
        <div className="container">
          <div className="track-card">
            <div className="track-header">
              <h3>📍 Track Your Package</h3>
              <p>Enter your tracking ID to get real-time updates on your delivery</p>
            </div>
            
            <form onSubmit={handleTrackPackage} className="track-form">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter tracking ID (e.g., TRK-ABC123-12345)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="track-input"
                />
                <button type="submit" className="btn btn-primary track-btn">
                  Track Now
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="container">
          <div className="section-header">
            <h2>🚀 What We Do</h2>
            <p>Comprehensive delivery solutions tailored for your needs</p>
          </div>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🏠</div>
              <h3>Home Pickup & Delivery</h3>
              <p>Convenient door-to-door service for all your parcel delivery needs</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">📱</div>
              <h3>Real-Time Tracking</h3>
              <p>Monitor your package location and delivery status in real-time</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">🚛</div>
              <h3>Agent Assignment</h3>
              <p>Choose your preferred delivery agent or let our system auto-assign</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">🛡️</div>
              <h3>Quality Assurance</h3>
              <p>Admin-controlled system ensures reliable and secure deliveries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-section">
        <div className="container">
          <div className="why-choose-content">
            <div className="why-choose-text">
              <h2>📋 Why Choose Parcel Fast Delivery?</h2>
              <p>We're committed to providing the best delivery experience with cutting-edge technology and professional service.</p>
              
              <div className="benefits-list">
                <div className="benefit-item">
                  <span className="benefit-icon">🔒</span>
                  <div>
                    <h4>Safe and Secure Delivery</h4>
                    <p>Your packages are handled with utmost care and security</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <span className="benefit-icon">📱</span>
                  <div>
                    <h4>Easy to Use Platform</h4>
                    <p>User-friendly interface for customers, agents, and administrators</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <span className="benefit-icon">⚡</span>
                  <div>
                    <h4>Modern Technology</h4>
                    <p>Built with latest technology for reliability and performance</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <span className="benefit-icon">💰</span>
                  <div>
                    <h4>Affordable & Fast</h4>
                    <p>Competitive pricing with guaranteed fast delivery times</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="why-choose-image">
              <div className="image-placeholder">
                <span className="large-icon">📦</span>
                <p>Trusted by thousands of customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      {isLoggedIn && (
        <section className="quick-access-section">
          <div className="container">
            <h2>Quick Access</h2>
            <p>Welcome back, {user.name}! Access your dashboard and services</p>
            
            <div className="quick-access-grid">
              {role === 'user' && (
                <>
                  <Link to="/addtocart" className="access-card">
                    <span className="access-icon">📦</span>
                    <h3>Create Delivery</h3>
                    <p>Send a new package</p>
                  </Link>
                  
                  <Link to="/cart" className="access-card">
                    <span className="access-icon">🛒</span>
                    <h3>My Cart</h3>
                    <p>View pending deliveries</p>
                  </Link>
                </>
              )}
              
              <Link to="/notifications" className="access-card">
                <span className="access-icon">🔔</span>
                <h3>Notifications</h3>
                <p>Check updates</p>
              </Link>
              
              <Link to="/dashboard" className="access-card">
                <span className="access-icon">🎯</span>
                <h3>Dashboard</h3>
                <p>Main control panel</p>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>🔐 Access Made Easy</h2>
            <p>Join thousands of satisfied customers who trust us with their deliveries. Login or signup to get started with our delivery services - Fast, easy, and secure!</p>
            
            <div className="cta-buttons">
              {!isLoggedIn ? (
                <>
                  <Link to="/signup" className="btn btn-primary btn-large">
                    📝 Sign Up Free
                  </Link>
                  <Link to="/login" className="btn btn-outline btn-large">
                    🔐 Login
                  </Link>
                </>
              ) : (
                <button onClick={handleGetStarted} className="btn btn-primary btn-large">
                  🎯 Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <span className="logo-icon">📦</span>
                <span className="logo-text">Parcel Fast Delivery</span>
              </div>
              <p>Your trusted partner for fast, reliable, and secure package delivery services across the city.</p>
            </div>
            
            <div className="footer-section">
              <h4>Services</h4>
              <ul>
                <li>Home Pickup</li>
                <li>Express Delivery</li>
                <li>Package Tracking</li>
                <li>Secure Handling</li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Track Package</li>
                <li>Report Issue</li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Contact</h4>
              <div className="contact-info">
                <p>📞 +1 (555) 123-4567</p>
                <p>✉️ support@parcelfast.com</p>
                <p>📍 123 Delivery Street, City</p>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 Parcel Fast Delivery. All rights reserved.</p>
            <p>Made with ❤️ for better deliveries</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RedirectDashboard() {
  const role = localStorage.getItem('role');

  if (role === 'user') return <Navigate to="/UserDashboard" replace />;
  if (role === 'agent') return <Navigate to="/AgentDashboard" replace />;
  if (role === 'admin') return <Navigate to="/AdminDashboard" replace />;
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/addtocart" element={<AddToCart />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/dashboard" element={<RedirectDashboard />} />
        <Route path="/UserDashboard" element={<UserDashboard />} />
        <Route path="/AgentDashboard" element={<AgentDashboard />} />
        <Route path="/AdminDashboard" element={<AdminDashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/AdminAssignDelivery" element={<AdminAssignDelivery />} />
        <Route path="/admin/users" element={<AdminManageUsers />} />
        <Route path="/payment" element={<Payment />} />
      </Routes>
    </Router>
  );
}

export default App;
