// client/src/pages/SignupPage.js
import { useState } from "react";

function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" // default role
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (res.ok) {
      alert("Registration successful!");
      // Save token if you decide to return it here later
    } else {
      alert(data.message || "Signup failed");
    }
  };

  return (
    <div>
      <h2>Signup</h2>
      <input name="name" placeholder="Name" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} />

      <select name="role" onChange={handleChange}>
        <option value="user">User</option>
        <option value="agent">Delivery Agent</option>
        <option value="admin">Admin</option>
      </select>

      <button onClick={handleSignup}>Register</button>
    </div>
  );
}

export default SignupPage;
