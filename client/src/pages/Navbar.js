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
    if (role === 'user') return '/dashboard/user';
    if (role === 'agent') return '/dashboard/agent';
    if (role === 'admin') return '/dashboard/admin';
    return '/';
  };

  return (
    <nav>
      <Link to="/">Home</Link> |{' '}
      {isLoggedIn && <Link to={getDashboardRoute()}>Dashboard</Link>} |{' '}

      {isLoggedIn ? (
        <>
          {role === 'user' && (
            <>
              <Link to="/add">Create Delivery</Link> |{' '}
              <Link to="/cart">My Deliveries</Link> |{' '}
            </>
          )}

          {role === 'agent' && (
            <>
              <Link to="/cart">Assigned Deliveries</Link> |{' '}
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