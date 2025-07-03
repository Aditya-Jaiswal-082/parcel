// File: src/pages/Cart.js
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
        <ul>
          {deliveries.map((d, i) => (
            <li key={i}>
              <strong>From:</strong> {d.pickupAddress} | <strong>To:</strong> {d.deliveryAddress} <br />
              <strong>Status:</strong> {d.status} | <strong>Date:</strong> {new Date(d.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Cart;
