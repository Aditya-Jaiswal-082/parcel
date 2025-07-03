import React, { useEffect, useState } from 'react';

function Cart() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/parcels', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setOrders(data);
    };

    fetchOrders();
  }, []);

  return (
    <div>
      <h2>My Deliveries</h2>
      {orders.length === 0 ? <p>No deliveries yet.</p> : (
        <ul>
          {orders.map((order) => (
            <li key={order._id}>{order.pickup} → {order.drop}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Cart;
