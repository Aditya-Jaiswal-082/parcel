// src/pages/AdminManageUsers.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from "../api/api";

function AdminManageUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await api.get('api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Fetched users:', res.data);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch users');
      
      // If token is invalid, redirect to login
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADD THIS: useEffect to fetch users on component mount
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
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No authentication token found. Please login again.');
        return;
      }

      await api.patch(`api/admin/user/${id}`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert('✅ User updated successfully');
      setEditing(null);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('❌ Error updating user:', err.response?.data || err.message);
      alert(`Failed to update user: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No authentication token found. Please login again.');
        return;
      }

      await api.delete(`api/admin/user/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert('🗑️ User deleted successfully');
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('❌ Error deleting user:', err.response?.data || err.message);
      alert(`Failed to delete user: ${err.response?.data?.error || err.message}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container">
        <h2>👥 Manage Users</h2>
        <p>Loading users...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <h2>👥 Manage Users</h2>
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '5px' }}>
          <strong>Error:</strong> {error}
          <br />
          <button onClick={fetchUsers} style={{ marginTop: '10px' }}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>👥 Manage Users</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Filter by role:&nbsp;
          <select onChange={(e) => setFilter(e.target.value)} value={filter}>
            <option value="all">All ({users.length})</option>
            <option value="user">Users ({users.filter(u => u.role === 'user').length})</option>
            <option value="agent">Agents ({users.filter(u => u.role === 'agent').length})</option>
            <option value="admin">Admins ({users.filter(u => u.role === 'admin').length})</option>
          </select>
        </label>
        
        <button onClick={fetchUsers} style={{ marginLeft: '10px' }}>
          🔄 Refresh
        </button>
      </div>

      {filteredUsers.length === 0 ? (
        <p>No users found for the selected filter.</p>
      ) : (
        <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
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
                      style={{ width: '100%' }}
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td>
                  {editing === user._id ? (
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      style={{ width: '100%' }}
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
                      style={{ width: '100%' }}
                    >
                      <option value="user">User</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '3px', 
                      backgroundColor: user.role === 'admin' ? '#ffebee' : user.role === 'agent' ? '#e3f2fd' : '#f3e5f5',
                      color: user.role === 'admin' ? '#c62828' : user.role === 'agent' ? '#1565c0' : '#7b1fa2'
                    }}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td>
                  {editing === user._id ? (
                    <div>
                      <button 
                        onClick={() => handleUpdate(user._id)}
                        style={{ marginRight: '5px', backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}
                      >
                        💾 Save
                      </button>
                      <button 
                        onClick={() => setEditing(null)}
                        style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button 
                        onClick={() => startEdit(user)}
                        style={{ marginRight: '5px', backgroundColor: '#2196f3', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(user._id)}
                        style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminManageUsers;
