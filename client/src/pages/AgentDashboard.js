// File: src/AgentDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AgentDashboard() {
  const [unassigned, setUnassigned] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const agentId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUnassignedDeliveries();
    fetchAssignedDeliveries();
  }, []);

  const fetchUnassignedDeliveries = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/delivery/unassigned', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnassigned(res.data);
    } catch (err) {
      console.error('Error fetching unassigned deliveries:', err.message);
    }
  };

  const fetchAssignedDeliveries = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/delivery/assigned/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssigned(res.data);
    } catch (err) {
      console.error('Error fetching assigned deliveries:', err.message);
    }
  };

  const handleClaim = async (deliveryId) => {
    try {
      await axios.patch(`http://localhost:5000/api/delivery/claim/${deliveryId}`, { agentId });
      alert('Delivery claimed!');
      fetchUnassignedDeliveries();
      fetchAssignedDeliveries();
    } catch (err) {
      alert('Error claiming delivery: ' + (err.response?.data?.error || err.message));
    }
  };

  const completeDelivery = async (deliveryId) => {
    try {
      const res = await axios.patch(`http://localhost:5000/api/delivery/complete/${deliveryId}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchAssignedDeliveries();
    } catch (err) {
      console.error('Error completing delivery:', err.response?.data || err.message);
      alert('Failed to complete delivery');
    }
  };

  return (
    <div className="container">
      <h2>📦 Unassigned Deliveries</h2>
      {unassigned.length === 0 ? (
        <p>No available deliveries.</p>
      ) : (
        unassigned.map((d) => (
          <div key={d._id} className="card">
            <p><strong>From:</strong> {d.pickupAddress}</p>
            <p><strong>To:</strong> {d.deliveryAddress}</p>
            <p><strong>Description:</strong> {d.description}</p>
            <button onClick={() => handleClaim(d._id)}>Claim Delivery</button>
          </div>
        ))
      )}

      <h2>🚚 Your Assigned Deliveries</h2>
      {assigned.length === 0 ? (
        <p>No deliveries assigned yet.</p>
      ) : (
        assigned.map((d) => (
          <div key={d._id} className="card">
            <p><strong>From:</strong> {d.pickupAddress}</p>
            <p><strong>To:</strong> {d.deliveryAddress}</p>
            <p><strong>Status:</strong> {d.status}</p>
            {d.status === 'assigned' && (
              <button onClick={() => completeDelivery(d._id)}>Mark as Completed</button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default AgentDashboard;
