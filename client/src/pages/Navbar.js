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
    localStorage.removeItem('userId');
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
      {/* {isLoggedIn && <Link to={getDashboardRoute()}>Dashboard</Link>} |{' '} */}

      {isLoggedIn ? (
        <>
          {role === 'user' && (
            <>
              <Link to="/AddToCart">Create Delivery</Link> |{' '}
              <Link to="/Cart">My Deliveries</Link> |{' '}
              <Link to="/UserDashboard">User Dashboard</Link> |{' '}
            </>
          )}

          {role === 'agent' && (
            <>
              <Link to="/Cart">Assigned Deliveries</Link> |{' '}
              <Link to="/notifications">Notifications</Link> |{' '}
              <Link to="/AgentDashboard">Agent Dashboard</Link> |{' '}

            </>
          )}

          {role === 'admin' && (
            <>
              <Link to="/admin/users">Manage Users</Link> |{' '}
              <Link to="/notifications">Notifications</Link> |{' '}
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
