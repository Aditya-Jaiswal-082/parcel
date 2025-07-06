import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state;

  useEffect(() => {
    if (!order) {
      alert('No order data found. Please restart the process.');
      navigate('/');
      return;
    }

    const {
      userId,
      pickupAddress,
      deliveryAddress,
      pickupCoordinates,
      deliveryCoordinates,
      description,
      contactNumber,
      deliveryDate,
      price
    } = order;

    const isValid =
      userId &&
      pickupAddress &&
      deliveryAddress &&
      pickupCoordinates?.lat &&
      pickupCoordinates?.lng &&
      deliveryCoordinates?.lat &&
      deliveryCoordinates?.lng &&
      description &&
      contactNumber &&
      deliveryDate &&
      price;

    if (!isValid) {
      console.error("❌ Missing field in order:", order);
      alert("Order information is incomplete. Please re-enter.");
      navigate('/');
      return;
    }

    const payload = {
      userId,
      pickupAddress,
      deliveryAddress,
      pickupCoordinates,
      deliveryCoordinates,
      description,
      contactNumber,
      deliveryDate,
      price
    };

    console.log("🚚 Sending order to backend:", payload);

    const submitOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('http://localhost:5000/api/delivery/create', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('✅ Order placed successfully! Please pay in cash upon pickup.');
        navigate('/track'); // or navigate('/home') etc.
      } catch (err) {
        console.error('❌ Error submitting delivery:', err.response?.data || err.message);
        alert('Failed to submit delivery. Please try again.');
      }
    };

    submitOrder();
  }, [location.state, navigate]);

  return (
    <div className="container">
      <h2>Placing Your Order...</h2>
      <p>Please wait while we confirm your delivery request.</p>
    </div>
  );
}

export default Payments;
