import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Cart() {
  const [deliveries, setDeliveries] = useState([]);

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/delivery/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeliveries(res.data);
    } catch (err) {
      console.error("Error loading deliveries:", err);
    }
  };

  useEffect(() => {
    if (userId && token) {
      fetchDeliveries();
    }
  }, [userId, token]);

  const handleCancel = async (id, trackingId) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel this delivery?\nTracking ID: ${trackingId}`
    );

    if (!confirmCancel) return;

    try {
      await axios.patch(`http://localhost:5000/api/delivery/cancel/${id}`, {
        cancelledBy: 'user'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('✅ Delivery cancelled. You will receive a confirmation email.');
      fetchDeliveries(); // refresh list
    } catch (err) {
      console.error("Error cancelling delivery:", err);
      alert('❌ Could not cancel delivery.');
    }
  };

  return (
    <div className="container">
      <h2>📦 My Deliveries</h2>
      {deliveries.length === 0 ? (
        <p>No deliveries yet.</p>
      ) : (
        <table className="delivery-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>From</th>
              <th>To</th>
              <th>Price</th>
              <th>Status</th>
              <th>Delivery Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d, i) => (
              <tr key={i}>
                <td>{d.trackingId}</td>
                <td>{d.pickupAddress}</td>
                <td>{d.deliveryAddress}</td>
                <td>₹{d.price}</td>
                <td style={{ textTransform: 'capitalize' }}>{d.status}</td>
                <td>{new Date(d.deliveryDate).toLocaleDateString()}</td>
                <td>
                  {(d.status !== 'cancelled' && d.status !== 'delivered') ? (
                    <button onClick={() => handleCancel(d._id, d.trackingId)}>
                      Cancel
                    </button>
                  ) : (
                    <span style={{ color: 'gray' }}>N/A</span>
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

export default Cart;
