import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function AddToCart() {
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    description: '',
    contactNumber: '',
    deliveryDate: '',
    pickupCoordinates: null,
    deliveryCoordinates: null,
    additionalInfoPickup: '',
    additionalInfoDelivery: ''
  });

  const [userId, setUserId] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState({ pickup: [], delivery: [] });
  const pickupRef = useRef(null);
  const deliveryRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) setUserId(id);
    else alert('User not logged in. Please log in first.');

    const saved = JSON.parse(localStorage.getItem('savedAddresses') || '{}');
    setSavedAddresses({
      pickup: saved.pickup || [],
      delivery: saved.delivery || []
    });
  }, []);

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
        script.onload = initAutocomplete;
        document.body.appendChild(script);
      }
    };

    const initAutocomplete = () => {
      const setPlaceData = (place, type) => {
        if (!place.geometry || !place.formatted_address) {
          alert('Please select a valid address from suggestions.');
          return;
        }

        const fullAddress = place.formatted_address;
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

      if (pickupRef.current) {
        const pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupRef.current);
        pickupAutocomplete.addListener('place_changed', () => {
          const place = pickupAutocomplete.getPlace();
          setPlaceData(place, 'pickup');
        });
      }

      if (deliveryRef.current) {
        const deliveryAutocomplete = new window.google.maps.places.Autocomplete(deliveryRef.current);
        deliveryAutocomplete.addListener('place_changed', () => {
          const place = deliveryAutocomplete.getPlace();
          setPlaceData(place, 'delivery');
        });
      }
    };

    loadGoogleMapsScript();
  }, []);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSavedAddressSelect = (type, index) => {
    const selected = savedAddresses[type][index];
    if (selected) {
      setFormData(prev => ({
        ...prev,
        [`${type}Address`]: selected.address,
        [`${type}Coordinates`]: selected.coordinates
      }));
    }
  };

  const saveAddressToLocalStorage = (type, label) => {
    const newEntry = {
      label,
      address: formData[`${type}Address`],
      coordinates: formData[`${type}Coordinates`]
    };

    const updated = { ...savedAddresses };
    updated[type].push(newEntry);
    setSavedAddresses(updated);
    localStorage.setItem('savedAddresses', JSON.stringify(updated));
  };

  const handleNext = e => {
    e.preventDefault();

    if (!formData.pickupCoordinates || !formData.deliveryCoordinates) {
      alert('Please select both pickup and delivery addresses.');
      return;
    }

    navigate('/payment', { state: { ...formData, userId } });
  };

  return (
    <div className="container">
      <h2>Create a Delivery</h2>
      <form onSubmit={handleNext}>
        <label>Pickup Address</label>
        <input
          type="text"
          name="pickupAddress"
          ref={pickupRef}
          value={formData.pickupAddress}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="additionalInfoPickup"
          placeholder="Flat/Room No, Landmark, etc."
          value={formData.additionalInfoPickup}
          onChange={handleChange}
        />
        <button type="button" onClick={() => {
          const label = prompt("Give a label (e.g., Home, Work):");
          if (label) saveAddressToLocalStorage('pickup', label);
        }}>
          💾 Save Pickup Address
        </button>
        <select onChange={e => handleSavedAddressSelect('pickup', e.target.value)}>
          <option value="">-- Select Saved Pickup --</option>
          {savedAddresses.pickup.map((addr, i) => (
            <option key={i} value={i}>{addr.label}</option>
          ))}
        </select>

        <label>Delivery Address</label>
        <input
          type="text"
          name="deliveryAddress"
          ref={deliveryRef}
          value={formData.deliveryAddress}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="additionalInfoDelivery"
          placeholder="Flat/Room No, Landmark, etc."
          value={formData.additionalInfoDelivery}
          onChange={handleChange}
        />
        <button type="button" onClick={() => {
          const label = prompt("Give a label (e.g., Friend, Mom):");
          if (label) saveAddressToLocalStorage('delivery', label);
        }}>
          💾 Save Delivery Address
        </button>
        <select onChange={e => handleSavedAddressSelect('delivery', e.target.value)}>
          <option value="">-- Select Saved Delivery --</option>
          {savedAddresses.delivery.map((addr, i) => (
            <option key={i} value={i}>{addr.label}</option>
          ))}
        </select>

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
          required
        />

        <button type="submit">Next</button>
      </form>
    </div>
  );
}

export default AddToCart;
