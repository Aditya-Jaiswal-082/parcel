import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function AddToCart() {
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    description: '',
    contactNumber: '',
    deliveryDate: '',
    pickupCoordinates: null,
    deliveryCoordinates: null
  });

  const [userId, setUserId] = useState(null);
  const pickupRef = useRef(null);
  const deliveryRef = useRef(null);

  // Load user ID
  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setUserId(id);
    } else {
      alert('User not logged in. Please log in first.');
    }
  }, []);

  // Load Google Maps and setup autocomplete
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initAutocomplete();
        return;
      }

      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (window.google && window.google.maps) {
            initAutocomplete();
          } else {
            console.error("Google Maps script loaded but 'google.maps' not available.");
          }
        };
        document.body.appendChild(script);
      }
    };

    const initAutocomplete = () => {
      if (!pickupRef.current || !deliveryRef.current) return;

      const setPlaceData = (place, type) => {
        if (!place.geometry || !place.formatted_address) {
          alert('Please select a complete address from suggestions.');
          return;
        }

        const fullAddress = place.formatted_address || place.name;
        const coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        setFormData(prev => ({
          ...prev,
          [`${type}Address`]: fullAddress,
          [`${type}Coordinates`]: coordinates
        }));
      };

      const pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupRef.current);
      pickupAutocomplete.addListener('place_changed', () => {
        const place = pickupAutocomplete.getPlace();
        setPlaceData(place, 'pickup');
      });

      const deliveryAutocomplete = new window.google.maps.places.Autocomplete(deliveryRef.current);
      deliveryAutocomplete.addListener('place_changed', () => {
        const place = deliveryAutocomplete.getPlace();
        setPlaceData(place, 'delivery');
      });
    };

    loadGoogleMapsScript();
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

    if (!formData.pickupCoordinates || !formData.deliveryCoordinates) {
      alert('Please select both pickup and delivery addresses from the suggestions.');
      return;
    }

    const payload = {
      userId,
      pickupAddress: formData.pickupAddress,
      deliveryAddress: formData.deliveryAddress,
      pickupCoordinates: formData.pickupCoordinates,
      deliveryCoordinates: formData.deliveryCoordinates,
      description: formData.description,
      contactNumber: formData.contactNumber,
      deliveryDate: formData.deliveryDate
    };

    console.log("📦 Sending data:", payload);

    try {
      const res = await axios.post('http://localhost:5000/api/delivery/create', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(res.data.message);

      setFormData({
        pickupAddress: '',
        deliveryAddress: '',
        description: '',
        contactNumber: '',
        deliveryDate: '',
        pickupCoordinates: null,
        deliveryCoordinates: null
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
        <input
          type="text"
          name="pickupAddress"
          ref={pickupRef}
          value={formData.pickupAddress}
          onChange={handleChange}
          required
        />

        <label>Delivery Address</label>
        <input
          type="text"
          name="deliveryAddress"
          ref={deliveryRef}
          value={formData.deliveryAddress}
          onChange={handleChange}
          required
        />

        <label>Parcel Description</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <label>Contact Number</label>
        <input
          type="tel"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          required
        />

        <label>Delivery Date</label>
        <input
          type="date"
          name="deliveryDate"
          value={formData.deliveryDate}
          onChange={handleChange}
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default AddToCart;
