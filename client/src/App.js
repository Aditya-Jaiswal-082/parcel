import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function Home() {
  return (
    <div>
      <h1>Welcome to Ammu's Delivery</h1>
      <p>📦 We provide fast and reliable parcel delivery services from home-to-home across your city.</p>
      <h2>🔐 Access Made Easy</h2>
      <p>Login or signup to get started with our delivery services. Fast, easy, and secure!</p>
      <h2>🚀 What We Do</h2>
      <ul>
        <li>Home pickup and delivery of any parcels</li>
        <li>Real-time parcel tracking</li>
        <li>Delivery agent selection or auto-assignment</li>
        <li>Admin-controlled parcel system for quality assurance</li>
      </ul>
      <h2>📋 Why Choose Us?</h2>
      <ul>
        <li>Safe and secure delivery</li>
        <li>Easy to use app for both users and agents</li>
        <li>Built with modern technology for reliability</li>
        <li>Affordable pricing and fast delivery</li>
      </ul>
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
