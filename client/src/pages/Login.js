import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);

        if (data.role === 'user') {
          alert('User logged in successfully!');
          setTimeout(() => navigate('/UserDashboard'), 100);
        } else if (data.role === 'agent') {
          alert('Agent logged in successfully!');
          setTimeout(() => navigate('/AgentDashboard'), 100);
        } else if (data.role === 'admin') {
          alert('Admin logged in successfully!');
          setTimeout(() => navigate('/AdminDashboard'), 100);
        } else {
          alert('Login successful!');
          navigate('/');
        }
      } else {
        alert(data.message || 'Login failed.');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while logging in.');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
    </div>
  );
}

export default Login;
