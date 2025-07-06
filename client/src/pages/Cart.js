import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Cart() {
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userId || !token) return;

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

    fetchDeliveries();
  }, []);

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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Cart;
