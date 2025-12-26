import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './parcel.css'; 

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/auth/register', {
        // const res = await fetch('http://localhost:5000/api/auth/register', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'user' // 🔒 hardcoded to 'user'
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Signup successful! Please login.');
        navigate('/login');
      } else {
        alert(data.message || 'Signup failed.');
      }
    } catch (error) {
      alert('An error occurred during signup.');
    }
  };

  return (
    <div>
      <h2>Signup</h2>
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      {/* 🔒 Role dropdown removed */}
      <button onClick={handleSignup}>Signup</button>
    </div>
  );
}

export default Signup;
