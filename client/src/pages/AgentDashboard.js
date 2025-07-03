import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AgentDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const token = localStorage.getItem('token');
  const agentId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/delivery/all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const unassigned = res.data.filter(d => !d.assignedAgent);
        setDeliveries(unassigned);
      } catch (err) {
        console.error('Failed to fetch deliveries:', err.message);
      }
    };

    fetchDeliveries();
  }, [token]);

  const claimDelivery = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/delivery/claim/${id}`, {
        agentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Delivery claimed!");
      setDeliveries(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      console.error("Claim failed:", err.response?.data || err.message);
      alert("Failed to claim delivery");
    }
  };

  return (
    <div className="container">
      <h2>🚚 Available Deliveries</h2>
      {deliveries.length === 0 ? (
        <p>No unassigned deliveries available.</p>
      ) : (
        <ul>
          {deliveries.map(delivery => (
            <li key={delivery._id}>
              <strong>From:</strong> {delivery.pickupAddress}<br />
              <strong>To:</strong> {delivery.deliveryAddress}<br />
              <strong>Description:</strong> {delivery.description}<br />
              <button onClick={() => claimDelivery(delivery._id)}>Claim</button>
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AgentDashboard;
