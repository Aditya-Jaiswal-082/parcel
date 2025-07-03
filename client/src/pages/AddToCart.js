import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import '../styles/common.css';

function AddToCart() {
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    description: '',
    contactNumber: '',
    deliveryDate: ''
  });

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setUserId(id);
    } else {
      alert('User not logged in. Please log in first.');
    }
  }, []);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!userId) {
      alert('User ID not found. Please log in again.');
      return;
    }

    console.log("📦 Sending data:", { ...formData, userId });

    try {
      const res = await axios.post(
        'http://localhost:5000/api/delivery/create',
        { ...formData, userId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      alert(res.data.message);
      setFormData({
        pickupAddress: '',
        deliveryAddress: '',
        description: '',
        contactNumber: '',
        deliveryDate: ''
      });
    } catch (err) {
      console.error("🔥 Delivery error:", err.response?.data || err.message);
      alert(err.response?.data?.error || 'Error creating delivery');
    }
  };

  return (
    <div className="container">
      <h2>Create a Delivery</h2>
      <form onSubmit={handleSubmit}>
        <label>Pickup Address</label>
        <input type="text" name="pickupAddress" value={formData.pickupAddress} onChange={handleChange} required />

        <label>Delivery Address</label>
        <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} required />

        <label>Parcel Description</label>
        <input type="text" name="description" value={formData.description} onChange={handleChange} required />

        <label>Contact Number</label>
        <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />

        <label>Delivery Date</label>
        <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default AddToCart;
