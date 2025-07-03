// File: src/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const getDashboardRoute = () => {
    if (role === 'user') return './UserDashboard';
    if (role === 'agent') return './AgentDashboard';
    if (role === 'admin') return './AdminDashboard';
  };

  return (
    <nav>
      <Link to="/">Home</Link> |{' '}
      {/* <Link to="./AddToCart">Create Delivery</Link> |{' '}
      <Link to="./Cart">My Deliveries</Link> |{' '} */}
      {isLoggedIn && <Link to={getDashboardRoute()}>Dashboard</Link>} |{' '}

      {isLoggedIn ? (
        <>
          {role === 'user' && (
            <>
              <Link to="./AddToCart">Create Delivery</Link> |{' '}
              <Link to="./Cart">My Deliveries</Link> |{' '}
            </>
          )}

          {role === 'agent' && (
            <>
              <Link to="./Cart">Assigned Deliveries</Link> |{' '}
            </>
          )}

          {role === 'admin' && (
            <>
              <Link to="/admin/users">Manage Users</Link> |{' '}
            </>
          )}

          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link> |{' '}
          <Link to="/signup">Signup</Link>
        </>
      )}
    </nav>
  );
}

export default Navbar;