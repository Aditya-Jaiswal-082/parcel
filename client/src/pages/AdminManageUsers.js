// src/pages/AdminManageUsers.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminManageUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: '' });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => (filter === 'all' ? true : u.role === filter));

  const startEdit = (user) => {
    setEditing(user._id);
    setForm({ name: user.name, email: user.email, role: user.role });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/admin/user/${id}`, form);
      alert('✅ User updated successfully');
      setEditing(null);
      fetchUsers();
    } catch (err) {
      console.error('❌ Error updating user:', err);
      alert('Failed to update user.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/admin/user/${id}`);
      alert('🗑️ User deleted');
      fetchUsers();
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      alert('Failed to delete user.');
    }
  };

  return (
    <div className="container">
      <h2>👥 Manage Users</h2>

      <label>
        Filter by role:&nbsp;
        <select onChange={(e) => setFilter(e.target.value)} value={filter}>
          <option value="all">All</option>
          <option value="user">User</option>
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      <table border="1" cellPadding="10" style={{ marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(user => (
            <tr key={user._id}>
              <td>
                {editing === user._id ? (
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                ) : (
                  user.name
                )}
              </td>
              <td>
                {editing === user._id ? (
                  <input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                ) : (
                  user.email
                )}
              </td>
              <td>
                {editing === user._id ? (
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  user.role
                )}
              </td>
              <td>
                {editing === user._id ? (
                  <>
                    <button onClick={() => handleUpdate(user._id)}>💾 Save</button>
                    <button onClick={() => setEditing(null)}>❌ Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(user)}>✏️ Edit</button>
                    <button onClick={() => handleDelete(user._id)}>🗑️ Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminManageUsers;
