// File: src/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/delivery/all');
      setDeliveries(res.data);
    } catch (err) {
      console.error('Error fetching deliveries:', err.message);
    }
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  return (
    <div className="container">
      <h2>📋 All Deliveries</h2>

      <label>Filter by Status: </label>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="assigned">Assigned</option>
        <option value="completed">Completed</option>
      </select>

      <div style={{ marginTop: '20px' }}>
        {filteredDeliveries.map((d) => (
          <div key={d._id} className="card">
            <p><strong>Status:</strong> {d.status}</p>
            <p><strong>From:</strong> {d.pickupAddress}</p>
            <p><strong>To:</strong> {d.deliveryAddress}</p>
            <p><strong>User:</strong> {d.userId?.name} ({d.userId?.email})</p>
            <p><strong>Assigned Agent:</strong> {d.assignedAgent?.name || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
